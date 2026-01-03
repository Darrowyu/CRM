import { pool } from '../db/connection.js';
import { Task, TaskStatus } from '../types/tasks';

export class TaskRepository {
  async findAll(filters: { assigned_to?: string; status?: string; customer_id?: string }): Promise<Task[]> {
    let query = `SELECT t.*, u1.name as assigned_to_name, u2.name as created_by_name, c.company_name as customer_name, o.name as opportunity_name
      FROM tasks t LEFT JOIN users u1 ON t.assigned_to = u1.id LEFT JOIN users u2 ON t.created_by = u2.id
      LEFT JOIN customers c ON t.customer_id = c.id LEFT JOIN opportunities o ON t.opportunity_id = o.id WHERE 1=1`;
    const params: unknown[] = [];
    if (filters.assigned_to) { params.push(filters.assigned_to); query += ` AND t.assigned_to = $${params.length}`; }
    if (filters.status) { params.push(filters.status); query += ` AND t.status = $${params.length}`; }
    if (filters.customer_id) { params.push(filters.customer_id); query += ` AND t.customer_id = $${params.length}`; }
    query += ' ORDER BY t.due_date ASC NULLS LAST, t.priority DESC';
    const result = await pool.query(query, params);
    return result.rows;
  }

  async findById(id: string): Promise<Task | null> {
    const result = await pool.query(`SELECT t.*, u1.name as assigned_to_name, u2.name as created_by_name, c.company_name as customer_name
      FROM tasks t LEFT JOIN users u1 ON t.assigned_to = u1.id LEFT JOIN users u2 ON t.created_by = u2.id
      LEFT JOIN customers c ON t.customer_id = c.id WHERE t.id = $1`, [id]);
    return result.rows[0] || null;
  }

  async create(data: Partial<Task>): Promise<Task> {
    const result = await pool.query(`INSERT INTO tasks (title, description, type, priority, status, due_date, reminder_time, customer_id, opportunity_id, assigned_to, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [data.title, data.description, data.type, data.priority || 'medium', data.status || 'pending', data.due_date, data.reminder_time, data.customer_id, data.opportunity_id, data.assigned_to, data.created_by]);
    return result.rows[0];
  }

  async update(id: string, data: Partial<Task>): Promise<Task | null> {
    const fields: string[] = []; const values: unknown[] = [];
    const allowedFields = ['title', 'description', 'type', 'priority', 'status', 'due_date', 'reminder_time', 'customer_id', 'opportunity_id', 'assigned_to'];
    for (const key of allowedFields) { if (data[key as keyof Task] !== undefined) { values.push(data[key as keyof Task]); fields.push(`${key} = $${values.length}`); } }
    if (data.status === TaskStatus.COMPLETED) { fields.push(`completed_at = NOW()`); }
    if (fields.length === 0) return this.findById(id);
    fields.push('updated_at = NOW()'); values.push(id);
    const result = await pool.query(`UPDATE tasks SET ${fields.join(', ')} WHERE id = $${values.length} RETURNING *`, values);
    return result.rows[0] || null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await pool.query('DELETE FROM tasks WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  async getTaskStats(userId: string): Promise<{ total: number; pending: number; in_progress: number; overdue: number; completed_today: number; completed_week: number; completion_rate: number }> {
    const result = await pool.query(`SELECT COUNT(*) as total, 
      COUNT(*) FILTER (WHERE status = 'pending') as pending,
      COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
      COUNT(*) FILTER (WHERE status NOT IN ('completed', 'cancelled') AND due_date < NOW()) as overdue,
      COUNT(*) FILTER (WHERE status = 'completed' AND completed_at::date = CURRENT_DATE) as completed_today,
      COUNT(*) FILTER (WHERE status = 'completed' AND completed_at >= date_trunc('week', CURRENT_DATE)) as completed_week,
      CASE WHEN COUNT(*) > 0 THEN ROUND(COUNT(*) FILTER (WHERE status = 'completed')::numeric / COUNT(*) * 100, 1) ELSE 0 END as completion_rate
      FROM tasks WHERE assigned_to = $1`, [userId]);
    return result.rows[0];
  }

  async batchComplete(ids: string[], userId: string): Promise<number> { // 批量完成
    const result = await pool.query(`UPDATE tasks SET status = 'completed', completed_at = NOW(), updated_at = NOW() WHERE id = ANY($1) AND assigned_to = $2 AND status NOT IN ('completed', 'cancelled')`, [ids, userId]);
    return result.rowCount || 0;
  }

  async batchDelete(ids: string[], userId: string): Promise<number> { // 批量删除
    const result = await pool.query(`DELETE FROM tasks WHERE id = ANY($1) AND (created_by = $2 OR assigned_to = $2)`, [ids, userId]);
    return result.rowCount || 0;
  }

  async getTeamMembers(managerId: string): Promise<{ id: string; name: string }[]> { // 获取团队成员
    const result = await pool.query(`SELECT id, name FROM users WHERE department_id = (SELECT department_id FROM users WHERE id = $1) AND id != $1`, [managerId]);
    return result.rows;
  }
}

export const taskRepository = new TaskRepository();
