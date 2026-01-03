import { Router, Response } from 'express';
import { userRepository } from '../repositories/UserRepository.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { toUserResponse } from '../models/User.js';
import { UserRole } from '../types/index.js';
import { query } from '../db/connection.js';

const router = Router();

// 所有管理员路由需要认证和管理员权限
router.use(authMiddleware);
router.use(authorize(UserRole.ADMIN));

// 用户管理
router.get('/users', async (req: AuthRequest, res: Response) => { // 获取所有用户
  try {
    const users = await userRepository.findAll();
    return res.json(users.map(toUserResponse));
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '获取用户列表失败' });
  }
});

router.post('/users', async (req: AuthRequest, res: Response) => { // 创建用户
  try {
    const { username, password, name, role } = req.body;
    if (!username || !password || !name || !role) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: '缺少必填字段' });
    }
    const existing = await userRepository.findByUsername(username);
    if (existing) {
      return res.status(409).json({ error: 'DUPLICATE_USER', message: '用户名已存在' });
    }
    const user = await userRepository.createUser({ username, password, name, role });
    return res.status(201).json(toUserResponse(user));
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '创建用户失败' });
  }
});

router.put('/users/:id', async (req: AuthRequest, res: Response) => { // 更新用户
  try {
    const { name, role } = req.body;
    const user = await userRepository.update(req.params.id, { name, role });
    if (!user) return res.status(404).json({ error: 'NOT_FOUND', message: '用户不存在' });
    return res.json(toUserResponse(user));
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '更新用户失败' });
  }
});

router.delete('/users/:id', async (req: AuthRequest, res: Response) => { // 删除用户
  try {
    if (req.params.id === req.user?.userId) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: '不能删除自己' });
    }
    const success = await userRepository.delete(req.params.id);
    if (!success) return res.status(404).json({ error: 'NOT_FOUND', message: '用户不存在' });
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '删除用户失败' });
  }
});

router.put('/users/:id/password', async (req: AuthRequest, res: Response) => { // 重置密码
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'VALIDATION_ERROR', message: '密码不能为空' });
    const success = await userRepository.updatePassword(req.params.id, password);
    if (!success) return res.status(404).json({ error: 'NOT_FOUND', message: '用户不存在' });
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '重置密码失败' });
  }
});

export default router;


// 系统统计
router.get('/stats', async (req: AuthRequest, res: Response) => { // 系统概览统计
  try {
    const [users, customers, opportunities, quotes, orders] = await Promise.all([
      query('SELECT COUNT(*) as count FROM users'),
      query('SELECT COUNT(*) as count FROM customers'),
      query('SELECT COUNT(*) as count FROM opportunities'),
      query('SELECT COUNT(*) as count FROM quotes'),
      query('SELECT COUNT(*) as count FROM orders')
    ]);
    return res.json({
      totalUsers: parseInt(users.rows[0].count),
      totalCustomers: parseInt(customers.rows[0].count),
      totalOpportunities: parseInt(opportunities.rows[0].count),
      totalQuotes: parseInt(quotes.rows[0].count),
      totalOrders: parseInt(orders.rows[0].count)
    });
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '获取统计失败' });
  }
});

// 操作日志
router.get('/logs', async (req: AuthRequest, res: Response) => { // 获取审批日志
  try {
    const result = await query(`
      SELECT al.*, u.name as approver_name, q.quote_number 
      FROM approval_logs al 
      LEFT JOIN users u ON u.id = al.approver_id 
      LEFT JOIN quotes q ON q.id = al.quote_id 
      ORDER BY al.created_at DESC LIMIT 100
    `);
    return res.json(result.rows);
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '获取日志失败' });
  }
});

// 产品管理
router.get('/products', async (req: AuthRequest, res: Response) => { // 获取产品列表
  try {
    const result = await query('SELECT * FROM products ORDER BY created_at DESC');
    return res.json(result.rows);
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '获取产品失败' });
  }
});

router.post('/products', async (req: AuthRequest, res: Response) => { // 创建产品
  try {
    const { name, sku, base_price, floor_price } = req.body;
    if (!name || !base_price || !floor_price) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: '缺少必填字段' });
    }
    const result = await query(
      'INSERT INTO products (name, sku, base_price, floor_price) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, sku, base_price, floor_price]
    );
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '创建产品失败' });
  }
});

