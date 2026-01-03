import { BaseRepository } from './BaseRepository.js';
import { Quote, QuoteItem, CreateQuoteDTO, generateQuoteNumber, isManualPrice, requiresApproval } from '../models/Quote.js';
import { query, pool } from '../db/connection.js';
import { QuoteStatus } from '../types/index.js';

// 报价单状态机：定义合法的状态转换
const VALID_TRANSITIONS: Record<QuoteStatus, QuoteStatus[]> = {
  [QuoteStatus.DRAFT]: [QuoteStatus.PENDING_MANAGER], // 草稿 -> 待审批
  [QuoteStatus.PENDING_MANAGER]: [QuoteStatus.APPROVED, QuoteStatus.REJECTED, QuoteStatus.PENDING_DIRECTOR], // 待经理审批 -> 通过/拒绝/待总监审批
  [QuoteStatus.PENDING_DIRECTOR]: [QuoteStatus.APPROVED, QuoteStatus.REJECTED], // 待总监审批 -> 通过/拒绝
  [QuoteStatus.APPROVED]: [QuoteStatus.SENT], // 已批准 -> 已发送(转订单)
  [QuoteStatus.REJECTED]: [QuoteStatus.DRAFT], // 被拒绝 -> 可重新编辑为草稿
  [QuoteStatus.SENT]: [], // 已发送(终态)
};

export const canTransition = (from: QuoteStatus, to: QuoteStatus): boolean => {
  return VALID_TRANSITIONS[from]?.includes(to) || false;
};

export class QuoteRepository extends BaseRepository<Quote> {
  constructor() {
    super('quotes');
  }

