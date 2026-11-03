import type { JobJourney } from './workflow';
import type { AttentionIssue } from './reception-workdesk';

export type ManagementJob = {
  reference: string; quote_reference: string | null; order_reference: string | null;
  client_name: string; summary: string; journey: JobJourney; issues: AttentionIssue[];
  attention: 'overdue' | 'blocked' | 'risk' | null;
  scheduled_date: string | null; updated_at: string; days_since_update: number;
  delivery_method: string | null;
};
export type ManagementSnapshot = {
  generated_at: string; risk_window_hours: number; delivery_days: number; delivery_end_exclusive: string;
  counts: { active: number; attention: number; overdue: number; blocked: number; risk: number; deliveries: number; unscheduled: number };
  columns: { key: string; count: number; attention_count: number; waiting_client: number; oldest_update: ManagementJob | null }[];
  exceptions: ManagementJob[]; deliveries: ManagementJob[];
};
