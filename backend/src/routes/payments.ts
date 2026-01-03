import { Router, Response } from 'express';
import { paymentPlanRepository } from '../repositories/PaymentPlanRepository';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { order_id, customer_id, status } = req.query;
    const plans = await paymentPlanRepository.findAll({ order_id: order_id as string, customer_id: customer_id as string, status: status as string });
    res.json(plans);
  } catch { res.status(500).json({ error: '获取回款计划失败' }); }
});

router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    const { customer_id } = req.query;
    const stats = await paymentPlanRepository.getStats(customer_id as string);
    res.json(stats);
  } catch { res.status(500).json({ error: '获取回款统计失败' }); }
});

router.get('/overdue', async (req: AuthRequest, res: Response) => {
  try {
    const plans = await paymentPlanRepository.getOverduePlans();
    res.json(plans);
  } catch { res.status(500).json({ error: '获取逾期回款失败' }); }
});

router.post('/batch/delete', async (req: AuthRequest, res: Response) => { // 批量删除
  try {
    const { ids } = req.body;
    if (!ids?.length) return res.status(400).json({ error: '请选择回款计划' });
    const count = await paymentPlanRepository.batchDelete(ids);
    res.json({ success: true, deleted: count });
  } catch { res.status(500).json({ error: '批量删除失败' }); }
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const plan = await paymentPlanRepository.findById(req.params.id);
    if (!plan) return res.status(404).json({ error: '回款计划不存在' });
    res.json(plan);
  } catch { res.status(500).json({ error: '获取回款计划失败' }); }
});

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { order_id, customer_id, plan_amount, plan_date } = req.body;
    if (!order_id || !customer_id || !plan_amount || !plan_date) return res.status(400).json({ error: '参数不完整' });
    const plan = await paymentPlanRepository.create(req.body);
    res.status(201).json(plan);
  } catch { res.status(500).json({ error: '创建回款计划失败' }); }
});

router.post('/:id/record', async (req: AuthRequest, res: Response) => {
  try {
    const { amount, date } = req.body;
    if (!amount) return res.status(400).json({ error: '请输入回款金额' });
    const plan = await paymentPlanRepository.recordPayment(req.params.id, amount, date || new Date().toISOString().split('T')[0]);
    if (!plan) return res.status(404).json({ error: '回款计划不存在' });
    res.json(plan);
  } catch { res.status(500).json({ error: '记录回款失败' }); }
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const success = await paymentPlanRepository.delete(req.params.id);
    res.json({ success });
  } catch { res.status(500).json({ error: '删除回款计划失败' }); }
});

router.put('/:id', async (req: AuthRequest, res: Response) => { // 更新回款计划
  try {
    const plan = await paymentPlanRepository.update(req.params.id, req.body);
    if (!plan) return res.status(404).json({ error: '回款计划不存在' });
    res.json(plan);
  } catch { res.status(500).json({ error: '更新回款计划失败' }); }
});

export default router;
