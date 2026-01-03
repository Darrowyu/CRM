import pg from 'pg'; // PostgreSQL客户端
import dotenv from 'dotenv';
import logger from '../utils/logger.js';

dotenv.config();

const { Pool } = pg;

export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'makrite_crm',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 20, // 最大连接数
  idleTimeoutMillis: 30000, // 空闲超时
  connectionTimeoutMillis: 2000 // 连接超时
});

export const testConnection = async (): Promise<boolean> => {
  try {
    const client = await pool.connect();
    logger.info('PostgreSQL connected successfully');
    client.release();
    return true;
  } catch (error) {
    logger.error(`PostgreSQL connection failed: ${error}`);
    return false;
  }
};

export const query = async (text: string, params?: unknown[]) => {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;
  if (process.env.NODE_ENV === 'development') {
    logger.debug(`Query executed: ${text.substring(0, 50)}... (${duration}ms, ${result.rowCount} rows)`);
  }
  return result;
};
