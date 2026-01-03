import { GoogleGenAI } from '@google/genai'; // Gemini SDK
import OpenAI from 'openai'; // OpenAI SDK (兼容DeepSeek)
import { ProxyAgent, setGlobalDispatcher, getGlobalDispatcher, Dispatcher } from 'undici'; // 代理支持
import { CustomerForAI, OrderForAI, FollowUpForAI, OpportunityForAI, ContractForAI, ProductForQuote, QuoteForAI, PipelineSummary } from '../types/ai.js';
import logger from '../utils/logger.js';

const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY; // 读取代理配置
const proxyDispatcher = proxyUrl ? new ProxyAgent(proxyUrl) : null; // 创建代理Dispatcher
const defaultDispatcher = getGlobalDispatcher(); // 保存默认Dispatcher

const withProxy = async <T>(needProxy: boolean, fn: () => Promise<T>): Promise<T> => { // 临时启用代理执行
  if (needProxy && proxyDispatcher) setGlobalDispatcher(proxyDispatcher);
  try { return await fn(); }
  finally { if (needProxy && proxyDispatcher) setGlobalDispatcher(defaultDispatcher); }
};

export type AIProvider = 'gemini' | 'openai' | 'deepseek';
export interface AIConfig { lang?: string; maxTokens?: number; temperature?: number; }
export interface UserAIConfig { provider?: AIProvider; geminiKey?: string; openaiKey?: string; deepseekKey?: string; }

const defaultConfig = { // 系统默认配置
  provider: (process.env.AI_PROVIDER || 'gemini') as AIProvider,
  gemini: { apiKey: process.env.GEMINI_API_KEY || '', model: 'gemini-2.5-flash' },
  openai: { apiKey: process.env.OPENAI_API_KEY || '', model: 'gpt-4o-mini' },
  deepseek: { apiKey: process.env.DEEPSEEK_API_KEY || '', model: 'deepseek-chat', baseURL: 'https://api.deepseek.com' }
};

const getLang = (lang: string) => lang === 'zh' ? '请用中文回复。' : 'Please respond in English.';

const createClients = (userCfg?: UserAIConfig) => { // 创建AI客户端（支持用户自定义Key）
  const geminiKey = userCfg?.geminiKey || defaultConfig.gemini.apiKey;
  const openaiKey = userCfg?.openaiKey || defaultConfig.openai.apiKey;
  const deepseekKey = userCfg?.deepseekKey || defaultConfig.deepseek.apiKey;
  return {
    provider: userCfg?.provider || defaultConfig.provider,
    gemini: geminiKey ? new GoogleGenAI({ apiKey: geminiKey }) : null, // Gemini通过withProxy走代理
    openai: openaiKey ? new OpenAI({ apiKey: openaiKey }) : null, // OpenAI通过withProxy走代理
    deepseek: deepseekKey ? new OpenAI({ apiKey: deepseekKey, baseURL: defaultConfig.deepseek.baseURL }) : null // DeepSeek不走代理
  };
};

const getActiveProvider = (clients: ReturnType<typeof createClients>): AIProvider => {
  if (clients.provider === 'gemini' && clients.gemini) return 'gemini';
  if (clients.provider === 'openai' && clients.openai) return 'openai';
  if (clients.provider === 'deepseek' && clients.deepseek) return 'deepseek';
  if (clients.gemini) return 'gemini';
  if (clients.openai) return 'openai';
  if (clients.deepseek) return 'deepseek';
  return 'gemini';
};

export class AIService {
  private userConfig?: UserAIConfig;
  
  setUserConfig(cfg: UserAIConfig) { this.userConfig = cfg; } // 设置用户自定义配置
  clearUserConfig() { this.userConfig = undefined; } // 清除用户配置

  private async generate(prompt: string, cfg?: AIConfig): Promise<string> { // 统一生成接口
    const clients = createClients(this.userConfig);
    const provider = getActiveProvider(clients);
    const fullPrompt = `${getLang(cfg?.lang || 'zh')}\n${prompt}`;
    try {
      if (provider === 'gemini' && clients.gemini) {
        const res = await withProxy(true, () => clients.gemini!.models.generateContent({ model: defaultConfig.gemini.model, contents: fullPrompt })); // Gemini走代理
        return res.text || '';
      }
      if (provider === 'openai' && clients.openai) {
        const res = await withProxy(true, () => clients.openai!.chat.completions.create({ model: defaultConfig.openai.model, messages: [{ role: 'user', content: fullPrompt }], max_tokens: cfg?.maxTokens || 2000, temperature: cfg?.temperature || 0.7 })); // OpenAI走代理
        return res.choices[0]?.message?.content || '';
      }
      if (provider === 'deepseek' && clients.deepseek) {
        const res = await clients.deepseek.chat.completions.create({ model: defaultConfig.deepseek.model, messages: [{ role: 'user', content: fullPrompt }], max_tokens: cfg?.maxTokens || 2000, temperature: cfg?.temperature || 0.7 }); // DeepSeek不走代理
        return res.choices[0]?.message?.content || '';
      }
      return cfg?.lang === 'zh' ? 'AI服务未配置，请在设置中配置API Key' : 'AI service not configured';
    } catch (e: unknown) { const msg = e instanceof Error ? e.message : String(e); logger.error(`AI Error: ${msg}`); return cfg?.lang === 'zh' ? `AI服务暂时不可用: ${msg}` : `AI service unavailable: ${msg}`; }
  }

