export enum ContractStatus { DRAFT = 'draft', PENDING = 'pending', ACTIVE = 'active', EXPIRED = 'expired', TERMINATED = 'terminated' }
export enum PaymentPlanStatus { PENDING = 'pending', PARTIAL = 'partial', COMPLETED = 'completed', OVERDUE = 'overdue' }
export enum ThreatLevel { LOW = 'low', MEDIUM = 'medium', HIGH = 'high' }

export interface Contract {
  id: string; contract_number: string; order_id?: string; customer_id: string; customer_name?: string;
  title: string; amount: number; start_date?: string; end_date?: string; status: ContractStatus;
  signed_date?: string; file_url?: string; reminder_days: number; created_at: string;
}

export interface PaymentPlan {
  id: string; order_id: string; contract_id?: string; customer_id: string; customer_name?: string;
  plan_amount: number; plan_date: string; actual_amount: number; actual_date?: string;
  status: PaymentPlanStatus; remark?: string; created_at: string;
}

export interface Competitor {
  id: string; name: string; website?: string; description?: string; strengths?: string; weaknesses?: string; created_at: string; opportunity_count?: number;
}

export interface OpportunityCompetitor {
  id: string; opportunity_id: string; competitor_id: string; competitor_name?: string; threat_level: ThreatLevel; notes?: string;
}

export interface PaymentStats { total_planned: number; total_received: number; overdue_count: number; overdue_amount: number; month_received: number; pending_count: number; collection_rate: number; }

export interface ContractStats { total: number; active: number; expiring7: number; expiring30: number; expired: number; monthNew: number; totalAmount: number; }

export interface CompetitorStats { total: number; highThreat: number; mediumThreat: number; lowThreat: number; totalOpportunities: number; topCompetitors: { name: string; count: number }[]; }
