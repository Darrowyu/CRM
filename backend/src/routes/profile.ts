import { Router, Response } from 'express';
import crypto from 'crypto';
import { userRepository, validatePassword } from '../repositories/UserRepository.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { toUserResponse } from '../models/User.js';
import { query } from '../db/connection.js';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req: AuthRequest, res: Response) => { // 获取当前用户信息
  try {
    const user = await userRepository.findById(req.user!.userId);
    if (!user) return res.status(404).json({ error: 'NOT_FOUND', message: '用户不存在' });
    const prefs = await query(`SELECT key, value FROM user_preferences WHERE user_id = $1 AND key IN ('phone', 'email')`, [req.user!.userId]);
    const extra: Record<string, string> = {}; prefs.rows.forEach((r: { key: string; value: string }) => extra[r.key] = r.value);
    return res.json({ ...toUserResponse(user), phone: extra.phone || '', email: extra.email || '' });
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '获取用户信息失败' });
  }
});

router.put('/', async (req: AuthRequest, res: Response) => { // 更新个人信息
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'VALIDATION_ERROR', message: '姓名不能为空' });
    const user = await userRepository.update(req.user!.userId, { name });
    if (!user) return res.status(404).json({ error: 'NOT_FOUND', message: '用户不存在' });
    return res.json(toUserResponse(user));
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '更新失败' });
  }
});

router.put('/avatar', async (req: AuthRequest, res: Response) => { // 更新头像
  try {
    const { avatar } = req.body;
    if (!avatar) return res.status(400).json({ error: 'VALIDATION_ERROR', message: '头像路径不能为空' });
    const user = await userRepository.update(req.user!.userId, { avatar });
    if (!user) return res.status(404).json({ error: 'NOT_FOUND', message: '用户不存在' });
    return res.json(toUserResponse(user));
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '更新头像失败' });
  }
});

router.put('/password', async (req: AuthRequest, res: Response) => { // 修改密码
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) return res.status(400).json({ error: 'VALIDATION_ERROR', message: '请填写完整' });
    const validation = validatePassword(newPassword); // 使用统一密码策略
    if (!validation.valid) return res.status(400).json({ error: 'VALIDATION_ERROR', message: validation.message });
    const user = await userRepository.findById(req.user!.userId);
    if (!user) return res.status(404).json({ error: 'NOT_FOUND', message: '用户不存在' });
    const valid = await userRepository.verifyPassword(user, oldPassword);
    if (!valid) return res.status(400).json({ error: 'INVALID_PASSWORD', message: '原密码错误' });
    await userRepository.updatePassword(req.user!.userId, newPassword);
    return res.json({ success: true, message: '密码修改成功' });
  } catch (error: any) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: error.message || '修改密码失败' });
  }
});

// 获取用户偏好设置
router.get('/preferences', async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(`SELECT key, value FROM user_preferences WHERE user_id = $1`, [req.user!.userId]);
    const prefs: Record<string, any> = {};
    result.rows.forEach((r: { key: string; value: string }) => { try { prefs[r.key] = JSON.parse(r.value); } catch { prefs[r.key] = r.value; } });
    res.json({ notifications: prefs.notifications || { opportunity: true, task: true, approval: true, system: true }, dashboard: prefs.dashboard || [], theme: prefs.theme || 'light', emailSignature: prefs.emailSignature || '', exportFormat: prefs.exportFormat || 'xlsx', aiStyle: prefs.aiStyle || 'professional', twoFactorEnabled: prefs.twoFactorEnabled || false });
  } catch { res.json({ notifications: { opportunity: true, task: true, approval: true, system: true }, dashboard: [], theme: 'light', emailSignature: '', exportFormat: 'xlsx', aiStyle: 'professional', twoFactorEnabled: false }); }
});

