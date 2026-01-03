import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger.js';

export interface AppError extends Error { // 应用错误接口
  statusCode?: number;
  code?: string;
}

export const errorHandler = (err: AppError, req: Request, res: Response, next: NextFunction): void => { // 全局错误处理中间件
  logger.error(`[${req.method}] ${req.path}: ${err.message}`);
  const statusCode = err.statusCode || 500;
  const code = err.code || 'SERVER_ERROR';
  const message = process.env.NODE_ENV === 'production' && statusCode === 500 ? '服务器内部错误' : err.message;
  res.status(statusCode).json({ error: code, message });
};

export const notFoundHandler = (req: Request, res: Response): void => { // 404处理
  res.status(404).json({ error: 'NOT_FOUND', message: `路径 ${req.path} 不存在` });
};

export const createError = (message: string, statusCode = 500, code = 'SERVER_ERROR'): AppError => { // 创建错误对象
  const error: AppError = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
};
