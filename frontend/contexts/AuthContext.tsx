import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface User {
  id: string;
  username: string;
  role: 'admin' | 'sales_manager' | 'sales_rep' | 'finance';
  name?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  permissions: string[]; // 用户权限列表
  login: (user: User, token: string, permissions?: string[]) => void;
  logout: () => void;
  isAdmin: boolean;
  isManager: boolean;
  isLoading: boolean;
  hasPermission: (permission: string) => boolean; // 权限检查方法
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { // 初始化时从sessionStorage恢复登录状态（关闭浏览器即退出）
    const savedToken = sessionStorage.getItem('token');
    const savedUser = sessionStorage.getItem('user');
    const savedPermissions = sessionStorage.getItem('permissions');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
      setPermissions(savedPermissions ? JSON.parse(savedPermissions) : []);
    }
    setIsLoading(false);
  }, []);

  const login = (user: User, token: string, perms: string[] = []) => {
    setUser(user);
    setToken(token);
    setPermissions(perms);
    sessionStorage.setItem('token', token); // 使用sessionStorage，关闭浏览器自动清除
    sessionStorage.setItem('user', JSON.stringify(user));
    sessionStorage.setItem('permissions', JSON.stringify(perms));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setPermissions([]);
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('permissions');
    localStorage.removeItem('activeTab'); // 退出时清除页面状态，下次登录从首页开始
  };

  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'admin' || user?.role === 'sales_manager';

  // 检查用户是否拥有指定权限
  const hasPermission = (permission: string): boolean => {
    if (isAdmin) return true; // Admin拥有所有权限
    return permissions.includes(permission);
  };

  return (
    <AuthContext.Provider value={{ user, token, permissions, login, logout, isAdmin, isManager, isLoading, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
