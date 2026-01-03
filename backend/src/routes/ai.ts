import { Router, Response } from 'express'; // Express路由
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { aiService, UserAIConfig } from '../services/AIService.js';
import { pool } from '../db/connection.js';
import { UserRole } from '../types/index.js';

const userAIConfigs: Map<string, UserAIConfig> = new Map(); // 用户AI配置缓存

const router = Router();
router.use(authMiddleware); // 所有AI接口需要认证

router.post('/analyze-customer/:id', async (req: AuthRequest, res: Response) => { // 客户智能分析
  try {
    const { id } = req.params;
    const lang = req.body.lang || 'zh';
    const [custRes, orderRes, followRes] = await Promise.all([
      pool.query('SELECT * FROM customers WHERE id = $1', [id]),
      pool.query('SELECT * FROM orders WHERE customer_id = $1 ORDER BY created_at DESC', [id]),
      pool.query('SELECT * FROM follow_ups WHERE customer_id = $1 ORDER BY created_at DESC LIMIT 10', [id])
    ]);
    if (!custRes.rows[0]) return res.status(404).json({ message: '客户不存在' });
    const analysis = await aiService.analyzeCustomer(custRes.rows[0], orderRes.rows, followRes.rows, { lang });
    res.json({ analysis });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post('/predict-win-rate/:id', async (req: AuthRequest, res: Response) => { // 商机赢率预测
  try {
    const { id } = req.params;
    const lang = req.body.lang || 'zh';
    const oppRes = await pool.query(`SELECT o.*, c.company_name, c.industry, (SELECT COUNT(*) FROM orders WHERE customer_id = c.id) as order_count 
      FROM opportunities o JOIN customers c ON o.customer_id = c.id WHERE o.id = $1`, [id]);
    if (!oppRes.rows[0]) return res.status(404).json({ message: '商机不存在' });
    const opp = oppRes.rows[0];
    const prediction = await aiService.predictWinRate(opp, { company_name: opp.company_name, industry: opp.industry, order_count: opp.order_count }, { lang });
    res.json(prediction);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post('/follow-up-suggestion', async (req: AuthRequest, res: Response) => { // 跟进建议
  try {
    const { customer_id, opportunity_id, lang = 'zh' } = req.body;
    const [custRes, followRes, oppRes] = await Promise.all([
      pool.query('SELECT * FROM customers WHERE id = $1', [customer_id]),
      pool.query('SELECT * FROM follow_ups WHERE customer_id = $1 ORDER BY created_at DESC LIMIT 1', [customer_id]),
      opportunity_id ? pool.query('SELECT * FROM opportunities WHERE id = $1', [opportunity_id]) : Promise.resolve({ rows: [] })
    ]);
    if (!custRes.rows[0]) return res.status(404).json({ message: '客户不存在' });
    const suggestion = await aiService.generateFollowUpSuggestion(custRes.rows[0], followRes.rows[0], oppRes.rows[0], { lang });
    res.json({ suggestion });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post('/quote-suggestion', async (req: AuthRequest, res: Response) => { // 报价建议
  try {
    const { customer_id, products, lang = 'zh' } = req.body;
    const [custRes, quoteRes] = await Promise.all([
      pool.query('SELECT * FROM customers WHERE id = $1', [customer_id]),
      pool.query('SELECT * FROM quotes WHERE customer_id = $1 ORDER BY created_at DESC LIMIT 5', [customer_id])
    ]);
    if (!custRes.rows[0]) return res.status(404).json({ message: '客户不存在' });
    const suggestion = await aiService.generateQuoteSuggestion(custRes.rows[0], products || [], quoteRes.rows, { lang });
    res.json({ suggestion });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post('/contract-risk/:id', async (req: AuthRequest, res: Response) => { // 合同风险分析
  try {
    const { id } = req.params;
    const lang = req.body.lang || 'zh';
    const contractRes = await pool.query(`SELECT ct.*, c.company_name, cs.grade FROM contracts ct 
      JOIN customers c ON ct.customer_id = c.id LEFT JOIN customer_scores cs ON c.id = cs.customer_id WHERE ct.id = $1`, [id]);
    if (!contractRes.rows[0]) return res.status(404).json({ message: '合同不存在' });
    const contract = contractRes.rows[0];
    const risk = await aiService.analyzeContractRisk(contract, { company_name: contract.company_name, grade: contract.grade }, { lang });
    res.json(risk);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post('/query', async (req: AuthRequest, res: Response) => { // 自然语言查询
  try {
    const { query, lang = 'zh' } = req.body;
    const tables = ['customers', 'opportunities', 'orders', 'quotes', 'follow_ups', 'contracts'];
    const result = await aiService.naturalLanguageQuery(query, { tables, userRole: req.user?.role || 'sales' }, { lang });
    if (result.needsExecution && result.sql) {
      if (!/^SELECT/i.test(result.sql.trim()) || /DELETE|UPDATE|DROP|INSERT|ALTER/i.test(result.sql)) {
        return res.json({ answer: '不允许执行该查询', data: null });
      }
      try {
        const dbRes = await pool.query(result.sql);
        res.json({ answer: result.answer || '查询完成', data: dbRes.rows, sql: result.sql });
      } catch (dbErr: any) { res.json({ answer: `查询失败: ${dbErr.message}`, data: null }); }
    } else { res.json({ answer: result.answer, data: null }); }
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post('/pipeline-analysis', async (req: AuthRequest, res: Response) => { // 销售管道分析
  try {
    const { lang = 'zh' } = req.body;
    const userId = req.user?.role === UserRole.ADMIN || req.user?.role === UserRole.SALES_MANAGER ? null : req.user?.userId;
    const oppQuery = userId 
      ? `SELECT o.*, c.company_name as customer_name, u.name as owner_name FROM opportunities o JOIN customers c ON o.customer_id = c.id LEFT JOIN users u ON o.owner_id = u.id WHERE o.owner_id = $1`
      : `SELECT o.*, c.company_name as customer_name, u.name as owner_name FROM opportunities o JOIN customers c ON o.customer_id = c.id LEFT JOIN users u ON o.owner_id = u.id`;
    const oppRes = await pool.query(oppQuery, userId ? [userId] : []);
    const opps = oppRes.rows;
    const active = opps.filter(o => !['closed_won', 'closed_lost'].includes(o.stage));
    const won = opps.filter(o => o.stage === 'closed_won');
    const lost = opps.filter(o => o.stage === 'closed_lost');
    const summary = {
      totalActive: active.length,
      totalAmount: active.reduce((s, o) => s + Number(o.amount || 0), 0),
      closedWonCount: won.length,
      closedWonAmount: won.reduce((s, o) => s + Number(o.amount || 0), 0),
      closedLostCount: lost.length
    };
    const analysis = await aiService.analyzePipeline(opps, summary, { lang });
    res.json({ analysis, summary });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post('/generate-email', async (req: AuthRequest, res: Response) => { // 生成跟进邮件
  try {
    const { customerName, stage, notes, lang = 'zh' } = req.body;
    const email = await aiService.generateEmail(customerName, stage, notes || [], { lang });
    res.json({ email });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post('/refine-notes', async (req: AuthRequest, res: Response) => { // 整理会议记录
  try {
    const { rawText, lang = 'zh' } = req.body;
    const refined = await aiService.refineMeetingNotes(rawText, { lang });
    res.json({ refined });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post('/ai-score/:id', async (req: AuthRequest, res: Response) => { // AI客户评分
  try {
    const { id } = req.params;
    const lang = req.body.lang || 'zh';
    const [custRes, orderRes, followRes] = await Promise.all([
      pool.query('SELECT * FROM customers WHERE id = $1', [id]),
      pool.query('SELECT * FROM orders WHERE customer_id = $1 ORDER BY created_at DESC', [id]),
      pool.query('SELECT * FROM follow_ups WHERE customer_id = $1 ORDER BY created_at DESC LIMIT 10', [id])
    ]);
    if (!custRes.rows[0]) return res.status(404).json({ message: '客户不存在' });
    const score = await aiService.calculateAIScore(custRes.rows[0], orderRes.rows, followRes.rows, { lang });
    res.json(score);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get('/config', async (req: AuthRequest, res: Response) => { // 获取AI配置状态
  try {
    const userId = req.user?.userId;
    const userCfg = userId ? userAIConfigs.get(userId) : undefined;
    const defaultCfg = aiService.getDefaultConfig();
    res.json({ default: defaultCfg, user: userCfg ? { provider: userCfg.provider, hasGemini: !!userCfg.geminiKey, hasOpenai: !!userCfg.openaiKey, hasDeepseek: !!userCfg.deepseekKey } : null });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post('/config', async (req: AuthRequest, res: Response) => { // 保存用户AI配置
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: '未登录' });
    const { provider, geminiKey, openaiKey, deepseekKey } = req.body as UserAIConfig;
    const cfg: UserAIConfig = { provider, geminiKey, openaiKey, deepseekKey };
    if (geminiKey || openaiKey || deepseekKey) { userAIConfigs.set(userId, cfg); aiService.setUserConfig(cfg); }
    else { userAIConfigs.delete(userId); aiService.clearUserConfig(); }
    res.json({ success: true, message: '配置已保存' });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.delete('/config', async (req: AuthRequest, res: Response) => { // 清除用户AI配置（使用系统默认）
  try {
    const userId = req.user?.userId;
    if (userId) { userAIConfigs.delete(userId); aiService.clearUserConfig(); }
    res.json({ success: true, message: '已恢复系统默认配置' });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

export default router;
