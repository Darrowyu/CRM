export interface Dictionary { id: string; type: string; code: string; label: string; sort_order: number; enabled: boolean; }
export interface Announcement { id: string; title: string; content: string; type: string; priority: number; start_time?: string; end_time?: string; is_active: boolean; creator_name?: string; created_at: string; }
export interface ApprovalConfig { id: string; name: string; type: string; threshold?: number; approver_role?: string; approver_id?: string; approver_name?: string; is_active: boolean; }
export interface OperationLog { id: string; user_id?: string; action: string; module: string; target_type?: string; target_id?: string; detail: Record<string, unknown>; ip_address?: string; created_at: string; operator_name?: string; }
export interface Role { id: string; name: string; display_name: string; description?: string; is_system: boolean; }
export interface Permission { id: string; code: string; name: string; module: string; description?: string; }
export interface Department { id: string; name: string; parent_id?: string; manager_id?: string; manager_name?: string; sort_order: number; }
export interface MessageTemplate { id: string; name: string; type: string; subject?: string; content: string; variables: string[]; is_active: boolean; }
export interface ArchiveConfig { id: string; table_name: string; retention_days: number; is_enabled: boolean; last_archive_at?: string; }
export interface Translation { id: string; key: string; locale: string; value: string; updated_at: string; }
export interface ApiStat { endpoint: string; method: string; count: number; avg_time: number; error_count: number; }
export interface SystemHealth { database: { status: string; time: string }; tables: { table_name: string; row_count: number }[]; memory: { used: number; total: number; percentage: number; heapUsed?: number; heapTotal?: number; rss?: number }; uptime: number; }