  async analyzeCustomer(customer: CustomerForAI, orders: OrderForAI[], followUps: FollowUpForAI[], cfg?: AIConfig): Promise<string> { // 客户智能分析
    const prompt = `你是CRM智能顾问。分析以下客户数据并给出洞察：
客户：${customer.company_name}，行业：${customer.industry || '未知'}，来源：${customer.source || '未知'}
订单历史：${orders.length}笔，总金额：¥${orders.reduce((s, o) => s + Number(o.total_amount || 0), 0).toLocaleString()}
最近跟进：${followUps.slice(0, 3).map(f => f.content).join('；') || '无'}
请提供：1.客户价值评估 2.潜在需求预测 3.下一步跟进建议
格式：自然段落，关键信息用<b>标签包裹，不要用markdown`;
    return this.generate(prompt, cfg);
  }

  async predictWinRate(opp: OpportunityForAI, customer: CustomerForAI, cfg?: AIConfig): Promise<{ rate: number; factors: string; suggestions: string }> { // 商机赢率预测
    const prompt = `你是销售预测专家。分析商机赢率：
商机：${opp.name}，金额：¥${opp.amount}，当前阶段：${opp.stage}
客户：${customer.company_name}，历史成交：${customer.order_count || 0}笔
预计成交日：${opp.expected_close_date || '未设定'}
返回JSON格式（不要markdown代码块）：{"rate":预测赢率0-100,"factors":"影响因素分析","suggestions":"提升建议"}`;
    const res = await this.generate(prompt, cfg);
    try { return JSON.parse(res.replace(/```json?|```/g, '').trim()); }
    catch { return { rate: opp.probability || 50, factors: '数据不足', suggestions: res }; }
  }

  async generateFollowUpSuggestion(customer: CustomerForAI, lastFollowUp: FollowUpForAI | null, opp: OpportunityForAI | null, cfg?: AIConfig): Promise<string> { // 跟进建议生成
    const prompt = `你是销售教练。根据以下信息生成跟进建议：
客户：${customer.company_name}
上次跟进：${lastFollowUp?.content || '无记录'}（${lastFollowUp?.created_at?.split('T')[0] || ''}）
当前商机：${opp?.name || '无'}，阶段：${opp?.stage || '无'}
给出：1.最佳跟进时机 2.沟通要点 3.话术示例
简洁实用，不超过200字`;
    return this.generate(prompt, cfg);
  }

  async generateQuoteSuggestion(customer: CustomerForAI, products: ProductForQuote[], quotes: QuoteForAI[], cfg?: AIConfig): Promise<string> { // 智能报价建议
    const avgDiscount = quotes.length > 0 ? quotes.reduce((s, q) => s + (q.discount || 0), 0) / quotes.length : 0;
    const prompt = `你是定价策略专家。给出报价建议：
客户：${customer.company_name}，历史报价${quotes.length}次，平均折扣${avgDiscount.toFixed(1)}%
本次产品：${products.map(p => `${p.name}x${p.quantity}`).join('，')}
建议：1.定价策略 2.折扣空间 3.谈判要点
简洁，不超过150字`;
    return this.generate(prompt, cfg);
  }

  async analyzeContractRisk(contract: ContractForAI, customer: CustomerForAI, cfg?: AIConfig): Promise<{ riskLevel: string; risks: string[]; suggestions: string }> { // 合同风险分析
    const prompt = `你是合同风险分析师。评估合同风险：
合同金额：¥${contract.amount}，期限：${contract.start_date}至${contract.end_date}
客户：${customer.company_name}，信用等级：${customer.grade || '未评级'}
付款条款：${contract.payment_terms || '未知'}
返回JSON（不要markdown）：{"riskLevel":"low/medium/high","risks":["风险点1","风险点2"],"suggestions":"建议"}`;
    const res = await this.generate(prompt, cfg);
    try { return JSON.parse(res.replace(/```json?|```/g, '').trim()); }
    catch { return { riskLevel: 'medium', risks: ['数据不足'], suggestions: res }; }
  }

