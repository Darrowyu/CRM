export enum UserRole { // 用户角色（与后端保持一致）
  SALES_REP = 'sales_rep',
  SALES_MANAGER = 'sales_manager',
  FINANCE = 'finance',
  ADMIN = 'admin',
}

export enum CustomerStatus { // 客户状态
  PRIVATE = 'private',
  PUBLIC_POOL = 'public_pool',
}

export enum OpportunityStage { // 商机阶段
  PROSPECTING = 'prospecting',
  QUALIFICATION = 'qualification',
  PROPOSAL = 'proposal',
  NEGOTIATION = 'negotiation',
  CLOSED_WON = 'closed_won',
  CLOSED_LOST = 'closed_lost',
}

export enum QuoteStatus { // 报价单状态
  DRAFT = 'draft',
  PENDING_MANAGER = 'pending_manager',
  PENDING_DIRECTOR = 'pending_director',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  SENT = 'sent',
}

export enum LeadSource { // 线索来源
  EXHIBITION = 'exhibition',
  WEBSITE = 'website',
  REFERRAL = 'referral',
  OTHER = 'other',
}

export enum FollowUpType { // 跟进类型
  CALL = 'call',
  VISIT = 'visit',
  EMAIL = 'email',
  OTHER = 'other',
}

export interface Contact { // 联系人
  id: string;
  name: string;
  phone: string;
  email?: string;
  role?: string;
  is_primary?: boolean;
}

export interface Customer { // 客户
  id: string;
  company_name: string;
  industry?: string;
  region?: string;
  status: CustomerStatus;
  owner_id?: string;
  owner_name?: string;
  last_contact_date?: string;
  source?: LeadSource;
  contacts?: Contact[];
  created_at?: string;
  updated_at?: string;
}

export interface Opportunity { // 商机
  id: string;
  customer_id: string;
  customer_name?: string;
  name: string;
  amount: number;
  stage: OpportunityStage;
  probability: number;
  expected_close_date?: string;
  owner_id?: string;
  owner_name?: string;
  created_at?: string;
}

export interface QuoteItem { // 报价项
  id?: string;
  product_id: string;
  product_name?: string;
  product_sku?: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface Quote { // 报价单
  id: string;
  quote_number: string;
  customer_id: string;
  customer_name?: string;
  opportunity_id?: string;
  items?: QuoteItem[];
  total_amount: number;
  status: QuoteStatus;
  created_by?: string;
  created_by_name?: string;
  rejection_reason?: string;
  approval_logs?: ApprovalLog[];
  created_at?: string;
}

export interface ApprovalLog { // 审批日志
  id: string;
  action: 'approve' | 'reject';
  approver_id: string;
  approver_name?: string;
  comment?: string;
  created_at: string;
}

export interface FollowUp { // 跟进记录
  id: string;
  customer_id: string;
  opportunity_id?: string;
  user_id: string;
  user_name?: string;
  content: string;
  type: FollowUpType;
  created_at: string;
}

export interface User { // 用户
  id: string;
  username: string;
  name: string;
  role: UserRole;
}
