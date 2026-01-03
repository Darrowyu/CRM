import api from './api';

export interface DashboardStats {
  monthlySales: number; monthlyPayments: number; lastMonthSales: number; newCustomers: number;
  activeOpportunities: number; pendingApprovals: number; pendingTasks: number; overdueTasks: number;
  targetAmount: number; targetRate: number;
}
export interface ConversionStats { source: string; total: number; converted: number; rate: number; }
export interface FunnelStats { stage: string; count: number; dropOffRate: number; }
export interface SalesTrend { month: string; sales: number; payments: number; }
export interface TaskItem { id: string; title: string; type: string; priority: string; due_date: string; customer_name?: string; }
export interface FollowUpItem { id: string; content: string; type: string; created_at: string; customer_name: string; user_name: string; }
export interface ContractItem { id: string; contract_no: string; customer_name: string; end_date: string; amount: number; }
export interface RankingItem { user_id: string; user_name: string; sales: number; customers: number; }

export const dashboardService = {
  getStats: async (): Promise<DashboardStats> => (await api.get('/dashboard/stats')).data,
  getConversionBySource: async (): Promise<ConversionStats[]> => (await api.get('/dashboard/conversion')).data,
  getFunnelStats: async (): Promise<FunnelStats[]> => (await api.get('/dashboard/funnel')).data,
  getSalesTrend: async (): Promise<SalesTrend[]> => (await api.get('/dashboard/trend')).data,
  getPendingTasks: async (): Promise<TaskItem[]> => (await api.get('/dashboard/tasks')).data,
  getRecentFollowUps: async (): Promise<FollowUpItem[]> => (await api.get('/dashboard/followups')).data,
  getExpiringContracts: async (): Promise<ContractItem[]> => (await api.get('/dashboard/contracts')).data,
  getSalesRanking: async (): Promise<RankingItem[]> => (await api.get('/dashboard/ranking')).data,
};
