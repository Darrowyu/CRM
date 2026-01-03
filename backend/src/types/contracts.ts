// 合同状态枚举
export enum ContractStatus { DRAFT = 'draft', PENDING = 'pending', ACTIVE = 'active', EXPIRED = 'expired', TERMINATED = 'terminated' }
// 回款状态枚举
export enum PaymentPlanStatus { PENDING = 'pending', PARTIAL = 'partial', COMPLETED = 'completed', OVERDUE = 'overdue' }
// 威胁等级枚举
export enum ThreatLevel { LOW = 'low', MEDIUM = 'medium', HIGH = 'high' }

export interface Contract {
  id: string; contract_number: string; order_id?: string; customer_id: string; customer_name?: string;
  title: string; amount: number; start_date?: string; end_date?: string; status: ContractStatus;
  signed_date?: string; file_url?: string; reminder_days: number; created_by?: string; created_at: string;
}

export interface PaymentPlan {
  id: string; order_id: string; contract_id?: string; customer_id: string; customer_name?: string;
  plan_amount: number; plan_date: string; actual_amount: number; actual_date?: string;
  status: PaymentPlanStatus; remark?: string; created_at: string;
}

export interface Competitor {
  id: string; name: string; website?: string; description?: string;
  strengths?: string; weaknesses?: string; created_by?: string; created_at: string;
}

export interface OpportunityCompetitor {
  id: string; opportunity_id: string; competitor_id: string; competitor_name?: string;
  threat_level: ThreatLevel; notes?: string; created_at: string;
}
