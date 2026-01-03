import { CreateCustomerDTO, maskPhone } from '../models/Customer.js';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export const validateCustomerData = (data: Partial<CreateCustomerDTO>): ValidationResult => { // 验证客户数据
  const errors: string[] = [];
  
  if (!data.company_name?.trim()) errors.push('公司名称不能为空');
  if (!data.contact_name?.trim()) errors.push('联系人姓名不能为空');
  if (!data.phone?.trim()) errors.push('联系人电话不能为空');
  if (!data.industry?.trim()) errors.push('行业不能为空');
  
  if (data.phone && !/^1[3-9]\d{9}$/.test(data.phone)) {
    errors.push('手机号格式不正确');
  }
  
  return { valid: errors.length === 0, errors };
};

export const isValidPhone = (phone: string): boolean => /^1[3-9]\d{9}$/.test(phone); // 验证手机号格式

export const CUSTOMER_CLAIM_LIMIT = 50; // 私海客户上限
export const INACTIVE_DAYS_LIMIT = 30;  // 未跟进天数上限
