import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') }); // 指定.env路径

import { pool } from '../src/db/connection.js';

const migrate = async () => {
  const migrationsDir = join(__dirname, '../src/db/migrations');
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
  try {
    for (const file of files) {
      console.log(`[Migrate] Running ${file}...`);
      const sql = fs.readFileSync(join(migrationsDir, file), 'utf8');
      await pool.query(sql);
    }
    console.log('[Migrate] ✅ All migrations completed!');
  } catch (error) {
    console.error('[Migrate] ❌ Migration failed:', error);
  } finally {
    await pool.end();
  }
};

migrate();
