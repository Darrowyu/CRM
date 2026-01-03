import { BaseRepository } from './BaseRepository.js';
import { FollowUp, FollowUpAttachment, CreateFollowUpDTO } from '../models/FollowUp.js';
import { query, pool } from '../db/connection.js';

export class FollowUpRepository extends BaseRepository<FollowUp> {
  constructor() {
    super('follow_ups');
  }

  async createWithAttachments(data: CreateFollowUpDTO): Promise<FollowUp> { // 创建跟进记录并更新客户最后联系日期
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const followUpResult = await client.query(
        `INSERT INTO follow_ups (customer_id, opportunity_id, user_id, content, type) 
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [data.customer_id, data.opportunity_id, data.user_id, data.content, data.type]
      );
      const followUp = followUpResult.rows[0];

      if (data.attachments?.length) {
        for (const att of data.attachments) {
          await client.query(
            `INSERT INTO follow_up_attachments (follow_up_id, file_url, file_type) VALUES ($1, $2, $3)`,
            [followUp.id, att.file_url, att.file_type]
          );
        }
      }

      // 更新客户最后联系日期
      await client.query(
        `UPDATE customers SET last_contact_date = CURRENT_DATE, updated_at = NOW() WHERE id = $1`,
        [data.customer_id]
      );

      await client.query('COMMIT');
      return followUp;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async findByCustomer(customerId: string): Promise<FollowUp[]> { // 查询客户的跟进记录
    const result = await query(
      'SELECT * FROM follow_ups WHERE customer_id = $1 ORDER BY created_at DESC',
      [customerId]
    );
    return result.rows;
  }

  async findByOpportunity(opportunityId: string): Promise<FollowUp[]> { // 查询商机的跟进记录
    const result = await query(
      `SELECT f.*, u.name as user_name FROM follow_ups f 
       LEFT JOIN users u ON f.user_id = u.id 
       WHERE f.opportunity_id = $1 ORDER BY f.created_at DESC`,
      [opportunityId]
    );
    return result.rows;
  }

  async getAttachments(followUpId: string): Promise<FollowUpAttachment[]> { // 获取跟进附件
    const result = await query(
      'SELECT * FROM follow_up_attachments WHERE follow_up_id = $1',
      [followUpId]
    );
    return result.rows;
  }
}

export const followUpRepository = new FollowUpRepository();
