import { Router, Response } from 'express';
import { contactRepository } from '../repositories/ContactRepository.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req: AuthRequest, res: Response) => { // 获取联系人列表
  try {
    const { customer_id } = req.query;
    if (!customer_id) return res.status(400).json({ error: 'VALIDATION_ERROR', message: '客户ID为必填' });
    const contacts = await contactRepository.findByCustomer(customer_id as string);
    return res.json(contacts);
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '服务器错误' });
  }
});

router.get('/:id', async (req: AuthRequest, res: Response) => { // 获取单个联系人
  try {
    const contact = await contactRepository.findById(req.params.id);
    if (!contact) return res.status(404).json({ error: 'NOT_FOUND', message: '联系人不存在' });
    return res.json(contact);
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '服务器错误' });
  }
});

router.post('/', async (req: AuthRequest, res: Response) => { // 创建联系人
  try {
    const { customer_id, name, phone, email, role, is_primary } = req.body;
    if (!customer_id || !name || !phone) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: '客户ID、姓名、电话为必填' });
    }
    const contact = await contactRepository.createContact({ customer_id, name, phone, email, role, is_primary });
    return res.status(201).json(contact);
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '服务器错误' });
  }
});

router.put('/:id', async (req: AuthRequest, res: Response) => { // 更新联系人
  try {
    const { name, phone, email, role } = req.body; // 只提取允许更新的字段
    const contact = await contactRepository.update(req.params.id, { name, phone, email, role });
    if (!contact) return res.status(404).json({ error: 'NOT_FOUND', message: '联系人不存在' });
    return res.json(contact);
  } catch (error) {
    logger.error(`Update contact error: ${error}`);
    return res.status(500).json({ error: 'SERVER_ERROR', message: '服务器错误' });
  }
});

router.post('/:id/set-primary', async (req: AuthRequest, res: Response) => { // 设为主联系人
  try {
    const contact = await contactRepository.findById(req.params.id);
    if (!contact) return res.status(404).json({ error: 'NOT_FOUND', message: '联系人不存在' });
    await contactRepository.setPrimaryContact(req.params.id, contact.customer_id);
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '服务器错误' });
  }
});

export default router;
