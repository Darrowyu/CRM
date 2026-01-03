import api from './api'; // 统一API实例

export interface AgentTask { type: string; params: Record<string, any>; result?: any; status: 'pending' | 'running' | 'completed' | 'failed'; error?: string; }
export interface AgentWorkflow { id: string; name: string; tasks: AgentTask[]; status: 'pending' | 'running' | 'completed' | 'failed'; createdAt: string; }
export interface PipelineHealth { score: number; issues: string[]; recommendations: string[]; }
export interface StaleCustomersResult { customers: any[]; suggestions: string[]; }
export interface AtRiskResult { opportunities: any[]; analysis: string; }

export const agentService = {
  executeWorkflow: async (name: string, tasks: AgentTask[]): Promise<AgentWorkflow> => { // 执行自定义工作流
    const res = await api.post('/agent/workflow', { name, tasks });
    return res.data;
  },

  getWorkflow: async (id: string): Promise<AgentWorkflow> => { // 获取工作流状态
    const res = await api.get(`/agent/workflow/${id}`);
    return res.data;
  },

  listWorkflows: async (): Promise<AgentWorkflow[]> => { // 列出工作流
    const res = await api.get('/agent/workflows');
    return res.data;
  },

  analyzeStaleCustomers: async (days = 30): Promise<StaleCustomersResult> => { // 分析沉睡客户
    const res = await api.post('/agent/stale-customers', { days });
    return res.data;
  },

  batchFollowUpSuggestions: async (customerIds: string[]): Promise<{ customerId: string; suggestion: string }[]> => { // 批量跟进建议
    const res = await api.post('/agent/batch-suggestions', { customerIds });
    return res.data;
  },

  getPipelineHealth: async (): Promise<PipelineHealth> => { // 管道健康检查
    const res = await api.get('/agent/pipeline-health');
    return res.data;
  },

  autoScoreCustomers: async (limit = 10): Promise<{ customerId: string; companyName: string; score: number; grade: string }[]> => { // 自动评分
    const res = await api.post('/agent/auto-score', { limit });
    return res.data;
  },

  getAtRiskOpportunities: async (): Promise<AtRiskResult> => { // 风险商机
    const res = await api.get('/agent/at-risk');
    return res.data;
  },

  getDailySummary: async (): Promise<string> => { // 每日摘要
    const res = await api.get('/agent/daily-summary');
    return res.data.summary;
  },

  runMorningBriefing: async (): Promise<AgentWorkflow> => { // 预设工作流：晨会简报
    return agentService.executeWorkflow('晨会简报', [
      { type: 'generate_daily_summary', params: {}, status: 'pending' },
      { type: 'pipeline_health_check', params: {}, status: 'pending' },
      { type: 'identify_at_risk_opportunities', params: {}, status: 'pending' }
    ]);
  },

  runCustomerReactivation: async (days = 30): Promise<AgentWorkflow> => { // 预设工作流：客户激活
    return agentService.executeWorkflow('客户激活', [
      { type: 'analyze_stale_customers', params: { days }, status: 'pending' }
    ]);
  },

  runBatchScoring: async (limit = 20): Promise<AgentWorkflow> => { // 预设工作流：批量评分
    return agentService.executeWorkflow('批量客户评分', [
      { type: 'auto_score_customers', params: { limit }, status: 'pending' }
    ]);
  }
};

export default agentService;
