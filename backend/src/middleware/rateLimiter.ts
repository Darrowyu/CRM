import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord { // 限流记录
  count: number;
  resetTime: number;
}

const store = new Map<string, RateLimitRecord>(); // 内存存储（生产环境建议用Redis）

export interface RateLimitOptions { // 限流配置
  windowMs?: number; // 时间窗口（毫秒）
  max?: number; // 最大请求数
  message?: string; // 超限提示
}

export const rateLimiter = (options: RateLimitOptions = {}) => { // 请求限流中间件
  const { windowMs = 60000, max = 100, message = '请求过于频繁，请稍后再试' } = options;
  
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.ip || req.headers['x-forwarded-for'] as string || 'unknown';
    const now = Date.now();
    const record = store.get(key);
    
    if (!record || now > record.resetTime) { // 新窗口或已过期
      store.set(key, { count: 1, resetTime: now + windowMs });
      next();
      return;
    }
    
    if (record.count >= max) { // 超过限制
      res.status(429).json({ error: 'RATE_LIMIT', message });
      return;
    }
    
    record.count++;
    next();
  };
};

export const loginLimiter = rateLimiter({ windowMs: 300000, max: 5, message: '登录尝试过多，请5分钟后再试' }); // 登录限流（5分钟5次）
export const apiLimiter = rateLimiter({ windowMs: 60000, max: 500, message: '请求过于频繁，请稍后再试' }); // API限流（1分钟500次，开发环境放宽）

setInterval(() => { // 定期清理过期记录（每5分钟）
  const now = Date.now();
  for (const [key, record] of store.entries()) {
    if (now > record.resetTime) store.delete(key);
  }
}, 300000);
