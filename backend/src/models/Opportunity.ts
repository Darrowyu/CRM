import { OpportunityStage } from '../types/index.js';

export interface Opportunity {
  id: string;
  customer_id: string;
  name: string;
  amount?: number;
  stage: OpportunityStage;
  probability: number;
  expected_close_date?: Date;
  loss_reason?: string;
  owner_id?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface CreateOpportunityDTO {
  customer_id: string;
  name: string;
  amount?: number;
  expected_close_date?: Date;
  owner_id?: string;
}

// 有效的阶段转换规则（允许自由拖拽，但成交/丢单后不可变更）
export const VALID_STAGE_TRANSITIONS: Record<OpportunityStage, OpportunityStage[]> = {
  [OpportunityStage.PROSPECTING]: [OpportunityStage.QUALIFICATION, OpportunityStage.PROPOSAL, OpportunityStage.NEGOTIATION, OpportunityStage.CLOSED_WON, OpportunityStage.CLOSED_LOST],
  [OpportunityStage.QUALIFICATION]: [OpportunityStage.PROSPECTING, OpportunityStage.PROPOSAL, OpportunityStage.NEGOTIATION, OpportunityStage.CLOSED_WON, OpportunityStage.CLOSED_LOST],
  [OpportunityStage.PROPOSAL]: [OpportunityStage.PROSPECTING, OpportunityStage.QUALIFICATION, OpportunityStage.NEGOTIATION, OpportunityStage.CLOSED_WON, OpportunityStage.CLOSED_LOST],
  [OpportunityStage.NEGOTIATION]: [OpportunityStage.PROSPECTING, OpportunityStage.QUALIFICATION, OpportunityStage.PROPOSAL, OpportunityStage.CLOSED_WON, OpportunityStage.CLOSED_LOST],
  [OpportunityStage.CLOSED_WON]: [],
  [OpportunityStage.CLOSED_LOST]: []
};

// 阶段对应的成交概率
export const STAGE_PROBABILITY: Record<OpportunityStage, number> = {
  [OpportunityStage.PROSPECTING]: 10,
  [OpportunityStage.QUALIFICATION]: 25,
  [OpportunityStage.PROPOSAL]: 50,
  [OpportunityStage.NEGOTIATION]: 75,
  [OpportunityStage.CLOSED_WON]: 100,
  [OpportunityStage.CLOSED_LOST]: 0
};

export const isValidTransition = (from: OpportunityStage, to: OpportunityStage): boolean => { // 验证阶段转换
  return VALID_STAGE_TRANSITIONS[from]?.includes(to) ?? false;
};
