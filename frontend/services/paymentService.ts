import { PaymentPlan, PaymentStats } from '../types/contracts';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const getHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem('token')}` });

export const paymentService = {
  async getAll(filters?: { order_id?: string; customer_id?: string; status?: string }): Promise<PaymentPlan[]> {
    const params = new URLSearchParams();
    if (filters?.order_id) params.append('order_id', filters.order_id);
    if (filters?.customer_id) params.append('customer_id', filters.customer_id);
    if (filters?.status) params.append('status', filters.status);
    const res = await fetch(`${API_BASE}/payments?${params}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('获取回款计划失败');
    return res.json();
  },

  async getStats(customerId?: string): Promise<PaymentStats> {
    const params = customerId ? `?customer_id=${customerId}` : '';
    const res = await fetch(`${API_BASE}/payments/stats${params}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('获取回款统计失败');
    return res.json();
  },

  async getOverdue(): Promise<PaymentPlan[]> {
    const res = await fetch(`${API_BASE}/payments/overdue`, { headers: getHeaders() });
    if (!res.ok) throw new Error('获取逾期回款失败');
    return res.json();
  },

  async create(data: Partial<PaymentPlan>): Promise<PaymentPlan> {
    const res = await fetch(`${API_BASE}/payments`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) });
    if (!res.ok) throw new Error('创建回款计划失败');
    return res.json();
  },

  async recordPayment(id: string, amount: number, date?: string): Promise<PaymentPlan> {
    const res = await fetch(`${API_BASE}/payments/${id}/record`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ amount, date }) });
    if (!res.ok) throw new Error('记录回款失败');
    return res.json();
  },

  async delete(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/payments/${id}`, { method: 'DELETE', headers: getHeaders() });
    if (!res.ok) throw new Error('删除回款计划失败');
  },

  async update(id: string, data: Partial<PaymentPlan>): Promise<PaymentPlan> { // 更新回款计划
    const res = await fetch(`${API_BASE}/payments/${id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data) });
    if (!res.ok) throw new Error('更新回款计划失败');
    return res.json();
  },

  async batchDelete(ids: string[]): Promise<{ deleted: number }> { // 批量删除
    const res = await fetch(`${API_BASE}/payments/batch/delete`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ ids }) });
    if (!res.ok) throw new Error('批量删除失败');
    return res.json();
  }
};
