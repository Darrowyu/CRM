import { Router, Response } from 'express';
import { orderRepository } from '../repositories/OrderRepository.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { UserRole } from '../types/index.js';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req: AuthRequest, res: Response) => { // 获取订单列表
  try {
    const { customer_id } = req.query;
    let orders;
    if (customer_id) {
      orders = await orderRepository.findByCustomer(customer_id as string);
    } else {
      orders = await orderRepository.findAll();
    }
    return res.json(orders);
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '服务器错误' });
  }
});

router.get('/:id', async (req: AuthRequest, res: Response) => { // 获取单个订单
  try {
    const order = await orderRepository.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'NOT_FOUND', message: '订单不存在' });
    const contracts = await orderRepository.getContracts(req.params.id);
    return res.json({ ...order, contracts });
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '服务器错误' });
  }
});

router.post('/', async (req: AuthRequest, res: Response) => { // 创建订单
  try {
    const { customer_id, quote_id, total_amount } = req.body;
    if (!customer_id || !total_amount) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: '客户ID和金额为必填' });
    }
    const order = await orderRepository.createOrder({ customer_id, quote_id, total_amount });
    return res.status(201).json(order);
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '服务器错误' });
  }
});

router.post('/:id/payment', authorize(UserRole.FINANCE, UserRole.ADMIN), async (req: AuthRequest, res: Response) => { // 更新付款
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'VALIDATION_ERROR', message: '金额必须大于0' });
    const order = await orderRepository.updatePayment(req.params.id, amount);
    if (!order) return res.status(404).json({ error: 'NOT_FOUND', message: '订单不存在' });
    return res.json(order);
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '服务器错误' });
  }
});

router.post('/:id/contract', async (req: AuthRequest, res: Response) => { // 上传合同
  try {
    const { file_url, file_name, file_type } = req.body;
    if (!file_url || !file_name) return res.status(400).json({ error: 'VALIDATION_ERROR', message: '文件信息为必填' });
    const result = await orderRepository.addContract(req.params.id, file_url, file_name, file_type);
    if ('error' in result) return res.status(400).json({ error: 'VALIDATION_ERROR', message: result.error });
    return res.status(201).json(result);
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '服务器错误' });
  }
});

export default router;
