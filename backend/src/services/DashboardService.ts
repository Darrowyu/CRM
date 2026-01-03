import { query } from '../db/connection.js';
import { UserRole } from '../types/index.js';

export interface DashboardStats {
  monthlySales: number;
  monthlyPayments: number;
  lastMonthSales: number; // 上月销售额（计算环比）
  newCustomers: number;
  activeOpportunities: number;
  pendingApprovals: number;
  pendingTasks: number; // 待办任务
  overdueTasks: number; // 逾期任务
  targetAmount: number; // 目标金额
  targetRate: number; // 目标完成率
}

export interface ConversionStats { source: string; total: number; converted: number; rate: number; }
export interface FunnelStats { stage: string; count: number; dropOffRate: number; }
export interface SalesTrend { month: string; sales: number; payments: number; }
export interface TaskItem { id: string; title: string; type: string; priority: string; due_date: string; customer_name?: string; }
export interface FollowUpItem { id: string; content: string; type: string; created_at: string; customer_name: string; user_name: string; }
export interface ContractItem { id: string; contract_no: string; customer_name: string; end_date: string; amount: number; }
export interface RankingItem { user_id: string; user_name: string; sales: number; customers: number; }

export const getDashboardStats = async (userId: string, role: UserRole): Promise<DashboardStats> => {
  const isManager = role === UserRole.ADMIN || role === UserRole.SALES_MANAGER;
  const userFilter = isManager ? '' : 'AND customer_id IN (SELECT id FROM customers WHERE owner_id = $1)';
  const ownerFilter = isManager ? '' : 'AND owner_id = $1';
  const assignFilter = isManager ? '' : 'AND assigned_to = $1';
  const params = isManager ? [] : [userId];

  const [sales, lastSales, payments, customers, opps, approvals, tasks, overdue, target] = await Promise.all([
    query(`SELECT COALESCE(SUM(total_amount), 0) as v FROM orders WHERE EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM NOW()) AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW()) ${userFilter}`, params),
    query(`SELECT COALESCE(SUM(total_amount), 0) as v FROM orders WHERE EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM NOW() - INTERVAL '1 month') AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW() - INTERVAL '1 month') ${userFilter}`, params),
    query(`SELECT COALESCE(SUM(payment_amount), 0) as v FROM orders WHERE EXTRACT(MONTH FROM updated_at) = EXTRACT(MONTH FROM NOW()) AND EXTRACT(YEAR FROM updated_at) = EXTRACT(YEAR FROM NOW()) ${userFilter}`, params),
    query(`SELECT COUNT(*) as v FROM customers WHERE EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM NOW()) AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW()) ${ownerFilter}`, params),
    query(`SELECT COUNT(*) as v FROM opportunities WHERE stage NOT IN ('closed_won', 'closed_lost') ${ownerFilter}`, params),
    query(`SELECT COUNT(*) as v FROM quotes WHERE status IN ('pending_manager', 'pending_director')`, []),
    query(`SELECT COUNT(*) as v FROM tasks WHERE status != 'completed' ${assignFilter}`, params),
    query(`SELECT COUNT(*) as v FROM tasks WHERE status != 'completed' AND due_date < NOW() ${assignFilter}`, params),
    query(`SELECT COALESCE(target_amount, 0) as v FROM sales_targets WHERE user_id ${isManager ? 'IS NULL' : '= $1'} AND year = EXTRACT(YEAR FROM NOW()) AND month = EXTRACT(MONTH FROM NOW())`, params)
  ]);

  const monthlySales = parseFloat(sales.rows[0]?.v || 0);
  const targetAmount = parseFloat(target.rows[0]?.v || 0);
  return {
    monthlySales, monthlyPayments: parseFloat(payments.rows[0]?.v || 0), lastMonthSales: parseFloat(lastSales.rows[0]?.v || 0),
    newCustomers: parseInt(customers.rows[0]?.v || 0), activeOpportunities: parseInt(opps.rows[0]?.v || 0), pendingApprovals: parseInt(approvals.rows[0]?.v || 0),
    pendingTasks: parseInt(tasks.rows[0]?.v || 0), overdueTasks: parseInt(overdue.rows[0]?.v || 0),
    targetAmount, targetRate: targetAmount > 0 ? Math.round((monthlySales / targetAmount) * 100) : 0
  };
};

