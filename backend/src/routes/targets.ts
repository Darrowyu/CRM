import { Router, Response } from 'express';
import { salesTargetRepository } from '../repositories/SalesTargetRepository';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { UserRole } from '../types/index';

const router = Router();
router.use(authMiddleware);

// 获取当前用户目标（含完成情况）
router.get('/my', async (req: AuthRequest, res: Response) => {
  try {
    const year = parseInt(req.query.year as string, 10) || new Date().getFullYear();
    const month = parseInt(req.query.month as string, 10) || new Date().getMonth() + 1;
    const target = await salesTargetRepository.findUserTarget(req.user!.userId, year, month);
    const actuals = await salesTargetRepository.getUserActuals(req.user!.userId, year, month);
    res.json({ target, actuals, achievement_rate: target && target.target_amount > 0 ? Math.round((actuals.amount / target.target_amount) * 100) : 0 });
  } catch (err) { res.status(500).json({ error: '获取目标失败' }); }
});

// 获取用户全年目标
router.get('/my/yearly', async (req: AuthRequest, res: Response) => {
  try {
    const year = parseInt(req.query.year as string, 10) || new Date().getFullYear();
    const targets = await salesTargetRepository.findUserTargets(req.user!.userId, year);
    res.json(targets);
  } catch (err) { res.status(500).json({ error: '获取年度目标失败' }); }
});

// 获取团队目标（经理/管理员）
router.get('/team', authorize(UserRole.SALES_MANAGER, UserRole.ADMIN), async (req: AuthRequest, res: Response) => {
  try {
    const year = parseInt(req.query.year as string, 10) || new Date().getFullYear();
    const month = parseInt(req.query.month as string, 10) || new Date().getMonth() + 1;
    const target = await salesTargetRepository.findTeamTarget(year, month);
    const actuals = await salesTargetRepository.getTeamActuals(year, month);
    const userTargets = await salesTargetRepository.getAllUserTargets(year, month);
    res.json({ target, actuals, userTargets, achievement_rate: target && target.target_amount > 0 ? Math.round((actuals.amount / target.target_amount) * 100) : 0 });
  } catch (err) { res.status(500).json({ error: '获取团队目标失败' }); }
});

// 设置个人目标（经理/管理员）
router.post('/user', authorize(UserRole.SALES_MANAGER, UserRole.ADMIN), async (req: AuthRequest, res: Response) => {
  try {
    const { user_id, year, month, target_amount, target_customers, target_opportunities } = req.body;
    if (!user_id || !year || !month || target_amount === undefined) return res.status(400).json({ error: '参数不完整' });
    const target = await salesTargetRepository.upsertUserTarget({ user_id, year, month, target_amount, target_customers, target_opportunities, created_by: req.user!.userId });
    res.json(target);
  } catch (err) { res.status(500).json({ error: '设置目标失败' }); }
});

// 设置团队目标（经理/管理员）
router.post('/team', authorize(UserRole.SALES_MANAGER, UserRole.ADMIN), async (req: AuthRequest, res: Response) => {
  try {
    const { year, month, target_amount, target_customers, target_opportunities } = req.body;
    if (!year || !month || target_amount === undefined) return res.status(400).json({ error: '参数不完整' });
    const target = await salesTargetRepository.upsertTeamTarget({ year, month, target_amount, target_customers, target_opportunities, created_by: req.user!.userId });
    res.json(target);
  } catch (err) { res.status(500).json({ error: '设置团队目标失败' }); }
});

// 获取年度趋势
router.get('/trend', async (req: AuthRequest, res: Response) => {
  try {
    const year = parseInt(req.query.year as string, 10) || new Date().getFullYear();
    const trend = await salesTargetRepository.getYearlyTrend(req.user!.userId, year);
    res.json(trend);
  } catch (err) { res.status(500).json({ error: '获取趋势失败' }); }
});

// 获取团队排行榜
router.get('/ranking', authorize(UserRole.SALES_MANAGER, UserRole.ADMIN), async (req: AuthRequest, res: Response) => {
  try {
    const year = parseInt(req.query.year as string, 10) || new Date().getFullYear();
    const month = parseInt(req.query.month as string, 10) || new Date().getMonth() + 1;
    const ranking = await salesTargetRepository.getTeamRanking(year, month);
    res.json(ranking);
  } catch (err) { res.status(500).json({ error: '获取排行榜失败' }); }
});

// 批量设置目标
router.post('/batch', authorize(UserRole.SALES_MANAGER, UserRole.ADMIN), async (req: AuthRequest, res: Response) => {
  try {
    const { targets, year, month } = req.body;
    if (!targets?.length || !year || !month) return res.status(400).json({ error: '参数不完整' });
    const count = await salesTargetRepository.batchSetTargets(targets, year, month, req.user!.userId);
    res.json({ success: true, count });
  } catch (err) { res.status(500).json({ error: '批量设置失败' }); }
});

export default router;
