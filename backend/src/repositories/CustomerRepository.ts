import { BaseRepository } from './BaseRepository.js';
import { Customer, CreateCustomerDTO, maskPhone } from '../models/Customer.js';
import { query, pool } from '../db/connection.js';
import { CustomerStatus, UserRole } from '../types/index.js';

export class CustomerRepository extends BaseRepository<Customer> {
  constructor() {
    super('customers');
  }

  async createWithContact(data: CreateCustomerDTO, ownerId?: string): Promise<Customer> { // 创建客户及联系人
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const customerResult = await client.query(
        `INSERT INTO customers (company_name, industry, region, source, owner_id, status) 
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [data.company_name, data.industry || null, data.region || null, data.source || null, ownerId, 
         ownerId ? CustomerStatus.PRIVATE : CustomerStatus.PUBLIC_POOL]
      );
      const customer = customerResult.rows[0];

      if (data.contact_name || data.phone || data.email) { // 有任意联系人信息时创建联系人
        await client.query(
          `INSERT INTO contacts (customer_id, name, phone, email, role, is_primary) 
           VALUES ($1, $2, $3, $4, $5, true)`,
          [customer.id, data.contact_name || null, data.phone || null, data.email || null, data.contact_role || null]
        );
      }

      await client.query('COMMIT');
      return customer;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async checkDuplicate(companyName: string, phone: string): Promise<{ exists: boolean; field?: string }> { // 查重
    const companyCheck = await query('SELECT id FROM customers WHERE company_name = $1', [companyName]);
    if (companyCheck.rows.length > 0) return { exists: true, field: 'company_name' };
    
    if (phone) { // 只有电话非空时才检查电话重复
      const phoneCheck = await query('SELECT id FROM contacts WHERE phone = $1', [phone]);
      if (phoneCheck.rows.length > 0) return { exists: true, field: 'phone' };
    }
    
    return { exists: false };
  }


  async findByOwner(ownerId: string, limit = 100, offset = 0): Promise<Customer[]> { // 查询私海客户
    const result = await query(
      `SELECT c.*, COALESCE(json_agg(json_build_object('id', ct.id, 'name', ct.name, 'phone', ct.phone, 'email', ct.email, 'role', ct.role)) FILTER (WHERE ct.id IS NOT NULL), '[]') as contacts
       FROM customers c 
       LEFT JOIN contacts ct ON ct.customer_id = c.id
       WHERE c.owner_id = $1 AND c.status = 'private'
       GROUP BY c.id
       ORDER BY c.updated_at DESC LIMIT $2 OFFSET $3`,
      [ownerId, limit, offset]
    );
    return result.rows;
  }

  async findPublicPool(limit = 100, offset = 0): Promise<Customer[]> { // 查询公海客户
    const result = await query(
      `SELECT c.*, COALESCE(json_agg(json_build_object('id', ct.id, 'name', ct.name, 'phone', ct.phone, 'email', ct.email, 'role', ct.role)) FILTER (WHERE ct.id IS NOT NULL), '[]') as contacts
       FROM customers c 
       LEFT JOIN contacts ct ON ct.customer_id = c.id
       WHERE c.status = 'public_pool'
       GROUP BY c.id
       ORDER BY c.updated_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return result.rows;
  }

  async findAll(): Promise<Customer[]> { // 查询所有客户(管理员导出用)
    const result = await query(
      `SELECT c.*, COALESCE(json_agg(json_build_object('id', ct.id, 'name', ct.name, 'phone', ct.phone, 'email', ct.email, 'role', ct.role, 'is_primary', ct.is_primary)) FILTER (WHERE ct.id IS NOT NULL), '[]') as contacts
       FROM customers c 
       LEFT JOIN contacts ct ON ct.customer_id = c.id
       GROUP BY c.id
       ORDER BY c.updated_at DESC`
    );
    return result.rows;
  }

  async countByOwner(ownerId: string): Promise<number> { // 统计私海客户数
    const result = await query(
      `SELECT COUNT(*) FROM customers WHERE owner_id = $1 AND status = 'private'`,
      [ownerId]
    );
    return parseInt(result.rows[0].count, 10);
  }

  async claimCustomer(customerId: string, ownerId: string): Promise<Customer | null> { // 领取客户(带事务和行锁防竞态)
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // 先锁定检查私海数量
      const countResult = await client.query(
        `SELECT COUNT(*) FROM customers WHERE owner_id = $1 AND status = 'private' FOR UPDATE`,
        [ownerId]
      );
      const count = parseInt(countResult.rows[0].count, 10);
      if (count >= 50) {
        await client.query('ROLLBACK');
        return null; // 超过上限
      }
      // 锁定目标客户并更新
      const result = await client.query(
        `UPDATE customers SET owner_id = $1, status = 'private', updated_at = NOW() 
         WHERE id = $2 AND status = 'public_pool' RETURNING *`,
        [ownerId, customerId]
      );
      await client.query('COMMIT');
      return result.rows[0] || null;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async releaseCustomer(customerId: string, reason?: string): Promise<Customer | null> { // 释放客户
    const result = await query(
      `UPDATE customers SET owner_id = NULL, status = 'public_pool', updated_at = NOW() 
       WHERE id = $1 RETURNING *`,
      [customerId]
    );
    return result.rows[0] || null;
  }

  async releaseCustomerByOwner(customerId: string, userId: string, role: UserRole, reason?: string): Promise<Customer | null> { // 释放客户(验证归属权限)
    const customer = await this.findById(customerId);
    if (!customer) return null;
    if (role !== UserRole.ADMIN && customer.owner_id !== userId) return null; // 非管理员只能释放自己的客户
    return this.releaseCustomer(customerId, reason);
  }

  async deleteCustomerByOwner(customerId: string, userId: string, role: UserRole, force = false): Promise<boolean | 'forbidden'> { // 删除客户(验证归属权限)
    const customer = await this.findById(customerId);
    if (!customer) return 'forbidden';
    if (role !== UserRole.ADMIN && customer.owner_id !== userId) return 'forbidden'; // 非管理员只能删除自己的客户
    return this.deleteCustomer(customerId, force);
  }

  async findInactiveCustomers(days: number): Promise<Customer[]> { // 查找超期未跟进客户（参数化防SQL注入）
    const result = await query(
      `SELECT * FROM customers WHERE status = 'private' AND (last_contact_date IS NULL OR last_contact_date < NOW() - INTERVAL '1 day' * $1)`,
      [days]
    );
    return result.rows;
  }

  async findWithRelations(customerId: string): Promise<any> { // 获取客户360度视图
    const customerResult = await query(
      `SELECT c.*, u.name as owner_name FROM customers c LEFT JOIN users u ON c.owner_id = u.id WHERE c.id = $1`,
      [customerId]
    );
    if (!customerResult.rows[0]) return null;
    const customer = customerResult.rows[0];

    const [contacts, opportunities, quotes, orders, followUps] = await Promise.all([
      query(`SELECT * FROM contacts WHERE customer_id = $1 ORDER BY is_primary DESC, created_at`, [customerId]),
      query(`SELECT * FROM opportunities WHERE customer_id = $1 ORDER BY created_at DESC LIMIT 10`, [customerId]),
      query(`SELECT * FROM quotes WHERE customer_id = $1 ORDER BY created_at DESC LIMIT 10`, [customerId]),
      query(`SELECT * FROM orders WHERE customer_id = $1 ORDER BY created_at DESC LIMIT 10`, [customerId]),
      query(`SELECT f.*, u.name as user_name FROM follow_ups f LEFT JOIN users u ON f.user_id = u.id WHERE f.customer_id = $1 ORDER BY f.created_at DESC LIMIT 20`, [customerId]),
    ]);

    return { ...customer, contacts: contacts.rows, opportunities: opportunities.rows, quotes: quotes.rows, orders: orders.rows, follow_ups: followUps.rows };
  }

  maskPhoneForRole(customers: Customer[], role: UserRole): Customer[] { // 按角色脱敏手机号
    if (role === UserRole.ADMIN) return customers;
    return customers.map(c => ({
      ...c,
      contacts: (c as any).contacts?.map((ct: any) => ({ ...ct, phone: ct.phone ? maskPhone(ct.phone) : undefined }))
    } as Customer));
  }

  async checkRelations(customerId: string): Promise<{ hasRelations: boolean; details: { opportunities: number; quotes: number; orders: number } }> { // 检查关联数据
    const [opp, quote, order] = await Promise.all([
      query('SELECT COUNT(*) FROM opportunities WHERE customer_id = $1', [customerId]),
      query('SELECT COUNT(*) FROM quotes WHERE customer_id = $1', [customerId]),
      query('SELECT COUNT(*) FROM orders WHERE customer_id = $1', [customerId]),
    ]);
    const details = { opportunities: parseInt(opp.rows[0].count), quotes: parseInt(quote.rows[0].count), orders: parseInt(order.rows[0].count) };
    return { hasRelations: details.opportunities > 0 || details.quotes > 0 || details.orders > 0, details };
  }

  async deleteCustomer(customerId: string, force = false): Promise<boolean> { // 删除客户(级联删除联系人和跟进记录)
    if (!force) {
      const { hasRelations } = await this.checkRelations(customerId);
      if (hasRelations) return false;
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      if (force) { // 强制删除时清理关联数据
        await client.query('DELETE FROM quote_items WHERE quote_id IN (SELECT id FROM quotes WHERE customer_id = $1)', [customerId]);
        await client.query('DELETE FROM quotes WHERE customer_id = $1', [customerId]);
        await client.query('DELETE FROM orders WHERE customer_id = $1', [customerId]);
        await client.query('DELETE FROM opportunities WHERE customer_id = $1', [customerId]);
      }
      await client.query('DELETE FROM follow_ups WHERE customer_id = $1', [customerId]);
      await client.query('DELETE FROM contacts WHERE customer_id = $1', [customerId]);
      await client.query('DELETE FROM customers WHERE id = $1', [customerId]);
      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

export const customerRepository = new CustomerRepository();
