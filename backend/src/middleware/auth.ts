import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '../types/index.js';
import logger from '../utils/logger.js';

const getJwtSecret = (): string => { // 获取JWT密钥（强制要求环境变量）
  const secret = process.env.JWT_SECRET;
  if (!secret || secret === 'default_secret' || secret.length < 32) {
    if (process.env.NODE_ENV === 'production') throw new Error('JWT_SECRET must be set in production with at least 32 characters');
    logger.warn('Using weak JWT_SECRET. Set a strong secret in production!');
    return 'dev_secret_key_for_local_development_only_32chars';
  }
  return secret;
};

const JWT_SECRET = getJwtSecret();

export interface JwtPayload {
  userId: string;
  username: string;
  role: UserRole;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export const generateToken = (payload: JwtPayload): string => { // 生成JWT令牌
  return jwt.sign({ ...payload }, JWT_SECRET, { expiresIn: '7d' });
};

export const verifyToken = (token: string): JwtPayload | null => { // 验证JWT令牌
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
};

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction): void => { // 认证中间件
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'AUTH_INVALID', message: '未提供认证令牌' });
    return;
  }
  const token = authHeader.substring(7);
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: 'AUTH_INVALID', message: '认证令牌无效或已过期' });
    return;
  }
  req.user = payload;
  next();
};
