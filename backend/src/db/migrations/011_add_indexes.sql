-- 添加缺失的数据库索引以提升查询性能

-- operation_logs 表索引
CREATE INDEX IF NOT EXISTS idx_operation_logs_user_action ON operation_logs(user_id, action);
CREATE INDEX IF NOT EXISTS idx_operation_logs_created_at ON operation_logs(created_at DESC);

-- customer_scores 表索引
CREATE INDEX IF NOT EXISTS idx_customer_scores_customer_id ON customer_scores(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_scores_grade ON customer_scores(grade);

-- tasks 表索引
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);

-- notifications 表索引
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- contracts 表索引
CREATE INDEX IF NOT EXISTS idx_contracts_customer_id ON contracts(customer_id);
CREATE INDEX IF NOT EXISTS idx_contracts_end_date ON contracts(end_date);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);

-- payment_plans 表索引
CREATE INDEX IF NOT EXISTS idx_payment_plans_contract_id ON payment_plans(contract_id);
CREATE INDEX IF NOT EXISTS idx_payment_plans_due_date ON payment_plans(due_date);

-- sales_targets 表索引
CREATE INDEX IF NOT EXISTS idx_sales_targets_user_id ON sales_targets(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_targets_year_month ON sales_targets(year, month);

-- sales_forecasts 表索引
CREATE INDEX IF NOT EXISTS idx_sales_forecasts_period ON sales_forecasts(period_start, period_end);
