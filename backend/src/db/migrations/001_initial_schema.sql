-- Makrite CRM 初始数据库架构
-- 创建时间: 2024

-- 启用UUID扩展
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. 用户表
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('sales_rep', 'sales_manager', 'finance', 'admin')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. 客户表
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name VARCHAR(200) NOT NULL,
  industry VARCHAR(100),
  region VARCHAR(100),
  status VARCHAR(20) DEFAULT 'public_pool' CHECK (status IN ('private', 'public_pool')),
  owner_id UUID REFERENCES users(id),
  last_contact_date DATE,
  source VARCHAR(50) CHECK (source IN ('exhibition', 'website', 'referral', 'other')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(company_name)
);

-- 3. 联系人表
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(100),
  role VARCHAR(100),
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(phone)
);


-- 4. 商机表
CREATE TABLE IF NOT EXISTS opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  amount DECIMAL(15,2),
  stage VARCHAR(30) DEFAULT 'prospecting' CHECK (stage IN ('prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost')),
  probability INTEGER DEFAULT 10,
  expected_close_date DATE,
  loss_reason TEXT,
  owner_id UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 5. 跟进记录表
CREATE TABLE IF NOT EXISTS follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  opportunity_id UUID REFERENCES opportunities(id),
  user_id UUID REFERENCES users(id),
  content TEXT NOT NULL,
  type VARCHAR(20) CHECK (type IN ('call', 'visit', 'email', 'other')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 6. 跟进附件表
CREATE TABLE IF NOT EXISTS follow_up_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follow_up_id UUID REFERENCES follow_ups(id) ON DELETE CASCADE,
  file_url VARCHAR(500) NOT NULL,
  file_type VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 7. 产品表
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  sku VARCHAR(50) UNIQUE,
  base_price DECIMAL(10,2) NOT NULL,
  floor_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 8. 阶梯价格表
CREATE TABLE IF NOT EXISTS pricing_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  min_quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);


-- 9. 报价单表
CREATE TABLE IF NOT EXISTS quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number VARCHAR(50) UNIQUE NOT NULL,
  opportunity_id UUID REFERENCES opportunities(id),
  customer_id UUID REFERENCES customers(id),
  total_amount DECIMAL(15,2),
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'pending_manager', 'pending_director', 'approved', 'rejected', 'sent')),
  requires_approval BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 10. 报价单明细表
CREATE TABLE IF NOT EXISTS quote_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total DECIMAL(15,2) NOT NULL,
  is_manual_price BOOLEAN DEFAULT false
);

-- 11. 订单表
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number VARCHAR(50) UNIQUE NOT NULL,
  quote_id UUID REFERENCES quotes(id),
  opportunity_id UUID REFERENCES opportunities(id),
  customer_id UUID REFERENCES customers(id),
  total_amount DECIMAL(15,2),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'shipped', 'completed', 'cancelled')),
  payment_status VARCHAR(20) DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid')),
  payment_amount DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 12. 合同附件表
CREATE TABLE IF NOT EXISTS order_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  file_url VARCHAR(500) NOT NULL,
  file_name VARCHAR(200),
  file_type VARCHAR(20),
  uploaded_at TIMESTAMP DEFAULT NOW()
);

-- 13. 审批记录表
CREATE TABLE IF NOT EXISTS approval_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE,
  approver_id UUID REFERENCES users(id),
  action VARCHAR(20) CHECK (action IN ('approve', 'reject')),
  comment TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 创建索引以提升查询性能
CREATE INDEX IF NOT EXISTS idx_customers_owner ON customers(owner_id);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_opportunities_customer ON opportunities(customer_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_stage ON opportunities(stage);
CREATE INDEX IF NOT EXISTS idx_follow_ups_customer ON follow_ups(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotes_customer ON quotes(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
