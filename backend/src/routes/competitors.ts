import { Router, Response } from 'express';
import { competitorRepository } from '../repositories/CompetitorRepository';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { UserRole } from '../types/index';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const competitors = await competitorRepository.findAll();
    res.json(competitors);
  } catch { res.status(500).json({ error: '获取竞争对手列表失败' }); }
});

router.get('/stats/overview', async (req: AuthRequest, res: Response) => { // 统计概览
  try { const stats = await competitorRepository.getStats(); res.json(stats); }
  catch { res.status(500).json({ error: '获取统计失败' }); }
});

router.post('/batch/delete', authorize(UserRole.ADMIN), async (req: AuthRequest, res: Response) => { // 批量删除
  try {
    const { ids } = req.body;
    if (!ids?.length) return res.status(400).json({ error: '请选择竞争对手' });
    const count = await competitorRepository.batchDelete(ids);
    res.json({ success: true, deleted: count });
  } catch { res.status(500).json({ error: '批量删除失败' }); }
});

router.get('/:id/opportunities', async (req: AuthRequest, res: Response) => { // 获取关联商机
  try { const list = await competitorRepository.getCompetitorOpportunities(req.params.id); res.json(list); }
  catch { res.status(500).json({ error: '获取关联商机失败' }); }
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const competitor = await competitorRepository.findById(req.params.id);
    if (!competitor) return res.status(404).json({ error: '竞争对手不存在' });
    res.json(competitor);
  } catch { res.status(500).json({ error: '获取竞争对手失败' }); }
});

router.post('/', authorize(UserRole.SALES_MANAGER, UserRole.ADMIN), async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: '请输入竞争对手名称' });
    const competitor = await competitorRepository.create({ ...req.body, created_by: req.user!.userId });
    res.status(201).json(competitor);
  } catch { res.status(500).json({ error: '创建竞争对手失败' }); }
});

router.put('/:id', authorize(UserRole.SALES_MANAGER, UserRole.ADMIN), async (req: AuthRequest, res: Response) => {
  try {
    const competitor = await competitorRepository.update(req.params.id, req.body);
    if (!competitor) return res.status(404).json({ error: '竞争对手不存在' });
    res.json(competitor);
  } catch { res.status(500).json({ error: '更新竞争对手失败' }); }
});

router.delete('/:id', authorize(UserRole.ADMIN), async (req: AuthRequest, res: Response) => {
  try {
    const success = await competitorRepository.delete(req.params.id);
    res.json({ success });
  } catch { res.status(500).json({ error: '删除竞争对手失败' }); }
});

// 商机竞争分析
router.get('/opportunity/:opportunityId', async (req: AuthRequest, res: Response) => {
  try {
    const competitors = await competitorRepository.getOpportunityCompetitors(req.params.opportunityId);
    res.json(competitors);
  } catch { res.status(500).json({ error: '获取商机竞争分析失败' }); }
});

router.post('/opportunity/:opportunityId', async (req: AuthRequest, res: Response) => {
  try {
    const { competitor_id, threat_level, notes } = req.body;
    if (!competitor_id) return res.status(400).json({ error: '请选择竞争对手' });
    const result = await competitorRepository.addOpportunityCompetitor({ opportunity_id: req.params.opportunityId, competitor_id, threat_level, notes });
    res.json(result);
  } catch { res.status(500).json({ error: '添加竞争分析失败' }); }
});

router.delete('/opportunity/:opportunityId/:competitorId', async (req: AuthRequest, res: Response) => {
  try {
    const success = await competitorRepository.removeOpportunityCompetitor(req.params.opportunityId, req.params.competitorId);
    res.json({ success });
  } catch { res.status(500).json({ error: '删除竞争分析失败' }); }
});

export default router;
