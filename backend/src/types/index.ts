// 用户角色枚举
export enum UserRole {
  SALES_REP = 'sales_rep',
  SALES_MANAGER = 'sales_manager',
  FINANCE = 'finance',
  ADMIN = 'admin'
}

// 客户状态枚举
export enum CustomerStatus {
  PRIVATE = 'private',
  PUBLIC_POOL = 'public_pool'
}

// 商机阶段枚举
export enum OpportunityStage {
  PROSPECTING = 'prospecting',
  QUALIFICATION = 'qualification',
  PROPOSAL = 'proposal',
  NEGOTIATION = 'negotiation',
  CLOSED_WON = 'closed_won',
  CLOSED_LOST = 'closed_lost'
}

// 报价单状态枚举
export enum QuoteStatus {
  DRAFT = 'draft',
  PENDING_MANAGER = 'pending_manager',
  PENDING_DIRECTOR = 'pending_director',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  SENT = 'sent'
}

// 线索来源枚举
export enum LeadSource {
  EXHIBITION = 'exhibition',
  WEBSITE = 'website',
  REFERRAL = 'referral',
  OTHER = 'other'
}

// 跟进类型枚举
export enum FollowUpType {
  CALL = 'call',
  VISIT = 'visit',
  EMAIL = 'email',
  OTHER = 'other'
}

// 订单状态枚举
export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  SHIPPED = 'shipped',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

// 支付状态枚举
export enum PaymentStatus {
  UNPAID = 'unpaid',
  PARTIAL = 'partial',
  PAID = 'paid'
}
