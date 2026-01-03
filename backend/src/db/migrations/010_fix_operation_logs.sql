-- 010: 修复operation_logs表结构

-- 添加缺失的字段
ALTER TABLE operation_logs ADD COLUMN IF NOT EXISTS module VARCHAR(50);
ALTER TABLE operation_logs ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45);
ALTER TABLE operation_logs ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE operation_logs ADD COLUMN IF NOT EXISTS target_type VARCHAR(50);
ALTER TABLE operation_logs ADD COLUMN IF NOT EXISTS target_id UUID;
ALTER TABLE operation_logs ADD COLUMN IF NOT EXISTS detail JSONB DEFAULT '{}';
