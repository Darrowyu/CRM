import { Router, Response } from 'express';
import { notificationRepository } from '../repositories/NotificationRepository';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

// 获取通知列表
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { limit, unread_only } = req.query;
    const notifications = await notificationRepository.findByUser(req.user!.userId, limit ? parseInt(limit as string, 10) : 50, unread_only === 'true');
    res.json(notifications);
  } catch (err) { res.status(500).json({ error: '获取通知失败' }); }
});

// 获取未读数量
router.get('/unread-count', async (req: AuthRequest, res: Response) => {
  try {
    const count = await notificationRepository.getUnreadCount(req.user!.userId);
    res.json({ count });
  } catch (err) { res.status(500).json({ error: '获取未读数量失败' }); }
});

// 标记单条已读
router.post('/:id/read', async (req: AuthRequest, res: Response) => {
  try {
    const success = await notificationRepository.markAsRead(req.params.id, req.user!.userId);
    res.json({ success });
  } catch (err) { res.status(500).json({ error: '标记已读失败' }); }
});

// 标记全部已读
router.post('/read-all', async (req: AuthRequest, res: Response) => {
  try {
    const count = await notificationRepository.markAllAsRead(req.user!.userId);
    res.json({ count });
  } catch (err) { res.status(500).json({ error: '标记全部已读失败' }); }
});

// 删除通知
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const success = await notificationRepository.delete(req.params.id, req.user!.userId);
    res.json({ success });
  } catch (err) { res.status(500).json({ error: '删除通知失败' }); }
});

export default router;
