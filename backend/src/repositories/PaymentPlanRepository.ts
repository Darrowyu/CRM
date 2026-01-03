import { pool } from '../db/connection.js';
import { PaymentPlan } from '../types/contracts';

export class PaymentPlanRepository {
  async findAll(filters: { order_id?: string; customer_id?: string; status?: string }): Promise<PaymentPlan[]> {
    let query = `SELECT p.*, c.company_name as customer_name FROM payment_plans p LEFT JOIN customers c ON p.customer_id = c.id WHERE 1=1`;
    const params: unknown[] = [];
    if (filters.order_id) { params.push(filters.order_id); query += ` AND p.order_id = $${params.length}`; }
    if (filters.customer_id) { params.push(filters.customer_id); query += ` AND p.customer_id = $${params.length}`; }
    if (filters.status) { params.push(filters.status); query += ` AND p.status = $${params.length}`; }
    query += ' ORDER BY p.plan_date ASC';
    const result = await pool.query(query, params);
    return result.rows;
  }

  async findById(id: string): Promise<PaymentPlan | null> {
    const result = await pool.query(`SELECT p.*, c.company_name as customer_name FROM payment_plans p LEFT JOIN customers c ON p.customer_id = c.id WHERE p.id = $1`, [id]);
    return result.rows[0] || null;
  }

  async create(data: Partial<PaymentPlan>): Promise<PaymentPlan> {
    const result = await pool.query(`INSERT INTO payment_plans (order_id, contract_id, customer_id, plan_amount, plan_date, remark) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [data.order_id, data.contract_id, data.customer_id, data.plan_amount, data.plan_date, data.remark]);
    return result.rows[0];
  }

  async recordPayment(id: string, amount: number, date: string): Promise<PaymentPlan | null> {
    const plan = await this.findById(id);
    if (!plan) return null;
    const newActual = (plan.actual_amount || 0) + amount;
    const status = newActual >= plan.plan_amount ? 'completed' : 'partial';
    const result = await pool.query(`UPDATE payment_plans SET actual_amount = $1, actual_date = $2, status = $3, updated_at = NOW() WHERE id = $4 RETURNING *`, [newActual, date, status, id]);
    return result.rows[0];
  }

  async delete(id: string): Promise<boolean> {
    const result = await pool.query('DELETE FROM payment_plans WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  async getOverduePlans(): Promise<PaymentPlan[]> {
    const result = await pool.query(`SELECT p.*, c.company_name as customer_name FROM payment_plans p LEFT JOIN customers c ON p.customer_id = c.id
      WHERE p.status IN ('pending', 'partial') AND p.plan_date < CURRENT_DATE ORDER BY p.plan_date`);
    return result.rows;
  }

  async getStats(customerId?: string): Promise<{ total_planned: number; total_received: number; overdue_count: number; overdue_amount: number; month_received: number; pending_count: number; collection_rate: number }> {
    let query = `SELECT COALESCE(SUM(plan_amount), 0) as total_planned, COALESCE(SUM(actual_amount), 0) as total_received,
      COUNT(*) FILTER (WHERE status IN ('pending', 'partial') AND plan_date < CURRENT_DATE) as overdue_count,
      COALESCE(SUM(plan_amount - actual_amount) FILTER (WHERE status IN ('pending', 'partial') AND plan_date < CURRENT_DATE), 0) as overdue_amount,
      COALESCE(SUM(actual_amount) FILTER (WHERE actual_date >= date_trunc('month', CURRENT_DATE)), 0) as month_received,
      COUNT(*) FILTER (WHERE status IN ('pending', 'partial')) as pending_count,
      CASE WHEN SUM(plan_amount) > 0 THEN ROUND(SUM(actual_amount)::numeric / SUM(plan_amount) * 100, 1) ELSE 0 END as collection_rate
      FROM payment_plans`;
    const params: unknown[] = [];
    if (customerId) { params.push(customerId); query += ` WHERE customer_id = $1`; }
    const result = await pool.query(query, params);
    return result.rows[0];
  }

  async update(id: string, data: Partial<PaymentPlan>): Promise<PaymentPlan | null> { // 更新回款计划
    const fields: string[] = []; const values: unknown[] = [];
    const allowed = ['plan_amount', 'plan_date', 'remark'];
    for (const key of allowed) { if (data[key as keyof PaymentPlan] !== undefined) { values.push(data[key as keyof PaymentPlan]); fields.push(`${key} = $${values.length}`); } }
    if (fields.length === 0) return this.findById(id);
    fields.push('updated_at = NOW()'); values.push(id);
    const result = await pool.query(`UPDATE payment_plans SET ${fields.join(', ')} WHERE id = $${values.length} RETURNING *`, values);
    return result.rows[0] || null;
  }

  async batchDelete(ids: string[]): Promise<number> { // 批量删除
    const result = await pool.query(`DELETE FROM payment_plans WHERE id = ANY($1)`, [ids]);
    return result.rowCount || 0;
  }
}

export const paymentPlanRepository = new PaymentPlanRepository();
