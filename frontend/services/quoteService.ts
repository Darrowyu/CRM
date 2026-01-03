import api from './api';

export interface Quote {
  id: string;
  quote_number: string;
  customer_id: string;
  customer_name?: string;
  opportunity_id?: string;
  total_amount: number;
  status: string;
  requires_approval: boolean;
  created_by: string;
  created_by_name?: string;
  approved_by?: string;
  rejection_reason?: string;
  created_at: string;
  items?: QuoteItem[];
  approval_logs?: ApprovalLog[];
}

export interface QuoteItem {
  id: string;
  quote_id: string;
  product_id: string;
  product_name?: string;
  product_sku?: string;
  quantity: number;
  unit_price: number;
  total: number;
  is_manual_price: boolean;
}

export interface ApprovalLog {
  id: string;
  quote_id: string;
  approver_id: string;
  approver_name?: string;
  action: 'approve' | 'reject';
  comment?: string;
  created_at: string;
}

export interface CreateQuoteDTO {
  customer_id: string;
  opportunity_id?: string;
  items: { product_id: string; quantity: number; unit_price: number; calculated_price?: number }[];
}

export interface QuoteStatistics {
  total: number;
  draft: number;
  pending: number;
  approved: number;
  rejected: number;
  monthAmount: number;
  conversionRate: number;
}

export const quoteService = {
  getAll: async (): Promise<Quote[]> => {
    const res = await api.get('/quotes');
    return res.data;
  },

  getPending: async (): Promise<Quote[]> => {
    const res = await api.get('/quotes?pending=true');
    return res.data;
  },

  getById: async (id: string): Promise<Quote> => {
    const res = await api.get(`/quotes/${id}`);
    return res.data;
  },

  create: async (data: CreateQuoteDTO): Promise<Quote> => {
    const res = await api.post('/quotes', data);
    return res.data;
  },

  approve: async (id: string, comment?: string): Promise<Quote> => {
    const res = await api.post(`/quotes/${id}/approve`, { comment });
    return res.data;
  },

  reject: async (id: string, reason: string): Promise<Quote> => {
    const res = await api.post(`/quotes/${id}/reject`, { reason });
    return res.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/quotes/${id}`);
  },

  convertToOrder: async (id: string): Promise<any> => {
    const res = await api.post(`/quotes/${id}/convert-to-order`);
    return res.data;
  },

  submit: async (id: string): Promise<Quote> => { // 提交审批
    const res = await api.post(`/quotes/${id}/submit`);
    return res.data;
  },

  update: async (id: string, items: { product_id: string; quantity: number; unit_price: number }[]): Promise<Quote> => { // 更新报价单
    const res = await api.put(`/quotes/${id}`, { items });
    return res.data;
  },

  copy: async (id: string): Promise<Quote> => { // 复制报价单
    const res = await api.post(`/quotes/${id}/copy`);
    return res.data;
  },

  getStatistics: async (): Promise<QuoteStatistics> => { // 获取统计数据
    const res = await api.get('/quotes/stats/summary');
    return res.data;
  },

  batchDelete: async (ids: string[]): Promise<{ deleted: number }> => { // 批量删除
    const res = await api.post('/quotes/batch/delete', { ids });
    return res.data;
  },

  batchSubmit: async (ids: string[]): Promise<{ submitted: number }> => { // 批量提交
    const res = await api.post('/quotes/batch/submit', { ids });
    return res.data;
  },
};
