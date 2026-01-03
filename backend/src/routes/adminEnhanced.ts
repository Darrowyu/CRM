import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { UserRole } from '../types/index.js';
import { query } from '../db/connection.js';

const router = Router();
router.use(authMiddleware);
router.use(authorize(UserRole.ADMIN));

// ========== 数据字典管理 ==========
router.get('/dictionaries', async (req: AuthRequest, res: Response) => { // 获取所有字典
  try {
    const { type } = req.query;
    const sql = type 
      ? 'SELECT * FROM dictionaries WHERE type = $1 ORDER BY sort_order' 
      : 'SELECT * FROM dictionaries ORDER BY type, sort_order';
    const result = await query(sql, type ? [type] : []);
    return res.json(result.rows);
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '获取字典失败' });
  }
});

router.post('/dictionaries', async (req: AuthRequest, res: Response) => { // 创建字典项
  try {
    const { type, code, label, sort_order = 0 } = req.body;
    const result = await query(
      'INSERT INTO dictionaries (type, code, label, sort_order) VALUES ($1, $2, $3, $4) RETURNING *',
      [type, code, label, sort_order]
    );
    return res.status(201).json(result.rows[0]);
  } catch (error: any) {
    if (error.code === '23505') return res.status(409).json({ error: 'DUPLICATE', message: '字典项已存在' });
    return res.status(500).json({ error: 'SERVER_ERROR', message: '创建失败' });
  }
});

router.put('/dictionaries/:id', async (req: AuthRequest, res: Response) => { // 更新字典项
  try {
    const { label, sort_order, enabled } = req.body;
    const result = await query(
      'UPDATE dictionaries SET label = COALESCE($1, label), sort_order = COALESCE($2, sort_order), enabled = COALESCE($3, enabled) WHERE id = $4 RETURNING *',
      [label, sort_order, enabled, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'NOT_FOUND' });
    return res.json(result.rows[0]);
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '更新失败' });
  }
});

router.delete('/dictionaries/:id', async (req: AuthRequest, res: Response) => { // 删除字典项
  try {
    const result = await query('DELETE FROM dictionaries WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'NOT_FOUND' });
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '删除失败' });
  }
});

// ========== 公告管理 ==========
router.get('/announcements', async (req: AuthRequest, res: Response) => { // 获取公告列表
  try {
    const result = await query('SELECT a.*, u.name as creator_name FROM announcements a LEFT JOIN users u ON u.id = a.created_by ORDER BY a.priority DESC, a.created_at DESC');
    return res.json(result.rows);
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '获取公告失败' });
  }
});

router.post('/announcements', async (req: AuthRequest, res: Response) => { // 创建公告
  try {
    const { title, content, type = 'info', priority = 0, start_time, end_time } = req.body;
    const result = await query(
      'INSERT INTO announcements (title, content, type, priority, start_time, end_time, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [title, content, type, priority, start_time, end_time, req.user!.userId]
    );
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '创建公告失败' });
  }
});

router.put('/announcements/:id', async (req: AuthRequest, res: Response) => { // 更新公告
  try {
    const { title, content, type, priority, start_time, end_time, is_active } = req.body;
    const result = await query(
      `UPDATE announcements SET title = COALESCE($1, title), content = COALESCE($2, content), type = COALESCE($3, type), 
       priority = COALESCE($4, priority), start_time = $5, end_time = $6, is_active = COALESCE($7, is_active) WHERE id = $8 RETURNING *`,
      [title, content, type, priority, start_time, end_time, is_active, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'NOT_FOUND' });
    return res.json(result.rows[0]);
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '更新公告失败' });
  }
});

router.delete('/announcements/:id', async (req: AuthRequest, res: Response) => { // 删除公告
  try {
    await query('DELETE FROM announcements WHERE id = $1', [req.params.id]);
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '删除公告失败' });
  }
});

// ========== 审批流配置 ==========
router.get('/approval-configs', async (req: AuthRequest, res: Response) => { // 获取审批配置
  try {
    const result = await query('SELECT ac.*, u.name as approver_name FROM approval_configs ac LEFT JOIN users u ON u.id = ac.approver_id ORDER BY ac.type, ac.threshold');
    return res.json(result.rows);
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '获取审批配置失败' });
  }
});

router.post('/approval-configs', async (req: AuthRequest, res: Response) => { // 创建审批配置
  try {
    const { name, type, threshold, approver_role, approver_id } = req.body;
    const result = await query(
      'INSERT INTO approval_configs (name, type, threshold, approver_role, approver_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, type, threshold, approver_role, approver_id]
    );
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '创建审批配置失败' });
  }
});

router.put('/approval-configs/:id', async (req: AuthRequest, res: Response) => { // 更新审批配置
  try {
    const { name, threshold, approver_role, approver_id, is_active } = req.body;
    const result = await query(
      'UPDATE approval_configs SET name = COALESCE($1, name), threshold = COALESCE($2, threshold), approver_role = $3, approver_id = $4, is_active = COALESCE($5, is_active) WHERE id = $6 RETURNING *',
      [name, threshold, approver_role, approver_id, is_active, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'NOT_FOUND' });
    return res.json(result.rows[0]);
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '更新审批配置失败' });
  }
});

router.delete('/approval-configs/:id', async (req: AuthRequest, res: Response) => { // 删除审批配置
  try {
    await query('DELETE FROM approval_configs WHERE id = $1', [req.params.id]);
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '删除审批配置失败' });
  }
});

