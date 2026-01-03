import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const BACKUP_DIR = process.env.BACKUP_DIR || './backups';
const RETENTION_DAYS = 30;

const runBackup = async () => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `makrite_crm_${timestamp}.sql`;
  const filepath = path.join(BACKUP_DIR, filename);

  // 确保备份目录存在
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const pgDumpCmd = `pg_dump -h ${process.env.DB_HOST || 'localhost'} -p ${process.env.DB_PORT || '5432'} -U ${process.env.DB_USER || 'postgres'} -d ${process.env.DB_NAME || 'makrite_crm'} -F p -f "${filepath}"`;

  console.log(`[Backup] Starting backup: ${filename}`);

  return new Promise<void>((resolve, reject) => {
    exec(pgDumpCmd, { env: { ...process.env, PGPASSWORD: process.env.DB_PASSWORD } }, (error, stdout, stderr) => {
      if (error) {
        console.error(`[Backup] Failed: ${error.message}`);
        reject(error);
        return;
      }
      console.log(`[Backup] Completed: ${filepath}`);
      cleanOldBackups();
      resolve();
    });
  });
};

const cleanOldBackups = () => { // 清理超过保留期的备份
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);

  const files = fs.readdirSync(BACKUP_DIR);
  files.forEach(file => {
    const filepath = path.join(BACKUP_DIR, file);
    const stats = fs.statSync(filepath);
    if (stats.mtime < cutoffDate) {
      fs.unlinkSync(filepath);
      console.log(`[Backup] Deleted old backup: ${file}`);
    }
  });
};

// 如果直接运行此脚本
runBackup().catch(console.error);

export { runBackup, cleanOldBackups };
