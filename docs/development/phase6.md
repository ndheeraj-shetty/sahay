# Phase 6 — Lakshya Goal Vaults: Implementation & Verification Report

## 1. Executive Summary
Phase 6 implements **Lakshya Goal Vaults**, the collaborative family savings and milestone management system of SAHAY. It enables Indian families to turn aspirations into structured financial milestones:
- **Supported Goal Vault Categories:** Higher Education, Child Schooling, Emergency Fund, Medical Emergency Buffer, Home Down Payment, Home Renovation, Electric Vehicle / Car Purchase, Family Vacation, Wedding, Elder Care, and Custom Goals.
- **Milestone Checkpoint Tracking:** Automatically synthesizes standard 25%, 50%, 75%, and 100% milestone markers for every goal, unlocking them dynamically as family contributions arrive.
- **Collaborative Family Contributors:** Allocates monthly commitments and percentage shares across multiple earning members (e.g., Rajesh 60%, Sunita 40%).
- **Automated Run-Rate & Risk Intelligence:** Calculates remaining months and required monthly savings (`[Target - Current] / Remaining Months`) against actual committed family contributions to flag goals as `ON_TRACK`, `AT_RISK`, `BEHIND`, or `COMPLETED`. Provides concrete financial recommendations.
- **Deposit & Disbursement Tracking:** Records deposits with payment methods (UPI, Bank Transfer, SIP, Cash) and validates disbursements against available accumulated savings.

---

## 2. Architecture & Data Models

### 2.1 Backend Models (`backend/app/models/lakshya.py`)
- **`GoalVault`**:
  - `id`: UUID Primary Key.
  - `household_id`: Linked to active household.
  - `created_by_user_id`: Member creating the goal.
  - `target_member_id`: Beneficiary family member (child, student, or elder).
  - `title`, `description`, `category` (`GoalCategory` enum), `currency` (`INR`).
  - `target_amount`, `current_amount` (accumulated savings minus disbursements).
  - `start_date`, `target_date`, `priority` (`critical`, `high`, `medium`, `low`).
  - `status` (`active`, `on_track`, `at_risk`, `behind`, `paused`, `completed`, `cancelled`).
  - `is_locked`, `completed_at`.
- **`GoalContributor`**:
  - `goal_id`, `member_id`, `monthly_commitment_amount`, `target_share_percentage`, `notes`.
- **`GoalContribution`**:
  - `goal_id`, `contributor_member_id`, `recorded_by_user_id`, `amount`, `contribution_date`, `payment_method` (UPI, Transfer, SIP, Cash), `transaction_reference`, `notes`.
- **`GoalWithdrawal`**:
  - `goal_id`, `authorized_by_user_id`, `amount`, `withdrawal_date`, `reason`, `notes`.
- **`GoalMilestone`**:
  - `goal_id`, `milestone_name`, `target_percentage` (25%, 50%, 75%, 100%), `target_amount`, `is_reached`, `reached_at`.

---

## 3. REST API Endpoints (`/api/v1/lakshya`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/lakshya/overview` | Household savings overview: total target, accumulated savings, progress %, monthly committed |
| `GET` | `/lakshya/goals` | List all goal vaults with category and status filters |
| `POST` | `/lakshya/goals` | Create goal vault (auto-generates 25%, 50%, 75%, 100% milestones) |
| `GET` | `/lakshya/goals/{id}` | Detailed vault with contributors, transactions, milestones, and risk run-rate |
| `PATCH` | `/lakshya/goals/{id}` | Update target amount, target date, priority, or status |
| `DELETE` | `/lakshya/goals/{id}` | Delete goal vault |
| `POST` | `/lakshya/goals/{id}/contributors` | Assign family contributor with monthly commitment ₹ |
| `DELETE` | `/lakshya/contributors/{id}` | Remove contributor |
| `POST` | `/lakshya/goals/{id}/contributions` | Record savings deposit, updates current balance, triggers milestones |
| `POST` | `/lakshya/goals/{id}/withdrawals` | Record disbursement (validated against available savings) |
| `GET` | `/lakshya/goals/{id}/risk` | Compute required monthly savings vs committed run-rate and recommendations |

---

## 4. Frontend Implementation

### 4.1 Views & Modals (`frontend/src/features/lakshya/`)
1. **`LakshyaDashboardView.tsx`**:
   - Overview metrics banner: Total Family Savings ₹, Overall Progress %, Monthly Committed ₹, and Vaults Status.
   - Filter tabs: All, On Track, At Risk / Behind, Completed.
   - Responsive Goal Cards grid featuring category icons, progress bar, monthly run-rate metrics, remaining time badge, and quick action buttons (*"Deposit"*, *"Inspect Vault"*).
2. **`GoalDetailModal.tsx`**:
   - Full Goal Vault drawer with accumulated savings vs target.
   - **Real-Time Risk Intelligence Box**: Required monthly run-rate, committed family savings, and planning suggestions.
   - Milestone checkpoints (25%, 50%, 75%, 100%) with reached checkmarks.
   - Contributors breakdown with monthly shares and inline "Add Contributor" form.
   - Transaction tabs for Contribution history and Disbursements.
3. **`CreateGoalModal.tsx`**:
   - 1-Click Indian family presets (*Emergency Buffer, Higher Education, Home Down Payment, Family Vacation, Electric Car, Elder Medical Care*).
4. **`AddContributionModal.tsx`**:
   - Deposit savings with contributor selector, payment mode (UPI, Transfer, SIP, Cash), and transaction UTR.
5. **`AddWithdrawalModal.tsx`**:
   - Disbursement modal with available balance check and reason documentation.

---

## 5. Automated Test Coverage
All tests in `backend/tests/` passed (`15/15 passed` in 4.81s):
- `test_lakshya.py`:
  - `test_goal_creation_and_milestones`: Creation, auto-generated 25%, 50%, 75%, 100% milestones, initial progress calculation.
  - `test_contributors_and_risk_analysis`: Contributor allocation, monthly run-rate formulas, dynamic status change from behind to on_track.
  - `test_contributions_and_milestone_progression`: Deposit logging, milestone trigger activation, validated withdrawals, excess withdrawal prevention.
- Full regression tests passed across Phases 1, 2, 3, 4, 5 & 6.
