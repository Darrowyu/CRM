-- AI Agent 权限点迁移
-- 为AI工作流模块添加细粒度权限控制

-- 1. 添加 AI Agent 模块权限点
INSERT INTO permissions (code, name, module, description) VALUES
    ('agent:analyze', '智能分析', 'agent', '访问管道健康、风险商机、每日摘要等分析功能'),
    ('agent:reactivation', '客户激活', 'agent', '执行沉睡客户分析和激活功能'),
    ('agent:scoring', 'AI评分', 'agent', '执行AI客户评分功能'),
    ('agent:workflow', '工作流管理', 'agent', '创建和管理自定义工作流')
ON CONFLICT (code) DO NOTHING;

-- 2. 为系统管理员角色分配所有 Agent 权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'admin' AND p.module = 'agent'
ON CONFLICT DO NOTHING;

-- 3. 为销售经理角色分配所有 Agent 权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'sales_manager' AND p.module = 'agent'
ON CONFLICT DO NOTHING;

-- 4. 为普通销售分配分析权限（只读）
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'sales_rep' AND p.code = 'agent:analyze'
ON CONFLICT DO NOTHING;
