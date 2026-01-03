import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { UserRole } from '../types/index.js';
import { query } from '../db/connection.js';

const router = Router();
router.use(authMiddleware);
router.use(authorize(UserRole.ADMIN));

// ========== 消息模板管理 ==========
router.get('/templates', async (req: AuthRequest, res: Response) => { // 获取模板列表
  try {
    const { type } = req.query;
    const sql = type 
      ? 'SELECT * FROM message_templates WHERE type = $1 ORDER BY name' 
      : 'SELECT * FROM message_templates ORDER BY type, name';
    const result = await query(sql, type ? [type] : []);
    return res.json(result.rows);
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '获取模板失败' });
  }
});

router.post('/templates', async (req: AuthRequest, res: Response) => { // 创建模板
  try {
    const { name, type, subject, content, variables = [] } = req.body;
    const result = await query(
      'INSERT INTO message_templates (name, type, subject, content, variables) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, type, subject, content, JSON.stringify(variables)]
    );
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '创建模板失败' });
  }
});

router.put('/templates/:id', async (req: AuthRequest, res: Response) => { // 更新模板
  try {
    const { name, subject, content, variables, is_active } = req.body;
    const result = await query(
      `UPDATE message_templates SET name = COALESCE($1, name), subject = $2, content = COALESCE($3, content), 
       variables = COALESCE($4, variables), is_active = COALESCE($5, is_active) WHERE id = $6 RETURNING *`,
      [name, subject, content, variables ? JSON.stringify(variables) : null, is_active, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'NOT_FOUND' });
    return res.json(result.rows[0]);
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '更新模板失败' });
  }
});

router.delete('/templates/:id', async (req: AuthRequest, res: Response) => { // 删除模板
  try {
    await query('DELETE FROM message_templates WHERE id = $1', [req.params.id]);
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '删除模板失败' });
  }
});

// ========== 系统监控 ==========
router.get('/api-stats', async (req: AuthRequest, res: Response) => { // 获取API统计
  try {
    const { start_date, end_date } = req.query;
    let sql = `SELECT endpoint, method, COUNT(*) as count, AVG(response_time)::int as avg_time, 
               COUNT(CASE WHEN status_code >= 400 THEN 1 END) as error_count
               FROM api_stats WHERE 1=1`;
    const params: any[] = [];
    let idx = 1;
    if (start_date) { sql += ` AND created_at >= $${idx++}`; params.push(start_date); }
    if (end_date) { sql += ` AND created_at <= $${idx++}`; params.push(end_date); }
    sql += ' GROUP BY endpoint, method ORDER BY count DESC LIMIT 50';
    const result = await query(sql, params);
    return res.json(result.rows);
  } catch (error) {
    return res.json([]);
  }
});

router.get('/system-health', async (req: AuthRequest, res: Response) => { // 系统健康检查
  try {
    const [dbCheck, tableStats] = await Promise.all([
      query('SELECT NOW() as time'),
      query(`SELECT relname as table_name, n_live_tup as row_count 
             FROM pg_stat_user_tables ORDER BY n_live_tup DESC LIMIT 10`)
    ]);
    return res.json({
      database: { status: 'healthy', time: dbCheck.rows[0].time },
      tables: tableStats.rows,
      memory: process.memoryUsage(),
      uptime: process.uptime()
    });
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '健康检查失败' });
  }
});

// ========== 数据归档管理 ==========
router.get('/archive-configs', async (req: AuthRequest, res: Response) => { // 获取归档配置
  try {
    const result = await query('SELECT * FROM archive_configs ORDER BY table_name');
    return res.json(result.rows);
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '获取归档配置失败' });
  }
});

router.put('/archive-configs/:id', async (req: AuthRequest, res: Response) => { // 更新归档配置
  try {
    const { retention_days, is_enabled } = req.body;
    const result = await query(
      'UPDATE archive_configs SET retention_days = COALESCE($1, retention_days), is_enabled = COALESCE($2, is_enabled) WHERE id = $3 RETURNING *',
      [retention_days, is_enabled, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'NOT_FOUND' });
    return res.json(result.rows[0]);
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '更新归档配置失败' });
  }
});

