import { Router, Response } from 'express'; // Express路由
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { aiAgentService, AgentTask } from '../services/AIAgentService.js';
import { checkPermission } from '../middleware/authorize.js';

const router = Router();
router.use(authMiddleware);

// 工作流管理 - 需要 agent:workflow 权限
router.post('/workflow', checkPermission('agent:workflow'), async (req: AuthRequest, res: Response) => {
  try {
    const { name, tasks } = req.body as { name: string; tasks: AgentTask[] };
    if (!name || !tasks?.length) return res.status(400).json({ message: '缺少工作流名称或任务' });
    const workflow = await aiAgentService.executeWorkflow(name, tasks);
    res.json(workflow);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get('/workflow/:id', async (req: AuthRequest, res: Response) => { // 获取工作流状态
  const workflow = aiAgentService.getWorkflow(req.params.id);
  if (!workflow) return res.status(404).json({ message: '工作流不存在' });
  res.json(workflow);
});

router.get('/workflows', async (_req: AuthRequest, res: Response) => { // 列出工作流
  res.json(aiAgentService.listWorkflows());
});

// 客户激活 - 需要 agent:reactivation 权限
router.post('/stale-customers', checkPermission('agent:reactivation'), async (req: AuthRequest, res: Response) => {
  try {
    const { days = 30 } = req.body;
    const result = await aiAgentService.analyzeStaleCustomers(days);
    res.json(result);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post('/batch-suggestions', checkPermission('agent:reactivation'), async (req: AuthRequest, res: Response) => {
  try {
    const { customerIds } = req.body;
    if (!customerIds?.length) return res.status(400).json({ message: '缺少客户ID列表' });
    const result = await aiAgentService.batchFollowUpSuggestions(customerIds);
    res.json(result);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// 智能分析 - 需要 agent:analyze 权限（所有认证用户默认有）
router.get('/pipeline-health', checkPermission('agent:analyze'), async (_req: AuthRequest, res: Response) => {
  try {
    const result = await aiAgentService.pipelineHealthCheck();
    res.json(result);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get('/at-risk', checkPermission('agent:analyze'), async (_req: AuthRequest, res: Response) => {
  try {
    const result = await aiAgentService.identifyAtRiskOpportunities();
    res.json(result);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get('/daily-summary', checkPermission('agent:analyze'), async (req: AuthRequest, res: Response) => {
  try {
    const summary = await aiAgentService.generateDailySummary(req.user?.userId);
    res.json({ summary });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// AI评分 - 需要 agent:scoring 权限
router.post('/auto-score', checkPermission('agent:scoring'), async (req: AuthRequest, res: Response) => {
  try {
    const { limit = 10 } = req.body;
    const result = await aiAgentService.autoScoreCustomers(limit);
    res.json(result);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

export default router;
