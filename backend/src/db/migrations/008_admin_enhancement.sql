-- 008: 管理后台增强 - 方案A+B完整实现

-- 1. 操作日志表（增强版）
CREATE TABLE IF NOT EXISTS operation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    module VARCHAR(50) NOT NULL,
    target_type VARCHAR(50),
    target_id UUID,
    detail JSONB DEFAULT '{}',
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_operation_logs_user ON operation_logs(user_id);
CREATE INDEX idx_operation_logs_action ON operation_logs(action);
CREATE INDEX idx_operation_logs_created ON operation_logs(created_at DESC);

-- 2. 数据字典表
CREATE TABLE IF NOT EXISTS dictionaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL,
    code VARCHAR(50) NOT NULL,
    label VARCHAR(100) NOT NULL,
    sort_order INT DEFAULT 0,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(type, code)
);
CREATE INDEX idx_dictionaries_type ON dictionaries(type);

-- 3. 系统公告表
CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    type VARCHAR(20) DEFAULT 'info',
    priority INT DEFAULT 0,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_announcements_active ON announcements(is_active, start_time, end_time);

-- 4. 审批流配置表
CREATE TABLE IF NOT EXISTS approval_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    threshold DECIMAL(15,2),
    approver_role VARCHAR(50),
    approver_id UUID REFERENCES users(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. 角色表（自定义角色）
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. 权限表
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    module VARCHAR(50) NOT NULL,
    description TEXT
);

-- 7. 角色权限关联表
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- 8. 部门表
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    parent_id UUID REFERENCES departments(id),
    manager_id UUID REFERENCES users(id),
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_departments_parent ON departments(parent_id);

-- 9. 用户部门关联（用户可属于多部门）
ALTER TABLE users ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS custom_role_id UUID REFERENCES roles(id);

-- 10. 消息模板表
CREATE TABLE IF NOT EXISTS message_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL,
    subject VARCHAR(200),
    content TEXT NOT NULL,
    variables JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. API调用统计表
CREATE TABLE IF NOT EXISTS api_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint VARCHAR(200) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INT,
    response_time INT,
    user_id UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_api_stats_endpoint ON api_stats(endpoint);
CREATE INDEX idx_api_stats_created ON api_stats(created_at DESC);

-- 12. 数据归档配置表
CREATE TABLE IF NOT EXISTS archive_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(100) NOT NULL UNIQUE,
    retention_days INT DEFAULT 365,
    is_enabled BOOLEAN DEFAULT true,
    last_archive_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 13. 翻译词条表
CREATE TABLE IF NOT EXISTS translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(200) NOT NULL,
    locale VARCHAR(10) NOT NULL,
    value TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(key, locale)
);
CREATE INDEX idx_translations_locale ON translations(locale);

-- 初始化系统角色
INSERT INTO roles (name, display_name, is_system) VALUES 
    ('admin', '系统管理员', true),
    ('sales_manager', '销售经理', true),
    ('sales_rep', '销售代表', true),
    ('finance', '财务人员', true)
ON CONFLICT (name) DO NOTHING;

-- 初始化权限
INSERT INTO permissions (code, name, module) VALUES
    ('customer:view', '查看客户', 'customer'),
    ('customer:create', '创建客户', 'customer'),
    ('customer:edit', '编辑客户', 'customer'),
    ('customer:delete', '删除客户', 'customer'),
    ('opportunity:view', '查看商机', 'opportunity'),
    ('opportunity:create', '创建商机', 'opportunity'),
    ('opportunity:edit', '编辑商机', 'opportunity'),
    ('quote:view', '查看报价', 'quote'),
    ('quote:create', '创建报价', 'quote'),
    ('quote:approve', '审批报价', 'quote'),
    ('order:view', '查看订单', 'order'),
    ('order:create', '创建订单', 'order'),
    ('admin:access', '访问管理后台', 'admin'),
    ('admin:users', '用户管理', 'admin'),
    ('admin:settings', '系统设置', 'admin')
ON CONFLICT (code) DO NOTHING;

-- 初始化数据字典
INSERT INTO dictionaries (type, code, label, sort_order) VALUES
    ('customer_source', 'website', '官网', 1),
    ('customer_source', 'referral', '转介绍', 2),
    ('customer_source', 'exhibition', '展会', 3),
    ('customer_source', 'cold_call', '陌拜', 4),
    ('customer_source', 'other', '其他', 99),
    ('industry', 'manufacturing', '制造业', 1),
    ('industry', 'technology', '科技', 2),
    ('industry', 'finance', '金融', 3),
    ('industry', 'retail', '零售', 4),
    ('industry', 'healthcare', '医疗', 5),
    ('industry', 'other', '其他', 99),
    ('opportunity_stage', 'initial', '初步接触', 1),
    ('opportunity_stage', 'requirement', '需求确认', 2),
    ('opportunity_stage', 'proposal', '方案报价', 3),
    ('opportunity_stage', 'negotiation', '商务谈判', 4),
    ('opportunity_stage', 'closed_won', '成交', 5),
    ('opportunity_stage', 'closed_lost', '丢单', 6)
ON CONFLICT (type, code) DO NOTHING;

-- 初始化归档配置
INSERT INTO archive_configs (table_name, retention_days) VALUES
    ('operation_logs', 180),
    ('api_stats', 90),
    ('notifications', 90)
ON CONFLICT (table_name) DO NOTHING;
