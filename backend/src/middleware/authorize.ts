import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.js';
import { UserRole } from '../types/index.js';
import { query } from '../db/connection.js';

// 角色权限层级：admin > sales_manager > finance > sales_rep
const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.ADMIN]: 100,
  [UserRole.SALES_MANAGER]: 50,
  [UserRole.FINANCE]: 30,
  [UserRole.SALES_REP]: 10
};

// 权限缓存（简单实现，生产环境可用Redis）
const permissionCache = new Map<string, { permissions: string[]; expiry: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

export const authorize = (...allowedRoles: UserRole[]) => { // 角色授权中间件
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'AUTH_INVALID', message: '未认证' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: 'AUTH_FORBIDDEN', message: '权限不足' });
      return;
    }

    next();
  };
};

export const isAdmin = (role: UserRole): boolean => role === UserRole.ADMIN; // 是否管理员
export const isManager = (role: UserRole): boolean => [UserRole.ADMIN, UserRole.SALES_MANAGER].includes(role); // 是否经理级别
export const getRoleLevel = (role: UserRole): number => ROLE_HIERARCHY[role] || 0; // 获取角色等级

export const canAccessResource = (userRole: UserRole, requiredRoles: UserRole[]): boolean => { // 检查资源访问权限
  return requiredRoles.includes(userRole);
};

// 获取用户权限列表（带缓存）
export const getUserPermissions = async (userId: string, role: UserRole): Promise<string[]> => {
  // Admin拥有所有权限
  if (role === UserRole.ADMIN) {
    const allPerms = await query('SELECT code FROM permissions');
    return allPerms.rows.map(r => r.code);
  }

  // 检查缓存
  const cached = permissionCache.get(userId);
  if (cached && cached.expiry > Date.now()) {
    return cached.permissions;
  }

  // 从数据库查询：基于用户角色名查找对应角色的权限
  const result = await query(`
    SELECT DISTINCT p.code FROM permissions p
    INNER JOIN role_permissions rp ON rp.permission_id = p.id
    INNER JOIN roles r ON r.id = rp.role_id
    WHERE r.name = $1
  `, [role]);

  const permissions = result.rows.map(r => r.code);
  permissionCache.set(userId, { permissions, expiry: Date.now() + CACHE_TTL });
  return permissions;
};

// 动态权限检查中间件
export const checkPermission = (...requiredPermissions: string[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'AUTH_INVALID', message: '未认证' });
      return;
    }

    try {
      const userPermissions = await getUserPermissions(req.user.userId, req.user.role);
      const hasPermission = requiredPermissions.some(p => userPermissions.includes(p));

      if (!hasPermission) {
        res.status(403).json({ error: 'AUTH_FORBIDDEN', message: `需要权限: ${requiredPermissions.join(' 或 ')}` });
        return;
      }

      // 将权限列表附加到请求对象，方便后续使用
      (req as any).permissions = userPermissions;
      next();
    } catch (error) {
      res.status(500).json({ error: 'SERVER_ERROR', message: '权限检查失败' });
    }
  };
};

// 清除用户权限缓存
export const clearPermissionCache = (userId?: string): void => {
  if (userId) {
    permissionCache.delete(userId);
  } else {
    permissionCache.clear();
  }
};