  async naturalLanguageQuery(query: string, ctx: { tables: string[]; userRole: string }, cfg?: AIConfig): Promise<{ sql?: string; answer: string; needsExecution: boolean }> { // 自然语言查询
    const prompt = `你是CRM数据分析师。用户问："${query}"
可用表：${ctx.tables.join(', ')}，用户角色：${ctx.userRole}
如果需要查询数据库，返回JSON：{"sql":"安全的SELECT语句","answer":"","needsExecution":true}
如果可以直接回答，返回：{"sql":"","answer":"回答内容","needsExecution":false}
注意：只允许SELECT，禁止DELETE/UPDATE/DROP`;
    const res = await this.generate(prompt, cfg);
    try { return JSON.parse(res.replace(/```json?|```/g, '').trim()); }
    catch { return { answer: res, needsExecution: false }; }
  }

  async analyzePipeline(opps: OpportunityForAI[], summary: PipelineSummary, cfg?: AIConfig): Promise<string> { // 销售管道分析
    const enriched = opps.map(o => ({ customer: o.customer_name, stage: o.stage, amount: Number(o.amount) || 0, probability: o.probability, daysToClose: o.expected_close_date ? Math.ceil((new Date(o.expected_close_date).getTime() - Date.now()) / 86400000) : null }));
    const prompt = `${getLang(cfg?.lang || 'zh')}
你是资深销售顾问，为制造业公司"Makrite"进行销售管道审计。
历史数据：活跃商机${summary.totalActive}个，总金额¥${summary.totalAmount.toLocaleString()}，成交${summary.closedWonCount}个(¥${summary.closedWonAmount.toLocaleString()})，丢单${summary.closedLostCount}个
当前商机：${JSON.stringify(enriched, null, 2)}
提供：1.管道健康度(1-10分) 2.风险预警 3.立即行动建议 4.优化建议
格式：自然段落，公司名和金额用<b>标签，不要markdown`;
    return this.generate(prompt, cfg);
  }

  async generateEmail(customerName: string, stage: string, notes: string[], cfg?: AIConfig): Promise<string> { // 跟进邮件生成
    const prompt = `你是CRM助手，为制造业公司"Makrite"起草跟进邮件。
客户：${customerName}，阶段：${stage}，备注：${notes.join('；')}
要求：专业、简洁、有说服力，不超过150字`;
    return this.generate(prompt, cfg);
  }

  async refineMeetingNotes(rawText: string, cfg?: AIConfig): Promise<string> { // 会议记录整理
    const prompt = `将以下语音转文字整理为结构化会议记录：
"${rawText}"
格式：摘要(1句)、要点(列表)、待办事项`;
    return this.generate(prompt, cfg);
  }

  async calculateAIScore(customer: CustomerForAI, orders: OrderForAI[], followUps: FollowUpForAI[], cfg?: AIConfig): Promise<{ score: number; grade: string; analysis: string }> { // AI驱动客户评分
    const totalAmount = orders.reduce((s, o) => s + Number(o.total_amount || 0), 0);
    const daysSinceOrder = orders[0]?.created_at ? Math.ceil((Date.now() - new Date(orders[0].created_at).getTime()) / 86400000) : 999;
    const prompt = `你是客户价值评估专家。评估客户：
公司：${customer.company_name}，行业：${customer.industry || '未知'}
订单：${orders.length}笔，总金额¥${totalAmount.toLocaleString()}，最近订单${daysSinceOrder}天前
跟进：${followUps.length}次，最近内容：${followUps[0]?.content || '无'}
返回JSON（不要markdown）：{"score":0-100分,"grade":"A/B/C/D","analysis":"简短分析"}`;
    const res = await this.generate(prompt, cfg);
    try { return JSON.parse(res.replace(/```json?|```/g, '').trim()); }
    catch { return { score: 50, grade: 'C', analysis: res }; }
  }

  getDefaultConfig(): { provider: AIProvider; hasGemini: boolean; hasOpenai: boolean; hasDeepseek: boolean } { // 获取默认配置状态
    return {
      provider: defaultConfig.provider,
      hasGemini: !!defaultConfig.gemini.apiKey,
      hasOpenai: !!defaultConfig.openai.apiKey,
      hasDeepseek: !!defaultConfig.deepseek.apiKey
    };
  }
}

export const aiService = new AIService();