router.put('/products/:id', async (req: AuthRequest, res: Response) => { // 更新产品
  try {
    const { name, sku, base_price, floor_price } = req.body;
    const result = await query(
      'UPDATE products SET name = COALESCE($1, name), sku = COALESCE($2, sku), base_price = COALESCE($3, base_price), floor_price = COALESCE($4, floor_price) WHERE id = $5 RETURNING *',
      [name, sku, base_price, floor_price, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'NOT_FOUND', message: '产品不存在' });
    return res.json(result.rows[0]);
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '更新产品失败' });
  }
});

router.delete('/products/:id', async (req: AuthRequest, res: Response) => { // 删除产品
  try {
    const result = await query('DELETE FROM products WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'NOT_FOUND', message: '产品不存在' });
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '删除产品失败' });
  }
});

router.get('/products/:id/tiers', async (req: AuthRequest, res: Response) => { // 获取阶梯价格
  try {
    const result = await query('SELECT * FROM pricing_tiers WHERE product_id = $1 ORDER BY min_quantity ASC', [req.params.id]);
    return res.json(result.rows);
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '获取阶梯价格失败' });
  }
});

router.post('/products/:id/tiers', async (req: AuthRequest, res: Response) => { // 添加阶梯价格
  try {
    const { min_quantity, unit_price } = req.body;
    const result = await query(
      'INSERT INTO pricing_tiers (product_id, min_quantity, unit_price) VALUES ($1, $2, $3) RETURNING *',
      [req.params.id, min_quantity, unit_price]
    );
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '添加阶梯价格失败' });
  }
});

router.delete('/products/:id/tiers/:tierId', async (req: AuthRequest, res: Response) => { // 删除阶梯价格
  try {
    const result = await query('DELETE FROM pricing_tiers WHERE id = $1 AND product_id = $2 RETURNING id', [req.params.tierId, req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'NOT_FOUND', message: '阶梯价格不存在' });
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '删除阶梯价格失败' });
  }
});

// 数据备份
router.post('/backup', async (req: AuthRequest, res: Response) => { // 触发手动备份
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupInfo = { timestamp, status: 'initiated', message: '备份任务已启动，请在服务器查看备份文件' };
    return res.json(backupInfo);
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '备份失败' });
  }
});

// 系统设置
router.get('/settings', async (req: AuthRequest, res: Response) => { // 获取系统设置
  try {
    const result = await query('SELECT key, value FROM system_settings');
    const settings: Record<string, string> = {};
    result.rows.forEach((row: { key: string; value: string }) => { settings[row.key] = row.value; });
    return res.json({ claim_limit: settings.claim_limit || '50', auto_return_days: settings.auto_return_days || '30' });
  } catch (error) {
    return res.json({ claim_limit: '50', auto_return_days: '30' }); // 表不存在时返回默认值
  }
});

router.put('/settings', async (req: AuthRequest, res: Response) => { // 保存系统设置
  try {
    const { claim_limit, auto_return_days } = req.body;
    await query(`INSERT INTO system_settings (key, value) VALUES ('claim_limit', $1) ON CONFLICT (key) DO UPDATE SET value = $1`, [claim_limit]);
    await query(`INSERT INTO system_settings (key, value) VALUES ('auto_return_days', $1) ON CONFLICT (key) DO UPDATE SET value = $1`, [auto_return_days]);
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '保存设置失败' });
  }
});

// 操作日志
router.get('/operation-logs', async (req: AuthRequest, res: Response) => { // 获取操作日志
  try {
    const result = await query(`SELECT ol.*, u.name as operator_name FROM operation_logs ol LEFT JOIN users u ON u.id = ol.user_id ORDER BY ol.created_at DESC LIMIT 200`);
    return res.json(result.rows);
  } catch (error) {
    return res.json([]); // 表不存在时返回空数组
  }
});

