import { pool } from '../db/connection.js';
import { Notification, NotificationType } from '../types/tasks';

export class NotificationRepository {
  async findByUser(userId: string, limit = 50, unreadOnly = false): Promise<Notification[]> {
    let query = 'SELECT * FROM notifications WHERE user_id = $1';
    if (unreadOnly) query += ' AND is_read = false';
    query += ' ORDER BY created_at DESC LIMIT $2';
    const result = await pool.query(query, [userId, limit]);
    return result.rows;
  }

  async create(data: { user_id: string; type: NotificationType; title: string; content?: string; related_type?: string; related_id?: string }): Promise<Notification> {
    const result = await pool.query(`INSERT INTO notifications (user_id, type, title, content, related_type, related_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [data.user_id, data.type, data.title, data.content, data.related_type, data.related_id]);
    return result.rows[0];
  }

  async markAsRead(id: string, userId: string): Promise<boolean> {
    const result = await pool.query('UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2', [id, userId]);
    return (result.rowCount ?? 0) > 0;
  }

  async markAllAsRead(userId: string): Promise<number> {
    const result = await pool.query('UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false', [userId]);
    return result.rowCount ?? 0;
  }

  async getUnreadCount(userId: string): Promise<number> {
    const result = await pool.query('SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false', [userId]);
    return parseInt(result.rows[0].count, 10);
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const result = await pool.query('DELETE FROM notifications WHERE id = $1 AND user_id = $2', [id, userId]);
    return (result.rowCount ?? 0) > 0;
  }
}

export const notificationRepository = new NotificationRepository();
