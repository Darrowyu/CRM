import api from './api';

export interface Opportunity {
  id: string;
  customer_id: string;
  customer_name?: string;
  owner_name?: string;
  name: string;
  amount?: number;
  stage: string;
  probability: number;
  expected_close_date?: string;
  loss_reason?: string;
  owner_id?: string;
  created_at?: string;
}

export interface CreateOpportunityDTO {
  customer_id: string;
  name: string;
  amount?: number;
  expected_close_date?: string;
}

export interface StageSummary {
  stage: string;
  count: number;
  total_amount: number;
}

export const opportunityService = {
  getAll: async (): Promise<Opportunity[]> => { // 获取当前用户商机
    const res = await api.get('/opportunities');
    return res.data;
  },

  getAllWithCustomer: async (): Promise<Opportunity[]> => { // 获取所有商机(含客户信息)
    const res = await api.get('/opportunities?all=true');
    return res.data;
  },

  getSummary: async (): Promise<StageSummary[]> => { // 获取各阶段汇总
    const res = await api.get('/opportunities/summary');
    return res.data;
  },
  
  getByCustomer: async (customerId: string): Promise<Opportunity[]> => {
    const res = await api.get(`/opportunities?customer_id=${customerId}`);
    return res.data;
  },

  getById: async (id: string): Promise<Opportunity> => {
    const res = await api.get(`/opportunities/${id}`);
    return res.data;
  },
  
  create: async (data: CreateOpportunityDTO): Promise<Opportunity> => {
    const res = await api.post('/opportunities', data);
    return res.data;
  },

  update: async (id: string, data: Partial<Opportunity>): Promise<Opportunity> => {
    const res = await api.put(`/opportunities/${id}`, data);
    return res.data;
  },
  
  updateStage: async (id: string, stage: string, lossReason?: string): Promise<Opportunity> => {
    const res = await api.put(`/opportunities/${id}/stage`, { stage, loss_reason: lossReason });
    return res.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/opportunities/${id}`);
  },

  getFollowUps: async (opportunityId: string): Promise<FollowUp[]> => { // 获取商机跟进记录
    const res = await api.get(`/follow-ups?opportunity_id=${opportunityId}`);
    return res.data;
  },

  addFollowUp: async (data: { opportunity_id: string; customer_id: string; content: string; type: string }): Promise<FollowUp> => {
    const res = await api.post('/follow-ups', data);
    return res.data;
  },

  getQuotes: async (opportunityId: string): Promise<Quote[]> => { // 获取商机关联报价
    const res = await api.get(`/quotes?opportunity_id=${opportunityId}`);
    return res.data;
  },
};

export interface FollowUp {
  id: string;
  customer_id: string;
  opportunity_id?: string;
  user_id: string;
  user_name?: string;
  content: string;
  type: string;
  created_at: string;
}

export interface Quote {
  id: string;
  quote_number: string;
  customer_id: string;
  customer_name?: string;
  opportunity_id?: string;
  total_amount: number;
  status: string;
  created_at: string;
}
