import { OrderStatus, PaymentStatus } from '../types/index.js';

export interface Order {
  id: string;
  order_number: string;
  quote_id?: string;
  opportunity_id?: string;
  customer_id: string;
  total_amount?: number;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_amount: number;
  created_at?: Date;
  updated_at?: Date;
}

export interface OrderContract {
  id: string;
  order_id: string;
  file_url: string;
  file_name?: string;
  file_type?: string;
  uploaded_at?: Date;
}

export interface CreateOrderDTO {
  quote_id?: string;
  opportunity_id?: string;
  customer_id: string;
  total_amount: number;
}

// 允许的合同文件类型
export const ALLOWED_CONTRACT_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
export const MAX_CONTRACT_SIZE = 10 * 1024 * 1024; // 10MB

export const isValidContractFile = (fileType: string, fileSize: number): { valid: boolean; error?: string } => {
  if (!ALLOWED_CONTRACT_TYPES.includes(fileType)) {
    return { valid: false, error: 'FILE_TYPE_INVALID' };
  }
  if (fileSize > MAX_CONTRACT_SIZE) {
    return { valid: false, error: 'FILE_SIZE_EXCEEDED' };
  }
  return { valid: true };
};

export const generateOrderNumber = (): string => {
  const date = new Date();
  const prefix = 'ORD';
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${prefix}${dateStr}${random}`;
};
