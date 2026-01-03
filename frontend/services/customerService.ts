import api from './api';

export interface Contact {
  id: string;
  customer_id?: string;
  name: string;
  phone: string;
  email?: string;
  role?: string;
  is_primary?: boolean;
}

export interface FollowUp {
  id: string;
  customer_id: string;
  opportunity_id?: string;
  user_id: string;
  content: string;
  type: 'call' | 'visit' | 'email' | 'other';
  created_at: string;
  user_name?: string;
}

export interface Opportunity {
  id: string;
  customer_id: string;
  name: string;
  amount: number;
  stage: string;
  probability: number;
  expected_close_date?: string;
}

export interface Quote {
  id: string;
  quote_number: string;
  customer_id: string;
  total_amount: number;
  status: string;
  created_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  total_amount: number;
  status: string;
  payment_status: string;
  created_at: string;
}

export interface Customer {
  id: string;
  company_name: string;
  industry?: string;
  region?: string;
  status: 'private' | 'public_pool';
  owner_id?: string;
  owner_name?: string;
  last_contact_date?: string;
  source?: string;
  tags?: string[];
  score?: number;
  contacts?: Contact[];
  opportunities?: Opportunity[];
  quotes?: Quote[];
  orders?: Order[];
  follow_ups?: FollowUp[];
  created_at?: string;
  updated_at?: string;
}


export interface CreateCustomerDTO {
  company_name: string;
  contact_name: string;
  phone: string;
  email?: string;
  industry?: string;
  region?: string;
  source?: string;
  contact_role?: string;
}

export interface CreateFollowUpDTO {
  customer_id: string;
  content: string;
  type: 'call' | 'visit' | 'email' | 'other';
  opportunity_id?: string;
}

export interface CustomerFilter {
  industry?: string;
  region?: string;
  source?: string;
  search?: string;
}

export const customerService = {
  getPrivatePool: async (filter?: CustomerFilter): Promise<Customer[]> => { // 获取私海客户
    const params = new URLSearchParams({ type: 'private', ...filter });
    const res = await api.get(`/customers?${params}`);
    return res.data;
  },
  
  getPublicPool: async (filter?: CustomerFilter): Promise<Customer[]> => { // 获取公海客户
    const params = new URLSearchParams({ type: 'public', ...filter });
    const res = await api.get(`/customers?${params}`);
    return res.data;
  },

  getById: async (id: string): Promise<Customer> => { // 获取客户详情(含关联数据)
    const res = await api.get(`/customers/${id}/detail`);
    return res.data;
  },
  
  create: async (data: CreateCustomerDTO): Promise<Customer> => { // 创建客户
    const res = await api.post('/customers', data);
    return res.data;
  },

  update: async (id: string, data: Partial<Customer>): Promise<Customer> => { // 更新客户
    const res = await api.put(`/customers/${id}`, data);
    return res.data;
  },
  
  claim: async (customerId: string): Promise<Customer> => { // 领取客户
    const res = await api.post(`/customers/${customerId}/claim`);
    return res.data;
  },
  
  release: async (customerId: string, reason?: string): Promise<Customer> => { // 释放客户
    const res = await api.post(`/customers/${customerId}/release`, { reason });
    return res.data;
  },

  batchClaim: async (ids: string[]): Promise<{ success: number; failed: number }> => { // 批量领取
    const res = await api.post('/customers/batch-claim', { ids });
    return res.data;
  },

  batchRelease: async (ids: string[], reason?: string): Promise<{ success: number; failed: number }> => { // 批量释放
    const res = await api.post('/customers/batch-release', { ids, reason });
    return res.data;
  },

  addFollowUp: async (data: CreateFollowUpDTO): Promise<FollowUp> => { // 添加跟进记录
    const res = await api.post('/follow-ups', data);
    return res.data;
  },

  getFollowUps: async (customerId: string): Promise<FollowUp[]> => { // 获取跟进记录
    const res = await api.get(`/follow-ups?customer_id=${customerId}`);
    return res.data;
  },

  addContact: async (data: Partial<Contact>): Promise<Contact> => { // 添加联系人
    const res = await api.post('/contacts', data);
    return res.data;
  },

  updateContact: async (id: string, data: Partial<Contact>): Promise<Contact> => { // 更新联系人
    const res = await api.put(`/contacts/${id}`, data);
    return res.data;
  },

  deleteContact: async (id: string): Promise<void> => { // 删除联系人
    await api.delete(`/contacts/${id}`);
  },

  setPrimaryContact: async (id: string): Promise<void> => { // 设为主联系人
    await api.post(`/contacts/${id}/set-primary`);
  },

  exportCustomers: async (type: 'private' | 'public'): Promise<Blob> => { // 导出客户
    const res = await api.get(`/customers/export?type=${type}`, { responseType: 'blob' });
    return res.data;
  },

  checkDuplicate: async (companyName: string, phone: string): Promise<{ exists: boolean; field?: string }> => { // 查重
    const res = await api.post('/customers/check-duplicate', { company_name: companyName, phone });
    return res.data;
  },

  checkRelations: async (id: string): Promise<{ hasRelations: boolean; details: { opportunities: number; quotes: number; orders: number } }> => { // 检查关联数据
    const res = await api.get(`/customers/${id}/check-relations`);
    return res.data;
  },

  delete: async (id: string, force = false): Promise<void> => { // 删除客户
    await api.delete(`/customers/${id}${force ? '?force=true' : ''}`);
  },

  batchDelete: async (ids: string[], force = false): Promise<{ success: number; failed: number; errors?: string[] }> => { // 批量删除
    const res = await api.post('/customers/batch-delete', { ids, force });
    return res.data;
  },
};
