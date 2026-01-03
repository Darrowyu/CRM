import { Quote } from '../../services/quoteService';
import { Customer } from '../../services/customerService';
import { Opportunity } from '../../services/opportunityService';

// 状态类型
export type QuoteStatusKey = 'draft' | 'pending_manager' | 'pending_director' | 'approved' | 'rejected' | 'sent';

// 颜色常量
export const STATUS_COLORS: Record<QuoteStatusKey, string> = {
  draft: 'default',
  pending_manager: 'processing',
  pending_director: 'processing',
  approved: 'success',
  rejected: 'error',
  sent: 'cyan'
};

export const STATUS_STEPS: Record<QuoteStatusKey, number> = {
  draft: 0,
  pending_manager: 1,
  pending_director: 1,
  approved: 2,
  rejected: -1,
  sent: 3
};

// 表单项类型
export interface QuoteFormItem {
  product_id?: string;
  quantity?: number;
  unit_price?: number;
}

// 表单总额计算
export const calcFormTotal = (items: QuoteFormItem[]): number =>
  items?.reduce((sum, i) => sum + (i?.quantity || 0) * (i?.unit_price || 0), 0) || 0;

// 共享Props类型
export interface QuoteActionsProps {
  loadData: () => Promise<void>;
  message: ReturnType<typeof import('antd').App.useApp>['message'];
  t: (key: string) => string;
}

export interface QuoteTableProps {
  quotes: Quote[];
  loading: boolean;
  selectedRowKeys: React.Key[];
  onSelectChange: (keys: React.Key[]) => void;
  onView: (quote: Quote) => void;
  onEdit: (quote: Quote) => void;
  onDelete: (id: string) => void;
  onCopy: (id: string) => void;
  onSubmit: (id: string) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onConvert: (quote: Quote) => void;
  statusMap: Record<string, { color: string; label: string; step: number }>;
  t: (key: string) => string;
}

export interface QuoteDetailProps {
  open: boolean;
  quote: Quote | null;
  loading: boolean;
  onClose: () => void;
  onEdit: (quote: Quote) => void;
  onCopy: (id: string) => void;
  onSubmit: (id: string) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onConvert: (quote: Quote) => void;
  onPrint: (quote: Quote) => void;
  statusMap: Record<string, { color: string; label: string; step: number }>;
  t: (key: string) => string;
}

export interface QuoteFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: { customer_id?: string; opportunity_id?: string; items: QuoteFormItem[] }) => void;
  customers: Customer[];
  products: { id: string; name: string; sku: string; price: number }[];
  opportunities: Opportunity[];
  selectedCustomerId: string;
  onCustomerChange: (customerId: string) => void;
  submitting: boolean;
  t: (key: string) => string;
  mode: 'create' | 'edit';
  editQuote?: Quote | null;
}

export interface ApprovalStepsProps {
  quote: Quote;
  statusMap: Record<string, { color: string; label: string; step: number }>;
  t: (key: string) => string;
}