// ========== 操作日志 ==========
router.get('/operation-logs', async (req: AuthRequest, res: Response) => { // 获取操作日志
  try {
    const { module, action, user_id, start_date, end_date } = req.query;
    let sql = 'SELECT ol.*, u.name as operator_name FROM operation_logs ol LEFT JOIN users u ON u.id = ol.user_id WHERE 1=1';
    const params: any[] = [];
    let idx = 1;
    if (module) { sql += ` AND ol.module = $${idx++}`; params.push(module); }
    if (action) { sql += ` AND ol.action = $${idx++}`; params.push(action); }
    if (user_id) { sql += ` AND ol.user_id = $${idx++}`; params.push(user_id); }
    if (start_date) { sql += ` AND ol.created_at >= $${idx++}`; params.push(start_date); }
    if (end_date) { sql += ` AND ol.created_at <= $${idx++}`; params.push(end_date); }
    sql += ' ORDER BY ol.created_at DESC LIMIT 500';
    const result = await query(sql, params);
    return res.json(result.rows);
  } catch (error) {
    return res.json([]);
  }
});

// ========== 角色权限管理 ==========
router.get('/roles', async (req: AuthRequest, res: Response) => { // 获取角色列表
  try {
    const result = await query('SELECT * FROM roles ORDER BY is_system DESC, name');
    return res.json(result.rows);
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '获取角色失败' });
  }
});

router.post('/roles', async (req: AuthRequest, res: Response) => { // 创建角色
  try {
    const { name, display_name, description } = req.body;
    const result = await query(
      'INSERT INTO roles (name, display_name, description) VALUES ($1, $2, $3) RETURNING *',
      [name, display_name, description]
    );
    return res.status(201).json(result.rows[0]);
  } catch (error: any) {
    if (error.code === '23505') return res.status(409).json({ error: 'DUPLICATE', message: '角色名已存在' });
    return res.status(500).json({ error: 'SERVER_ERROR', message: '创建角色失败' });
  }
});

router.put('/roles/:id', async (req: AuthRequest, res: Response) => { // 更新角色
  try {
    const { display_name, description } = req.body;
    const result = await query(
      'UPDATE roles SET display_name = COALESCE($1, display_name), description = $2 WHERE id = $3 AND is_system = false RETURNING *',
      [display_name, description, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'NOT_FOUND', message: '角色不存在或为系统角色' });
    return res.json(result.rows[0]);
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '更新角色失败' });
  }
});

router.delete('/roles/:id', async (req: AuthRequest, res: Response) => { // 删除角色
  try {
    const result = await query('DELETE FROM roles WHERE id = $1 AND is_system = false RETURNING id', [req.params.id]);
    if (!result.rows[0]) return res.status(400).json({ error: 'FORBIDDEN', message: '系统角色不可删除' });
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '删除角色失败' });
  }
});

router.get('/permissions', async (req: AuthRequest, res: Response) => { // 获取权限列表
  try {
    const result = await query('SELECT * FROM permissions ORDER BY module, code');
    return res.json(result.rows);
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '获取权限失败' });
  }
});

router.get('/roles/:id/permissions', async (req: AuthRequest, res: Response) => { // 获取角色权限
  try {
    const result = await query(
      'SELECT p.* FROM permissions p INNER JOIN role_permissions rp ON rp.permission_id = p.id WHERE rp.role_id = $1',
      [req.params.id]
    );
    return res.json(result.rows);
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '获取角色权限失败' });
  }
});

router.put('/roles/:id/permissions', async (req: AuthRequest, res: Response) => { // 更新角色权限
  try {
    const { permission_ids } = req.body;
    await query('DELETE FROM role_permissions WHERE role_id = $1', [req.params.id]);
    if (permission_ids?.length) {
      const values = permission_ids.map((pid: string, i: number) => `($1, $${i + 2})`).join(',');
      await query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ${values}`, [req.params.id, ...permission_ids]);
    }
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '更新角色权限失败' });
  }
});

// ========== 部门管理 ==========
router.get('/departments', async (req: AuthRequest, res: Response) => { // 获取部门列表
  try {
    const result = await query('SELECT d.*, u.name as manager_name FROM departments d LEFT JOIN users u ON u.id = d.manager_id ORDER BY d.sort_order');
    return res.json(result.rows);
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '获取部门失败' });
  }
});

router.post('/departments', async (req: AuthRequest, res: Response) => { // 创建部门
  try {
    const { name, parent_id, manager_id, sort_order = 0 } = req.body;
    const result = await query(
      'INSERT INTO departments (name, parent_id, manager_id, sort_order) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, parent_id, manager_id, sort_order]
    );
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '创建部门失败' });
  }
});

router.put('/departments/:id', async (req: AuthRequest, res: Response) => { // 更新部门
  try {
    const { name, parent_id, manager_id, sort_order } = req.body;
    const result = await query(
      'UPDATE departments SET name = COALESCE($1, name), parent_id = $2, manager_id = $3, sort_order = COALESCE($4, sort_order) WHERE id = $5 RETURNING *',
      [name, parent_id, manager_id, sort_order, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'NOT_FOUND' });
    return res.json(result.rows[0]);
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '更新部门失败' });
  }
});

router.delete('/departments/:id', async (req: AuthRequest, res: Response) => { // 删除部门
  try {
    const children = await query('SELECT id FROM departments WHERE parent_id = $1', [req.params.id]);
    if (children.rows.length) return res.status(400).json({ error: 'HAS_CHILDREN', message: '请先删除子部门' });
    await query('UPDATE users SET department_id = NULL WHERE department_id = $1', [req.params.id]);
    await query('DELETE FROM departments WHERE id = $1', [req.params.id]);
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '删除部门失败' });
  }
});

export default router;
