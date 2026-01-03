import { pool } from '../db/connection.js';
import { SalesTarget, TeamTarget } from '../types/tasks';

export class SalesTargetRepository {
  async findUserTargets(userId: string, year: number): Promise<SalesTarget[]> {
    const result = await pool.query(`SELECT st.*, u.name as user_name FROM sales_targets st LEFT JOIN users u ON st.user_id = u.id WHERE st.user_id = $1 AND st.year = $2 ORDER BY st.month`, [userId, year]);
    return result.rows;
  }

  async findUserTarget(userId: string, year: number, month: number): Promise<SalesTarget | null> {
    const result = await pool.query(`SELECT st.*, u.name as user_name FROM sales_targets st LEFT JOIN users u ON st.user_id = u.id WHERE st.user_id = $1 AND st.year = $2 AND st.month = $3`, [userId, year, month]);
    return result.rows[0] || null;
  }

  async upsertUserTarget(data: { user_id: string; year: number; month: number; target_amount: number; target_customers?: number; target_opportunities?: number; created_by: string }): Promise<SalesTarget> {
    const result = await pool.query(`INSERT INTO sales_targets (user_id, year, month, target_amount, target_customers, target_opportunities, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (user_id, year, month) DO UPDATE SET target_amount = $4, target_customers = $5, target_opportunities = $6, updated_at = NOW() RETURNING *`,
      [data.user_id, data.year, data.month, data.target_amount, data.target_customers || 0, data.target_opportunities || 0, data.created_by]);
    return result.rows[0];
  }

  async getAllUserTargets(year: number, month: number): Promise<SalesTarget[]> {
    const result = await pool.query(`SELECT st.*, u.name as user_name FROM sales_targets st LEFT JOIN users u ON st.user_id = u.id WHERE st.year = $1 AND st.month = $2 ORDER BY u.name`, [year, month]);
    return result.rows;
  }

  async findTeamTarget(year: number, month: number): Promise<TeamTarget | null> {
    const result = await pool.query('SELECT * FROM team_targets WHERE year = $1 AND month = $2', [year, month]);
    return result.rows[0] || null;
  }

  async upsertTeamTarget(data: { year: number; month: number; target_amount: number; target_customers?: number; target_opportunities?: number; created_by: string }): Promise<TeamTarget> {
    const result = await pool.query(`INSERT INTO team_targets (year, month, target_amount, target_customers, target_opportunities, created_by)
      VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (year, month) DO UPDATE SET target_amount = $3, target_customers = $4, target_opportunities = $5, updated_at = NOW() RETURNING *`,
      [data.year, data.month, data.target_amount, data.target_customers || 0, data.target_opportunities || 0, data.created_by]);
    return result.rows[0];
  }

  async getUserActuals(userId: string, year: number, month: number): Promise<{ amount: number; customers: number; opportunities: number }> {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const [amountRes, customersRes, oppsRes] = await Promise.all([
      pool.query(`SELECT COALESCE(SUM(total_amount), 0) as amount FROM orders WHERE customer_id IN (SELECT id FROM customers WHERE owner_id = $1) AND status = 'completed' AND created_at >= $2 AND created_at < $3`, [userId, startDate, endDate]),
      pool.query(`SELECT COUNT(*) as count FROM customers WHERE owner_id = $1 AND created_at >= $2 AND created_at < $3`, [userId, startDate, endDate]),
      pool.query(`SELECT COUNT(*) as count FROM opportunities WHERE owner_id = $1 AND stage = 'closed_won' AND updated_at >= $2 AND updated_at < $3`, [userId, startDate, endDate])
    ]);
    return { amount: parseFloat(amountRes.rows[0].amount), customers: parseInt(customersRes.rows[0].count, 10), opportunities: parseInt(oppsRes.rows[0].count, 10) };
  }

  async getTeamActuals(year: number, month: number): Promise<{ amount: number; customers: number; opportunities: number }> {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const [amountRes, customersRes, oppsRes] = await Promise.all([
      pool.query(`SELECT COALESCE(SUM(total_amount), 0) as amount FROM orders WHERE status = 'completed' AND created_at >= $1 AND created_at < $2`, [startDate, endDate]),
      pool.query(`SELECT COUNT(*) as count FROM customers WHERE created_at >= $1 AND created_at < $2`, [startDate, endDate]),
      pool.query(`SELECT COUNT(*) as count FROM opportunities WHERE stage = 'closed_won' AND updated_at >= $1 AND updated_at < $2`, [startDate, endDate])
    ]);
    return { amount: parseFloat(amountRes.rows[0].amount), customers: parseInt(customersRes.rows[0].count, 10), opportunities: parseInt(oppsRes.rows[0].count, 10) };
  }

  async getYearlyTrend(userId: string, year: number): Promise<{ month: number; target: number; actual: number }[]> { // 获取年度趋势
    const result: { month: number; target: number; actual: number }[] = [];
    for (let m = 1; m <= 12; m++) {
      const target = await this.findUserTarget(userId, year, m);
      const actuals = await this.getUserActuals(userId, year, m);
      result.push({ month: m, target: target?.target_amount || 0, actual: actuals.amount });
    }
    return result;
  }

  async getTeamRanking(year: number, month: number): Promise<{ user_id: string; user_name: string; target: number; actual: number; rate: number }[]> { // 获取团队排行榜
    const targets = await this.getAllUserTargets(year, month);
    const ranking = await Promise.all(targets.map(async t => {
      const actuals = await this.getUserActuals(t.user_id, year, month);
      const rate = t.target_amount > 0 ? Math.round((actuals.amount / t.target_amount) * 100) : 0;
      return { user_id: t.user_id, user_name: t.user_name || '', target: t.target_amount, actual: actuals.amount, rate };
    }));
    return ranking.sort((a, b) => b.rate - a.rate); // 按完成率降序
  }

  async batchSetTargets(data: { user_id: string; target_amount: number }[], year: number, month: number, createdBy: string): Promise<number> { // 批量设置目标
    let count = 0;
    for (const item of data) {
      await this.upsertUserTarget({ user_id: item.user_id, year, month, target_amount: item.target_amount, created_by: createdBy });
      count++;
    }
    return count;
  }
}

export const salesTargetRepository = new SalesTargetRepository();