export const getConversionBySource = async (): Promise<ConversionStats[]> => { // 按来源统计转化率
  const result = await query(`
    SELECT 
      c.source,
      COUNT(DISTINCT c.id) as total,
      COUNT(DISTINCT CASE WHEN o.stage = 'closed_won' THEN o.id END) as converted
    FROM customers c
    LEFT JOIN opportunities o ON o.customer_id = c.id
    WHERE c.source IS NOT NULL
    GROUP BY c.source
  `, []);

  return result.rows.map(row => ({
    source: row.source,
    total: parseInt(row.total),
    converted: parseInt(row.converted),
    rate: row.total > 0 ? (row.converted / row.total * 100) : 0
  }));
};

export const getFunnelStats = async (): Promise<FunnelStats[]> => { // 漏斗统计
  const stages = ['prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won'];
  const result = await query(`SELECT stage, COUNT(*) as count FROM opportunities GROUP BY stage`, []);
  const stageCounts = new Map(result.rows.map(r => [r.stage, parseInt(r.count)]));
  return stages.map((stage, i) => {
    const count = stageCounts.get(stage) || 0;
    const prevCount = i > 0 ? (stageCounts.get(stages[i-1]) || 0) : count;
    return { stage, count, dropOffRate: prevCount > 0 ? ((prevCount - count) / prevCount * 100) : 0 };
  });
};

export const getSalesTrend = async (userId: string, role: UserRole): Promise<SalesTrend[]> => { // 近6个月销售趋势
  const isManager = role === UserRole.ADMIN || role === UserRole.SALES_MANAGER;
  const filter = isManager ? '' : 'AND customer_id IN (SELECT id FROM customers WHERE owner_id = $1)';
  const result = await query(`
    SELECT TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') as month,
           COALESCE(SUM(total_amount), 0) as sales, COALESCE(SUM(payment_amount), 0) as payments
    FROM orders WHERE created_at >= NOW() - INTERVAL '6 months' ${filter}
    GROUP BY DATE_TRUNC('month', created_at) ORDER BY month`, isManager ? [] : [userId]);
  return result.rows.map(r => ({ month: r.month, sales: parseFloat(r.sales), payments: parseFloat(r.payments) }));
};

export const getPendingTasks = async (userId: string, role: UserRole): Promise<TaskItem[]> => { // 待办任务
  const isManager = role === UserRole.ADMIN || role === UserRole.SALES_MANAGER;
  const filter = isManager ? '' : 'AND t.assigned_to = $1';
  const result = await query(`
    SELECT t.id, t.title, t.type, t.priority, t.due_date, c.company_name as customer_name
    FROM tasks t LEFT JOIN customers c ON t.customer_id = c.id
    WHERE t.status != 'completed' ${filter} ORDER BY t.due_date ASC NULLS LAST LIMIT 10`, isManager ? [] : [userId]);
  return result.rows;
};

export const getRecentFollowUps = async (userId: string, role: UserRole): Promise<FollowUpItem[]> => { // 最近跟进
  const isManager = role === UserRole.ADMIN || role === UserRole.SALES_MANAGER;
  const filter = isManager ? '' : 'AND f.user_id = $1';
  const result = await query(`
    SELECT f.id, f.content, f.type, f.created_at, c.company_name as customer_name, u.name as user_name
    FROM follow_ups f JOIN customers c ON f.customer_id = c.id JOIN users u ON f.user_id = u.id
    WHERE 1=1 ${filter} ORDER BY f.created_at DESC LIMIT 10`, isManager ? [] : [userId]);
  return result.rows;
};

export const getExpiringContracts = async (): Promise<ContractItem[]> => { // 即将到期合同
  const result = await query(`
    SELECT ct.id, ct.contract_number as contract_no, c.company_name as customer_name, ct.end_date, ct.amount
    FROM contracts ct JOIN customers c ON ct.customer_id = c.id
    WHERE ct.end_date BETWEEN NOW() AND NOW() + INTERVAL '30 days' AND ct.status = 'active'
    ORDER BY ct.end_date ASC LIMIT 10`, []);
  return result.rows;
};

export const getSalesRanking = async (): Promise<RankingItem[]> => { // 销售排行榜（本月）
  const result = await query(`
    SELECT u.id as user_id, u.name as user_name, COALESCE(SUM(o.total_amount), 0) as sales,
           COUNT(DISTINCT c.id) FILTER (WHERE EXTRACT(MONTH FROM c.created_at) = EXTRACT(MONTH FROM NOW())) as customers
    FROM users u LEFT JOIN customers c ON c.owner_id = u.id
    LEFT JOIN orders o ON o.customer_id = c.id AND EXTRACT(MONTH FROM o.created_at) = EXTRACT(MONTH FROM NOW())
    WHERE u.role = 'sales_rep' GROUP BY u.id, u.name ORDER BY sales DESC LIMIT 10`, []);
  return result.rows.map(r => ({ ...r, sales: parseFloat(r.sales), customers: parseInt(r.customers) }));
};
