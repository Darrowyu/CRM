import { Router, Response } from 'express';
import { followUpRepository } from '../repositories/FollowUpRepository.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req: AuthRequest, res: Response) => { // 获取跟进记录
  try {
    const { customer_id, opportunity_id } = req.query;
    if (opportunity_id) { // 按商机查询
      const followUps = await followUpRepository.findByOpportunity(opportunity_id as string);
      return res.json(followUps);
    }
    if (!customer_id) return res.status(400).json({ error: 'VALIDATION_ERROR', message: '客户ID或商机ID为必填' });
    const followUps = await followUpRepository.findByCustomer(customer_id as string);
    return res.json(followUps);
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '服务器错误' });
  }
});

router.post('/', async (req: AuthRequest, res: Response) => { // 创建跟进记录
  try {
    const { customer_id, content, type, opportunity_id } = req.body;
    if (!customer_id || !content || !type) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: '客户ID、内容、类型为必填' });
    }
    const followUp = await followUpRepository.createWithAttachments({
      customer_id, content, type, opportunity_id, user_id: req.user!.userId, attachments: []
    });
    return res.status(201).json(followUp);
  } catch (error) {
    console.error('Create follow-up error:', error);
    return res.status(500).json({ error: 'SERVER_ERROR', message: '服务器错误' });
  }
});

export default router;
