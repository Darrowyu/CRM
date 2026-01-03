import { Router, Response } from 'express';
import { opportunityRepository } from '../repositories/OpportunityRepository.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { OpportunityStage, UserRole } from '../types/index.js';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req: AuthRequest, res: Response) => { // 获取商机列表
  try {
    const { customer_id, stage, all } = req.query;
    let opportunities;
    if (customer_id) {
      opportunities = await opportunityRepository.findByCustomer(customer_id as string);
    } else if (stage) {
      opportunities = await opportunityRepository.findByStage(stage as OpportunityStage);
    } else if (all === 'true') {
      opportunities = await opportunityRepository.findAllWithCustomer();
    } else {
      opportunities = await opportunityRepository.findByOwner(req.user!.userId);
    }
    return res.json(opportunities);
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '服务器错误' });
  }
});

router.get('/summary', async (req: AuthRequest, res: Response) => { // 获取各阶段汇总
  try {
    const summary = await opportunityRepository.getStageSummary();
    return res.json(summary);
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '服务器错误' });
  }
});

router.get('/:id', async (req: AuthRequest, res: Response) => { // 获取单个商机
  try {
    const opp = await opportunityRepository.findById(req.params.id);
    if (!opp) return res.status(404).json({ error: 'NOT_FOUND', message: '商机不存在' });
    return res.json(opp);
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '服务器错误' });
  }
});

router.post('/', async (req: AuthRequest, res: Response) => { // 创建商机
  try {
    const { customer_id, name, amount, expected_close_date } = req.body;
    if (!customer_id || !name) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: '客户ID和商机名称为必填' });
    }
    const opp = await opportunityRepository.createOpportunity({
      customer_id, name, amount, expected_close_date, owner_id: req.user!.userId
    });
    return res.status(201).json(opp);
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '服务器错误' });
  }
});


router.put('/:id/stage', async (req: AuthRequest, res: Response) => { // 更新商机阶段
  try {
    const { stage, loss_reason } = req.body;
    const opp = await opportunityRepository.findById(req.params.id);
    if (!opp) return res.status(404).json({ error: 'NOT_FOUND', message: '商机不存在' });
    if (req.user!.role !== UserRole.ADMIN && opp.owner_id !== req.user!.userId) { // 验证归属权限
      return res.status(403).json({ error: 'FORBIDDEN', message: '无权限操作此商机' });
    }
    const result = await opportunityRepository.updateStage(req.params.id, stage, loss_reason);
    if (!result.success) {
      const status = result.error === 'NOT_FOUND' ? 404 : 400;
      return res.status(status).json({ error: result.error, message: result.error });
    }
    return res.json(result.opportunity);
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '服务器错误' });
  }
});

router.put('/:id', async (req: AuthRequest, res: Response) => { // 更新商机
  try {
    const opp = await opportunityRepository.findById(req.params.id);
    if (!opp) return res.status(404).json({ error: 'NOT_FOUND', message: '商机不存在' });
    if (req.user!.role !== UserRole.ADMIN && opp.owner_id !== req.user!.userId) { // 验证归属权限
      return res.status(403).json({ error: 'FORBIDDEN', message: '无权限操作此商机' });
    }
    const updated = await opportunityRepository.update(req.params.id, req.body);
    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '服务器错误' });
  }
});

router.delete('/:id', async (req: AuthRequest, res: Response) => { // 删除商机
  try {
    const opp = await opportunityRepository.findById(req.params.id);
    if (!opp) return res.status(404).json({ error: 'NOT_FOUND', message: '商机不存在' });
    if (req.user!.role !== UserRole.ADMIN && opp.owner_id !== req.user!.userId) { // 验证归属权限
      return res.status(403).json({ error: 'FORBIDDEN', message: '无权限删除此商机' });
    }
    await opportunityRepository.delete(req.params.id);
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '服务器错误' });
  }
});

export default router;
