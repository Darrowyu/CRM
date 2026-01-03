import { QuoteStatus } from '../types/index.js';

export interface Quote {
  id: string;
  quote_number: string;
  opportunity_id?: string;
  customer_id: string;
  total_amount?: number;
  status: QuoteStatus;
  requires_approval: boolean;
  created_by: string;
  approved_by?: string;
  rejection_reason?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface QuoteItem {
  id: string;
  quote_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total: number;
  is_manual_price: boolean;
}

export interface CreateQuoteDTO {
  customer_id: string;
  opportunity_id?: string;
  created_by: string;
  items: {
    product_id: string;
    quantity: number;
    unit_price: number;
    calculated_price: number; // 系统计算的阶梯价格
  }[];
}

// 检查是否需要审批（价格低于底价）
export const requiresApproval = (unitPrice: number, floorPrice: number): boolean => {
  return unitPrice < floorPrice;
};

// 检查是否手动调价
export const isManualPrice = (unitPrice: number, calculatedPrice: number): boolean => {
  return Math.abs(unitPrice - calculatedPrice) > 0.001;
};

// 生成报价单号
export const generateQuoteNumber = (): string => {
  const date = new Date();
  const prefix = 'QT';
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${prefix}${dateStr}${random}`;
};
