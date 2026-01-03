import { Router, Response } from 'express';
import { getDashboardStats, getConversionBySource, getFunnelStats, getSalesTrend, getPendingTasks, getRecentFollowUps, getExpiringContracts, getSalesRanking } from '../services/DashboardService.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { UserRole } from '../types/index.js';

const router = Router();
router.use(authMiddleware);

const handle = (fn: (req: AuthRequest) => Promise<any>) => async (req: AuthRequest, res: Response) => { // 统一错误处理
  try { return res.json(await fn(req)); }
  catch (e) { console.error('Dashboard error:', e); return res.status(500).json({ error: 'SERVER_ERROR' }); }
};

router.get('/stats', handle(req => getDashboardStats(req.user!.userId, req.user!.role as UserRole)));
router.get('/conversion', handle(() => getConversionBySource()));
router.get('/funnel', handle(() => getFunnelStats()));
router.get('/trend', handle(req => getSalesTrend(req.user!.userId, req.user!.role as UserRole)));
router.get('/tasks', handle(req => getPendingTasks(req.user!.userId, req.user!.role as UserRole)));
router.get('/followups', handle(req => getRecentFollowUps(req.user!.userId, req.user!.role as UserRole)));
router.get('/contracts', handle(() => getExpiringContracts()));
router.get('/ranking', handle(() => getSalesRanking()));

export default router;
