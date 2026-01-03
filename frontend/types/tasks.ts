// 任务类型枚举
export enum TaskType { FOLLOW_UP = 'follow_up', CALL = 'call', VISIT = 'visit', MEETING = 'meeting', QUOTE = 'quote', OTHER = 'other' }
export enum TaskPriority { LOW = 'low', MEDIUM = 'medium', HIGH = 'high', URGENT = 'urgent' }
export enum TaskStatus { PENDING = 'pending', IN_PROGRESS = 'in_progress', COMPLETED = 'completed', CANCELLED = 'cancelled' }
export enum NotificationType { TASK_REMINDER = 'task_reminder', APPROVAL_REQUEST = 'approval_request', APPROVAL_RESULT = 'approval_result', CUSTOMER_CLAIM = 'customer_claim', CUSTOMER_RELEASE = 'customer_release', TARGET_ALERT = 'target_alert', SYSTEM = 'system' }

export interface Task {
  id: string; title: string; description?: string; type: TaskType; priority: TaskPriority; status: TaskStatus;
  due_date?: string; reminder_time?: string; customer_id?: string; customer_name?: string; opportunity_id?: string; opportunity_name?: string;
  assigned_to: string; assigned_to_name?: string; created_by?: string; created_by_name?: string; completed_at?: string; created_at: string; updated_at: string;
}

export interface Notification {
  id: string; user_id: string; type: NotificationType; title: string; content?: string; related_type?: string; related_id?: string; is_read: boolean; created_at: string;
}

export interface SalesTarget {
  id: string; user_id: string; user_name?: string; year: number; month: number;
  target_amount: number; target_customers: number; target_opportunities: number; created_at: string;
}

export interface TargetWithActuals extends SalesTarget {
  actual_amount: number; actual_customers: number; actual_opportunities: number; achievement_rate: number;
}

export interface TaskStats { total: number; pending: number; in_progress: number; overdue: number; completed_today: number; completed_week: number; completion_rate: number; }
