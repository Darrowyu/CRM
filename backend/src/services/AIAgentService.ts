import { pool } from '../db/connection.js'; // 数据库连接
import { aiService } from './AIService.js'; // AI服务

export interface AgentTask { type: string; params: Record<string, unknown>; result?: unknown; status: 'pending' | 'running' | 'completed' | 'failed'; error?: string; }
export interface AgentWorkflow { id: string; name: string; tasks: AgentTask[]; status: 'pending' | 'running' | 'completed' | 'failed'; createdAt: Date; }
export interface StaleCustomer { id: string; company_name: string; last_follow?: string; }
export interface AtRiskOpportunity { id: string; name: string; amount: number; probability?: number; company_name: string; }

const workflows: Map<string, AgentWorkflow> = new Map(); // 内存存储工作流

export class AIAgentService {
  async executeWorkflow(name: string, tasks: AgentTask[]): Promise<AgentWorkflow> { // 执行工作流
    const workflow: AgentWorkflow = { id: `wf_${Date.now()}`, name, tasks, status: 'running', createdAt: new Date() };
    workflows.set(workflow.id, workflow);
    try {
      for (const task of workflow.tasks) {
        task.status = 'running';
        try {
          task.result = await this.executeTask(task);
          task.status = 'completed';
        } catch (e: any) { task.status = 'failed'; task.error = e.message; workflow.status = 'failed'; return workflow; }
      }
      workflow.status = 'completed';
    } catch (e: any) { workflow.status = 'failed'; }
    return workflow;
  }

  private async executeTask(task: AgentTask): Promise<unknown> { // 执行单个任务
    switch (task.type) {
      case 'analyze_stale_customers': return this.analyzeStaleCustomers(Number(task.params.days) || 30);
      case 'batch_follow_up_suggestions': return this.batchFollowUpSuggestions(task.params.customerIds as string[]);
      case 'pipeline_health_check': return this.pipelineHealthCheck();
      case 'auto_score_customers': return this.autoScoreCustomers(Number(task.params.limit) || 10);
      case 'identify_at_risk_opportunities': return this.identifyAtRiskOpportunities();
      case 'generate_daily_summary': return this.generateDailySummary(task.params.userId as string | undefined);
      default: throw new Error(`未知任务类型: ${task.type}`);
    }
  }

  async analyzeStaleCustomers(days: number): Promise<{ customers: StaleCustomer[]; suggestions: string[] }> { // 分析沉睡客户
    const res = await pool.query(`SELECT c.*, MAX(f.created_at) as last_follow FROM customers c 
      LEFT JOIN follow_ups f ON c.id = f.customer_id GROUP BY c.id 
      HAVING MAX(f.created_at) < NOW() - INTERVAL '${days} days' OR MAX(f.created_at) IS NULL LIMIT 20`);
    const suggestions: string[] = [];
    for (const c of res.rows.slice(0, 5)) {
      const suggestion = await aiService.generateFollowUpSuggestion(c, null, null, { lang: 'zh' });
      suggestions.push(`${c.company_name}: ${suggestion}`);
    }
    return { customers: res.rows, suggestions };
  }

  async batchFollowUpSuggestions(customerIds: string[]): Promise<{ customerId: string; suggestion: string }[]> { // 批量生成跟进建议
    const results: { customerId: string; suggestion: string }[] = [];
    for (const id of customerIds.slice(0, 10)) {
      const [custRes, followRes, oppRes] = await Promise.all([
        pool.query('SELECT id, company_name, industry, source FROM customers WHERE id = $1', [id]),
        pool.query('SELECT id, content, created_at FROM follow_ups WHERE customer_id = $1 ORDER BY created_at DESC LIMIT 1', [id]),
        pool.query('SELECT id, name, amount, stage, probability, expected_close_date FROM opportunities WHERE customer_id = $1 AND stage NOT IN ($2, $3) LIMIT 1', [id, 'closed_won', 'closed_lost'])
      ]);
      if (custRes.rows[0]) {
        const suggestion = await aiService.generateFollowUpSuggestion(custRes.rows[0], followRes.rows[0], oppRes.rows[0], { lang: 'zh' });
        results.push({ customerId: id, suggestion });
      }
    }
    return results;
  }

