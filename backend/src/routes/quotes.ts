import { Router, Response } from 'express';
import { quoteRepository } from '../repositories/QuoteRepository.js';
import { productRepository } from '../repositories/ProductRepository.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { UserRole, QuoteStatus } from '../types/index.js';
import { isValidUUID, validateAmount } from '../middleware/validators.js';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req: AuthRequest, res: Response) => { // 获取报价单列表
  try {
    const { opportunity_id, pending } = req.query;
    if (opportunity_id) return res.json(await quoteRepository.findByOpportunity(opportunity_id as string));
    if (pending === 'true') return res.json(await quoteRepository.findPendingApproval());
    return res.json(await quoteRepository.findAllWithDetails());
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '服务器错误' });
  }
});

router.get('/stats/summary', async (_req: AuthRequest, res: Response) => { // 获取统计数据
  try {
    const stats = await quoteRepository.getStatistics();
    return res.json(stats);
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '获取统计失败' });
  }
});

router.post('/batch/delete', async (req: AuthRequest, res: Response) => { // 批量删除
  try {
    const { ids } = req.body;
    if (!ids?.length) return res.status(400).json({ error: 'VALIDATION_ERROR', message: '请选择报价单' });
    const count = await quoteRepository.batchDelete(ids);
    return res.json({ success: true, deleted: count });
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '批量删除失败' });
  }
});

router.post('/batch/submit', async (req: AuthRequest, res: Response) => { // 批量提交审批
  try {
    const { ids } = req.body;
    if (!ids?.length) return res.status(400).json({ error: 'VALIDATION_ERROR', message: '请选择报价单' });
    const count = await quoteRepository.batchSubmit(ids);
    return res.json({ success: true, submitted: count });
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '批量提交失败' });
  }
});

router.get('/:id', async (req: AuthRequest, res: Response) => { // 获取单个报价单详情
  try {
    const quote = await quoteRepository.findByIdWithDetails(req.params.id);
    if (!quote) return res.status(404).json({ error: 'NOT_FOUND', message: '报价单不存在' });
    const [items, logs] = await Promise.all([quoteRepository.getItemsWithProduct(req.params.id), quoteRepository.getApprovalLogs(req.params.id)]);
    return res.json({ ...quote, items, approval_logs: logs });
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '服务器错误' });
  }
});

router.post('/', async (req: AuthRequest, res: Response) => { // 创建报价单
  try {
    const { customer_id, opportunity_id, items } = req.body;
    if (!customer_id || !items?.length) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: '客户ID和报价项为必填' });
    }
    if (!isValidUUID(customer_id)) return res.status(400).json({ error: 'VALIDATION_ERROR', message: '无效的客户ID格式' });
    // 验证报价项
    for (const item of items) {
      if (!isValidUUID(item.product_id)) return res.status(400).json({ error: 'VALIDATION_ERROR', message: '无效的产品ID格式' });
      const priceCheck = validateAmount(item.unit_price, '单价');
      if (!priceCheck.valid) return res.status(400).json({ error: 'VALIDATION_ERROR', message: priceCheck.message });
      if (!item.quantity || item.quantity <= 0) return res.status(400).json({ error: 'VALIDATION_ERROR', message: '数量必须大于0' });
    }
    // 批量获取产品信息(修复N+1)
    const productIds = [...new Set(items.map((i: any) => i.product_id))];
    const products = await productRepository.findByIds(productIds as string[]);
    const floorPrices = new Map<string, number>();
    products.forEach(p => floorPrices.set(p.id, p.floor_price || 0));
    const quote = await quoteRepository.createQuote(
      { customer_id, opportunity_id, items, created_by: req.user!.userId },
      floorPrices
    );
    return res.status(201).json(quote);
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '服务器错误' });
  }
});


router.post('/:id/approve', authorize(UserRole.SALES_MANAGER, UserRole.ADMIN), async (req: AuthRequest, res: Response) => { // 审批通过
  try {
    const quote = await quoteRepository.approve(req.params.id, req.user!.userId, req.body.comment);
    if (!quote) return res.status(404).json({ error: 'NOT_FOUND', message: '报价单不存在' });
    return res.json(quote);
  } catch (error: any) {
    if (error.message?.includes('无法从')) return res.status(400).json({ error: 'INVALID_STATUS', message: error.message }); // 状态机校验失败
    return res.status(500).json({ error: 'SERVER_ERROR', message: '服务器错误' });
  }
});

