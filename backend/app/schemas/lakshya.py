import uuid
from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field

from app.models.lakshya import GoalCategory, GoalPriority, GoalStatus


class ContributorCreate(BaseModel):
    member_id: str
    monthly_commitment_amount: float = Field(default=0.0, ge=0.0)
    target_share_percentage: Optional[float] = Field(default=None, ge=0.0, le=100.0)
    notes: Optional[str] = None


class GoalContributorResponse(BaseModel):
    id: str
    goal_id: str
    member_id: str
    member_name: Optional[str] = None
    member_role: Optional[str] = None
    monthly_commitment_amount: float
    target_share_percentage: Optional[float] = None
    notes: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ContributionCreate(BaseModel):
    contributor_member_id: Optional[str] = None
    amount: float = Field(..., gt=0.0)
    contribution_date: Optional[date] = None
    payment_method: str = "UPI"
    transaction_reference: Optional[str] = None
    notes: Optional[str] = None


class GoalContributionResponse(BaseModel):
    id: str
    goal_id: str
    contributor_member_id: Optional[str] = None
    contributor_name: Optional[str] = None
    recorded_by_user_id: str
    amount: float
    contribution_date: date
    payment_method: str
    transaction_reference: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class WithdrawalCreate(BaseModel):
    amount: float = Field(..., gt=0.0)
    withdrawal_date: Optional[date] = None
    reason: str = Field(..., min_length=2, max_length=255)
    notes: Optional[str] = None


class GoalWithdrawalResponse(BaseModel):
    id: str
    goal_id: str
    amount: float
    withdrawal_date: date
    reason: str
    authorized_by_user_id: str
    authorized_by_name: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class GoalMilestoneResponse(BaseModel):
    id: str
    goal_id: str
    milestone_name: str
    target_percentage: float
    target_amount: float
    reached_at: Optional[datetime] = None
    is_reached: bool

    model_config = ConfigDict(from_attributes=True)


class GoalCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=200)
    description: Optional[str] = None
    category: GoalCategory = GoalCategory.CUSTOM
    target_amount: float = Field(..., gt=0.0)
    target_date: date
    priority: GoalPriority = GoalPriority.MEDIUM
    target_member_id: Optional[str] = None
    initial_contributors: List[ContributorCreate] = []


class GoalUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[GoalCategory] = None
    target_amount: Optional[float] = Field(None, gt=0.0)
    target_date: Optional[date] = None
    priority: Optional[GoalPriority] = None
    status: Optional[GoalStatus] = None
    target_member_id: Optional[str] = None


class GoalRiskAnalysisResponse(BaseModel):
    progress_percentage: float
    target_amount: float
    current_amount: float
    remaining_amount: float
    remaining_months: int
    required_monthly_savings: float
    committed_monthly_savings: float
    monthly_shortfall: float
    risk_level: GoalStatus
    projected_completion_date: Optional[date] = None
    recommendations: List[str] = []


class GoalListItem(BaseModel):
    id: str
    title: str
    category: GoalCategory
    target_amount: float
    current_amount: float
    progress_percentage: float
    currency: str
    start_date: date
    target_date: date
    priority: GoalPriority
    status: GoalStatus
    contributors_count: int
    target_member_name: Optional[str] = None
    required_monthly_savings: float
    remaining_months: int

    model_config = ConfigDict(from_attributes=True)


class GoalResponse(BaseModel):
    id: str
    household_id: str
    created_by_user_id: str
    target_member_id: Optional[str] = None
    target_member_name: Optional[str] = None
    title: str
    description: Optional[str] = None
    category: GoalCategory
    target_amount: float
    current_amount: float
    progress_percentage: float
    currency: str
    start_date: date
    target_date: date
    priority: GoalPriority
    status: GoalStatus
    is_locked: bool
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    contributors: List[GoalContributorResponse] = []
    contributions: List[GoalContributionResponse] = []
    withdrawals: List[GoalWithdrawalResponse] = []
    milestones: List[GoalMilestoneResponse] = []
    risk_analysis: Optional[GoalRiskAnalysisResponse] = None

    model_config = ConfigDict(from_attributes=True)


class LakshyaOverviewResponse(BaseModel):
    total_goals_count: int
    active_goals_count: int
    completed_goals_count: int
    at_risk_goals_count: int
    total_target_amount: float
    total_saved_amount: float
    overall_progress_percentage: float
    total_monthly_committed: float
