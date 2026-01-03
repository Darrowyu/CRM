// 任务类型枚举
export enum TaskType {
  FOLLOW_UP = 'follow_up',
  CALL = 'call',
  VISIT = 'visit',
  MEETING = 'meeting',
  QUOTE = 'quote',
  OTHER = 'other'
}

// 任务优先级枚举
export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

// 任务状态枚举
export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

// 通知类型枚举
export enum NotificationType {
  TASK_REMINDER = 'task_reminder',
  APPROVAL_REQUEST = 'approval_request',
  APPROVAL_RESULT = 'approval_result',
  CUSTOMER_CLAIM = 'customer_claim',
  CUSTOMER_RELEASE = 'customer_release',
  TARGET_ALERT = 'target_alert',
  SYSTEM = 'system'
}

// 任务接口
export interface Task {
  id: string;
  title: string;
  description?: string;
  type: TaskType;
  priority: TaskPriority;
  status: TaskStatus;
  due_date?: Date;
  reminder_time?: Date;
  customer_id?: string;
  customer_name?: string;
  opportunity_id?: string;
  opportunity_name?: string;
  assigned_to: string;
  assigned_to_name?: string;
  created_by?: string;
  created_by_name?: string;
  completed_at?: Date;
  created_at: Date;
  updated_at: Date;
}

// 通知接口
export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  content?: string;
  related_type?: string;
  related_id?: string;
  is_read: boolean;
  created_at: Date;
}

// 销售目标接口
export interface SalesTarget {
  id: string;
  user_id: string;
  user_name?: string;
  year: number;
  month: number;
  target_amount: number;
  target_customers: number;
  target_opportunities: number;
  actual_amount?: number;
  actual_customers?: number;
  actual_opportunities?: number;
  achievement_rate?: number;
  created_at: Date;
}

// 团队目标接口
export interface TeamTarget {
  id: string;
  year: number;
  month: number;
  target_amount: number;
  target_customers: number;
  target_opportunities: number;
  actual_amount?: number;
  actual_customers?: number;
  actual_opportunities?: number;
  achievement_rate?: number;
  created_at: Date;
}
