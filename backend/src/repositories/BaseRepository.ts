import { pool, query } from '../db/connection.js';
import { QueryResult } from 'pg';

export interface BaseEntity {
  id: string;
  created_at?: Date;
  updated_at?: Date;
}

const ALLOWED_TABLES = ['users', 'customers', 'contacts', 'opportunities', 'quotes', 'quote_items', 'orders', 'products', 'pricing_tiers', 'follow_ups', 'approval_logs', 'system_settings', 'operation_logs', 'tasks', 'notifications', 'sales_targets', 'team_targets', 'contracts', 'payment_plans', 'competitors', 'opportunity_competitors', 'customer_scores', 'sales_forecasts']; // 白名单表
const validateTableName = (name: string): boolean => ALLOWED_TABLES.includes(name); // 验证表名
const validateFieldName = (name: string): boolean => /^[a-z_][a-z0-9_]*$/i.test(name) && name.length <= 64; // 验证字段名格式

export class BaseRepository<T extends BaseEntity> {
  protected tableName: string;

  constructor(tableName: string) {
    if (!validateTableName(tableName)) throw new Error(`Invalid table name: ${tableName}`);
    this.tableName = tableName;
  }

  async findAll(limit = 100, offset = 0): Promise<T[]> { // 查询所有记录
    const result = await query(`SELECT * FROM ${this.tableName} ORDER BY created_at DESC LIMIT $1 OFFSET $2`, [limit, offset]);
    return result.rows as T[];
  }

  async findById(id: string): Promise<T | null> { // 按ID查询
    const result = await query(`SELECT * FROM ${this.tableName} WHERE id = $1`, [id]);
    return result.rows[0] as T || null;
  }

  async findByField(field: string, value: unknown): Promise<T[]> { // 按字段查询
    if (!validateFieldName(field)) throw new Error(`Invalid field name: ${field}`);
    const result = await query(`SELECT * FROM ${this.tableName} WHERE ${field} = $1`, [value]);
    return result.rows as T[];
  }

  async create(data: Partial<T>): Promise<T> { // 创建记录（参数化查询防SQL注入）
    const keys = Object.keys(data).filter(k => validateFieldName(k));
    if (keys.length === 0) throw new Error('No valid fields to insert');
    const values = keys.map(k => (data as any)[k]);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const columns = keys.join(', ');
    const result = await query(`INSERT INTO ${this.tableName} (${columns}) VALUES (${placeholders}) RETURNING *`, values);
    return result.rows[0] as T;
  }

  async update(id: string, data: Partial<T>): Promise<T | null> { // 更新记录（参数化查询防SQL注入）
    const keys = Object.keys(data).filter(k => k !== 'market_region' && data[k as keyof typeof data] !== undefined && validateFieldName(k));
    if (keys.length === 0) return this.findById(id);
    const values = keys.map(k => (data as any)[k]);
    const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
    const result = await query(`UPDATE ${this.tableName} SET ${setClause} WHERE id = $${keys.length + 1} RETURNING *`, [...values, id]);
    return result.rows[0] as T || null;
  }

  async delete(id: string): Promise<boolean> { // 删除记录
    const result = await query(`DELETE FROM ${this.tableName} WHERE id = $1`, [id]);
    return (result.rowCount ?? 0) > 0;
  }

  async count(whereClause?: string, params?: unknown[]): Promise<number> { // 统计数量
    const sql = whereClause ? `SELECT COUNT(*) FROM ${this.tableName} WHERE ${whereClause}` : `SELECT COUNT(*) FROM ${this.tableName}`;
    const result = await query(sql, params);
    return parseInt(result.rows[0].count, 10);
  }

  async exists(field: string, value: unknown): Promise<boolean> { // 检查是否存在
    if (!validateFieldName(field)) throw new Error(`Invalid field name: ${field}`);
    const result = await query(`SELECT EXISTS(SELECT 1 FROM ${this.tableName} WHERE ${field} = $1)`, [value]);
    return result.rows[0].exists;
  }

  async transaction<R>(callback: (client: typeof pool) => Promise<R>): Promise<R> { // 事务支持
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client as unknown as typeof pool);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