  async createQuote(data: CreateQuoteDTO, floorPrices: Map<string, number>): Promise<Quote> { // 创建报价单
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      let needsApproval = false;
      let totalAmount = 0;

      const quoteResult = await client.query(
        `INSERT INTO quotes (quote_number, customer_id, opportunity_id, created_by, status, requires_approval) 
         VALUES ($1, $2, $3, $4, 'draft', false) RETURNING *`,
        [generateQuoteNumber(), data.customer_id, data.opportunity_id, data.created_by]
      );
      const quote = quoteResult.rows[0];

      for (const item of data.items) {
        const isManual = isManualPrice(item.unit_price, item.calculated_price);
        const floorPrice = floorPrices.get(item.product_id) || 0;
        if (requiresApproval(item.unit_price, floorPrice)) needsApproval = true;
        
        const itemTotal = item.quantity * item.unit_price;
        totalAmount += itemTotal;

        await client.query(
          `INSERT INTO quote_items (quote_id, product_id, quantity, unit_price, total, is_manual_price) 
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [quote.id, item.product_id, item.quantity, item.unit_price, itemTotal, isManual]
        );
      }

      const status = needsApproval ? QuoteStatus.PENDING_MANAGER : QuoteStatus.DRAFT;
      await client.query(
        `UPDATE quotes SET total_amount = $1, requires_approval = $2, status = $3 WHERE id = $4`,
        [totalAmount, needsApproval, status, quote.id]
      );

      await client.query('COMMIT');
      return { ...quote, total_amount: totalAmount, requires_approval: needsApproval, status };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async approve(quoteId: string, approverId: string, comment?: string): Promise<Quote | null> { // 审批通过
    const quote = await this.findById(quoteId);
    if (!quote) return null;
    // 状态机校验：只有待审批状态才能审批通过
    if (!canTransition(quote.status as QuoteStatus, QuoteStatus.APPROVED)) {
      throw new Error(`无法从 ${quote.status} 状态审批通过`);
    }
    await query(
      `INSERT INTO approval_logs (quote_id, approver_id, action, comment) VALUES ($1, $2, 'approve', $3)`,
      [quoteId, approverId, comment]
    );
    return this.update(quoteId, { status: QuoteStatus.APPROVED, approved_by: approverId } as Partial<Quote>);
  }

  async reject(quoteId: string, approverId: string, reason: string): Promise<Quote | null> { // 审批拒绝
    const quote = await this.findById(quoteId);
    if (!quote) return null;
    // 状态机校验：只有待审批状态才能拒绝
    if (!canTransition(quote.status as QuoteStatus, QuoteStatus.REJECTED)) {
      throw new Error(`无法从 ${quote.status} 状态拒绝`);
    }
    await query(
      `INSERT INTO approval_logs (quote_id, approver_id, action, comment) VALUES ($1, $2, 'reject', $3)`,
      [quoteId, approverId, reason]
    );
    return this.update(quoteId, { status: QuoteStatus.REJECTED, rejection_reason: reason } as Partial<Quote>);
  }

  async getItems(quoteId: string): Promise<QuoteItem[]> { // 获取报价明细
    const result = await query('SELECT * FROM quote_items WHERE quote_id = $1', [quoteId]);
    return result.rows;
  }

  async findByOpportunity(opportunityId: string): Promise<Quote[]> { // 按商机查询报价单
    const result = await query(
      `SELECT q.*, c.company_name as customer_name FROM quotes q 
       LEFT JOIN customers c ON q.customer_id = c.id 
       WHERE q.opportunity_id = $1 ORDER BY q.created_at DESC`,
      [opportunityId]
    );
    return result.rows;
  }

  async findAllWithDetails(): Promise<Quote[]> { // 获取所有报价单(含客户和创建人)
    const result = await query(
      `SELECT q.*, c.company_name as customer_name, u.name as created_by_name 
       FROM quotes q 
       LEFT JOIN customers c ON q.customer_id = c.id 
       LEFT JOIN users u ON q.created_by = u.id 
       ORDER BY q.created_at DESC`
    );
    return result.rows;
  }

  async findByIdWithDetails(id: string): Promise<Quote | null> { // 获取单个报价单详情(含客户和创建人)
    const result = await query(
      `SELECT q.*, c.company_name as customer_name, u.name as created_by_name 
       FROM quotes q 
       LEFT JOIN customers c ON q.customer_id = c.id 
       LEFT JOIN users u ON q.created_by = u.id 
       WHERE q.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  async findPendingApproval(): Promise<Quote[]> { // 获取待审批报价单
    const result = await query(
      `SELECT q.*, c.company_name as customer_name, u.name as created_by_name 
       FROM quotes q 
       LEFT JOIN customers c ON q.customer_id = c.id 
       LEFT JOIN users u ON q.created_by = u.id 
       WHERE q.status IN ('pending_manager', 'pending_director') 
       ORDER BY q.created_at ASC`
    );
    return result.rows;
  }

  async getItemsWithProduct(quoteId: string): Promise<QuoteItem[]> { // 获取报价明细(含产品信息)
    const result = await query(
      `SELECT qi.*, p.name as product_name, p.sku as product_sku 
       FROM quote_items qi 
       LEFT JOIN products p ON qi.product_id = p.id 
       WHERE qi.quote_id = $1`,
      [quoteId]
    );
    return result.rows;
  }

  async getApprovalLogs(quoteId: string): Promise<any[]> { // 获取审批记录
    const result = await query(
      `SELECT al.*, u.name as approver_name 
       FROM approval_logs al 
       LEFT JOIN users u ON al.approver_id = u.id 
       WHERE al.quote_id = $1 ORDER BY al.created_at DESC`,
      [quoteId]
    );
    return result.rows;
  }

  async updateQuoteItems(quoteId: string, items: any[], floorPrices: Map<string, number>): Promise<Quote | null> { // 更新报价明细
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM quote_items WHERE quote_id = $1', [quoteId]);
      let totalAmount = 0;
      let needsApproval = false;
      for (const item of items) {
        const floorPrice = floorPrices.get(item.product_id) || 0;
        if (requiresApproval(item.unit_price, floorPrice)) needsApproval = true;
        const itemTotal = item.quantity * item.unit_price;
        totalAmount += itemTotal;
        await client.query(
          `INSERT INTO quote_items (quote_id, product_id, quantity, unit_price, total, is_manual_price) VALUES ($1, $2, $3, $4, $5, $6)`,
          [quoteId, item.product_id, item.quantity, item.unit_price, itemTotal, false]
        );
      }
      await client.query(`UPDATE quotes SET total_amount = $1, requires_approval = $2 WHERE id = $3`, [totalAmount, needsApproval, quoteId]);
      await client.query('COMMIT');
      return this.findById(quoteId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async convertToOrder(quoteId: string): Promise<any> { // 报价单转订单
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const quote = await this.findById(quoteId);
      if (!quote) throw new Error('报价单不存在');
      const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;
      const orderResult = await client.query(
        `INSERT INTO orders (order_number, quote_id, opportunity_id, customer_id, total_amount, status) 
         VALUES ($1, $2, $3, $4, $5, 'pending') RETURNING *`,
        [orderNumber, quoteId, quote.opportunity_id, quote.customer_id, quote.total_amount]
      );
      await client.query(`UPDATE quotes SET status = 'sent' WHERE id = $1`, [quoteId]);
      await client.query('COMMIT');
      return orderResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async copyQuote(quoteId: string, createdBy: string): Promise<Quote | null> { // 复制报价单
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const original = await this.findById(quoteId);
      if (!original) return null;
      const items = await this.getItems(quoteId);
      const quoteResult = await client.query(
        `INSERT INTO quotes (quote_number, customer_id, opportunity_id, created_by, status, requires_approval, total_amount) 
         VALUES ($1, $2, $3, $4, 'draft', $5, $6) RETURNING *`,
        [generateQuoteNumber(), original.customer_id, original.opportunity_id, createdBy, original.requires_approval, original.total_amount]
      );
      const newQuote = quoteResult.rows[0];
      for (const item of items) {
        await client.query(
          `INSERT INTO quote_items (quote_id, product_id, quantity, unit_price, total, is_manual_price) VALUES ($1, $2, $3, $4, $5, $6)`,
          [newQuote.id, item.product_id, item.quantity, item.unit_price, item.total, item.is_manual_price]
        );
      }
      await client.query('COMMIT');
      return newQuote;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getStatistics(): Promise<{ total: number; draft: number; pending: number; approved: number; rejected: number; monthAmount: number; conversionRate: number }> { // 获取报价统计
    const result = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'draft') as draft,
        COUNT(*) FILTER (WHERE status IN ('pending_manager', 'pending_director')) as pending,
        COUNT(*) FILTER (WHERE status = 'approved') as approved,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
        COALESCE(SUM(total_amount) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE)), 0) as month_amount,
        CASE WHEN COUNT(*) FILTER (WHERE status IN ('approved', 'sent')) > 0 
          THEN ROUND(COUNT(*) FILTER (WHERE status = 'sent')::numeric / NULLIF(COUNT(*) FILTER (WHERE status IN ('approved', 'sent')), 0) * 100, 1)
          ELSE 0 END as conversion_rate
      FROM quotes
    `);
    const row = result.rows[0];
    return { total: Number(row.total), draft: Number(row.draft), pending: Number(row.pending), approved: Number(row.approved), rejected: Number(row.rejected), monthAmount: Number(row.month_amount), conversionRate: Number(row.conversion_rate) };
  }

  async batchDelete(ids: string[]): Promise<number> { // 批量删除草稿
    const result = await query(`DELETE FROM quotes WHERE id = ANY($1) AND status = 'draft'`, [ids]);
    return result.rowCount || 0;
  }

  async batchSubmit(ids: string[]): Promise<number> { // 批量提交审批
    const result = await query(`UPDATE quotes SET status = 'pending_manager' WHERE id = ANY($1) AND status = 'draft'`, [ids]);
    return result.rowCount || 0;
  }
}

export const quoteRepository = new QuoteRepository();
