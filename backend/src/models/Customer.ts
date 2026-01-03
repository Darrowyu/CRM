import { CustomerStatus, LeadSource } from '../types/index.js';

export interface Customer {
  id: string;
  company_name: string;
  industry?: string;
  region?: string;
  status: CustomerStatus;
  owner_id?: string;
  last_contact_date?: Date;
  source?: LeadSource;
  created_at?: Date;
  updated_at?: Date;
}

export interface CreateCustomerDTO {
  company_name: string;
  industry: string;
  region?: string;
  source?: LeadSource;
  contact_name: string;  // 联系人姓名（必填）
  phone: string;         // 联系人电话（必填）
  email?: string;
  contact_role?: string;
}

export interface CustomerWithContact extends Customer {
  contact_name?: string;
  contact_phone?: string;
}

export const maskPhone = (phone: string): string => { // 手机号脱敏：138****8000
  if (!phone || phone.length < 7) return phone;
  const start = phone.substring(0, 3);
  const end = phone.substring(phone.length - 4);
  return `${start}****${end}`;
};