router.post('/archive/execute', async (req: AuthRequest, res: Response) => { // 执行数据归档
  try {
    const configs = await query('SELECT * FROM archive_configs WHERE is_enabled = true');
    const results: any[] = [];
    for (const config of configs.rows) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - config.retention_days);
      const deleteResult = await query(
        `DELETE FROM ${config.table_name} WHERE created_at < $1`,
        [cutoffDate.toISOString()]
      );
      results.push({ table: config.table_name, deleted: deleteResult.rowCount });
      await query('UPDATE archive_configs SET last_archive_at = NOW() WHERE id = $1', [config.id]);
    }
    return res.json({ success: true, results });
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '执行归档失败' });
  }
});

// ========== 翻译管理 ==========
router.get('/translations', async (req: AuthRequest, res: Response) => { // 获取翻译列表
  try {
    const { locale } = req.query;
    const sql = locale 
      ? 'SELECT * FROM translations WHERE locale = $1 ORDER BY key' 
      : 'SELECT * FROM translations ORDER BY key, locale';
    const result = await query(sql, locale ? [locale] : []);
    return res.json(result.rows);
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '获取翻译失败' });
  }
});

router.post('/translations', async (req: AuthRequest, res: Response) => { // 创建翻译
  try {
    const { key, locale, value } = req.body;
    const result = await query(
      'INSERT INTO translations (key, locale, value) VALUES ($1, $2, $3) ON CONFLICT (key, locale) DO UPDATE SET value = $3, updated_at = NOW() RETURNING *',
      [key, locale, value]
    );
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '创建翻译失败' });
  }
});

router.put('/translations/:id', async (req: AuthRequest, res: Response) => { // 更新翻译
  try {
    const { value } = req.body;
    const result = await query(
      'UPDATE translations SET value = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [value, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'NOT_FOUND' });
    return res.json(result.rows[0]);
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '更新翻译失败' });
  }
});

router.delete('/translations/:id', async (req: AuthRequest, res: Response) => { // 删除翻译
  try {
    await query('DELETE FROM translations WHERE id = $1', [req.params.id]);
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '删除翻译失败' });
  }
});

router.post('/translations/batch', async (req: AuthRequest, res: Response) => { // 批量导入翻译
  try {
    const { translations } = req.body;
    for (const t of translations) {
      await query(
        'INSERT INTO translations (key, locale, value) VALUES ($1, $2, $3) ON CONFLICT (key, locale) DO UPDATE SET value = $3, updated_at = NOW()',
        [t.key, t.locale, t.value]
      );
    }
    return res.json({ success: true, count: translations.length });
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '批量导入失败' });
  }
});

// ========== 数据导出 ==========
router.get('/export/:type', async (req: AuthRequest, res: Response) => { // 导出数据
  try {
    const { type } = req.params;
    let sql = '';
    switch (type) {
      case 'customers':
        sql = `SELECT c.*, u.name as owner_name FROM customers c LEFT JOIN users u ON u.id = c.owner_id ORDER BY c.created_at DESC`;
        break;
      case 'opportunities':
        sql = `SELECT o.*, c.name as customer_name, u.name as owner_name FROM opportunities o 
               LEFT JOIN customers c ON c.id = o.customer_id LEFT JOIN users u ON u.id = o.owner_id ORDER BY o.created_at DESC`;
        break;
      case 'orders':
        sql = `SELECT o.*, c.name as customer_name FROM orders o LEFT JOIN customers c ON c.id = o.customer_id ORDER BY o.created_at DESC`;
        break;
      case 'quotes':
        sql = `SELECT q.*, c.name as customer_name FROM quotes q LEFT JOIN customers c ON c.id = q.customer_id ORDER BY q.created_at DESC`;
        break;
      default:
        return res.status(400).json({ error: 'INVALID_TYPE', message: '不支持的导出类型' });
    }
    const result = await query(sql);
    return res.json({ type, count: result.rows.length, data: result.rows });
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: '导出失败' });
  }
});

export default router;
