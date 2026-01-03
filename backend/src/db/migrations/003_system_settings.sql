-- 系统设置表
CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 操作日志表
CREATE TABLE IF NOT EXISTS operation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    target_type VARCHAR(50),
    target_id UUID,
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 默认设置
INSERT INTO system_settings (key, value) VALUES ('claim_limit', '50') ON CONFLICT (key) DO NOTHING;
INSERT INTO system_settings (key, value) VALUES ('auto_return_days', '30') ON CONFLICT (key) DO NOTHING;
