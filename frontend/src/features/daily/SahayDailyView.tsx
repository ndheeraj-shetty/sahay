import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  Wallet,
  TrendingUp,
  PieChart,
  ArrowRight,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  IndianRupee,
  Home,
  ShoppingBag,
  Zap,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { dailyService } from '../../services/dailyService';
import {
  CalendarViewData,
  CreateObligationPayload,
  MarkPaidPayload,
  MoneyViewData,
  Obligation,
  SnoozePayload,
  TodayViewData,
  UpdateMoneyProfilePayload,
} from '../../types/daily';
import { ObligationCard } from './ObligationCard';
import { AddObligationModal } from './AddObligationModal';
import { MarkPaidModal } from './MarkPaidModal';
import { SnoozeModal } from './SnoozeModal';
import { MoneyProfileModal } from './MoneyProfileModal';

type DailyTab = 'today' | 'calendar' | 'money';

export const SahayDailyView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<DailyTab>('today');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [todayData, setTodayData] = useState<TodayViewData | null>(null);
  const [calendarData, setCalendarData] = useState<CalendarViewData | null>(null);
  const [moneyData, setMoneyData] = useState<MoneyViewData | null>(null);

  // Calendar controls
  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState<number>(now.getMonth() + 1);
  const [currentYear, setCurrentYear] = useState<number>(now.getFullYear());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);
  const [calendarCategoryFilter, setCalendarCategoryFilter] = useState<string>('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isMoneyProfileOpen, setIsMoneyProfileOpen] = useState<boolean>(false);
  const [activePayObligation, setActivePayObligation] = useState<Obligation | null>(null);
  const [activeSnoozeObligation, setActiveSnoozeObligation] = useState<Obligation | null>(null);

  // Fetch functions
  const loadTodayView = async () => {
    try {
      setError(null);
      const data = await dailyService.getTodayView();
      setTodayData(data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to load Today dashboard.');
    }
  };

  const loadCalendarView = async (m = currentMonth, y = currentYear, cat = calendarCategoryFilter) => {
    try {
      const data = await dailyService.getCalendarView({
        month: m,
        year: y,
        category: cat || undefined,
      });
      setCalendarData(data);
    } catch (err: any) {
      console.error('Failed to load calendar view:', err);
    }
  };

  const loadMoneyView = async (m = currentMonth, y = currentYear) => {
    try {
      const data = await dailyService.getMoneyView({ month: m, year: y });
      setMoneyData(data);
    } catch (err: any) {
      console.error('Failed to load money view:', err);
    }
  };

  const refreshAll = async () => {
    setIsLoading(true);
    await Promise.all([loadTodayView(), loadCalendarView(), loadMoneyView()]);
    setIsLoading(false);
  };

  useEffect(() => {
    refreshAll();
  }, []);

  const handleMonthChange = (direction: 'prev' | 'next') => {
    let newM = direction === 'prev' ? currentMonth - 1 : currentMonth + 1;
    let newY = currentYear;
    if (newM < 1) {
      newM = 12;
      newY -= 1;
    } else if (newM > 12) {
      newM = 1;
      newY += 1;
    }
    setCurrentMonth(newM);
    setCurrentYear(newY);
    setSelectedCalendarDate(null);
    loadCalendarView(newM, newY);
    loadMoneyView(newM, newY);
  };

  // Actions
  const handleCreateObligation = async (payload: CreateObligationPayload) => {
    await dailyService.createObligation(payload);
    await refreshAll();
  };

  const handleMarkPaid = async (id: string, payload: MarkPaidPayload) => {
    await dailyService.markPaid(id, payload);
    await refreshAll();
  };

  const handleSnooze = async (id: string, payload: SnoozePayload) => {
    await dailyService.snooze(id, payload);
    await refreshAll();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this obligation?')) {
      await dailyService.deleteObligation(id);
      await refreshAll();
    }
  };

  const handleUpdateMoneyProfile = async (payload: UpdateMoneyProfilePayload) => {
    await dailyService.updateMoneyProfile(payload);
    await loadMoneyView();
  };

  // Calendar grid generator
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth - 1, 1).getDay(); // 0 is Sunday
  const monthName = new Date(currentYear, currentMonth - 1).toLocaleString('en-US', { month: 'long' });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">Sahay Daily</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
              Active OS
            </span>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            Today Dashboard, Household Calendar & Money Intelligence
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => refreshAll()}
            disabled={isLoading}
            className="p-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            title="Refresh dashboard"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setIsMoneyProfileOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Wallet className="w-4 h-4 text-emerald-600" />
            <span>Money Targets</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Obligation</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center border-b border-slate-200 bg-white px-6 rounded-xl">
        <button
          onClick={() => setActiveTab('today')}
          className={`flex items-center gap-2 py-4 px-4 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'today'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Today Dashboard</span>
          {todayData && todayData.due_today_count > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-800">
              {todayData.due_today_count}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('calendar')}
          className={`flex items-center gap-2 py-4 px-4 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'calendar'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <CalendarIcon className="w-4 h-4" />
          <span>Calendar View</span>
        </button>

        <button
          onClick={() => setActiveTab('money')}
          className={`flex items-center gap-2 py-4 px-4 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'money'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <IndianRupee className="w-4 h-4" />
          <span>Money View</span>
        </button>
      </div>

      {/* TAB CONTENT: TODAY VIEW */}
      {activeTab === 'today' && todayData && (
        <div className="space-y-6">
          {/* Critical Alerts Banner */}
          {todayData.critical.length > 0 && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-red-900">
                  Critical / Overdue Obligations Require Attention ({todayData.critical.length})
                </h4>
                <p className="text-xs text-red-700 mt-0.5">
                  The following payments are either overdue or marked critical. Please resolve or snooze them immediately.
                </p>
                <div className="mt-3 space-y-2">
                  {todayData.critical.map((ob) => (
                    <ObligationCard
                      key={ob.id}
                      obligation={ob}
                      onPay={(o) => setActivePayObligation(o)}
                      onSnooze={(o) => setActiveSnoozeObligation(o)}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Due Today</span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-bold text-amber-600">{todayData.due_today.length}</span>
                <span className="text-xs text-slate-500">
                  ₹{todayData.due_today.reduce((acc, i) => acc + i.amount, 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Pending</span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-bold text-slate-900">
                  ₹{todayData.total_pending_amount.toLocaleString('en-IN')}
                </span>
                <span className="text-xs text-slate-500">{todayData.total_obligations_count} bills</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Due Soon (7 Days)</span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-bold text-primary-600">{todayData.due_soon.length}</span>
                <span className="text-xs text-slate-500">
                  ₹{todayData.due_soon.reduce((acc, i) => acc + i.amount, 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Completed / Paid</span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-bold text-emerald-600">{todayData.completed.length}</span>
                <span className="text-xs text-emerald-600 font-medium">All recorded</span>
              </div>
            </div>
          </div>

          {/* Section: Due Today */}
          {todayData.due_today.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                <h3 className="text-base font-bold text-slate-900">Due Today</h3>
                <span className="text-xs bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded-full">
                  {todayData.due_today.length}
                </span>
              </div>
              <div className="space-y-2.5">
                {todayData.due_today.map((ob) => (
                  <ObligationCard
                    key={ob.id}
                    obligation={ob}
                    onPay={(o) => setActivePayObligation(o)}
                    onSnooze={(o) => setActiveSnoozeObligation(o)}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Section: Due Soon */}
          {todayData.due_soon.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-primary-600" />
                <h3 className="text-base font-bold text-slate-900">Due in the Next 7 Days</h3>
                <span className="text-xs bg-primary-50 text-primary-700 font-semibold px-2 py-0.5 rounded-full">
                  {todayData.due_soon.length}
                </span>
              </div>
              <div className="space-y-2.5">
                {todayData.due_soon.map((ob) => (
                  <ObligationCard
                    key={ob.id}
                    obligation={ob}
                    onPay={(o) => setActivePayObligation(o)}
                    onSnooze={(o) => setActiveSnoozeObligation(o)}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Section: Upcoming */}
          {todayData.upcoming.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-slate-500" />
                <h3 className="text-base font-semibold text-slate-800">Upcoming Later This Month</h3>
                <span className="text-xs bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded-full">
                  {todayData.upcoming.length}
                </span>
              </div>
              <div className="space-y-2.5">
                {todayData.upcoming.map((ob) => (
                  <ObligationCard
                    key={ob.id}
                    obligation={ob}
                    onPay={(o) => setActivePayObligation(o)}
                    onSnooze={(o) => setActiveSnoozeObligation(o)}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Section: Snoozed */}
          {todayData.snoozed.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-600" />
                <h3 className="text-base font-semibold text-slate-800">Snoozed Obligations</h3>
                <span className="text-xs bg-purple-100 text-purple-700 font-semibold px-2 py-0.5 rounded-full">
                  {todayData.snoozed.length}
                </span>
              </div>
              <div className="space-y-2.5">
                {todayData.snoozed.map((ob) => (
                  <ObligationCard
                    key={ob.id}
                    obligation={ob}
                    onPay={(o) => setActivePayObligation(o)}
                    onSnooze={(o) => setActiveSnoozeObligation(o)}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Section: Completed */}
          {todayData.completed.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-slate-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <h3 className="text-base font-semibold text-slate-800">Recently Paid / Completed</h3>
                <span className="text-xs bg-emerald-100 text-emerald-700 font-semibold px-2 py-0.5 rounded-full">
                  {todayData.completed.length}
                </span>
              </div>
              <div className="space-y-2.5 opacity-80">
                {todayData.completed.map((ob) => (
                  <ObligationCard key={ob.id} obligation={ob} isCompleted onDelete={handleDelete} />
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {todayData.total_obligations_count === 0 && (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-900">All Clear! No Pending Obligations</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                You're completely on track. Add a new bill or upload a utility bill in the Family Vault to auto-track it here.
              </p>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add First Obligation</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: CALENDAR VIEW */}
      {activeTab === 'calendar' && calendarData && (
        <div className="space-y-6">
          {/* Calendar Header with Month Selector */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleMonthChange('prev')}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="text-lg font-bold text-slate-900">
                {monthName} {currentYear}
              </h2>
              <button
                onClick={() => handleMonthChange('next')}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                <span>Total Month Obligations:</span>
                <strong className="text-slate-900 font-semibold">{calendarData.total_count}</strong>
                <span className="mx-1">•</span>
                <strong className="text-slate-900 font-semibold">
                  ₹{calendarData.total_amount.toLocaleString('en-IN')}
                </strong>
              </div>

              {/* Filter by Category */}
              <select
                value={calendarCategoryFilter}
                onChange={(e) => {
                  setCalendarCategoryFilter(e.target.value);
                  loadCalendarView(currentMonth, currentYear, e.target.value);
                }}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
              >
                <option value="">All Categories</option>
                <option value="utility">Utilities</option>
                <option value="housing">Housing & Maintenance</option>
                <option value="loan">Loans & EMIs</option>
                <option value="insurance">Insurance</option>
                <option value="education">Education</option>
                <option value="groceries">Groceries</option>
                <option value="health">Health</option>
              </select>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center py-2.5 text-xs font-semibold text-slate-600">
              <span>Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            <div className="grid grid-cols-7 auto-rows-fr">
              {/* Blank leading cells */}
              {Array.from({ length: firstDayIndex }).map((_, idx) => (
                <div key={`blank-${idx}`} className="h-28 p-1.5 border-b border-r border-slate-100 bg-slate-50/40" />
              ))}

              {/* Days of current month */}
              {Array.from({ length: daysInMonth }).map((_, idx) => {
                const dayNum = idx + 1;
                const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                const dayItems = calendarData.items.filter((item) => item.due_date === dateStr);
                const isSelected = selectedCalendarDate === dateStr;
                const isToday =
                  dayNum === now.getDate() &&
                  currentMonth === now.getMonth() + 1 &&
                  currentYear === now.getFullYear();

                return (
                  <div
                    key={dateStr}
                    onClick={() => setSelectedCalendarDate(dateStr)}
                    className={`h-28 p-2 border-b border-r border-slate-100 cursor-pointer transition-colors flex flex-col justify-between ${
                      isSelected
                        ? 'bg-primary-50/60 ring-2 ring-primary-500 z-10'
                        : isToday
                        ? 'bg-amber-50/40'
                        : 'hover:bg-slate-50/70'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-semibold rounded-full w-5 h-5 flex items-center justify-center ${
                          isToday
                            ? 'bg-amber-600 text-white'
                            : isSelected
                            ? 'bg-primary-600 text-white'
                            : 'text-slate-700'
                        }`}
                      >
                        {dayNum}
                      </span>
                      {dayItems.length > 0 && (
                        <span className="text-[10px] font-semibold text-slate-500">
                          ₹{dayItems.reduce((acc, i) => acc + i.amount, 0).toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 overflow-y-auto max-h-16 mt-1">
                      {dayItems.slice(0, 2).map((item) => (
                        <div
                          key={item.id}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-medium truncate ${
                            item.status === 'paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.priority === 'critical'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-primary-100 text-primary-800'
                          }`}
                        >
                          {item.title}
                        </div>
                      ))}
                      {dayItems.length > 2 && (
                        <p className="text-[10px] text-slate-500 text-center font-medium">
                          +{dayItems.length - 2} more
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Date Detail Drawer */}
          {selectedCalendarDate && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">
                  Obligations Scheduled for {selectedCalendarDate}
                </h3>
                <button
                  onClick={() => setSelectedCalendarDate(null)}
                  className="text-xs text-slate-500 hover:text-slate-800"
                >
                  Clear Selection
                </button>
              </div>

              {calendarData.items.filter((i) => i.due_date === selectedCalendarDate).length === 0 ? (
                <p className="text-xs text-slate-500 py-2">No payments scheduled on this date.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {calendarData.items
                    .filter((i) => i.due_date === selectedCalendarDate)
                    .map((item) => (
                      <div
                        key={item.id}
                        className="p-3 border border-slate-200 rounded-xl flex items-center justify-between"
                      >
                        <div>
                          <h4 className="text-xs font-semibold text-slate-900">{item.title}</h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {item.biller || item.category} • Status: {item.status}
                          </p>
                        </div>
                        <span className="text-xs font-bold text-slate-900">
                          ₹{item.amount.toLocaleString('en-IN')}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: MONEY VIEW */}
      {activeTab === 'money' && moneyData && (
        <div className="space-y-6">
          {/* Cash Flow Warning if projected deficit */}
          {moneyData.cash_flow_warning && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-amber-900">Cash Flow Notice</h4>
                <p className="text-xs text-amber-700 mt-0.5">{moneyData.cash_flow_warning}</p>
              </div>
            </div>
          )}

          {/* Hero Financial Overview */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Monthly Income
              </span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-bold text-slate-900">
                  ₹{moneyData.expected_income.toLocaleString('en-IN')}
                </span>
                <span className="text-xs text-emerald-600 font-medium">Inflow</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Monthly Living Expenses
              </span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-bold text-slate-900">
                  ₹{(moneyData.total_living_expenses || 40000).toLocaleString('en-IN')}
                </span>
                <span className="text-xs text-slate-500">Rent, food, util</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Scheduled Obligations
              </span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-bold text-slate-900">
                  ₹{moneyData.total_obligations.toLocaleString('en-IN')}
                </span>
                <span className="text-xs text-slate-500">
                  ₹{moneyData.paid_obligations.toLocaleString('en-IN')} paid
                </span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Planned Savings Buffer
              </span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-bold text-primary-600">
                  ₹{moneyData.planned_savings.toLocaleString('en-IN')}
                </span>
                <span className="text-xs text-primary-600 font-medium">Lakshya goal</span>
              </div>
            </div>
          </div>

          {/* Remaining Monthly Balance Highlight Card */}
          <div className={`p-6 rounded-2xl border transition-all ${
            (moneyData.remaining_balance ?? 0) >= 0
              ? 'bg-gradient-to-r from-emerald-50 via-teal-50 to-white border-emerald-200'
              : 'bg-gradient-to-r from-red-50 via-amber-50 to-white border-red-200'
          }`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Net Remaining Monthly Balance
                </span>
                <div className="flex items-baseline gap-3 mt-1">
                  <h2 className={`text-3xl font-extrabold ${
                    (moneyData.remaining_balance ?? 0) >= 0 ? 'text-emerald-700' : 'text-red-700'
                  }`}>
                    ₹{(moneyData.remaining_balance ?? (moneyData.expected_income - (moneyData.total_living_expenses || 40000) - moneyData.total_obligations - moneyData.planned_savings)).toLocaleString('en-IN')}
                  </h2>
                  <span className="text-xs font-medium text-slate-600">
                    Remaining after Living Expenses, Scheduled Bills & Goal Savings
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-2">
                  {(moneyData.remaining_balance ?? 0) >= 0
                    ? '✨ Healthy household cash flow: Your essential expenses, rent, groceries, and goals are comfortably funded with zero lifestyle strain.'
                    : '⚠️ Total living expenses and commitments exceed monthly income. See AI recommendations below to optimize discretionary costs without harming daily comfort.'}
                </p>
              </div>

              <button
                onClick={() => setIsMoneyProfileOpen(true)}
                className="shrink-0 px-4 py-2 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold rounded-xl border border-slate-200 shadow-sm transition-all"
              >
                Configure Expenses & Income
              </button>
            </div>
          </div>

          {/* Monthly Expenses Breakdown: Room Rent, Groceries, Utilities, Others */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">Monthly Living Expenses Breakdown</h3>
                  <p className="text-xs text-slate-500">Track core lifestyle costs: rent, groceries, and regular utilities</p>
                </div>
              </div>
              <span className="text-xs font-bold text-slate-800 bg-slate-100 px-3 py-1 rounded-lg">
                Total: ₹{(moneyData.total_living_expenses || 40000).toLocaleString('en-IN')}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                  <Home className="w-4 h-4 text-blue-600" />
                  <span>Room Rent / Housing</span>
                </div>
                <p className="text-lg font-bold text-slate-900 mt-1">
                  ₹{(moneyData.rent_expense || 18000).toLocaleString('en-IN')}
                </p>
                <span className="text-[10px] text-slate-500">Essential shelter</span>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                  <ShoppingBag className="w-4 h-4 text-amber-600" />
                  <span>Groceries & Food</span>
                </div>
                <p className="text-lg font-bold text-slate-900 mt-1">
                  ₹{(moneyData.groceries_expense || 12000).toLocaleString('en-IN')}
                </p>
                <span className="text-[10px] text-slate-500">Daily nutrition & home</span>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                  <Zap className="w-4 h-4 text-purple-600" />
                  <span>Utilities & Maintenance</span>
                </div>
                <p className="text-lg font-bold text-slate-900 mt-1">
                  ₹{(moneyData.utilities_expense || 5000).toLocaleString('en-IN')}
                </p>
                <span className="text-[10px] text-slate-500">Power, gas & WiFi</span>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                  <Wallet className="w-4 h-4 text-emerald-600" />
                  <span>Other / Lifestyle</span>
                </div>
                <p className="text-lg font-bold text-slate-900 mt-1">
                  ₹{(moneyData.other_expenses || 5000).toLocaleString('en-IN')}
                </p>
                <span className="text-[10px] text-slate-500">Incidentals & dining</span>
              </div>
            </div>
          </div>

          {/* AI Goal & Expense Advice Banner */}
          <div className="p-5 bg-gradient-to-r from-primary-50 via-indigo-50 to-purple-50 border border-primary-200 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Sahay AI Goal & Expense Optimization
                </h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  Get personalized, lifestyle-preserving advice on where to optimize expenses (e.g. telecom tiers, impulse delivery fees) and where to invest less or rebalance long-term goals without compromising family comfort.
                </p>
              </div>
            </div>
            <a
              href="#/assistant"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors shrink-0"
            >
              <span>Get AI Advice</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Category Expense Breakdown */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PieChart className="w-5 h-5 text-slate-700" />
                <h3 className="text-base font-bold text-slate-900">Category Expense Distribution</h3>
              </div>
              <span className="text-xs text-slate-500">
                {moneyData.category_breakdown.length} active spending categories
              </span>
            </div>

            <div className="space-y-3">
              {moneyData.category_breakdown.map((cat) => (
                <div key={cat.category} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800 uppercase tracking-wider">
                      {cat.category} ({cat.count} bills)
                    </span>
                    <span className="font-bold text-slate-900">
                      ₹{cat.total_amount.toLocaleString('en-IN')} ({cat.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-primary-600 h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(cat.percentage, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming Payment Queue */}
          {moneyData.upcoming_payments.length > 0 && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-3">
              <h3 className="text-base font-bold text-slate-900">Immediate Cash Outflows</h3>
              <div className="space-y-2">
                {moneyData.upcoming_payments.map((ob) => (
                  <ObligationCard
                    key={ob.id}
                    obligation={ob}
                    onPay={(o) => setActivePayObligation(o)}
                    onSnooze={(o) => setActiveSnoozeObligation(o)}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <AddObligationModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onCreated={handleCreateObligation}
      />

      <MarkPaidModal
        obligation={activePayObligation}
        isOpen={!!activePayObligation}
        onClose={() => setActivePayObligation(null)}
        onConfirm={handleMarkPaid}
      />

      <SnoozeModal
        obligation={activeSnoozeObligation}
        isOpen={!!activeSnoozeObligation}
        onClose={() => setActiveSnoozeObligation(null)}
        onConfirm={handleSnooze}
      />

      <MoneyProfileModal
        isOpen={isMoneyProfileOpen}
        onClose={() => setIsMoneyProfileOpen(false)}
        currentIncome={moneyData?.expected_income || 85000}
        currentSavings={moneyData?.planned_savings || 15000}
        currentRent={moneyData?.rent_expense}
        currentGroceries={moneyData?.groceries_expense}
        currentUtilities={moneyData?.utilities_expense}
        currentOther={moneyData?.other_expenses}
        onSave={handleUpdateMoneyProfile}
      />
    </div>
  );
};
