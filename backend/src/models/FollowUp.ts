import { FollowUpType } from '../types/index.js';

export interface FollowUp {
  id: string;
  customer_id: string;
  opportunity_id?: string;
  user_id: string;
  content: string;
  type: FollowUpType;
  created_at?: Date;
}

export interface FollowUpAttachment {
  id: string;
  follow_up_id: string;
  file_url: string;
  file_type?: string;
  created_at?: Date;
}

export interface CreateFollowUpDTO {
  customer_id: string;
  opportunity_id?: string;
  user_id: string;
  content: string;
  type: FollowUpType;
  attachments?: { file_url: string; file_type?: string }[];
}
