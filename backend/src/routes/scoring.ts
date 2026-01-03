import { Router, Response } from 'express';
import { customerScoringService } from '../services/CustomerScoringService.js';
import { forecastService } from '../services/ForecastService.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { UserRole } from '../types/index.js';

const router = Router();
router.use(authMiddleware);

// 客户评分
router.get('/scores', async (req: AuthRequest, res: Response) => {
  try {
    const { grade, limit } = req.query;
    const scores = await customerScoringService.getScores({ grade: grade as string, limit: limit ? parseInt(limit as string, 10) : undefined });
    res.json(scores);
  } catch { res.status(500).json({ error: '获取客户评分失败' }); }
});

router.get('/scores/distribution', async (req: AuthRequest, res: Response) => {
  try {
    const distribution = await customerScoringService.getGradeDistribution();
    res.json(distribution);
  } catch { res.status(500).json({ error: '获取评分分布失败' }); }
});

router.get('/scores/:customerId', async (req: AuthRequest, res: Response) => {
  try {
    const score = await customerScoringService.getCustomerScore(req.params.customerId);
    res.json(score);
  } catch { res.status(500).json({ error: '获取客户评分失败' }); }
});

router.post('/scores/calculate', authorize(UserRole.ADMIN), async (req: AuthRequest, res: Response) => {
  try {
    const count = await customerScoringService.calculateScores();
    res.json({ success: true, count, message: `已计算 ${count} 个客户的评分` });
  } catch { res.status(500).json({ error: '计算评分失败' }); }
});

// 销售预测
router.get('/forecast/my', async (req: AuthRequest, res: Response) => {
  try {
    const year = parseInt(req.query.year as string, 10) || new Date().getFullYear();
    const month = parseInt(req.query.month as string, 10) || new Date().getMonth() + 1;
    const forecast = await forecastService.getForecast(req.user!.userId, year, month);
    res.json(forecast);
  } catch { res.status(500).json({ error: '获取预测失败' }); }
});

router.get('/forecast/team', authorize(UserRole.SALES_MANAGER, UserRole.ADMIN), async (req: AuthRequest, res: Response) => {
  try {
    const year = parseInt(req.query.year as string, 10) || new Date().getFullYear();
    const month = parseInt(req.query.month as string, 10) || new Date().getMonth() + 1;
    const forecasts = await forecastService.getTeamForecast(year, month);
    res.json(forecasts);
  } catch { res.status(500).json({ error: '获取团队预测失败' }); }
});

router.get('/forecast/summary', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.role === UserRole.SALES_REP ? req.user.userId : (req.query.user_id as string);
    const summary = await forecastService.getForecastSummary(userId);
    res.json(summary);
  } catch { res.status(500).json({ error: '获取预测摘要失败' }); }
});

router.post('/forecast/generate', async (req: AuthRequest, res: Response) => {
  try {
    const year = parseInt(req.body.year, 10) || new Date().getFullYear();
    const month = parseInt(req.body.month, 10) || new Date().getMonth() + 1;
    const amount = await forecastService.generateForecast(req.user!.userId, year, month);
    res.json({ success: true, forecast_amount: amount });
  } catch { res.status(500).json({ error: '生成预测失败' }); }
});

router.post('/forecast', async (req: AuthRequest, res: Response) => {
  try {
    const { year, month, amount, confidence, notes } = req.body;
    if (!year || !month || amount === undefined) return res.status(400).json({ error: '参数不完整' });
    const forecast = await forecastService.setManualForecast(req.user!.userId, year, month, amount, confidence || 'medium', notes);
    res.json(forecast);
  } catch { res.status(500).json({ error: '设置预测失败' }); }
});

router.get('/funnel', async (req: AuthRequest, res: Response) => { // 销售漏斗分析
  try { const data = await forecastService.getFunnelAnalysis(); res.json(data); }
  catch { res.status(500).json({ error: '获取漏斗分析失败' }); }
});

router.get('/trend', async (req: AuthRequest, res: Response) => { // 趋势分析
  try { const months = parseInt(req.query.months as string) || 6; const data = await forecastService.getTrendAnalysis(months); res.json(data); }
  catch { res.status(500).json({ error: '获取趋势分析失败' }); }
});

router.get('/ranking', authorize(UserRole.SALES_MANAGER, UserRole.ADMIN), async (req: AuthRequest, res: Response) => { // 销售排行
  try {
    const year = parseInt(req.query.year as string) || undefined;
    const month = parseInt(req.query.month as string) || undefined;
    const data = await forecastService.getSalesRanking(year, month);
    res.json(data);
  } catch { res.status(500).json({ error: '获取排行榜失败' }); }
});

router.get('/alerts', async (req: AuthRequest, res: Response) => { // 智能预警
  try { const data = await forecastService.getAlerts(); res.json(data); }
  catch { res.status(500).json({ error: '获取预警失败' }); }
});

export default router;
