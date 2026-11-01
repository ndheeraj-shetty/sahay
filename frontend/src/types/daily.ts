export type ObligationType =
  | 'bill'
  | 'emi'
  | 'insurance'
  | 'school_fee'
  | 'health_task'
  | 'goal_contribution'
  | 'document_renewal'
  | 'custom_task';

export type ObligationPriority = 'critical' | 'high' | 'medium' | 'low';

export type ObligationStatus =
  | 'pending'
  | 'due_today'
  | 'overdue'
  | 'paid'
  | 'completed'
  | 'snoozed';

export type RecurrenceFrequency =
  | 'none'
  | 'monthly'
  | 'quarterly'
  | 'half_yearly'
  | 'yearly';

export interface Obligation {
  id: string;
  household_id: string;
  title: string;
  obligation_type: ObligationType;
  category: string;
  biller_or_payee?: string;
  account_or_consumer_no?: string;
  amount: number;
  currency: string;
  due_date: string; // ISO date string (YYYY-MM-DD)
  late_payment_date?: string;
  priority: ObligationPriority;
  status: ObligationStatus;
  recurrence: RecurrenceFrequency;
  snoozed_until?: string;
  paid_at?: string;
  paid_amount?: number;
  payment_reference?: string;
  assigned_member_id?: string;
  assigned_member_name?: string;
  source_document_id?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  days_until_due: number;
}

export interface TodayViewData {
  critical: Obligation[];
  due_today: Obligation[];
  due_soon: Obligation[];
  upcoming: Obligation[];
  completed: Obligation[];
  snoozed: Obligation[];
  total_pending_amount: number;
  total_obligations_count: number;
  due_today_count: number;
}

export interface CalendarItem {
  id: string;
  title: string;
  obligation_type: ObligationType;
  category: string;
  amount: number;
  due_date: string;
  status: ObligationStatus;
  priority: ObligationPriority;
  assigned_to?: string;
  biller?: string;
}

export interface CalendarViewData {
  month: number;
  year: number;
  total_count: number;
  total_amount: number;
  items: CalendarItem[];
}

export interface CategoryBreakdown {
  category: string;
  total_amount: number;
  count: number;
  percentage: number;
}

export interface MoneyViewData {
  expected_income: number;
  total_obligations: number;
  paid_obligations: number;
  pending_obligations: number;
  planned_savings: number;
  projected_balance: number;
  rent_expense: number;
  groceries_expense: number;
  utilities_expense: number;
  other_expenses: number;
  total_living_expenses: number;
  remaining_balance: number;
  category_breakdown: CategoryBreakdown[];
  upcoming_payments: Obligation[];
  cash_flow_warning?: string;
}

export interface CreateObligationPayload {
  title: string;
  obligation_type: ObligationType;
  category?: string;
  biller_or_payee?: string;
  account_or_consumer_no?: string;
  amount: number;
  currency?: string;
  due_date: string;
  late_payment_date?: string;
  priority?: ObligationPriority;
  recurrence?: RecurrenceFrequency;
  assigned_member_id?: string;
  notes?: string;
}

export interface MarkPaidPayload {
  paid_amount?: number;
  payment_reference?: string;
  payment_method?: string;
  notes?: string;
  create_next_recurrence?: boolean;
}

export interface SnoozePayload {
  snooze_days?: number;
  snooze_until?: string;
  reason?: string;
}

export interface UpdateMoneyProfilePayload {
  expected_monthly_income: number;
  planned_monthly_savings: number;
  rent_expense?: number;
  groceries_expense?: number;
  utilities_expense?: number;
  other_expenses?: number;
  notes?: string;
}

export interface LifeEventItem {
  id: string;
  title: string;
  event_type: 'document_expiry' | 'obligation_due' | 'medicine_refill' | 'tax_deadline' | string;
  category: string;
  target_date: string;
  days_remaining: number;
  time_horizon: 'urgent' | 'this_month' | 'upcoming' | 'future';
  estimated_amount?: number | null;
  source_document_id?: string | null;
  source_document_title?: string | null;
  assigned_member_id?: string | null;
  assigned_member_name?: string | null;
  has_active_obligation: boolean;
  suggested_action?: string | null;
  is_overdue: boolean;
}

export interface LifeEventTimelineBucket {
  horizon_key: 'urgent' | 'this_month' | 'upcoming' | 'future';
  horizon_label: string;
  total_outflow: number;
  events: LifeEventItem[];
}

export interface HouseholdRadarResponse {
  total_upcoming_events: number;
  next_90_days_outflow: number;
  peak_outflow_month: string;
  radar_summary: string;
  predictive_alerts: string[];
  timeline: LifeEventTimelineBucket[];
}

export interface TransferSuggestion {
  obligation_id: string;
  obligation_title: string;
  amount: number;
  due_date: string;
  days_remaining: number;
  current_member_id?: string | null;
  current_member_name: string;
  suggested_member_id: string;
  suggested_member_name: string;
  reason: string;
  urgency: 'high' | 'medium' | 'low';
}

export interface MemberWorkload {
  member_id: string;
  member_name: string;
  relationship?: string | null;
  role: string;
  total_obligations: number;
  pending_obligations: number;
  overdue_obligations: number;
  completed_obligations: number;
  total_managed_amount: number;
  obligations: Obligation[];
}

export interface FamilyResponsibilityIntelligenceResponse {
  total_obligations: number;
  unassigned_count: number;
  overdue_count: number;
  workload_imbalance_detected: boolean;
  intelligence_summary: string;
  member_workloads: MemberWorkload[];
  unassigned_obligations: Obligation[];
  transfer_suggestions: TransferSuggestion[];
}

export interface TransferObligationPayload {
  target_member_id: string;
  reason?: string;
}
