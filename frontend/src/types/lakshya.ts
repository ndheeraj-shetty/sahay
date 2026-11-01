export type GoalCategory =
  | 'child_education'
  | 'higher_education'
  | 'emergency_fund'
  | 'medical_fund'
  | 'home_down_payment'
  | 'home_renovation'
  | 'vehicle_purchase'
  | 'travel_vacation'
  | 'wedding'
  | 'elder_care'
  | 'retirement'
  | 'custom';

export type GoalPriority = 'critical' | 'high' | 'medium' | 'low';

export type GoalStatus =
  | 'active'
  | 'on_track'
  | 'at_risk'
  | 'behind'
  | 'paused'
  | 'completed'
  | 'cancelled';

export interface GoalContributor {
  id: string;
  goal_id: string;
  member_id: string;
  member_name?: string;
  member_role?: string;
  monthly_commitment_amount: number;
  target_share_percentage?: number;
  notes?: string;
  created_at: string;
}

export interface GoalContribution {
  id: string;
  goal_id: string;
  contributor_member_id?: string;
  contributor_name?: string;
  recorded_by_user_id: string;
  amount: number;
  contribution_date: string;
  payment_method: string;
  transaction_reference?: string;
  notes?: string;
  created_at: string;
}

export interface GoalWithdrawal {
  id: string;
  goal_id: string;
  amount: number;
  withdrawal_date: string;
  reason: string;
  authorized_by_user_id: string;
  authorized_by_name?: string;
  notes?: string;
  created_at: string;
}

export interface GoalMilestone {
  id: string;
  goal_id: string;
  milestone_name: string;
  target_percentage: number;
  target_amount: number;
  reached_at?: string;
  is_reached: boolean;
}

export interface GoalRiskAnalysis {
  progress_percentage: number;
  target_amount: number;
  current_amount: number;
  remaining_amount: number;
  remaining_months: number;
  required_monthly_savings: number;
  committed_monthly_savings: number;
  monthly_shortfall: number;
  risk_level: GoalStatus;
  projected_completion_date?: string;
  recommendations: string[];
}

export interface GoalListItem {
  id: string;
  title: string;
  category: GoalCategory;
  target_amount: number;
  current_amount: number;
  progress_percentage: number;
  currency: string;
  start_date: string;
  target_date: string;
  priority: GoalPriority;
  status: GoalStatus;
  contributors_count: number;
  target_member_name?: string;
  required_monthly_savings: number;
  remaining_months: number;
}

export interface GoalDetail {
  id: string;
  household_id: string;
  created_by_user_id: string;
  target_member_id?: string;
  target_member_name?: string;
  title: string;
  description?: string;
  category: GoalCategory;
  target_amount: number;
  current_amount: number;
  progress_percentage: number;
  currency: string;
  start_date: string;
  target_date: string;
  priority: GoalPriority;
  status: GoalStatus;
  is_locked: boolean;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  contributors: GoalContributor[];
  contributions: GoalContribution[];
  withdrawals: GoalWithdrawal[];
  milestones: GoalMilestone[];
  risk_analysis?: GoalRiskAnalysis;
}

export interface LakshyaOverview {
  total_goals_count: number;
  active_goals_count: number;
  completed_goals_count: number;
  at_risk_goals_count: number;
  total_target_amount: number;
  total_saved_amount: number;
  overall_progress_percentage: number;
  total_monthly_committed: number;
}

export interface CreateGoalPayload {
  title: string;
  description?: string;
  category: GoalCategory;
  target_amount: number;
  target_date: string;
  priority?: GoalPriority;
  target_member_id?: string;
}

export interface AddContributorPayload {
  member_id: string;
  monthly_commitment_amount: number;
  target_share_percentage?: number;
  notes?: string;
}

export interface AddContributionPayload {
  contributor_member_id?: string;
  amount: number;
  contribution_date?: string;
  payment_method?: string;
  transaction_reference?: string;
  notes?: string;
}

export interface AddWithdrawalPayload {
  amount: number;
  withdrawal_date?: string;
  reason: string;
  notes?: string;
}
