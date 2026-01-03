const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const getHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem('token')}` });

export interface CustomerScore { customer_id: string; company_name?: string; recency_score: number; frequency_score: number; monetary_score: number; total_score: number; grade: string; }
export interface ForecastSummary { total_forecast: number; total_actual: number; accuracy: number; by_stage: { stage: string; amount: number; probability: number }[]; }
export interface FunnelData { stage: string; count: number; amount: number; conversion_rate: number; avg_days: number; }
export interface TrendData { period: string; forecast: number; actual: number; accuracy: number; }
export interface RankingData { user_id: string; user_name: string; amount: number; target: number; rate: number; rank: number; }
export interface AlertData { type: string; level: string; message: string; data?: unknown; }

export const scoringService = {
  async getScores(filters?: { grade?: string; limit?: number }): Promise<CustomerScore[]> {
    const params = new URLSearchParams();
    if (filters?.grade) params.append('grade', filters.grade);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    const res = await fetch(`${API_BASE}/scoring/scores?${params}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('获取评分失败');
    return res.json();
  },

  async getDistribution(): Promise<{ grade: string; count: number }[]> {
    const res = await fetch(`${API_BASE}/scoring/scores/distribution`, { headers: getHeaders() });
    if (!res.ok) throw new Error('获取分布失败');
    return res.json();
  },

  async calculateScores(): Promise<{ count: number }> {
    const res = await fetch(`${API_BASE}/scoring/scores/calculate`, { method: 'POST', headers: getHeaders() });
    if (!res.ok) throw new Error('计算评分失败');
    return res.json();
  },

  async getForecastSummary(userId?: string): Promise<ForecastSummary> {
    const params = userId ? `?user_id=${userId}` : '';
    const res = await fetch(`${API_BASE}/scoring/forecast/summary${params}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('获取预测失败');
    return res.json();
  },

  async generateForecast(year: number, month: number): Promise<{ forecast_amount: number }> {
    const res = await fetch(`${API_BASE}/scoring/forecast/generate`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ year, month }) });
    if (!res.ok) throw new Error('生成预测失败');
    return res.json();
  },

  async getFunnel(): Promise<FunnelData[]> { // 销售漏斗
    const res = await fetch(`${API_BASE}/scoring/funnel`, { headers: getHeaders() });
    if (!res.ok) throw new Error('获取漏斗失败');
    return res.json();
  },

  async getTrend(months?: number): Promise<TrendData[]> { // 趋势分析
    const params = months ? `?months=${months}` : '';
    const res = await fetch(`${API_BASE}/scoring/trend${params}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('获取趋势失败');
    return res.json();
  },

  async getRanking(year?: number, month?: number): Promise<RankingData[]> { // 销售排行
    const params = new URLSearchParams();
    if (year) params.append('year', year.toString());
    if (month) params.append('month', month.toString());
    const res = await fetch(`${API_BASE}/scoring/ranking?${params}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('获取排行失败');
    return res.json();
  },

  async getAlerts(): Promise<AlertData[]> { // 智能预警
    const res = await fetch(`${API_BASE}/scoring/alerts`, { headers: getHeaders() });
    if (!res.ok) throw new Error('获取预警失败');
    return res.json();
  }
};
