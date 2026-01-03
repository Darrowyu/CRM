import { Router, Response } from 'express';
import { taskRepository } from '../repositories/TaskRepository';
import { notificationRepository } from '../repositories/NotificationRepository';
import { NotificationType } from '../types/tasks';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { UserRole } from '../types/index';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { status, customer_id, all } = req.query;
    const filters: Record<string, string | undefined> = { status: status as string, customer_id: customer_id as string };
    if (all !== 'true' && req.user?.role !== UserRole.ADMIN && req.user?.role !== UserRole.SALES_MANAGER) { filters.assigned_to = req.user?.userId; }
    const tasks = await taskRepository.findAll(filters);
    res.json(tasks);
  } catch { res.status(500).json({ error: '获取任务列表失败' }); }
});

router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    const stats = await taskRepository.getTaskStats(req.user!.userId);
    res.json(stats);
  } catch { res.status(500).json({ error: '获取任务统计失败' }); }
});

router.post('/batch/complete', async (req: AuthRequest, res: Response) => { // 批量完成
  try {
    const { ids } = req.body;
    if (!ids?.length) return res.status(400).json({ error: '请选择任务' });
    const count = await taskRepository.batchComplete(ids, req.user!.userId);
    res.json({ success: true, completed: count });
  } catch { res.status(500).json({ error: '批量完成失败' }); }
});

router.post('/batch/delete', async (req: AuthRequest, res: Response) => { // 批量删除
  try {
    const { ids } = req.body;
    if (!ids?.length) return res.status(400).json({ error: '请选择任务' });
    const count = await taskRepository.batchDelete(ids, req.user!.userId);
    res.json({ success: true, deleted: count });
  } catch { res.status(500).json({ error: '批量删除失败' }); }
});

router.get('/team/members', async (req: AuthRequest, res: Response) => { // 获取团队成员
  try {
    if (req.user?.role !== UserRole.SALES_MANAGER && req.user?.role !== UserRole.ADMIN) {
      return res.status(403).json({ error: '无权限' });
    }
    const members = await taskRepository.getTeamMembers(req.user!.userId);
    res.json(members);
  } catch { res.status(500).json({ error: '获取团队成员失败' }); }
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const task = await taskRepository.findById(req.params.id);
    if (!task) return res.status(404).json({ error: '任务不存在' });
    res.json(task);
  } catch { res.status(500).json({ error: '获取任务失败' }); }
});

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, type, priority, due_date, reminder_time, customer_id, opportunity_id, assigned_to } = req.body;
    if (!title || !type) return res.status(400).json({ error: '标题和类型必填' });
    const task = await taskRepository.create({ title, description, type, priority, due_date, reminder_time, customer_id, opportunity_id, assigned_to: assigned_to || req.user!.userId, created_by: req.user!.userId });
    if (assigned_to && assigned_to !== req.user!.userId) {
      await notificationRepository.create({ user_id: assigned_to, type: NotificationType.TASK_REMINDER, title: '新任务分配', content: `您有一个新任务：${title}`, related_type: 'task', related_id: task.id });
    }
    res.status(201).json(task);
  } catch { res.status(500).json({ error: '创建任务失败' }); }
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const task = await taskRepository.findById(req.params.id);
    if (!task) return res.status(404).json({ error: '任务不存在' });
    if (task.assigned_to !== req.user!.userId && req.user?.role !== UserRole.ADMIN && req.user?.role !== UserRole.SALES_MANAGER) {
      return res.status(403).json({ error: '无权修改此任务' });
    }
    const updated = await taskRepository.update(req.params.id, req.body);
    res.json(updated);
  } catch { res.status(500).json({ error: '更新任务失败' }); }
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const task = await taskRepository.findById(req.params.id);
    if (!task) return res.status(404).json({ error: '任务不存在' });
    if (task.created_by !== req.user!.userId && req.user?.role !== UserRole.ADMIN) {
      return res.status(403).json({ error: '无权删除此任务' });
    }
    await taskRepository.delete(req.params.id);
    res.json({ success: true });
  } catch { res.status(500).json({ error: '删除任务失败' }); }
});

export default router;