router.post('/:id/reject', authorize(UserRole.SALES_MANAGER, UserRole.ADMIN), async (req: AuthRequest, res: Response) => { // 审批拒绝
  try {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ error: 'VALIDATION_ERROR', message: '拒绝原因为必填' });
    const quote = await quoteRepository.reject(req.params.id, req.user!.userId, reason);
    if (!quote) return res.status(404).json({ error: 'NOT_FOUND', message: '报价单不存在' });
    return res.json(quote);
  } catch (error: any) {
    if (error.message?.includes('无法从')) return res.status(400).json({ error: 'INVALID_STATUS', message: error.message }); // 状态机校验失败
    return res.status(500).json({ error: 'SERVER_ERROR', message: '服务器错误' });
  }
});

router.put('/:id', async (req: AuthRequest, res: Response) => { // 更新报价单(仅草稿)
  try {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'VALIDATION_ERROR', message: '无效的报价单ID格式' });
    const quote = await quoteRepository.findById(req.params.id);
    if (!quote) return res.status(404).json({ error: 'NOT_FOUND', message: '报价单不存在' });
    if (quote.status !== 'draft') return res.status(400).json({ error: 'VALIDATION_ERROR', message: '只能编辑草稿状态的报价单' });
    const { items } = req.body;
    if (!items?.length) return res.status(400).json({ error: 'VALIDATION_ERROR', message: '报价项不能为空' });
    // 验证报价项
    for (const item of items) {
      if (!isValidUUID(item.product_id)) return res.status(400).json({ error: 'VALIDATION_ERROR', message: '无效的产品ID格式' });
      const priceCheck = validateAmount(item.unit_price, '单价');
      if (!priceCheck.valid) return res.status(400).json({ error: 'VALIDATION_ERROR', message: priceCheck.message });
      if (!item.quantity || item.quantity <= 0) return res.status(400).json({ error: 'VALIDATION_ERROR', message: '数量必须大于0' });
    }
    // 批量获取产品信息(修复N+1)
    const productIds = [...new Set(items.map((i: any) => i.product_id))];
    const products = await productRepository.findByIds(productIds as string[]);
    const floorPrices = new Map<string, number>();
    products.forEach(p => floorPrices.set(p.id, p.floor_price || 0));
    const updated = await quoteRepository.updateQuoteItems(req.params.id, items, floorPrices);
    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '更新失败' });
  }
});

router.delete('/:id', async (req: AuthRequest, res: Response) => { // 删除报价单(仅草稿)
  try {
    const quote = await quoteRepository.findById(req.params.id);
    if (!quote) return res.status(404).json({ error: 'NOT_FOUND', message: '报价单不存在' });
    if (quote.status !== 'draft') return res.status(400).json({ error: 'VALIDATION_ERROR', message: '只能删除草稿状态的报价单' });
    await quoteRepository.delete(req.params.id);
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '删除失败' });
  }
});

router.post('/:id/submit', async (req: AuthRequest, res: Response) => { // 提交审批
  try {
    const quote = await quoteRepository.findById(req.params.id);
    if (!quote) return res.status(404).json({ error: 'NOT_FOUND', message: '报价单不存在' });
    if (quote.status !== 'draft') return res.status(400).json({ error: 'VALIDATION_ERROR', message: '只有草稿状态可提交审批' });
    const updated = await quoteRepository.update(req.params.id, { status: QuoteStatus.PENDING_MANAGER });
    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '提交失败' });
  }
});

router.post('/:id/convert-to-order', async (req: AuthRequest, res: Response) => { // 转为订单
  try {
    const quote = await quoteRepository.findById(req.params.id);
    if (!quote) return res.status(404).json({ error: 'NOT_FOUND', message: '报价单不存在' });
    if (quote.status !== 'approved') return res.status(400).json({ error: 'VALIDATION_ERROR', message: '只有已批准的报价单可转订单' });
    const order = await quoteRepository.convertToOrder(req.params.id);
    return res.status(201).json(order);
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '转换失败' });
  }
});

router.post('/:id/copy', async (req: AuthRequest, res: Response) => { // 复制报价单
  try {
    const quote = await quoteRepository.copyQuote(req.params.id, req.user!.userId);
    if (!quote) return res.status(404).json({ error: 'NOT_FOUND', message: '报价单不存在' });
    return res.status(201).json(quote);
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '复制失败' });
  }
});

export default router;
