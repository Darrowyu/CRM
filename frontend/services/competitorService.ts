import { Competitor, OpportunityCompetitor, CompetitorStats } from '../types/contracts';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const getHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem('token')}` });

export const competitorService = {
  async getAll(): Promise<Competitor[]> {
    const res = await fetch(`${API_BASE}/competitors`, { headers: getHeaders() });
    if (!res.ok) throw new Error('获取竞争对手失败');
    return res.json();
  },

  async getStats(): Promise<CompetitorStats> { // 统计概览
    const res = await fetch(`${API_BASE}/competitors/stats/overview`, { headers: getHeaders() });
    if (!res.ok) throw new Error('获取统计失败');
    return res.json();
  },

  async batchDelete(ids: string[]): Promise<{ deleted: number }> { // 批量删除
    const res = await fetch(`${API_BASE}/competitors/batch/delete`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ ids }) });
    if (!res.ok) throw new Error('批量删除失败');
    return res.json();
  },

  async getOpportunities(id: string): Promise<{ id: string; name: string; threat_level: string; customer_name: string; amount: number }[]> { // 关联商机
    const res = await fetch(`${API_BASE}/competitors/${id}/opportunities`, { headers: getHeaders() });
    if (!res.ok) throw new Error('获取关联商机失败');
    return res.json();
  },

  async getById(id: string): Promise<Competitor> {
    const res = await fetch(`${API_BASE}/competitors/${id}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('获取竞争对手失败');
    return res.json();
  },

  async create(data: Partial<Competitor>): Promise<Competitor> {
    const res = await fetch(`${API_BASE}/competitors`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) });
    if (!res.ok) throw new Error('创建竞争对手失败');
    return res.json();
  },

  async update(id: string, data: Partial<Competitor>): Promise<Competitor> {
    const res = await fetch(`${API_BASE}/competitors/${id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data) });
    if (!res.ok) throw new Error('更新竞争对手失败');
    return res.json();
  },

  async delete(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/competitors/${id}`, { method: 'DELETE', headers: getHeaders() });
    if (!res.ok) throw new Error('删除竞争对手失败');
  },

  // 商机竞争分析
  async getOpportunityCompetitors(opportunityId: string): Promise<OpportunityCompetitor[]> {
    const res = await fetch(`${API_BASE}/competitors/opportunity/${opportunityId}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('获取商机竞争分析失败');
    return res.json();
  },

  async addOpportunityCompetitor(opportunityId: string, data: { competitor_id: string; threat_level?: string; notes?: string }): Promise<OpportunityCompetitor> {
    const res = await fetch(`${API_BASE}/competitors/opportunity/${opportunityId}`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) });
    if (!res.ok) throw new Error('添加竞争分析失败');
    return res.json();
  },

  async removeOpportunityCompetitor(opportunityId: string, competitorId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/competitors/opportunity/${opportunityId}/${competitorId}`, { method: 'DELETE', headers: getHeaders() });
    if (!res.ok) throw new Error('删除竞争分析失败');
  }
};
