import api from './api';

export interface UserPreferences {
  notifications: { opportunity: boolean; task: boolean; approval: boolean; system: boolean };
  dashboard: string[];
  theme: 'light' | 'dark';
  emailSignature: string;
  exportFormat: 'xlsx' | 'csv' | 'pdf';
  aiStyle: 'professional' | 'friendly' | 'concise';
  twoFactorEnabled: boolean;
}

export interface LoginHistory { ip_address: string; user_agent: string; created_at: string; }
export interface UserDevice { id: string; device_name: string; device_type: string; last_active: string; created_at: string; }

export const getPreferences = () => api.get<UserPreferences>('/profile/preferences').then(r => r.data);
export const savePreferences = (prefs: Partial<UserPreferences>) => api.put('/profile/preferences', prefs).then(r => r.data);
export const getLoginHistory = () => api.get<LoginHistory[]>('/profile/login-history').then(r => r.data);
export const getDevices = () => api.get<UserDevice[]>('/profile/devices').then(r => r.data);
export const removeDevice = (id: string) => api.delete(`/profile/devices/${id}`).then(r => r.data);
export const updateInfo = (data: { name?: string; phone?: string; email?: string }) => api.put('/profile/info', data).then(r => r.data);
export const enableTwoFactor = () => api.post<{ secret: string }>('/profile/two-factor/enable').then(r => r.data);
export const disableTwoFactor = () => api.post('/profile/two-factor/disable').then(r => r.data);
