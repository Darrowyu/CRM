import { pool } from '../db/connection.js';

export interface Forecast {
  id: string; user_id: string; user_name?: string; year: number; month: number;
  forecast_amount: number; confidence_level: string; notes?: string; actual_amount?: number;
}

export interface ForecastSummary {
  total_forecast: number; total_actual: number; accuracy: number; by_stage: { stage: string; amount: number; probability: number }[];
}

export interface FunnelData { stage: string; count: number; amount: number; conversion_rate: number; avg_days: number; }
export interface TrendData { period: string; forecast: number; actual: number; accuracy: number; }
export interface RankingData { user_id: string; user_name: string; amount: number; target: number; rate: number; rank: number; }
export interface AlertData { type: string; level: string; message: string; data?: unknown; }

export class ForecastService {
  // 基于漏斗的销售预测
  async generateForecast(userId: string, year: number, month: number): Promise<number> {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, '0')}-01`;
    // 基于商机阶段和概率计算预测
    const result = await pool.query(`SELECT COALESCE(SUM(amount * probability / 100), 0) as forecast
      FROM opportunities WHERE owner_id = $1 AND stage NOT IN ('closed_won', 'closed_lost')
      AND (expected_close_date IS NULL OR (expected_close_date >= $2 AND expected_close_date < $3))`, [userId, startDate, endDate]);
    const forecast = parseFloat(result.rows[0].forecast);
    // 保存预测
    await pool.query(`INSERT INTO sales_forecasts (user_id, year, month, forecast_amount, confidence_level)
      VALUES ($1, $2, $3, $4, 'medium') ON CONFLICT (user_id, year, month) DO UPDATE SET forecast_amount = $4`, [userId, year, month, forecast]);
    return forecast;
  }

  async getForecast(userId: string, year: number, month: number): Promise<Forecast | null> {
    const result = await pool.query(`SELECT sf.*, u.name as user_name FROM sales_forecasts sf LEFT JOIN users u ON sf.user_id = u.id WHERE sf.user_id = $1 AND sf.year = $2 AND sf.month = $3`, [userId, year, month]);
    return result.rows[0] || null;
  }

  async getTeamForecast(year: number, month: number): Promise<Forecast[]> {
    const result = await pool.query(`SELECT sf.*, u.name as user_name FROM sales_forecasts sf LEFT JOIN users u ON sf.user_id = u.id WHERE sf.year = $1 AND sf.month = $2 ORDER BY sf.forecast_amount DESC`, [year, month]);
    return result.rows;
  }

  async getForecastSummary(userId?: string): Promise<ForecastSummary> {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    let forecastQuery = `SELECT COALESCE(SUM(forecast_amount), 0) as total FROM sales_forecasts WHERE year = $1 AND month = $2`;
    let actualQuery = `SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE status = 'completed' AND EXTRACT(YEAR FROM created_at) = $1 AND EXTRACT(MONTH FROM created_at) = $2`;
    const params: unknown[] = [year, month];
    if (userId) { forecastQuery += ` AND user_id = $3`; actualQuery += ` AND customer_id IN (SELECT id FROM customers WHERE owner_id = $3)`; params.push(userId); }
    const [forecastRes, actualRes, stageRes] = await Promise.all([
      pool.query(forecastQuery, params),
      pool.query(actualQuery, params),
      pool.query(`SELECT stage, COALESCE(SUM(amount), 0) as amount, AVG(probability) as probability FROM opportunities WHERE stage NOT IN ('closed_won', 'closed_lost') ${userId ? 'AND owner_id = $1' : ''} GROUP BY stage`, userId ? [userId] : [])
    ]);
    const total_forecast = parseFloat(forecastRes.rows[0].total);
    const total_actual = parseFloat(actualRes.rows[0].total);
    return { total_forecast, total_actual, accuracy: total_forecast > 0 ? Math.round((total_actual / total_forecast) * 100) : 0, by_stage: stageRes.rows };
  }

  async setManualForecast(userId: string, year: number, month: number, amount: number, confidence: string, notes?: string): Promise<Forecast> {
    const result = await pool.query(`INSERT INTO sales_forecasts (user_id, year, month, forecast_amount, confidence_level, notes)
      VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (user_id, year, month) DO UPDATE SET forecast_amount = $4, confidence_level = $5, notes = $6 RETURNING *`,
      [userId, year, month, amount, confidence, notes]);
    return result.rows[0];
  }

  async getFunnelAnalysis(): Promise<FunnelData[]> { // 销售漏斗转化率分析
    const stages = ['prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won'];
    const result = await pool.query(`SELECT stage, COUNT(*) as count, COALESCE(SUM(amount), 0) as amount,
      AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400)::int as avg_days FROM opportunities GROUP BY stage`);
    const stageMap: Record<string, { count: number; amount: number; avg_days: number }> = {};
    result.rows.forEach((r: { stage: string; count: string; amount: string; avg_days: number }) => stageMap[r.stage] = { count: parseInt(r.count), amount: parseFloat(r.amount), avg_days: r.avg_days || 0 });
    return stages.map((stage, i) => {
      const curr = stageMap[stage] || { count: 0, amount: 0, avg_days: 0 };
      const prev = i > 0 ? (stageMap[stages[i - 1]]?.count || 1) : curr.count;
      return { stage, count: curr.count, amount: curr.amount, conversion_rate: prev > 0 ? Math.round((curr.count / prev) * 100) : 0, avg_days: curr.avg_days };
    });
  }

  async getTrendAnalysis(months: number = 6): Promise<TrendData[]> { // 趋势分析
    const result = await pool.query(`SELECT TO_CHAR(date_trunc('month', sf.created_at), 'YYYY-MM') as period,
      COALESCE(SUM(sf.forecast_amount), 0) as forecast, COALESCE(SUM(o.total_amount), 0) as actual
      FROM sales_forecasts sf LEFT JOIN orders o ON EXTRACT(YEAR FROM o.created_at) = sf.year AND EXTRACT(MONTH FROM o.created_at) = sf.month AND o.status = 'completed'
      WHERE sf.created_at >= NOW() - INTERVAL '${months} months' GROUP BY period ORDER BY period`);
    return result.rows.map((r: { period: string; forecast: string; actual: string }) => ({
      period: r.period, forecast: parseFloat(r.forecast), actual: parseFloat(r.actual),
      accuracy: parseFloat(r.forecast) > 0 ? Math.round((parseFloat(r.actual) / parseFloat(r.forecast)) * 100) : 0
    }));
  }

  async getSalesRanking(year?: number, month?: number): Promise<RankingData[]> { // 销售排行榜
    const y = year || new Date().getFullYear(); const m = month || new Date().getMonth() + 1;
    const result = await pool.query(`SELECT u.id as user_id, u.name as user_name, COALESCE(SUM(o.total_amount), 0) as amount,
      COALESCE(st.target_amount, 0) as target FROM users u LEFT JOIN orders o ON o.customer_id IN (SELECT id FROM customers WHERE owner_id = u.id)
      AND o.status = 'completed' AND EXTRACT(YEAR FROM o.created_at) = $1 AND EXTRACT(MONTH FROM o.created_at) = $2
      LEFT JOIN sales_targets st ON st.user_id = u.id AND st.year = $1 AND st.month = $2
      WHERE u.role = 'sales_rep' GROUP BY u.id, u.name, st.target_amount ORDER BY amount DESC`, [y, m]);
    return result.rows.map((r: { user_id: string; user_name: string; amount: string; target: string }, i: number) => ({
      user_id: r.user_id, user_name: r.user_name, amount: parseFloat(r.amount), target: parseFloat(r.target),
      rate: parseFloat(r.target) > 0 ? Math.round((parseFloat(r.amount) / parseFloat(r.target)) * 100) : 0, rank: i + 1
    }));
  }

  async getAlerts(): Promise<AlertData[]> { // 智能预警
    const alerts: AlertData[] = [];
    const [lowConv, highRisk, overdue] = await Promise.all([
      pool.query(`SELECT stage, COUNT(*) as count FROM opportunities WHERE stage NOT IN ('closed_won', 'closed_lost')
        AND updated_at < NOW() - INTERVAL '30 days' GROUP BY stage HAVING COUNT(*) > 3`),
      pool.query(`SELECT c.id, c.company_name, cs.grade FROM customers c JOIN customer_scores cs ON c.id = cs.customer_id
        WHERE cs.grade = 'D' AND c.id IN (SELECT customer_id FROM orders WHERE created_at > NOW() - INTERVAL '1 year')`),
      pool.query(`SELECT COUNT(*) as count FROM payment_plans WHERE status IN ('pending', 'partial') AND plan_date < CURRENT_DATE`)
    ]);
    lowConv.rows.forEach((r: { stage: string; count: string }) => alerts.push({ type: 'conversion', level: 'warning', message: `${r.stage}阶段有${r.count}个商机超过30天未推进`, data: r }));
    if (highRisk.rows.length > 0) alerts.push({ type: 'churn', level: 'error', message: `有${highRisk.rows.length}个高价值客户评分降至D级，存在流失风险`, data: highRisk.rows });
    if (parseInt(overdue.rows[0].count) > 0) alerts.push({ type: 'payment', level: 'error', message: `有${overdue.rows[0].count}笔回款已逾期`, data: overdue.rows[0] });
    return alerts;
  }
}

export const forecastService = new ForecastService();
