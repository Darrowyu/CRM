import { Router, Response } from 'express';
import { userRepository } from '../repositories/UserRepository.js';
import { generateToken, authMiddleware, AuthRequest } from '../middleware/auth.js';
import { toUserResponse } from '../models/User.js';
import { query } from '../db/connection.js';
import { getUserPermissions } from '../middleware/authorize.js';

const router = Router();

router.post('/login', async (req, res: Response) => { // 用户登录
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: '用户名和密码不能为空' });
    }

    const user = await userRepository.findByUsername(username);
    if (!user) {
      return res.status(401).json({ error: 'AUTH_INVALID', message: '用户名或密码错误' });
    }

    const isValid = await userRepository.verifyPassword(user, password);
    if (!isValid) {
      return res.status(401).json({ error: 'AUTH_INVALID', message: '用户名或密码错误' });
    }

    const token = generateToken({ userId: user.id, username: user.username, role: user.role });

    // 获取用户权限列表
    const permissions = await getUserPermissions(user.id, user.role);

    try { // 记录登录日志
      const forwarded = req.headers['x-forwarded-for'];
      const ip = (Array.isArray(forwarded) ? forwarded[0] : forwarded) || req.socket.remoteAddress || '';
      const ua = req.headers['user-agent'] || '';
      const result = await query(`INSERT INTO operation_logs (user_id, action, ip_address, user_agent) VALUES ($1, $2, $3, $4) RETURNING id`, [user.id, 'login', ip, ua]);
      console.log('[Auth] Login log created:', result.rows[0]?.id);
    } catch (e) { console.error('[Auth] Log error:', e); }

    return res.json({ token, user: toUserResponse(user), permissions });
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '服务器错误' });
  }
});

router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => { // 获取当前用户
  try {
    const user = await userRepository.findById(req.user!.userId);
    if (!user) {
      return res.status(404).json({ error: 'NOT_FOUND', message: '用户不存在' });
    }
    return res.json(toUserResponse(user));
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '服务器错误' });
  }
});

router.get('/translations/:locale', async (req, res: Response) => { // 公开翻译API（无需认证）
  try {
    const { locale } = req.params;
    const result = await query('SELECT key, value FROM translations WHERE locale = $1', [locale]);
    const translations: Record<string, string> = {};
    result.rows.forEach((row: { key: string; value: string }) => { translations[row.key] = row.value; });
    return res.json(translations);
  } catch (error) {
    return res.json({}); // 失败时返回空对象，前端降级到静态翻译
  }
});

export default router;