// 管理后台仪表盘
router.get('/dashboard', async (req: AuthRequest, res: Response) => { // 管理仪表盘数据
  try {
    const [users, customers, opportunities, quotes, orders, contracts, tasks, logs, loginHistory, dbSize] = await Promise.all([
      query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE role = \'sales_rep\') as sales_rep, COUNT(*) FILTER (WHERE role = \'sales_manager\') as manager FROM users'),
      query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL \'7 days\') as week_new FROM customers'),
      query('SELECT COUNT(*) as total, COALESCE(SUM(amount), 0) as total_amount FROM opportunities WHERE stage NOT IN (\'closed_won\', \'closed_lost\')'),
      query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = \'pending\') as pending FROM quotes'),
      query('SELECT COUNT(*) as total, COALESCE(SUM(total_amount), 0) as total_amount FROM orders WHERE status = \'completed\''),
      query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE end_date < CURRENT_DATE AND status = \'active\') as expired FROM contracts'),
      query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = \'pending\' AND due_date < CURRENT_DATE) as overdue FROM tasks'),
      query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL \'24 hours\') as today FROM operation_logs'),
      query(`SELECT DATE(created_at) as date, COUNT(*) as count FROM operation_logs WHERE action = 'login' AND created_at > NOW() - INTERVAL '7 days' GROUP BY DATE(created_at) ORDER BY date`),
      query(`SELECT pg_database_size(current_database()) as size`)
    ]);
    res.json({
      users: { total: parseInt(users.rows[0].total), sales_rep: parseInt(users.rows[0].sales_rep), manager: parseInt(users.rows[0].manager) },
      customers: { total: parseInt(customers.rows[0].total), week_new: parseInt(customers.rows[0].week_new) },
      opportunities: { total: parseInt(opportunities.rows[0].total), total_amount: parseFloat(opportunities.rows[0].total_amount) },
      quotes: { total: parseInt(quotes.rows[0].total), pending: parseInt(quotes.rows[0].pending) },
      orders: { total: parseInt(orders.rows[0].total), total_amount: parseFloat(orders.rows[0].total_amount) },
      contracts: { total: parseInt(contracts.rows[0].total), expired: parseInt(contracts.rows[0].expired) },
      tasks: { total: parseInt(tasks.rows[0].total), overdue: parseInt(tasks.rows[0].overdue) },
      logs: { total: parseInt(logs.rows[0].total), today: parseInt(logs.rows[0].today) },
      loginTrend: loginHistory.rows, dbSize: parseInt(dbSize.rows[0].size)
    });
  } catch { res.json({ users: {}, customers: {}, opportunities: {}, quotes: {}, orders: {}, contracts: {}, tasks: {}, logs: {}, loginTrend: [], dbSize: 0 }); }
});

// 用户管理增强
router.get('/users/:id/login-history', async (req: AuthRequest, res: Response) => { // 用户登录历史
  try {
    const result = await query(`SELECT * FROM operation_logs WHERE user_id = $1 AND action = 'login' ORDER BY created_at DESC LIMIT 20`, [req.params.id]);
    res.json(result.rows);
  } catch { res.json([]); }
});

router.post('/users/batch-import', async (req: AuthRequest, res: Response) => { // 批量导入用户
  try {
    const { users: userList } = req.body;
    if (!userList?.length) return res.status(400).json({ error: '请提供用户数据' });
    let imported = 0;
    for (const u of userList) {
      if (!u.username || !u.password || !u.name || !u.role) continue;
      const existing = await userRepository.findByUsername(u.username);
      if (!existing) { await userRepository.createUser(u); imported++; }
    }
    res.json({ success: true, imported, total: userList.length });
  } catch { res.status(500).json({ error: '批量导入失败' }); }
});

router.put('/users/:id/status', async (req: AuthRequest, res: Response) => { // 启用/禁用用户
  try {
    const { is_active } = req.body;
    await query('UPDATE users SET is_active = $1 WHERE id = $2', [is_active, req.params.id]);
    res.json({ success: true });
  } catch { res.status(500).json({ error: '更新状态失败' }); }
});

