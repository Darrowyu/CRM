import api from './api';
import type { Dictionary, Announcement, ApprovalConfig, OperationLog, Role, Permission, Department, MessageTemplate, ArchiveConfig, Translation, ApiStat, SystemHealth } from '../types/admin';

// 数据字典
export const getDictionaries = (type?: string) => api.get<Dictionary[]>('/admin/dictionaries', { params: { type } }).then(r => r.data);
export const createDictionary = (data: Partial<Dictionary>) => api.post<Dictionary>('/admin/dictionaries', data).then(r => r.data);
export const updateDictionary = (id: string, data: Partial<Dictionary>) => api.put<Dictionary>(`/admin/dictionaries/${id}`, data).then(r => r.data);
export const deleteDictionary = (id: string) => api.delete(`/admin/dictionaries/${id}`);

// 公告管理
export const getAnnouncements = () => api.get<Announcement[]>('/admin/announcements').then(r => r.data);
export const createAnnouncement = (data: Partial<Announcement>) => api.post<Announcement>('/admin/announcements', data).then(r => r.data);
export const updateAnnouncement = (id: string, data: Partial<Announcement>) => api.put<Announcement>(`/admin/announcements/${id}`, data).then(r => r.data);
export const deleteAnnouncement = (id: string) => api.delete(`/admin/announcements/${id}`);

// 审批流配置
export const getApprovalConfigs = () => api.get<ApprovalConfig[]>('/admin/approval-configs').then(r => r.data);
export const createApprovalConfig = (data: Partial<ApprovalConfig>) => api.post<ApprovalConfig>('/admin/approval-configs', data).then(r => r.data);
export const updateApprovalConfig = (id: string, data: Partial<ApprovalConfig>) => api.put<ApprovalConfig>(`/admin/approval-configs/${id}`, data).then(r => r.data);
export const deleteApprovalConfig = (id: string) => api.delete(`/admin/approval-configs/${id}`);

// 操作日志
export const getOperationLogs = (params?: { module?: string; action?: string; user_id?: string; start_date?: string; end_date?: string }) => 
  api.get<OperationLog[]>('/admin/operation-logs', { params }).then(r => r.data);

// 角色权限
export const getRoles = () => api.get<Role[]>('/admin/roles').then(r => r.data);
export const createRole = (data: Partial<Role>) => api.post<Role>('/admin/roles', data).then(r => r.data);
export const updateRole = (id: string, data: Partial<Role>) => api.put<Role>(`/admin/roles/${id}`, data).then(r => r.data);
export const deleteRole = (id: string) => api.delete(`/admin/roles/${id}`);
export const getPermissions = () => api.get<Permission[]>('/admin/permissions').then(r => r.data);
export const getRolePermissions = (roleId: string) => api.get<Permission[]>(`/admin/roles/${roleId}/permissions`).then(r => r.data);
export const updateRolePermissions = (roleId: string, permissionIds: string[]) => api.put(`/admin/roles/${roleId}/permissions`, { permission_ids: permissionIds });

// 部门管理
export const getDepartments = () => api.get<Department[]>('/admin/departments').then(r => r.data);
export const createDepartment = (data: Partial<Department>) => api.post<Department>('/admin/departments', data).then(r => r.data);
export const updateDepartment = (id: string, data: Partial<Department>) => api.put<Department>(`/admin/departments/${id}`, data).then(r => r.data);
export const deleteDepartment = (id: string) => api.delete(`/admin/departments/${id}`);

// 消息模板
export const getTemplates = (type?: string) => api.get<MessageTemplate[]>('/admin/templates', { params: { type } }).then(r => r.data);
export const createTemplate = (data: Partial<MessageTemplate>) => api.post<MessageTemplate>('/admin/templates', data).then(r => r.data);
export const updateTemplate = (id: string, data: Partial<MessageTemplate>) => api.put<MessageTemplate>(`/admin/templates/${id}`, data).then(r => r.data);
export const deleteTemplate = (id: string) => api.delete(`/admin/templates/${id}`);

