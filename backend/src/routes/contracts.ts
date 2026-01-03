import { Router, Response } from 'express';
import { contractRepository } from '../repositories/ContractRepository';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { customer_id, status } = req.query;
    const contracts = await contractRepository.findAll({ customer_id: customer_id as string, status: status as string });
    res.json(contracts);
  } catch { res.status(500).json({ error: '获取合同列表失败' }); }
});

router.get('/expiring', async (req: AuthRequest, res: Response) => {
  try {
    const days = parseInt(req.query.days as string, 10) || 30;
    const contracts = await contractRepository.getExpiringContracts(days);
    res.json(contracts);
  } catch { res.status(500).json({ error: '获取即将到期合同失败' }); }
});

router.get('/stats/summary', async (_req: AuthRequest, res: Response) => { // 获取统计
  try {
    const stats = await contractRepository.getStatistics();
    res.json(stats);
  } catch { res.status(500).json({ error: '获取统计失败' }); }
});

router.post('/batch/delete', async (req: AuthRequest, res: Response) => { // 批量删除
  try {
    const { ids } = req.body;
    if (!ids?.length) return res.status(400).json({ error: '请选择合同' });
    const count = await contractRepository.batchDelete(ids);
    res.json({ success: true, deleted: count });
  } catch { res.status(500).json({ error: '批量删除失败' }); }
});

router.post('/batch/status', async (req: AuthRequest, res: Response) => { // 批量更新状态
  try {
    const { ids, status } = req.body;
    if (!ids?.length || !status) return res.status(400).json({ error: '参数不完整' });
    const count = await contractRepository.batchUpdateStatus(ids, status);
    res.json({ success: true, updated: count });
  } catch { res.status(500).json({ error: '批量更新失败' }); }
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const contract = await contractRepository.findById(req.params.id);
    if (!contract) return res.status(404).json({ error: '合同不存在' });
    res.json(contract);
  } catch { res.status(500).json({ error: '获取合同失败' }); }
});

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { customer_id, title, amount } = req.body;
    if (!customer_id || !title || !amount) return res.status(400).json({ error: '参数不完整' });
    const contract = await contractRepository.create({ ...req.body, created_by: req.user!.userId });
    res.status(201).json(contract);
  } catch { res.status(500).json({ error: '创建合同失败' }); }
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const contract = await contractRepository.update(req.params.id, req.body);
    if (!contract) return res.status(404).json({ error: '合同不存在' });
    res.json(contract);
  } catch { res.status(500).json({ error: '更新合同失败' }); }
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const success = await contractRepository.delete(req.params.id);
    res.json({ success });
  } catch { res.status(500).json({ error: '删除合同失败' }); }
});

router.post('/:id/renew', async (req: AuthRequest, res: Response) => { // 续签合同
  try {
    const contract = await contractRepository.renewContract(req.params.id, req.user!.userId);
    if (!contract) return res.status(404).json({ error: '合同不存在' });
    res.status(201).json(contract);
  } catch { res.status(500).json({ error: '续签失败' }); }
});

export default router;
