import { pool } from '../db/connection.js';
import { Competitor, OpportunityCompetitor } from '../types/contracts';

export class CompetitorRepository {
  async findAll(): Promise<Competitor[]> {
    const result = await pool.query(`SELECT c.*, (SELECT COUNT(*) FROM opportunity_competitors oc WHERE oc.competitor_id = c.id) as opportunity_count FROM competitors c ORDER BY name`);
    return result.rows;
  }

  async getStats(): Promise<{ total: number; highThreat: number; mediumThreat: number; lowThreat: number; totalOpportunities: number; topCompetitors: { name: string; count: number }[] }> {
    const [total, threats, top] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM competitors'),
      pool.query(`SELECT threat_level, COUNT(*) as count FROM opportunity_competitors GROUP BY threat_level`),
      pool.query(`SELECT c.name, COUNT(oc.id) as count FROM competitors c LEFT JOIN opportunity_competitors oc ON c.id = oc.competitor_id GROUP BY c.id, c.name ORDER BY count DESC LIMIT 5`)
    ]);
    const threatMap: Record<string, number> = {}; threats.rows.forEach((r: { threat_level: string; count: string }) => threatMap[r.threat_level] = parseInt(r.count));
    return { total: parseInt(total.rows[0].count), highThreat: threatMap['high'] || 0, mediumThreat: threatMap['medium'] || 0, lowThreat: threatMap['low'] || 0,
      totalOpportunities: Object.values(threatMap).reduce((a, b) => a + b, 0), topCompetitors: top.rows.map((r: { name: string; count: string }) => ({ name: r.name, count: parseInt(r.count) })) };
  }

  async batchDelete(ids: string[]): Promise<number> { // 批量删除
    await pool.query('DELETE FROM opportunity_competitors WHERE competitor_id = ANY($1)', [ids]);
    const result = await pool.query('DELETE FROM competitors WHERE id = ANY($1)', [ids]);
    return result.rowCount || 0;
  }

  async getCompetitorOpportunities(competitorId: string): Promise<{ id: string; name: string; threat_level: string; customer_name: string; amount: number }[]> { // 获取竞争对手关联商机
    const result = await pool.query(`SELECT o.id, o.name, oc.threat_level, c.company_name as customer_name, o.estimated_amount as amount
      FROM opportunity_competitors oc JOIN opportunities o ON oc.opportunity_id = o.id LEFT JOIN customers c ON o.customer_id = c.id WHERE oc.competitor_id = $1 ORDER BY o.created_at DESC`, [competitorId]);
    return result.rows;
  }

  async findById(id: string): Promise<Competitor | null> {
    const result = await pool.query('SELECT * FROM competitors WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  async create(data: Partial<Competitor>): Promise<Competitor> {
    const result = await pool.query(`INSERT INTO competitors (name, website, description, strengths, weaknesses, created_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [data.name, data.website, data.description, data.strengths, data.weaknesses, data.created_by]);
    return result.rows[0];
  }

  async update(id: string, data: Partial<Competitor>): Promise<Competitor | null> {
    const fields: string[] = []; const values: unknown[] = [];
    const allowed = ['name', 'website', 'description', 'strengths', 'weaknesses'];
    for (const key of allowed) { if (data[key as keyof Competitor] !== undefined) { values.push(data[key as keyof Competitor]); fields.push(`${key} = $${values.length}`); } }
    if (fields.length === 0) return this.findById(id);
    fields.push('updated_at = NOW()'); values.push(id);
    const result = await pool.query(`UPDATE competitors SET ${fields.join(', ')} WHERE id = $${values.length} RETURNING *`, values);
    return result.rows[0] || null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await pool.query('DELETE FROM competitors WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  async getOpportunityCompetitors(opportunityId: string): Promise<OpportunityCompetitor[]> {
    const result = await pool.query(`SELECT oc.*, c.name as competitor_name FROM opportunity_competitors oc LEFT JOIN competitors c ON oc.competitor_id = c.id WHERE oc.opportunity_id = $1`, [opportunityId]);
    return result.rows;
  }

  async addOpportunityCompetitor(data: { opportunity_id: string; competitor_id: string; threat_level?: string; notes?: string }): Promise<OpportunityCompetitor> {
    const result = await pool.query(`INSERT INTO opportunity_competitors (opportunity_id, competitor_id, threat_level, notes) VALUES ($1, $2, $3, $4)
      ON CONFLICT (opportunity_id, competitor_id) DO UPDATE SET threat_level = $3, notes = $4 RETURNING *`,
      [data.opportunity_id, data.competitor_id, data.threat_level || 'medium', data.notes]);
    return result.rows[0];
  }

  async removeOpportunityCompetitor(opportunityId: string, competitorId: string): Promise<boolean> {
    const result = await pool.query('DELETE FROM opportunity_competitors WHERE opportunity_id = $1 AND competitor_id = $2', [opportunityId, competitorId]);
    return (result.rowCount ?? 0) > 0;
  }
}

export const competitorRepository = new CompetitorRepository();
