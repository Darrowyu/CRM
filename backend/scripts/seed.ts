import bcrypt from 'bcrypt';
import { pool } from '../src/db/connection.js';
import dotenv from 'dotenv';

dotenv.config();

const seedData = async () => {
  console.log('[Seed] Starting database seeding...');

  try {
    // 创建默认管理员
    const adminPassword = await bcrypt.hash('admin123', 10);
    await pool.query(`
      INSERT INTO users (username, password_hash, name, role) 
      VALUES ('admin', $1, '系统管理员', 'admin')
      ON CONFLICT (username) DO NOTHING
    `, [adminPassword]);
    console.log('[Seed] Admin user created (username: admin, password: admin123)');

    // 创建示例销售经理
    const managerPassword = await bcrypt.hash('manager123', 10);
    await pool.query(`
      INSERT INTO users (username, password_hash, name, role) 
      VALUES ('manager', $1, '张经理', 'sales_manager')
      ON CONFLICT (username) DO NOTHING
    `, [managerPassword]);
    console.log('[Seed] Manager user created (username: manager, password: manager123)');

    // 创建示例销售代表
    const salesPassword = await bcrypt.hash('sales123', 10);
    await pool.query(`
      INSERT INTO users (username, password_hash, name, role) 
      VALUES ('sales', $1, '李销售', 'sales_rep')
      ON CONFLICT (username) DO NOTHING
    `, [salesPassword]);
    console.log('[Seed] Sales user created (username: sales, password: sales123)');

    // 创建示例产品
    const productResult = await pool.query(`
      INSERT INTO products (name, sku, base_price, floor_price) 
      VALUES 
        ('标准螺丝 M6', 'SCR-M6-001', 0.15, 0.10),
        ('不锈钢螺母 M8', 'NUT-M8-001', 0.25, 0.18),
        ('六角螺栓 M10', 'BOLT-M10-001', 0.50, 0.35)
      ON CONFLICT DO NOTHING
      RETURNING id, name
    `);
    console.log('[Seed] Products created');

    // 为产品添加阶梯价格
    if (productResult.rows.length > 0) {
      const productId = productResult.rows[0].id;
      await pool.query(`
        INSERT INTO pricing_tiers (product_id, min_quantity, unit_price) 
        VALUES 
          ($1, 1, 0.15),
          ($1, 10000, 0.12),
          ($1, 100000, 0.10),
          ($1, 1000000, 0.08)
        ON CONFLICT DO NOTHING
      `, [productId]);
      console.log('[Seed] Pricing tiers created');
    }

    // 获取销售用户ID
    const salesUser = await pool.query(`SELECT id FROM users WHERE username = 'sales'`);
    const salesId = salesUser.rows[0]?.id;

    // 创建示例客户（私海）
    const customers = [
      { company: '上海精密制造有限公司', industry: '制造业', region: 'CN', contact: '王总', phone: '13800138001', email: 'wang@shpm.com', role: '采购总监', source: 'exhibition' },
      { company: 'Tokyo Electronics Co.', industry: '科技', region: 'JP', contact: '田中', phone: '+81-3-1234-5678', email: 'tanaka@tokyoelec.jp', role: 'Procurement Manager', source: 'referral' },
      { company: 'Singapore Medical Supplies', industry: '医疗', region: 'SG', contact: 'David Lee', phone: '+65-9123-4567', email: 'david@sgmed.sg', role: 'Director', source: 'website' },
    ];

    for (const c of customers) {
      const custResult = await pool.query(`
        INSERT INTO customers (company_name, industry, region, status, owner_id, source)
        VALUES ($1, $2, $3, 'private', $4, $5)
        ON CONFLICT DO NOTHING RETURNING id
      `, [c.company, c.industry, c.region, salesId, c.source]);
      
      if (custResult.rows[0]) {
        await pool.query(`
          INSERT INTO contacts (customer_id, name, phone, email, role, is_primary)
          VALUES ($1, $2, $3, $4, $5, true) ON CONFLICT DO NOTHING
        `, [custResult.rows[0].id, c.contact, c.phone, c.email, c.role]);
      }
    }
    console.log('[Seed] Private customers created');

    // 创建公海客户
    const publicCustomers = [
      { company: '深圳创新科技', industry: '科技', region: 'CN', contact: '陈经理', phone: '13900139001', email: 'chen@sztech.com', role: '采购', source: 'website' },
      { company: 'Bangkok Trading Co.', industry: '贸易', region: 'TH', contact: 'Somchai', phone: '+66-2-123-4567', email: 'somchai@bkktrade.th', role: 'Buyer', source: 'other' },
    ];

    for (const c of publicCustomers) {
      const custResult = await pool.query(`
        INSERT INTO customers (company_name, industry, region, status, source)
        VALUES ($1, $2, $3, 'public_pool', $4)
        ON CONFLICT DO NOTHING RETURNING id
      `, [c.company, c.industry, c.region, c.source]);
      
      if (custResult.rows[0]) {
        await pool.query(`
          INSERT INTO contacts (customer_id, name, phone, email, role, is_primary)
          VALUES ($1, $2, $3, $4, $5, true) ON CONFLICT DO NOTHING
        `, [custResult.rows[0].id, c.contact, c.phone, c.email, c.role]);
      }
    }
    console.log('[Seed] Public pool customers created');

    console.log('[Seed] ✅ Database seeding completed!');
  } catch (error) {
    console.error('[Seed] ❌ Seeding failed:', error);
  } finally {
    await pool.end();
  }
};

seedData();