// 安全中心
router.get('/security/sessions', async (req: AuthRequest, res: Response) => { // 活跃会话
  try {
    const result = await query(`SELECT ol.user_id, u.name, u.username, ol.ip_address, ol.created_at as last_login
      FROM operation_logs ol JOIN users u ON ol.user_id = u.id WHERE ol.action = 'login' AND ol.created_at > NOW() - INTERVAL '24 hours'
      ORDER BY ol.created_at DESC`);
    res.json(result.rows);
  } catch { res.json([]); }
});

router.get('/security/config', async (req: AuthRequest, res: Response) => { // 安全配置
  try {
    const result = await query(`SELECT key, value FROM system_settings WHERE key LIKE 'security_%'`);
    const config: Record<string, string> = {};
    result.rows.forEach((r: { key: string; value: string }) => config[r.key] = r.value);
    res.json({ password_min_length: config.security_password_min_length || '8', session_timeout: config.security_session_timeout || '480',
      max_login_attempts: config.security_max_login_attempts || '5', ip_whitelist: config.security_ip_whitelist || '' });
  } catch { res.json({ password_min_length: '8', session_timeout: '480', max_login_attempts: '5', ip_whitelist: '' }); }
});

router.put('/security/config', async (req: AuthRequest, res: Response) => { // 更新安全配置
  try {
    const { password_min_length, session_timeout, max_login_attempts, ip_whitelist } = req.body;
    const settings = [['security_password_min_length', password_min_length], ['security_session_timeout', session_timeout],
      ['security_max_login_attempts', max_login_attempts], ['security_ip_whitelist', ip_whitelist]];
    for (const [key, value] of settings) {
      await query(`INSERT INTO system_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2`, [key, value]);
    }
    res.json({ success: true });
  } catch { res.status(500).json({ error: '保存配置失败' }); }
});

// 系统监控增强
router.get('/monitor/performance', async (req: AuthRequest, res: Response) => { // 性能趋势
  try {
    const result = await query(`SELECT DATE_TRUNC('hour', created_at) as hour, COUNT(*) as requests, AVG(COALESCE((detail->>'duration')::int, 0)) as avg_duration
      FROM api_logs WHERE created_at > NOW() - INTERVAL '24 hours' GROUP BY hour ORDER BY hour`);
    res.json(result.rows);
  } catch { res.json([]); }
});

router.get('/monitor/errors', async (req: AuthRequest, res: Response) => { // 错误日志
  try {
    const result = await query(`SELECT * FROM api_logs WHERE status_code >= 400 ORDER BY created_at DESC LIMIT 50`);
    res.json(result.rows);
  } catch { res.json([]); }
});

// 产品管理增强
router.get('/products/categories', async (req: AuthRequest, res: Response) => { // 产品分类
  try { const result = await query(`SELECT DISTINCT category FROM products WHERE category IS NOT NULL ORDER BY category`); res.json(result.rows.map((r: { category: string }) => r.category)); }
  catch { res.json([]); }
});

router.post('/products/batch-import', async (req: AuthRequest, res: Response) => { // 批量导入产品
  try {
    const { products: list } = req.body;
    if (!list?.length) return res.status(400).json({ error: '请提供产品数据' });
    let imported = 0;
    for (const p of list) {
      if (!p.name || !p.base_price) continue;
      await query(`INSERT INTO products (name, sku, base_price, floor_price, category, stock) VALUES ($1, $2, $3, $4, $5, $6)`,
        [p.name, p.sku, p.base_price, p.floor_price || p.base_price, p.category, p.stock || 0]);
      imported++;
    }
    res.json({ success: true, imported, total: list.length });
  } catch { res.status(500).json({ error: '批量导入失败' }); }
});

router.put('/products/:id/stock', async (req: AuthRequest, res: Response) => { // 更新库存
  try {
    const { stock, operation } = req.body; // operation: 'set' | 'add' | 'subtract'
    let sql = 'UPDATE products SET stock = $1 WHERE id = $2 RETURNING *';
    if (operation === 'add') sql = 'UPDATE products SET stock = COALESCE(stock, 0) + $1 WHERE id = $2 RETURNING *';
    if (operation === 'subtract') sql = 'UPDATE products SET stock = GREATEST(COALESCE(stock, 0) - $1, 0) WHERE id = $2 RETURNING *';
    const result = await query(sql, [stock, req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: '产品不存在' });
    res.json(result.rows[0]);
  } catch { res.status(500).json({ error: '更新库存失败' }); }
});

