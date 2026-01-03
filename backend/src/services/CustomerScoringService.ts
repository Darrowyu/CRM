import { pool } from '../db/connection.js';

export interface CustomerScore {
  customer_id: string; company_name?: string; recency_score: number; frequency_score: number;
  monetary_score: number; total_score: number; grade: string; last_calculated: Date;
}

export class CustomerScoringService {
  // RFM评分计算
  async calculateScores(): Promise<number> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // 计算R分（最近交易时间）
      await client.query(`INSERT INTO customer_scores (customer_id, recency_score)
        SELECT c.id, CASE WHEN MAX(o.created_at) IS NULL THEN 1
          WHEN MAX(o.created_at) > NOW() - INTERVAL '30 days' THEN 5
          WHEN MAX(o.created_at) > NOW() - INTERVAL '90 days' THEN 4
          WHEN MAX(o.created_at) > NOW() - INTERVAL '180 days' THEN 3
          WHEN MAX(o.created_at) > NOW() - INTERVAL '365 days' THEN 2 ELSE 1 END
        FROM customers c LEFT JOIN orders o ON c.id = o.customer_id GROUP BY c.id
        ON CONFLICT (customer_id) DO UPDATE SET recency_score = EXCLUDED.recency_score`);
      // 计算F分（交易频率）
      await client.query(`UPDATE customer_scores cs SET frequency_score = sub.score FROM (
        SELECT c.id, CASE WHEN COUNT(o.id) >= 10 THEN 5 WHEN COUNT(o.id) >= 5 THEN 4
          WHEN COUNT(o.id) >= 3 THEN 3 WHEN COUNT(o.id) >= 1 THEN 2 ELSE 1 END as score
        FROM customers c LEFT JOIN orders o ON c.id = o.customer_id GROUP BY c.id) sub WHERE cs.customer_id = sub.id`);
      // 计算M分（交易金额）
      await client.query(`UPDATE customer_scores cs SET monetary_score = sub.score FROM (
        SELECT c.id, CASE WHEN COALESCE(SUM(o.total_amount), 0) >= 100000 THEN 5
          WHEN COALESCE(SUM(o.total_amount), 0) >= 50000 THEN 4 WHEN COALESCE(SUM(o.total_amount), 0) >= 20000 THEN 3
          WHEN COALESCE(SUM(o.total_amount), 0) >= 5000 THEN 2 ELSE 1 END as score
        FROM customers c LEFT JOIN orders o ON c.id = o.customer_id GROUP BY c.id) sub WHERE cs.customer_id = sub.id`);
      // 计算总分和等级
      await client.query(`UPDATE customer_scores SET total_score = recency_score + frequency_score + monetary_score,
        grade = CASE WHEN recency_score + frequency_score + monetary_score >= 13 THEN 'A'
          WHEN recency_score + frequency_score + monetary_score >= 10 THEN 'B'
          WHEN recency_score + frequency_score + monetary_score >= 7 THEN 'C' ELSE 'D' END,
        last_calculated = NOW()`);
      await client.query('COMMIT');
      const result = await client.query('SELECT COUNT(*) FROM customer_scores');
      return parseInt(result.rows[0].count, 10);
    } catch (err) { await client.query('ROLLBACK'); throw err; }
    finally { client.release(); }
  }

  async getScores(filters?: { grade?: string; limit?: number }): Promise<CustomerScore[]> {
    let query = `SELECT cs.*, c.company_name FROM customer_scores cs LEFT JOIN customers c ON cs.customer_id = c.id WHERE 1=1`;
    const params: unknown[] = [];
    if (filters?.grade) { params.push(filters.grade); query += ` AND cs.grade = $${params.length}`; }
    query += ' ORDER BY cs.total_score DESC';
    if (filters?.limit) { params.push(filters.limit); query += ` LIMIT $${params.length}`; }
    const result = await pool.query(query, params);
    return result.rows;
  }

  async getCustomerScore(customerId: string): Promise<CustomerScore | null> {
    const result = await pool.query(`SELECT cs.*, c.company_name FROM customer_scores cs LEFT JOIN customers c ON cs.customer_id = c.id WHERE cs.customer_id = $1`, [customerId]);
    return result.rows[0] || null;
  }

  async getGradeDistribution(): Promise<{ grade: string; count: number }[]> {
    const result = await pool.query(`SELECT grade, COUNT(*) as count FROM customer_scores GROUP BY grade ORDER BY grade`);
    return result.rows;
  }
}

export const customerScoringService = new CustomerScoringService();
