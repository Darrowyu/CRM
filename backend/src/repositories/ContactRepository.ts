import { BaseRepository } from './BaseRepository.js';
import { Contact, CreateContactDTO } from '../models/Contact.js';
import { query } from '../db/connection.js';

export class ContactRepository extends BaseRepository<Contact> {
  constructor() {
    super('contacts');
  }

  async findByCustomer(customerId: string): Promise<Contact[]> { // 查询客户的所有联系人
    const result = await query(
      'SELECT * FROM contacts WHERE customer_id = $1 ORDER BY is_primary DESC, created_at ASC',
      [customerId]
    );
    return result.rows;
  }

  async findPrimaryContact(customerId: string): Promise<Contact | null> { // 查询主联系人
    const result = await query(
      'SELECT * FROM contacts WHERE customer_id = $1 AND is_primary = true',
      [customerId]
    );
    return result.rows[0] || null;
  }

  async setPrimaryContact(contactId: string, customerId: string): Promise<void> { // 设置主联系人
    await query('UPDATE contacts SET is_primary = false WHERE customer_id = $1', [customerId]);
    await query('UPDATE contacts SET is_primary = true WHERE id = $1', [contactId]);
  }

  async createContact(data: CreateContactDTO): Promise<Contact> { // 创建联系人
    if (data.is_primary) {
      await query('UPDATE contacts SET is_primary = false WHERE customer_id = $1', [data.customer_id]);
    }
    return this.create(data as Partial<Contact>);
  }
}

export const contactRepository = new ContactRepository();