// 保存用户偏好设置
router.put('/preferences', async (req: AuthRequest, res: Response) => {
  try {
    const prefs = req.body;
    for (const [key, value] of Object.entries(prefs)) {
      const val = typeof value === 'string' ? value : JSON.stringify(value);
      await query(`INSERT INTO user_preferences (user_id, key, value) VALUES ($1, $2, $3) ON CONFLICT (user_id, key) DO UPDATE SET value = $3`, [req.user!.userId, key, val]);
    }
    res.json({ success: true });
  } catch { res.status(500).json({ error: '保存偏好失败' }); }
});

// 获取登录历史
router.get('/login-history', async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(`SELECT ip_address, user_agent, created_at FROM operation_logs WHERE user_id = $1 AND action = 'login' ORDER BY created_at DESC LIMIT 10`, [req.user!.userId]);
    res.json(result.rows);
  } catch { res.json([]); }
});

// 获取绑定设备
router.get('/devices', async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(`SELECT id, device_name, device_type, last_active, created_at FROM user_devices WHERE user_id = $1 ORDER BY last_active DESC`, [req.user!.userId]);
    res.json(result.rows);
  } catch { res.json([]); }
});

// 解绑设备
router.delete('/devices/:id', async (req: AuthRequest, res: Response) => {
  try {
    await query(`DELETE FROM user_devices WHERE id = $1 AND user_id = $2`, [req.params.id, req.user!.userId]);
    res.json({ success: true });
  } catch { res.status(500).json({ error: '解绑失败' }); }
});

// 更新个人信息（扩展）
router.put('/info', async (req: AuthRequest, res: Response) => {
  try {
    const { name, phone, email } = req.body;
    if (name) await userRepository.update(req.user!.userId, { name }); // 更新姓名到users表
    if (phone !== undefined) await query(`INSERT INTO user_preferences (user_id, key, value) VALUES ($1, 'phone', $2) ON CONFLICT (user_id, key) DO UPDATE SET value = $2`, [req.user!.userId, phone]);
    if (email !== undefined) await query(`INSERT INTO user_preferences (user_id, key, value) VALUES ($1, 'email', $2) ON CONFLICT (user_id, key) DO UPDATE SET value = $2`, [req.user!.userId, email]);
    const user = await userRepository.findById(req.user!.userId);
    if (!user) return res.status(404).json({ error: 'NOT_FOUND' });
    const prefs = await query(`SELECT key, value FROM user_preferences WHERE user_id = $1 AND key IN ('phone', 'email')`, [req.user!.userId]);
    const extra: Record<string, string> = {}; prefs.rows.forEach((r: { key: string; value: string }) => extra[r.key] = r.value);
    res.json({ ...toUserResponse(user), phone: extra.phone || '', email: extra.email || '' });
  } catch { res.status(500).json({ error: '更新失败' }); }
});

// 两步验证设置
router.post('/two-factor/enable', async (req: AuthRequest, res: Response) => {
  try {
    const secret = crypto.randomBytes(20).toString('hex').substring(0, 16).toUpperCase(); // 安全随机生成
    await query(`INSERT INTO user_preferences (user_id, key, value) VALUES ($1, 'twoFactorSecret', $2) ON CONFLICT (user_id, key) DO UPDATE SET value = $2`, [req.user!.userId, secret]);
    await query(`INSERT INTO user_preferences (user_id, key, value) VALUES ($1, 'twoFactorEnabled', 'true') ON CONFLICT (user_id, key) DO UPDATE SET value = 'true'`, [req.user!.userId]);
    res.json({ success: true, secret });
  } catch { res.status(500).json({ error: '启用失败' }); }
});

router.post('/two-factor/disable', async (req: AuthRequest, res: Response) => {
  try {
    await query(`UPDATE user_preferences SET value = 'false' WHERE user_id = $1 AND key = 'twoFactorEnabled'`, [req.user!.userId]);
    res.json({ success: true });
  } catch { res.status(500).json({ error: '禁用失败' }); }
});

export default router;
