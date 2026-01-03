import { Task, TaskStats } from '../types/tasks';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const getHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem('token')}` });

export const taskService = {
  async getAll(filters?: { status?: string; customer_id?: string; all?: boolean }): Promise<Task[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.customer_id) params.append('customer_id', filters.customer_id);
    if (filters?.all) params.append('all', 'true');
    const res = await fetch(`${API_BASE}/tasks?${params}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('获取任务失败');
    return res.json();
  },

  async getById(id: string): Promise<Task> {
    const res = await fetch(`${API_BASE}/tasks/${id}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('获取任务失败');
    return res.json();
  },

  async getStats(): Promise<TaskStats> {
    const res = await fetch(`${API_BASE}/tasks/stats`, { headers: getHeaders() });
    if (!res.ok) throw new Error('获取统计失败');
    return res.json();
  },

  async create(data: Partial<Task>): Promise<Task> {
    const res = await fetch(`${API_BASE}/tasks`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) });
    if (!res.ok) throw new Error('创建任务失败');
    return res.json();
  },

  async update(id: string, data: Partial<Task>): Promise<Task> {
    const res = await fetch(`${API_BASE}/tasks/${id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data) });
    if (!res.ok) throw new Error('更新任务失败');
    return res.json();
  },

  async delete(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/tasks/${id}`, { method: 'DELETE', headers: getHeaders() });
    if (!res.ok) throw new Error('删除任务失败');
  },

  async batchComplete(ids: string[]): Promise<{ completed: number }> { // 批量完成
    const res = await fetch(`${API_BASE}/tasks/batch/complete`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ ids }) });
    if (!res.ok) throw new Error('批量完成失败');
    return res.json();
  },

  async batchDelete(ids: string[]): Promise<{ deleted: number }> { // 批量删除
    const res = await fetch(`${API_BASE}/tasks/batch/delete`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ ids }) });
    if (!res.ok) throw new Error('批量删除失败');
    return res.json();
  },

  async getTeamMembers(): Promise<{ id: string; name: string }[]> { // 获取团队成员
    const res = await fetch(`${API_BASE}/tasks/team/members`, { headers: getHeaders() });
    if (!res.ok) throw new Error('获取团队成员失败');
    return res.json();
  }
};
