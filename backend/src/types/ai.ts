export interface CustomerForAI { // AI服务用客户类型
  id: string;
  company_name: string;
  industry?: string;
  source?: string;
  grade?: string;
  order_count?: number;
}

export interface OrderForAI { // AI服务用订单类型
  id: string;
  total_amount: number;
  created_at: string;
}

export interface FollowUpForAI { // AI服务用跟进类型
  id: string;
  content: string;
  created_at: string;
}

export interface OpportunityForAI { // AI服务用商机类型
  id: string;
  name: string;
  amount: number;
  stage: string;
  probability?: number;
  expected_close_date?: string;
  customer_name?: string;
}

export interface ContractForAI { // AI服务用合同类型
  id: string;
  amount: number;
  start_date: string;
  end_date: string;
  payment_terms?: string;
}

export interface ProductForQuote { // 报价用产品类型
  name: string;
  quantity: number;
}

export interface QuoteForAI { // AI服务用报价类型
  id: string;
  discount?: number;
}

export interface PipelineSummary { // 销售管道摘要
  totalActive: number;
  totalAmount: number;
  closedWonCount: number;
  closedWonAmount: number;
  closedLostCount: number;
}