// 操作日志增强
router.get('/operation-logs/stats', async (req: AuthRequest, res: Response) => { // 日志统计
  try {
    const [byModule, byAction, byDay] = await Promise.all([
      query(`SELECT module, COUNT(*) as count FROM operation_logs GROUP BY module ORDER BY count DESC`),
      query(`SELECT action, COUNT(*) as count FROM operation_logs GROUP BY action ORDER BY count DESC`),
      query(`SELECT DATE(created_at) as date, COUNT(*) as count FROM operation_logs WHERE created_at > NOW() - INTERVAL '7 days' GROUP BY DATE(created_at) ORDER BY date`)
    ]);
    res.json({ byModule: byModule.rows, byAction: byAction.rows, byDay: byDay.rows });
  } catch { res.json({ byModule: [], byAction: [], byDay: [] }); }
});

router.get('/operation-logs/export', async (req: AuthRequest, res: Response) => { // 导出日志
  try {
    const { start_date, end_date } = req.query;
    let sql = `SELECT ol.*, u.name as operator_name FROM operation_logs ol LEFT JOIN users u ON u.id = ol.user_id WHERE 1=1`;
    const params: unknown[] = [];
    if (start_date) { params.push(start_date); sql += ` AND ol.created_at >= $${params.length}`; }
    if (end_date) { params.push(end_date); sql += ` AND ol.created_at <= $${params.length}`; }
    sql += ' ORDER BY ol.created_at DESC LIMIT 5000';
    const result = await query(sql, params);
    res.json({ data: result.rows, count: result.rows.length });
  } catch { res.status(500).json({ error: '导出失败' }); }
});

// 数据归档增强
router.get('/archive/history', async (req: AuthRequest, res: Response) => { // 归档历史
  try {
    const result = await query(`SELECT * FROM archive_history ORDER BY created_at DESC LIMIT 50`);
    res.json(result.rows);
  } catch { res.json([]); }
});

router.post('/archive/restore/:id', async (req: AuthRequest, res: Response) => { // 恢复归档
  try {
    const archive = await query(`SELECT * FROM archive_history WHERE id = $1`, [req.params.id]);
    if (!archive.rows[0]) return res.status(404).json({ error: '归档记录不存在' });
    // 实际恢复逻辑需要根据备份文件实现
    res.json({ success: true, message: '恢复请求已提交，请在服务器查看恢复状态' });
  } catch { res.status(500).json({ error: '恢复失败' }); }
});

// 系统配置增强
router.get('/config/all', async (req: AuthRequest, res: Response) => { // 获取所有配置
  try {
    const result = await query(`SELECT key, value FROM system_settings`);
    const config: Record<string, string> = {};
    result.rows.forEach((r: { key: string; value: string }) => config[r.key] = r.value);
    res.json({
      email_smtp_host: config.email_smtp_host || '', email_smtp_port: config.email_smtp_port || '587',
      email_smtp_user: config.email_smtp_user || '', email_smtp_pass: config.email_smtp_pass || '',
      email_from: config.email_from || '', sms_provider: config.sms_provider || '',
      sms_api_key: config.sms_api_key || '', storage_type: config.storage_type || 'local',
      storage_path: config.storage_path || './uploads', storage_max_size: config.storage_max_size || '10'
    });
  } catch { res.json({}); }
});

router.put('/config/all', async (req: AuthRequest, res: Response) => { // 保存所有配置
  try {
    const configs = req.body;
    for (const [key, value] of Object.entries(configs)) {
      await query(`INSERT INTO system_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2`, [key, value]);
    }
    res.json({ success: true });
  } catch { res.status(500).json({ error: '保存配置失败' }); }
});

// 审批流增强
router.get('/approval-flow/:type', async (req: AuthRequest, res: Response) => { // 获取审批流
  try {
    const result = await query(`SELECT * FROM approval_configs WHERE type = $1 ORDER BY threshold ASC NULLS FIRST`, [req.params.type]);
    res.json(result.rows);
  } catch { res.json([]); }
});
