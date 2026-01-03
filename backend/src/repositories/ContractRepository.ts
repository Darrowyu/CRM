import { pool } from '../db/connection.js';
import { Contract } from '../types/contracts';

export class ContractRepository {
  async findAll(filters: { customer_id?: string; status?: string }): Promise<Contract[]> {
    let query = `SELECT c.*, cu.company_name as customer_name FROM contracts c LEFT JOIN customers cu ON c.customer_id = cu.id WHERE 1=1`;
    const params: unknown[] = [];
    if (filters.customer_id) { params.push(filters.customer_id); query += ` AND c.customer_id = $${params.length}`; }
    if (filters.status) { params.push(filters.status); query += ` AND c.status = $${params.length}`; }
    query += ' ORDER BY c.created_at DESC';
    const result = await pool.query(query, params);
    return result.rows;
  }

  async findById(id: string): Promise<Contract | null> {
    const result = await pool.query(`SELECT c.*, cu.company_name as customer_name FROM contracts c LEFT JOIN customers cu ON c.customer_id = cu.id WHERE c.id = $1`, [id]);
    return result.rows[0] || null;
  }

  async create(data: Partial<Contract>): Promise<Contract> {
    const number = `CON${Date.now().toString(36).toUpperCase()}`;
    const result = await pool.query(`INSERT INTO contracts (contract_number, order_id, customer_id, title, amount, start_date, end_date, status, signed_date, file_url, reminder_days, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [number, data.order_id, data.customer_id, data.title, data.amount, data.start_date, data.end_date, data.status || 'draft', data.signed_date, data.file_url, data.reminder_days || 30, data.created_by]);
    return result.rows[0];
  }

  async update(id: string, data: Partial<Contract>): Promise<Contract | null> {
    const fields: string[] = []; const values: unknown[] = [];
    const allowed = ['title', 'amount', 'start_date', 'end_date', 'status', 'signed_date', 'file_url', 'reminder_days'];
    for (const key of allowed) { if (data[key as keyof Contract] !== undefined) { values.push(data[key as keyof Contract]); fields.push(`${key} = $${values.length}`); } }
    if (fields.length === 0) return this.findById(id);
    fields.push('updated_at = NOW()'); values.push(id);
    const result = await pool.query(`UPDATE contracts SET ${fields.join(', ')} WHERE id = $${values.length} RETURNING *`, values);
    return result.rows[0] || null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await pool.query('DELETE FROM contracts WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  async getExpiringContracts(days: number): Promise<Contract[]> {
    const result = await pool.query(`SELECT c.*, cu.company_name as customer_name FROM contracts c LEFT JOIN customers cu ON c.customer_id = cu.id
      WHERE c.status = 'active' AND c.end_date IS NOT NULL AND c.end_date <= CURRENT_DATE + $1::INTEGER ORDER BY c.end_date`, [days]);
    return result.rows;
  }

  async getStatistics(): Promise<{ total: number; active: number; expiring7: number; expiring30: number; expired: number; monthNew: number; totalAmount: number }> { // 获取统计
    const result = await pool.query(`SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'active') as active,
      COUNT(*) FILTER (WHERE status = 'active' AND end_date <= CURRENT_DATE + 7) as expiring7,
      COUNT(*) FILTER (WHERE status = 'active' AND end_date <= CURRENT_DATE + 30) as expiring30,
      COUNT(*) FILTER (WHERE status = 'expired') as expired,
      COUNT(*) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE)) as month_new,
      COALESCE(SUM(amount), 0) as total_amount FROM contracts`);
    const row = result.rows[0];
    return { total: Number(row.total), active: Number(row.active), expiring7: Number(row.expiring7), expiring30: Number(row.expiring30), expired: Number(row.expired), monthNew: Number(row.month_new), totalAmount: Number(row.total_amount) };
  }

  async batchDelete(ids: string[]): Promise<number> { // 批量删除
    const result = await pool.query(`DELETE FROM contracts WHERE id = ANY($1)`, [ids]);
    return result.rowCount || 0;
  }

  async batchUpdateStatus(ids: string[], status: string): Promise<number> { // 批量更新状态
    const result = await pool.query(`UPDATE contracts SET status = $1, updated_at = NOW() WHERE id = ANY($2)`, [status, ids]);
    return result.rowCount || 0;
  }

  async renewContract(id: string, createdBy: string): Promise<Contract | null> { // 续签合同
    const original = await this.findById(id);
    if (!original) return null;
    const number = `CON${Date.now().toString(36).toUpperCase()}`;
    const result = await pool.query(`INSERT INTO contracts (contract_number, customer_id, title, amount, status, reminder_days, created_by)
      VALUES ($1, $2, $3, $4, 'draft', $5, $6) RETURNING *`,
      [number, original.customer_id, `${original.title}(续签)`, original.amount, original.reminder_days || 30, createdBy]);
    return result.rows[0];
  }
}

export const contractRepository = new ContractRepository();
