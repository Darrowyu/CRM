import { Contract, ContractStats } from '../types/contracts';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const getHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem('token')}` });

export const contractService = {
  async getAll(filters?: { customer_id?: string; status?: string }): Promise<Contract[]> {
    const params = new URLSearchParams();
    if (filters?.customer_id) params.append('customer_id', filters.customer_id);
    if (filters?.status) params.append('status', filters.status);
    const res = await fetch(`${API_BASE}/contracts?${params}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('获取合同失败');
    return res.json();
  },

  async getExpiring(days = 30): Promise<Contract[]> {
    const res = await fetch(`${API_BASE}/contracts/expiring?days=${days}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('获取即将到期合同失败');
    return res.json();
  },

  async getById(id: string): Promise<Contract> {
    const res = await fetch(`${API_BASE}/contracts/${id}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('获取合同失败');
    return res.json();
  },

  async create(data: Partial<Contract>): Promise<Contract> {
    const res = await fetch(`${API_BASE}/contracts`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) });
    if (!res.ok) throw new Error('创建合同失败');
    return res.json();
  },

  async update(id: string, data: Partial<Contract>): Promise<Contract> {
    const res = await fetch(`${API_BASE}/contracts/${id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data) });
    if (!res.ok) throw new Error('更新合同失败');
    return res.json();
  },

  async delete(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/contracts/${id}`, { method: 'DELETE', headers: getHeaders() });
    if (!res.ok) throw new Error('删除合同失败');
  },

  async getStatistics(): Promise<ContractStats> { // 获取统计
    const res = await fetch(`${API_BASE}/contracts/stats/summary`, { headers: getHeaders() });
    if (!res.ok) throw new Error('获取统计失败');
    return res.json();
  },

  async batchDelete(ids: string[]): Promise<{ deleted: number }> { // 批量删除
    const res = await fetch(`${API_BASE}/contracts/batch/delete`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ ids }) });
    if (!res.ok) throw new Error('批量删除失败');
    return res.json();
  },

  async batchUpdateStatus(ids: string[], status: string): Promise<{ updated: number }> { // 批量更新状态
    const res = await fetch(`${API_BASE}/contracts/batch/status`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ ids, status }) });
    if (!res.ok) throw new Error('批量更新失败');
    return res.json();
  },

  async renew(id: string): Promise<Contract> { // 续签合同
    const res = await fetch(`${API_BASE}/contracts/${id}/renew`, { method: 'POST', headers: getHeaders() });
    if (!res.ok) throw new Error('续签失败');
    return res.json();
  }
};
