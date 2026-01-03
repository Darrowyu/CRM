import api from './api';

export interface LoginRequest { username: string; password: string; }
export interface LoginResponse { token: string; user: User; permissions: string[]; }
export interface User { id: string; username: string; name: string; role: string; }

export const authService = {
  login: async (username: string, password: string): Promise<LoginResponse> => { // 用户登录
    const res = await api.post('/auth/login', { username, password });
    return res.data;
  },

  logout: () => {
    sessionStorage.removeItem('token');
    window.location.href = '/login';
  },

  getCurrentUser: async (): Promise<User> => {
    const res = await api.get('/auth/me');
    return res.data;
  },

  isAuthenticated: () => !!sessionStorage.getItem('token')
};