  async pipelineHealthCheck(): Promise<{ score: number; issues: string[]; recommendations: string[] }> { // 管道健康检查
    const oppRes = await pool.query(`SELECT o.*, c.company_name FROM opportunities o JOIN customers c ON o.customer_id = c.id WHERE o.stage NOT IN ('closed_won', 'closed_lost')`);
    const opps = oppRes.rows;
    const issues: string[] = [], recommendations: string[] = [];
    let score = 100;
    const overdue = opps.filter(o => o.expected_close_date && new Date(o.expected_close_date) < new Date());
    if (overdue.length > 0) { issues.push(`${overdue.length}个商机已逾期`); score -= overdue.length * 5; recommendations.push('立即跟进逾期商机'); }
    const stale = opps.filter(o => o.updated_at && (Date.now() - new Date(o.updated_at).getTime()) > 14 * 86400000);
    if (stale.length > 0) { issues.push(`${stale.length}个商机超过14天未更新`); score -= stale.length * 3; recommendations.push('更新停滞商机状态'); }
    const lowProb = opps.filter(o => (o.probability || 0) < 30 && o.stage !== 'prospecting');
    if (lowProb.length > 0) { issues.push(`${lowProb.length}个商机赢率低于30%`); score -= lowProb.length * 2; }
    return { score: Math.max(0, score), issues, recommendations };
  }

  async autoScoreCustomers(limit: number): Promise<{ customerId: string; companyName: string; score: number; grade: string }[]> { // 自动评分客户
    const custRes = await pool.query('SELECT id, company_name, industry, source, grade FROM customers ORDER BY updated_at DESC LIMIT $1', [limit]);
    const results: { customerId: string; companyName: string; score: number; grade: string }[] = [];
    for (const c of custRes.rows) {
      const [orderRes, followRes] = await Promise.all([
        pool.query('SELECT id, total_amount, created_at FROM orders WHERE customer_id = $1', [c.id]),
        pool.query('SELECT id, content, created_at FROM follow_ups WHERE customer_id = $1 ORDER BY created_at DESC LIMIT 10', [c.id])
      ]);
      const scoreResult = await aiService.calculateAIScore(c, orderRes.rows, followRes.rows, { lang: 'zh' });
      results.push({ customerId: c.id, companyName: c.company_name, score: scoreResult.score, grade: scoreResult.grade });
      await pool.query('INSERT INTO customer_scores (customer_id, total_score, grade, last_calculated) VALUES ($1, $2, $3, NOW()) ON CONFLICT (customer_id) DO UPDATE SET total_score = $2, grade = $3, last_calculated = NOW()', [c.id, scoreResult.score, scoreResult.grade]);
    }
    return results;
  }

  async identifyAtRiskOpportunities(): Promise<{ opportunities: AtRiskOpportunity[]; analysis: string }> { // 识别风险商机
    const res = await pool.query(`SELECT o.*, c.company_name FROM opportunities o JOIN customers c ON o.customer_id = c.id 
      WHERE o.stage NOT IN ('closed_won', 'closed_lost') AND (o.probability < 40 OR o.expected_close_date < NOW() + INTERVAL '7 days') ORDER BY o.amount DESC LIMIT 10`);
    const opps = res.rows;
    if (opps.length === 0) return { opportunities: [], analysis: '当前无高风险商机' };
    const prompt = `分析以下风险商机并给出挽救建议：\n${opps.map(o => `- ${o.company_name}: ${o.name}, ¥${o.amount}, 赢率${o.probability}%`).join('\n')}\n简洁回复，每个商机一句话建议`;
    const analysis = await aiService['generate'](prompt, { lang: 'zh' });
    return { opportunities: opps, analysis };
  }

  async generateDailySummary(userId?: string): Promise<string> { // 生成每日摘要
    const today = new Date().toISOString().split('T')[0];
    const [newCustomers, newOpps, closedWon, followUps] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM customers WHERE DATE(created_at) = $1`, [today]),
      pool.query(`SELECT COUNT(*), SUM(amount) FROM opportunities WHERE DATE(created_at) = $1`, [today]),
      pool.query(`SELECT COUNT(*), SUM(amount) FROM opportunities WHERE stage = 'closed_won' AND DATE(updated_at) = $1`, [today]),
      pool.query(`SELECT COUNT(*) FROM follow_ups WHERE DATE(created_at) = $1`, [today])
    ]);
    const summary = `今日摘要(${today})：新增客户${newCustomers.rows[0].count}个，新商机${newOpps.rows[0].count}个(¥${newOpps.rows[0].sum || 0})，成交${closedWon.rows[0].count}单(¥${closedWon.rows[0].sum || 0})，跟进${followUps.rows[0].count}次`;
    return summary;
  }

  getWorkflow(id: string): AgentWorkflow | undefined { return workflows.get(id); } // 获取工作流
  listWorkflows(): AgentWorkflow[] { return Array.from(workflows.values()).slice(-20); } // 列出最近工作流
}

export const aiAgentService = new AIAgentService();
