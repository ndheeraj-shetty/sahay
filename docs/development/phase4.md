# Phase 4 — Sahay Daily: Implementation & Verification Report

## 1. Executive Summary
Phase 4 implements **Sahay Daily**, the live life-admin timeline and financial operational heart of SAHAY. It unites bills, loan EMIs, insurance renewals, tuition fees, and health tasks into three views tailored for Indian households:
- **Today Dashboard:** An immediate action center categorizing items by urgency (Critical/Overdue, Due Today, Due Soon within 7 days, Upcoming, Snoozed, and Completed).
- **Calendar View:** A month-at-a-glance household grid with category badges, day drill-downs, and member/category filtering.
- **Money Dashboard:** A complete cash flow planner combining expected monthly household income, total obligations, paid amounts, planned savings buffer (Lakshya preview), and projected month-end balance.
- **Document Doctor Linkage:** Verifying an invoice/bill in the Family Vault automatically converts it into a scheduled Sahay Daily obligation.

---

## 2. Architecture & Data Models

### 2.1 Backend Models (`backend/app/models/daily.py`)
- **`Obligation`**: Primary entity tracking a household financial or administrative duty.
  - `id`: UUID Primary Key.
  - `household_id`: Foreign key with cascading delete.
  - `created_by_user_id`: Household member creating the obligation.
  - `assigned_member_id`: Specific family member responsible.
  - `source_document_id`: Optional link to the originating Family Vault document.
  - `title`, `obligation_type` (`bill`, `emi`, `insurance`, `school_fee`, `health_task`, `goal_contribution`, `custom_task`).
  - `category`: `utility`, `housing`, `loan`, `insurance`, `education`, `groceries`, `health`, etc.
  - `biller_or_payee`: Payee name (e.g. Mahadiscom, Airtel, HDFC).
  - `account_or_consumer_no`: Account/Consumer/Policy number.
  - `amount`, `currency` (Default `INR`).
  - `due_date`, `late_payment_date`.
  - `priority`: `critical`, `high`, `medium`, `low`.
  - `status`: `pending`, `due_today`, `overdue`, `paid`, `completed`, `snoozed`.
  - `recurrence`: `none`, `monthly`, `quarterly`, `half_yearly`, `yearly`.
  - `snoozed_until`, `paid_at`, `paid_amount`, `payment_reference`.
- **`ObligationEvent`**: Complete audit trail of payments, snoozes, edits, and reminders.
- **`HouseholdMoneyProfile`**: Household baseline financial targets (`expected_monthly_income`, `planned_monthly_savings`, `emergency_buffer_target`).

---

## 3. API Endpoints (`/api/v1/sahay-daily`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/sahay-daily/today` | Today Action Dashboard (Critical, Due Today, Due Soon, Upcoming, Completed, Snoozed) |
| `GET` | `/sahay-daily/calendar` | Monthly view with filters for `month`, `year`, `member_id`, `category` |
| `GET` | `/sahay-daily/money` | Financial outflow & cash-flow overview, category breakdown %, and warnings |
| `POST` | `/sahay-daily/money-profile` | Configure household expected income and target savings buffer |
| `GET` | `/sahay-daily/obligations` | List all household obligations with optional status/category filters |
| `POST` | `/sahay-daily/obligations` | Create a new obligation |
| `POST` | `/sahay-daily/obligations/{id}/mark-paid` | Record payment with transaction ref, UPI UTR, and optional next recurrence auto-creation |
| `POST` | `/sahay-daily/obligations/{id}/snooze` | Snooze obligation by N days or to a specific date |
| `DELETE` | `/sahay-daily/obligations/{id}` | Remove/soft-delete an obligation |

---

## 4. Frontend Implementation

### 4.1 Views & Modals (`frontend/src/features/daily/`)
1. **`SahayDailyView.tsx`**:
   - Tab 1: **Today Dashboard** with critical alert banners, summary metric counters (Due Today, Total Pending ₹, Due Soon, Completed), and categorized obligation queues.
   - Tab 2: **Calendar View** with interactive 35-day grid, color-coded badges, month-to-month navigation, category filters, and single-day inspection drawer.
   - Tab 3: **Money View** featuring income vs obligations vs savings calculation, deficit warnings, and percentage-based category progress bars.
2. **`AddObligationModal.tsx`**:
   - 1-Click Indian family presets:
     - MSEB Electricity Bill
     - Airtel Fiber Broadband
     - HDFC Home Loan EMI
     - DPS School Quarter Tuition
     - Indane LPG Cylinder
     - Star Health Insurance Premium
   - Full manual scheduling form with custom recurrence and priority.
3. **`MarkPaidModal.tsx`**:
   - Record actual payment amount, payment method (UPI, Netbanking, Card, Cash), and reference ID.
   - Checkbox to automatically schedule the next cycle for recurring bills.
4. **`SnoozeModal.tsx`**:
   - Quick snooze (+1 Day, +3 Days, +7 Days) or custom calendar picker with optional reason notes.
5. **`MoneyProfileModal.tsx`**:
   - Update household income and monthly savings target.

---

## 5. Automated Test Coverage
All tests in `backend/tests/` passed (10/10 tests in 2.56s):
- `test_sahay_daily.py`:
  - `test_obligation_lifecycle_and_today_dashboard`: Creation, prioritization, snoozing, and payment with next-cycle recurrence.
  - `test_calendar_and_money_dashboard`: Monthly calendar queries, money profile updates, and cash flow formulas.
  - `test_document_doctor_to_obligation_linkage`: Document verification to automatic Sahay Daily obligation synthesis.
- Regression tests passed:
  - Phase 1: `test_health.py` (4 tests)
  - Phase 2: `test_auth.py`, `test_households.py` (2 tests)
  - Phase 3: `test_vault_and_doctor.py` (1 test)
