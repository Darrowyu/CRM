import api from './api'; // 统一API实例

export interface WinRatePrediction { rate: number; factors: string; suggestions: string; }
export interface ContractRisk { riskLevel: string; risks: string[]; suggestions: string; }
export interface AIScore { score: number; grade: string; analysis: string; }
export interface QueryResult { answer: string; data: any[] | null; sql?: string; }
export interface PipelineAnalysis { analysis: string; summary: { totalActive: number; totalAmount: number; closedWonCount: number; closedWonAmount: number; closedLostCount: number }; }
export interface AIConfigStatus { default: { provider: string; hasGemini: boolean; hasOpenai: boolean; hasDeepseek: boolean }; user: { provider?: string; hasGemini: boolean; hasOpenai: boolean; hasDeepseek: boolean } | null; }
export interface UserAIConfig { provider?: 'gemini' | 'openai' | 'deepseek'; geminiKey?: string; openaiKey?: string; deepseekKey?: string; }

const getLang = () => localStorage.getItem('language') || 'zh'; // 获取当前语言

export const aiService = {
  analyzeCustomer: async (customerId: string): Promise<string> => { // 客户智能分析
    const res = await api.post(`/ai/analyze-customer/${customerId}`, { lang: getLang() });
    return res.data.analysis;
  },

  predictWinRate: async (opportunityId: string): Promise<WinRatePrediction> => { // 商机赢率预测
    const res = await api.post(`/ai/predict-win-rate/${opportunityId}`, { lang: getLang() });
    return res.data;
  },

  getFollowUpSuggestion: async (customerId: string, opportunityId?: string): Promise<string> => { // 跟进建议
    const res = await api.post('/ai/follow-up-suggestion', { customer_id: customerId, opportunity_id: opportunityId, lang: getLang() });
    return res.data.suggestion;
  },

  getQuoteSuggestion: async (customerId: string, products: { name: string; quantity: number }[]): Promise<string> => { // 报价建议
    const res = await api.post('/ai/quote-suggestion', { customer_id: customerId, products, lang: getLang() });
    return res.data.suggestion;
  },

  analyzeContractRisk: async (contractId: string): Promise<ContractRisk> => { // 合同风险分析
    const res = await api.post(`/ai/contract-risk/${contractId}`, { lang: getLang() });
    return res.data;
  },

  naturalQuery: async (query: string): Promise<QueryResult> => { // 自然语言查询
    const res = await api.post('/ai/query', { query, lang: getLang() });
    return res.data;
  },

  analyzePipeline: async (): Promise<PipelineAnalysis> => { // 销售管道分析
    const res = await api.post('/ai/pipeline-analysis', { lang: getLang() });
    return res.data;
  },

  generateEmail: async (customerName: string, stage: string, notes: string[]): Promise<string> => { // 生成跟进邮件
    const res = await api.post('/ai/generate-email', { customerName, stage, notes, lang: getLang() });
    return res.data.email;
  },

  refineNotes: async (rawText: string): Promise<string> => { // 整理会议记录
    const res = await api.post('/ai/refine-notes', { rawText, lang: getLang() });
    return res.data.refined;
  },

  getAIScore: async (customerId: string): Promise<AIScore> => { // AI客户评分
    const res = await api.post(`/ai/ai-score/${customerId}`, { lang: getLang() });
    return res.data;
  },

  getConfig: async (): Promise<AIConfigStatus> => { // 获取AI配置状态
    const res = await api.get('/ai/config');
    return res.data;
  },

  saveConfig: async (config: UserAIConfig): Promise<void> => { // 保存用户AI配置
    await api.post('/ai/config', config);
  },

  clearConfig: async (): Promise<void> => { // 清除用户配置（使用系统默认）
    await api.delete('/ai/config');
  }
};

export default aiService;