// 系统监控
export const getApiStats = (params?: { start_date?: string; end_date?: string }) => api.get<ApiStat[]>('/admin/api-stats', { params }).then(r => r.data);
export const getSystemHealth = () => api.get<SystemHealth>('/admin/system-health').then(r => r.data);

// 数据归档
export const getArchiveConfigs = () => api.get<ArchiveConfig[]>('/admin/archive-configs').then(r => r.data);
export const updateArchiveConfig = (id: string, data: Partial<ArchiveConfig>) => api.put<ArchiveConfig>(`/admin/archive-configs/${id}`, data).then(r => r.data);
export const executeArchive = () => api.post('/admin/archive/execute').then(r => r.data);

// 翻译管理
export const getTranslations = (locale?: string) => api.get<Translation[]>('/admin/translations', { params: { locale } }).then(r => r.data);
export const createTranslation = (data: Partial<Translation>) => api.post<Translation>('/admin/translations', data).then(r => r.data);
export const updateTranslation = (id: string, data: Partial<Translation>) => api.put<Translation>(`/admin/translations/${id}`, data).then(r => r.data);
export const deleteTranslation = (id: string) => api.delete(`/admin/translations/${id}`);
export const batchImportTranslations = (translations: { key: string; locale: string; value: string }[]) => api.post('/admin/translations/batch', { translations });

// 数据导出
export const exportData = (type: 'customers' | 'opportunities' | 'orders' | 'quotes') => api.get(`/admin/export/${type}`).then(r => r.data);

// 产品管理（兼容旧代码）
export const getProducts = () => api.get('/admin/products').then(r => r.data);

// 管理仪表盘
export const getDashboard = () => api.get('/admin/dashboard').then(r => r.data);

// 用户管理增强
export const getUserLoginHistory = (userId: string) => api.get(`/admin/users/${userId}/login-history`).then(r => r.data);
export const batchImportUsers = (users: { username: string; password: string; name: string; role: string }[]) => api.post('/admin/users/batch-import', { users }).then(r => r.data);
export const updateUserStatus = (userId: string, is_active: boolean) => api.put(`/admin/users/${userId}/status`, { is_active }).then(r => r.data);

// 安全中心
export const getActiveSessions = () => api.get('/admin/security/sessions').then(r => r.data);
export const getSecurityConfig = () => api.get('/admin/security/config').then(r => r.data);
export const updateSecurityConfig = (config: { password_min_length: string; session_timeout: string; max_login_attempts: string; ip_whitelist: string }) => api.put('/admin/security/config', config).then(r => r.data);

// 系统监控增强
export const getPerformanceTrend = () => api.get('/admin/monitor/performance').then(r => r.data);
export const getErrorLogs = () => api.get('/admin/monitor/errors').then(r => r.data);

// 产品管理增强
export const getProductCategories = () => api.get('/admin/products/categories').then(r => r.data);
export const batchImportProducts = (products: { name: string; sku?: string; base_price: number; floor_price?: number; category?: string; stock?: number }[]) => api.post('/admin/products/batch-import', { products }).then(r => r.data);
export const updateProductStock = (productId: string, stock: number, operation: 'set' | 'add' | 'subtract') => api.put(`/admin/products/${productId}/stock`, { stock, operation }).then(r => r.data);

// 操作日志增强
export const getLogStats = () => api.get('/admin/operation-logs/stats').then(r => r.data);
export const exportLogs = (params?: { start_date?: string; end_date?: string }) => api.get('/admin/operation-logs/export', { params }).then(r => r.data);

// 数据归档增强
export const getArchiveHistory = () => api.get('/admin/archive/history').then(r => r.data);
export const restoreArchive = (id: string) => api.post(`/admin/archive/restore/${id}`).then(r => r.data);

// 系统配置增强
export const getAllConfig = () => api.get('/admin/config/all').then(r => r.data);
export const saveAllConfig = (config: Record<string, string>) => api.put('/admin/config/all', config).then(r => r.data);

// 审批流
export const getApprovalFlow = (type: string) => api.get(`/admin/approval-flow/${type}`).then(r => r.data);

// 兼容旧的命名导入方式
export const adminService = { getProducts };
