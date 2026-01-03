-- P2功能：客户评分/分级、销售预测
-- 创建时间: 2024-12

-- 1. 客户评分表
CREATE TABLE IF NOT EXISTS customer_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE UNIQUE,
  recency_score INTEGER DEFAULT 0,
  frequency_score INTEGER DEFAULT 0,
  monetary_score INTEGER DEFAULT 0,
  total_score INTEGER DEFAULT 0,
  grade VARCHAR(10) DEFAULT 'C',
  last_calculated TIMESTAMP DEFAULT NOW()
);

-- 2. 销售预测表
CREATE TABLE IF NOT EXISTS sales_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  forecast_amount DECIMAL(15,2) NOT NULL,
  confidence_level VARCHAR(20) DEFAULT 'medium',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, year, month)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_customer_scores_grade ON customer_scores(grade);
CREATE INDEX IF NOT EXISTS idx_customer_scores_total ON customer_scores(total_score DESC);
CREATE INDEX IF NOT EXISTS idx_forecasts_user ON sales_forecasts(user_id, year, month);
