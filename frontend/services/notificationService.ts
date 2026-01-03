import { Notification } from '../types/tasks';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const getHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem('token')}` });

export const notificationService = {
  async getAll(unreadOnly = false): Promise<Notification[]> {
    const params = unreadOnly ? '?unread_only=true' : '';
    const res = await fetch(`${API_BASE}/notifications${params}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('获取通知失败');
    return res.json();
  },

  async getUnreadCount(): Promise<number> {
    const res = await fetch(`${API_BASE}/notifications/unread-count`, { headers: getHeaders() });
    if (!res.ok) throw new Error('获取未读数失败');
    const data = await res.json();
    return data.count;
  },

  async markAsRead(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/notifications/${id}/read`, { method: 'POST', headers: getHeaders() });
    if (!res.ok) throw new Error('标记已读失败');
  },

  async markAllAsRead(): Promise<void> {
    const res = await fetch(`${API_BASE}/notifications/read-all`, { method: 'POST', headers: getHeaders() });
    if (!res.ok) throw new Error('标记全部已读失败');
  },

  async delete(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/notifications/${id}`, { method: 'DELETE', headers: getHeaders() });
    if (!res.ok) throw new Error('删除通知失败');
  }
};
