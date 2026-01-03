import { SalesTarget, TargetWithActuals } from '../types/tasks';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const getHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem('token')}` });

export const targetService = {
  async getMyTarget(year?: number, month?: number): Promise<{ target: SalesTarget | null; actuals: { amount: number; customers: number; opportunities: number }; achievement_rate: number }> {
    const params = new URLSearchParams();
    if (year) params.append('year', year.toString());
    if (month) params.append('month', month.toString());
    const res = await fetch(`${API_BASE}/targets/my?${params}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('获取目标失败');
    return res.json();
  },

  async getMyYearlyTargets(year?: number): Promise<SalesTarget[]> {
    const params = year ? `?year=${year}` : '';
    const res = await fetch(`${API_BASE}/targets/my/yearly${params}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('获取年度目标失败');
    return res.json();
  },

  async getTeamTarget(year?: number, month?: number): Promise<{ target: SalesTarget | null; actuals: { amount: number; customers: number; opportunities: number }; userTargets: TargetWithActuals[]; achievement_rate: number }> {
    const params = new URLSearchParams();
    if (year) params.append('year', year.toString());
    if (month) params.append('month', month.toString());
    const res = await fetch(`${API_BASE}/targets/team?${params}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('获取团队目标失败');
    return res.json();
  },

  async setUserTarget(data: { user_id: string; year: number; month: number; target_amount: number; target_customers?: number; target_opportunities?: number }): Promise<SalesTarget> {
    const res = await fetch(`${API_BASE}/targets/user`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) });
    if (!res.ok) throw new Error('设置目标失败');
    return res.json();
  },

  async setTeamTarget(data: { year: number; month: number; target_amount: number; target_customers?: number; target_opportunities?: number }): Promise<SalesTarget> {
    const res = await fetch(`${API_BASE}/targets/team`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) });
    if (!res.ok) throw new Error('设置团队目标失败');
    return res.json();
  },

  async getYearlyTrend(year?: number): Promise<{ month: number; target: number; actual: number }[]> { // 获取年度趋势
    const params = year ? `?year=${year}` : '';
    const res = await fetch(`${API_BASE}/targets/trend${params}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('获取趋势失败');
    return res.json();
  },

  async getTeamRanking(year?: number, month?: number): Promise<{ user_id: string; user_name: string; target: number; actual: number; rate: number }[]> { // 获取排行榜
    const params = new URLSearchParams();
    if (year) params.append('year', year.toString());
    if (month) params.append('month', month.toString());
    const res = await fetch(`${API_BASE}/targets/ranking?${params}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('获取排行榜失败');
    return res.json();
  },

  async batchSetTargets(targets: { user_id: string; target_amount: number }[], year: number, month: number): Promise<{ count: number }> { // 批量设置
    const res = await fetch(`${API_BASE}/targets/batch`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ targets, year, month }) });
    if (!res.ok) throw new Error('批量设置失败');
    return res.json();
  }
};
