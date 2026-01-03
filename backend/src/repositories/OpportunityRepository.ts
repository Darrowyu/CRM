import { BaseRepository } from './BaseRepository.js';
import { Opportunity, CreateOpportunityDTO, STAGE_PROBABILITY, isValidTransition } from '../models/Opportunity.js';
import { query } from '../db/connection.js';
import { OpportunityStage } from '../types/index.js';

export class OpportunityRepository extends BaseRepository<Opportunity> {
  constructor() {
    super('opportunities');
  }

  async createOpportunity(data: CreateOpportunityDTO): Promise<Opportunity> { // 创建商机，默认阶段为prospecting
    return this.create({
      ...data,
      stage: OpportunityStage.PROSPECTING,
      probability: STAGE_PROBABILITY[OpportunityStage.PROSPECTING]
    } as Partial<Opportunity>);
  }

  async updateStage(id: string, newStage: OpportunityStage, lossReason?: string): Promise<{ success: boolean; error?: string; opportunity?: Opportunity }> {
    const opportunity = await this.findById(id);
    if (!opportunity) return { success: false, error: 'NOT_FOUND' };

    if (!isValidTransition(opportunity.stage, newStage)) {
      return { success: false, error: 'INVALID_STAGE_TRANSITION' };
    }

    if (newStage === OpportunityStage.CLOSED_LOST && !lossReason) {
      return { success: false, error: 'LOSS_REASON_REQUIRED' };
    }

    const updated = await this.update(id, {
      stage: newStage,
      probability: STAGE_PROBABILITY[newStage],
      loss_reason: lossReason
    } as Partial<Opportunity>);

    return { success: true, opportunity: updated! };
  }

  async findByCustomer(customerId: string): Promise<Opportunity[]> { // 查询客户的所有商机
    const result = await query(
      'SELECT * FROM opportunities WHERE customer_id = $1 ORDER BY created_at DESC',
      [customerId]
    );
    return result.rows;
  }

  async findByOwner(ownerId: string): Promise<Opportunity[]> { // 查询销售的所有商机
    const result = await query(
      `SELECT o.*, c.company_name as customer_name, u.name as owner_name 
       FROM opportunities o 
       LEFT JOIN customers c ON o.customer_id = c.id 
       LEFT JOIN users u ON o.owner_id = u.id 
       WHERE o.owner_id = $1 ORDER BY o.updated_at DESC`,
      [ownerId]
    );
    return result.rows;
  }

  async findAllWithCustomer(): Promise<Opportunity[]> { // 查询所有商机(含客户信息)
    const result = await query(
      `SELECT o.*, c.company_name as customer_name, u.name as owner_name 
       FROM opportunities o 
       LEFT JOIN customers c ON o.customer_id = c.id 
       LEFT JOIN users u ON o.owner_id = u.id 
       ORDER BY o.updated_at DESC`
    );
    return result.rows;
  }

  async getStageSummary(): Promise<{ stage: string; count: number; total_amount: number }[]> { // 各阶段汇总
    const result = await query(
      `SELECT stage, COUNT(*)::int as count, COALESCE(SUM(amount), 0)::numeric as total_amount 
       FROM opportunities WHERE stage NOT IN ('closed_won', 'closed_lost') GROUP BY stage`
    );
    return result.rows;
  }

  async findByStage(stage: OpportunityStage): Promise<Opportunity[]> { // 按阶段查询
    const result = await query('SELECT * FROM opportunities WHERE stage = $1', [stage]);
    return result.rows;
  }
}

export const opportunityRepository = new OpportunityRepository();
