import React, { useState, useMemo, useEffect } from 'react';
import {
  Wallet,
  Calendar,
  Search,
  Filter,
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Tag,
  AlertCircle,
  TrendingDown,
  TrendingUp,
  Receipt,
  Award,
  PieChart,
  DollarSign,
  Store
} from 'lucide-react';
import type { 
  ExpenseRecord, 
  IncomeRecord, 
  MonthlyProfitLossRecord, 
  DailyProfitLossTrend, 
  ProfitLossOverview,
  IncomeStats,
  ExpenseStats
} from '../../types/expense';
import {
  formatRupiah,
  getCategoryColor,
  calculateExpenseStats,
  calculateCategorySummaries,
  calculateDailyTrends,
  calculateRecipientSummaries,
  calculateIncomeStats,
  calculateProfitLossOverview,
  calculateDailyProfitLossTrends,
  calculateMonthlyProfitLoss,
  formatMonthYear
} from '../../utils/expenseParser';
import { ExpenseTrendChart } from '../Charts/ExpenseTrendChart';
import { ExpenseCategoryChart } from '../Charts/ExpenseCategoryChart';
import { ExpenseTopVendorsChart } from '../Charts/ExpenseTopVendorsChart';
import { ProfitLossTrendChart } from '../Charts/ProfitLossTrendChart';
import { IncomeTrendChart } from '../Charts/IncomeTrendChart';
import { IncomeLedger } from './IncomeLedger';
import { getOneMonthAgoDate, getTodayDateStr } from '../../utils/dateUtils';

interface ExpenseTrackerProps {
  expenses: ExpenseRecord[];
  incomes?: IncomeRecord[];
  monthlyPL?: MonthlyProfitLossRecord[];
  dailyPL?: DailyProfitLossTrend[];
  plOverview?: ProfitLossOverview;
  expenseStats?: ExpenseStats;
  incomeStats?: IncomeStats;
  incomeSources?: string[];
  loading: boolean;
  error: string | null;
  isUsingMock?: boolean;
  categories: string[];
  dateRange: { min: string; max: string };
  overallDateRange?: { min: string; max: string };
  onRefresh?: () => void;
}

export const ExpenseTracker: React.FC<ExpenseTrackerProps> = ({
  expenses,
  incomes,
  monthlyPL,
  dailyPL,
  plOverview,
  expenseStats: _expenseStats,
  incomeStats,
  incomeSources,
  loading,
  error,
  isUsingMock,
  categories,
  dateRange,
  overallDateRange: _overallDateRange,
  onRefresh
}) => {
  // --- Sub-Tab State: P&L | Penerimaan | Pengeluaran ---
  const [activeSubTab, setActiveSubTab] = useState<'pl' | 'incomes' | 'expenses'>('pl');

  // --- Filter State for Expenses ---
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');

  // --- Sort & Pagination State ---
  const [sortField, setSortField] = useState<'date' | 'recipient' | 'amount' | 'category'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Initialize dates from dateRange: default 1 month back from TODAY
  useEffect(() => {
    if (dateRange.min) {
      const todayStr = getTodayDateStr();
      const defaultEnd = dateRange.max && dateRange.max < todayStr ? dateRange.max : todayStr;
      const oneMonthAgo = getOneMonthAgoDate(defaultEnd);
      const initialStart = dateRange.min && oneMonthAgo < dateRange.min ? dateRange.min : oneMonthAgo;

      if (!endDate) {
        setEndDate(defaultEnd);
      }
      if (!startDate) {
        setStartDate(initialStart);
      }
    }
  }, [dateRange]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, startDate, endDate, minAmount, maxAmount, pageSize]);

  // Quick Date Range Helpers
  const handleQuickDatePreset = (preset: 'all' | 'this_month' | 'last_7_days' | 'last_30_days') => {
    if (preset === 'all') {
      setStartDate(dateRange.min || '');
      setEndDate(dateRange.max || '');
      return;
    }

    if (expenses.length === 0) return;
    const maxD = dateRange.max ? new Date(dateRange.max) : new Date();

    if (preset === 'this_month') {
      // Month of the latest date
      const year = maxD.getFullYear();
      const month = String(maxD.getMonth() + 1).padStart(2, '0');
      const lastDay = new Date(year, maxD.getMonth() + 1, 0).getDate();
      setStartDate(`${year}-${month}-01`);
      setEndDate(`${year}-${month}-${String(lastDay).padStart(2, '0')}`);
    } else if (preset === 'last_7_days') {
      const start = new Date(maxD);
      start.setDate(maxD.getDate() - 6);
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(maxD.toISOString().split('T')[0]);
    } else if (preset === 'last_30_days') {
      const start = new Date(maxD);
      start.setDate(maxD.getDate() - 29);
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(maxD.toISOString().split('T')[0]);
    }
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('All');
    setStartDate(dateRange.min || '');
    setEndDate(dateRange.max || '');
    setMinAmount('');
    setMaxAmount('');
  };

  const isFilterActive = useMemo(() => {
    return (
      searchTerm !== '' ||
      selectedCategory !== 'All' ||
      (startDate !== '' && startDate !== dateRange.min) ||
      (endDate !== '' && endDate !== dateRange.max) ||
      minAmount !== '' ||
      maxAmount !== ''
    );
  }, [searchTerm, selectedCategory, startDate, endDate, dateRange, minAmount, maxAmount]);

  // --- Filtered Data ---
  const filteredExpenses = useMemo(() => {
    return expenses.filter(item => {
      // Date filter
      if (startDate && item.date < startDate) return false;
      if (endDate && item.date > endDate) return false;

      // Category filter
      if (selectedCategory !== 'All' && item.category !== selectedCategory) return false;

      // Search term filter (penerima or category)
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const matchRecipient = item.recipient.toLowerCase().includes(query);
        const matchCategory = item.category.toLowerCase().includes(query);
        if (!matchRecipient && !matchCategory) return false;
      }

      // Amount filter
      if (minAmount && item.amount < parseFloat(minAmount)) return false;
      if (maxAmount && item.amount > parseFloat(maxAmount)) return false;

      return true;
    });
  }, [expenses, startDate, endDate, selectedCategory, searchTerm, minAmount, maxAmount]);

  // --- Statistics & Charts Data ---
  const stats = useMemo(() => calculateExpenseStats(filteredExpenses), [filteredExpenses]);
  const categorySummaries = useMemo(() => calculateCategorySummaries(filteredExpenses), [filteredExpenses]);
  const dailyTrends = useMemo(() => calculateDailyTrends(filteredExpenses), [filteredExpenses]);
  const recipientSummaries = useMemo(() => calculateRecipientSummaries(filteredExpenses, 15), [filteredExpenses]);

  // --- Sorted Data for Table ---
  const sortedExpenses = useMemo(() => {
    const list = [...filteredExpenses];
    list.sort((a, b) => {
      let valA: string | number = a[sortField];
      let valB: string | number = b[sortField];

      if (typeof valA === 'string' && typeof valB === 'string') {
        const comp = valA.localeCompare(valB);
        return sortDirection === 'asc' ? comp : -comp;
      }

      return sortDirection === 'asc' ? (Number(valA) - Number(valB)) : (Number(valB) - Number(valA));
    });
    return list;
  }, [filteredExpenses, sortField, sortDirection]);

  // --- Paginated Data ---
  const totalPages = Math.ceil(sortedExpenses.length / pageSize) || 1;
  const paginatedExpenses = useMemo(() => {
    if (pageSize >= 9999) return sortedExpenses;
    const start = (currentPage - 1) * pageSize;
    return sortedExpenses.slice(start, start + pageSize);
  }, [sortedExpenses, currentPage, pageSize]);

  const handleSort = (field: 'date' | 'recipient' | 'amount' | 'category') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'amount' || field === 'date' ? 'desc' : 'asc');
    }
  };

  // Export filtered data to CSV
  const handleExportCSV = () => {
    if (sortedExpenses.length === 0) return;

    const headers = ['No', 'Tanggal', 'Penerima', 'Kategori', 'Amount (IDR)'];
    const rows = sortedExpenses.map((exp, idx) => [
      idx + 1,
      `"${exp.date}"`,
      `"${exp.recipient.replace(/"/g, '""')}"`,
      `"${exp.category.replace(/"/g, '""')}"`,
      exp.amount
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Expense_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Safe memos for P&L and Incomes
  const safeIncomes = useMemo(() => incomes || [], [incomes]);
  const computedPLOverview = useMemo(() => {
    return plOverview || calculateProfitLossOverview(safeIncomes, expenses);
  }, [plOverview, safeIncomes, expenses]);

  const computedDailyPL = useMemo(() => {
    return dailyPL || calculateDailyProfitLossTrends(safeIncomes, expenses);
  }, [dailyPL, safeIncomes, expenses]);

  const computedMonthlyPL = useMemo(() => {
    return monthlyPL || calculateMonthlyProfitLoss(safeIncomes, expenses);
  }, [monthlyPL, safeIncomes, expenses]);

  const computedIncomeStats = useMemo(() => {
    return incomeStats || calculateIncomeStats(safeIncomes);
  }, [incomeStats, safeIncomes]);

  const computedIncomeSources = useMemo(() => {
    if (incomeSources && incomeSources.length > 0) return incomeSources;
    return Array.from(new Set(safeIncomes.map(i => i.source).filter(Boolean))).sort();
  }, [incomeSources, safeIncomes]);

  if (loading && expenses.length === 0 && safeIncomes.length === 0) {
    return (
      <div className="card flex flex-col items-center justify-center py-24 space-y-4 text-center">
        <div className="w-10 h-10 rounded-full border-4 border-cyan-500/20 border-t-cyan-500 animate-spin" />
        <div>
          <h3 className="text-sm font-bold text-[#f8fafc]">Memuat Data Keuangan...</h3>
          <p className="text-xs text-[#94a3b8] mt-1">Mengambil data dari Google Sheets Laporan Profit Loss</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Informational or Offline Banner */}
      {isUsingMock && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs text-amber-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>
              Menampilkan data cadangan offline (cache) dari Google Sheets Expense Tracking.
              {error ? ` (${error})` : ''}
            </span>
          </div>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 font-semibold transition"
            >
              Sinkronkan Ulang
            </button>
          )}
        </div>
      )}

      {/* Sub-Tabs: P&L | Penerimaan | Pengeluaran */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#334155]/60 pb-3">
        <button
          onClick={() => setActiveSubTab('pl')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            activeSubTab === 'pl'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-indigo-500/20'
              : 'text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#1e293b]'
          }`}
        >
          <PieChart className="w-4 h-4" />
          Ringkasan Profit & Loss (P&L)
        </button>

        <button
          onClick={() => setActiveSubTab('incomes')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            activeSubTab === 'incomes'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/20'
              : 'text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#1e293b]'
          }`}
        >
          <TrendingUp className="w-4 h-4 text-emerald-300" />
          Data Penerimaan (Pemasukan)
          {safeIncomes.length > 0 && (
            <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full font-bold ml-1">
              {safeIncomes.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('expenses')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            activeSubTab === 'expenses'
              ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/20'
              : 'text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#1e293b]'
          }`}
        >
          <TrendingDown className="w-4 h-4 text-cyan-300" />
          Data Pengeluaran (Expense Tracker)
          {expenses.length > 0 && (
            <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full font-bold ml-1">
              {expenses.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab 1: Ringkasan Profit & Loss */}
      {activeSubTab === 'pl' && (
        <div className="space-y-6">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Total Pemasukan */}
            <div className="kpi-card kpi-card-sales">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-400 shrink-0">
                <DollarSign className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="kpi-label">Total Pemasukan (Omset)</div>
                <div className="kpi-value text-emerald-400 truncate">
                  {formatRupiah(computedPLOverview.totalIncome)}
                </div>
                <div className="kpi-comparison text-emerald-400/80">
                  {safeIncomes.length} transaksi pencairan dana
                </div>
              </div>
            </div>

            {/* 2. Total Pengeluaran */}
            <div className="kpi-card kpi-card-stock">
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 flex items-center justify-center text-rose-400 shrink-0">
                <TrendingDown className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="kpi-label">Total Pengeluaran (Beban)</div>
                <div className="kpi-value text-rose-400 truncate">
                  {formatRupiah(computedPLOverview.totalExpense)}
                </div>
                <div className="kpi-comparison text-rose-400/80">
                  {expenses.length} transaksi pengeluaran
                </div>
              </div>
            </div>

            {/* 3. Net Profit / Loss */}
            <div className="kpi-card kpi-card-daily">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                computedPLOverview.netProfitLoss >= 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
              }`}>
                <Wallet className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="kpi-label">Net Profit / Loss (Laba Bersih)</div>
                <div className={`kpi-value truncate font-bold ${
                  computedPLOverview.netProfitLoss >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {computedPLOverview.netProfitLoss >= 0 ? '+' : ''}{formatRupiah(computedPLOverview.netProfitLoss)}
                </div>
                <div className="kpi-comparison flex items-center gap-1.5">
                  <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                    computedPLOverview.status === 'profit'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                  }`}>
                    {computedPLOverview.status === 'profit' ? 'Laba Bersih' : 'Rugi Bersih'}
                  </span>
                  <span className="text-[#94a3b8]">
                    Margin {computedPLOverview.profitMargin.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            {/* 4. Margin & Efisiensi */}
            <div className="kpi-card kpi-card-returned">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/15 flex items-center justify-center text-indigo-400 shrink-0">
                <PieChart className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="kpi-label">Rasio Beban : Pendapatan</div>
                <div className="kpi-value text-indigo-400 truncate">
                  {computedPLOverview.expenseToIncomeRatio.toFixed(1)}%
                </div>
                <div className="kpi-comparison text-[#94a3b8]">
                  {computedPLOverview.expenseToIncomeRatio > 100 
                    ? 'Pengeluaran melebihi penerimaan' 
                    : 'Pengeluaran terkendali di bawah omset'}
                </div>
              </div>
            </div>
          </div>

          {/* Profit & Loss Trend Chart */}
          <div className="w-full">
            <ProfitLossTrendChart data={computedDailyPL} />
          </div>

          {/* Monthly Summary Ledger Table */}
          <div className="card space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#334155]/50 pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#f8fafc]">Laporan Laba Rugi Bulanan</h3>
                <p className="text-xs text-[#94a3b8]">Rekapitulasi komparasi penerimaan dan pengeluaran per periode</p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-[#334155]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#1e293b] text-[#94a3b8] border-b border-[#334155]">
                  <tr>
                    <th className="py-2.5 px-4 font-medium">Bulan / Periode</th>
                    <th className="py-2.5 px-4 font-medium text-right text-emerald-400">Total Pemasukan</th>
                    <th className="py-2.5 px-4 font-medium text-right text-rose-400">Total Pengeluaran</th>
                    <th className="py-2.5 px-4 font-medium text-right">Net Profit / Loss</th>
                    <th className="py-2.5 px-4 font-medium text-right">Margin Bersih</th>
                    <th className="py-2.5 px-4 font-medium text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#334155]/60 text-[#f1f5f9]">
                  {computedMonthlyPL.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-[#64748b]">
                        Belum ada ringkasan bulanan tersedia
                      </td>
                    </tr>
                  ) : (
                    computedMonthlyPL.map((row) => {
                      const isProfit = row.netProfitLoss >= 0;
                      return (
                        <tr key={row.month} className="hover:bg-[#1e293b]/50 transition-colors">
                          <td className="py-3 px-4 font-semibold text-[#f8fafc]">
                            {row.displayMonth || formatMonthYear(row.month)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-400">
                            {formatRupiah(row.income)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-semibold text-rose-400">
                            {formatRupiah(row.expense)}
                          </td>
                          <td className={`py-3 px-4 text-right font-mono font-bold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isProfit ? '+' : ''}{formatRupiah(row.netProfitLoss)}
                          </td>
                          <td className={`py-3 px-4 text-right font-mono ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {row.margin.toFixed(1)}%
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                              isProfit
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            }`}>
                              {isProfit ? 'Surplus (Laba)' : 'Defisit (Rugi)'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {computedMonthlyPL.length > 0 && (
                  <tfoot className="bg-[#1e293b]/80 border-t border-[#334155] font-semibold">
                    <tr>
                      <td className="py-3 px-4 text-[#f8fafc]">Total Akumulasi</td>
                      <td className="py-3 px-4 text-right text-emerald-400 font-mono text-sm">
                        {formatRupiah(computedPLOverview.totalIncome)}
                      </td>
                      <td className="py-3 px-4 text-right text-rose-400 font-mono text-sm">
                        {formatRupiah(computedPLOverview.totalExpense)}
                      </td>
                      <td className={`py-3 px-4 text-right font-mono text-sm font-bold ${
                        computedPLOverview.netProfitLoss >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {computedPLOverview.netProfitLoss >= 0 ? '+' : ''}{formatRupiah(computedPLOverview.netProfitLoss)}
                      </td>
                      <td className={`py-3 px-4 text-right font-mono ${
                        computedPLOverview.profitMargin >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {computedPLOverview.profitMargin.toFixed(1)}%
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                          computedPLOverview.status === 'profit'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}>
                          {computedPLOverview.status === 'profit' ? 'Laba Bersih' : 'Rugi Bersih'}
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* Quick Insights Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card border-[#334155]/70 bg-gradient-to-br from-[#1e293b]/60 to-[#0f172a]">
              <div className="flex items-center gap-2 mb-2 text-emerald-400 font-semibold text-xs">
                <Store className="w-4 h-4" />
                <span>Penerimaan Utama (Platform)</span>
              </div>
              <p className="text-xs text-[#94a3b8] leading-relaxed">
                Platform <strong className="text-[#f8fafc]">{computedIncomeStats.topSource.name}</strong> mencakup{' '}
                <strong className="text-emerald-400">{computedIncomeStats.topSource.percentage}%</strong> dari seluruh penerimaan usaha dengan total{' '}
                <strong className="text-emerald-400">{formatRupiah(computedIncomeStats.topSource.amount)}</strong>.
              </p>
            </div>

            <div className="card border-[#334155]/70 bg-gradient-to-br from-[#1e293b]/60 to-[#0f172a]">
              <div className="flex items-center gap-2 mb-2 text-amber-400 font-semibold text-xs">
                <Tag className="w-4 h-4" />
                <span>Beban Operasional Dominan</span>
              </div>
              <p className="text-xs text-[#94a3b8] leading-relaxed">
                Alokasi terbesar dialokasikan untuk <strong className="text-[#f8fafc]">{stats.topCategory.name}</strong> sebesar{' '}
                <strong className="text-amber-400">{formatRupiah(stats.topCategory.amount)}</strong> ({stats.topCategory.percentage.toFixed(1)}% dari total pengeluaran), disusul penerima vendor utama <strong className="text-[#f8fafc]">{stats.topRecipient.name}</strong>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Data Penerimaan (Pemasukan) */}
      {activeSubTab === 'incomes' && (
        <div className="space-y-6">
          {/* Income KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="kpi-card kpi-card-sales">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-400 shrink-0">
                <DollarSign className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="kpi-label">Total Penerimaan</div>
                <div className="kpi-value text-emerald-400 truncate">
                  {formatRupiah(computedIncomeStats.totalAmount)}
                </div>
                <div className="kpi-comparison text-[#94a3b8]">
                  {computedIncomeStats.transactionCount} transaksi pencairan
                </div>
              </div>
            </div>

            <div className="kpi-card kpi-card-daily">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/15 flex items-center justify-center text-cyan-400 shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="kpi-label">Rata-rata per Pencairan</div>
                <div className="kpi-value text-cyan-400 truncate">
                  {formatRupiah(computedIncomeStats.avgTransaction)}
                </div>
                <div className="kpi-comparison text-[#94a3b8]">
                  Rata-rata harian: {formatRupiah(computedIncomeStats.dailyAverage)}
                </div>
              </div>
            </div>

            <div className="kpi-card kpi-card-stock">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/15 flex items-center justify-center text-indigo-400 shrink-0">
                <Award className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="kpi-label">Pencairan Terbesar</div>
                <div className="kpi-value text-indigo-400 truncate">
                  {formatRupiah(computedIncomeStats.largestTransaction.amount)}
                </div>
                <div className="kpi-comparison text-[#94a3b8]">
                  {computedIncomeStats.largestTransaction.source} ({computedIncomeStats.largestTransaction.date})
                </div>
              </div>
            </div>

            <div className="kpi-card kpi-card-returned">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-400 shrink-0">
                <Store className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="kpi-label">Platform Utama</div>
                <div className="kpi-value text-amber-400 truncate">
                  {computedIncomeStats.topSource.name}
                </div>
                <div className="kpi-comparison text-[#94a3b8]">
                  {formatRupiah(computedIncomeStats.topSource.amount)} ({computedIncomeStats.topSource.percentage}%)
                </div>
              </div>
            </div>
          </div>

          {/* Income Trend Chart */}
          <div className="w-full">
            <IncomeTrendChart incomes={safeIncomes} />
          </div>

          {/* Income Ledger Table */}
          <IncomeLedger
            incomes={safeIncomes}
            incomeStats={computedIncomeStats}
            incomeSources={computedIncomeSources}
            dateRange={dateRange}
          />
        </div>
      )}

      {/* Tab 3: Data Pengeluaran (Expense Tracker) */}
      {activeSubTab === 'expenses' && (
        <div className="space-y-6">
          {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Pengeluaran */}
        <div className="kpi-card kpi-card-stock">
          <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center text-blue-400 shrink-0">
            <Wallet className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="kpi-label">Total Pengeluaran</div>
            <div className="kpi-value text-blue-400 truncate">
              {formatRupiah(stats.totalAmount)}
            </div>
            <div className="kpi-comparison">
              {stats.transactionCount.toLocaleString('id-ID')} transaksi tercatat
            </div>
          </div>
        </div>

        {/* 2. Rata-rata Harian */}
        <div className="kpi-card kpi-card-daily">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/15 flex items-center justify-center text-cyan-400 shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="kpi-label">Rata-rata Pengeluaran Harian</div>
            <div className="kpi-value text-cyan-400 truncate">
              {formatRupiah(stats.dailyAverage)}
            </div>
            <div className="kpi-comparison">
              Rata-rata per transaksi: {formatRupiah(stats.avgTransaction)}
            </div>
          </div>
        </div>

        {/* 3. Kategori Terbesar */}
        <div className="kpi-card kpi-card-sales">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-400 shrink-0">
            <Tag className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="kpi-label">Kategori Terbesar</div>
            <div className="kpi-value text-amber-400 truncate">
              {stats.topCategory.name}
            </div>
            <div className="kpi-comparison">
              {formatRupiah(stats.topCategory.amount)} ({stats.topCategory.percentage.toFixed(1)}%)
            </div>
          </div>
        </div>

        {/* 4. Penerima / Vendor Terbesar */}
        <div className="kpi-card kpi-card-returned">
          <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center text-purple-400 shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="kpi-label">Penerima Alokasi Terbesar</div>
            <div className="kpi-value text-purple-400 truncate">
              {stats.topRecipient.name}
            </div>
            <div className="kpi-comparison">
              {formatRupiah(stats.topRecipient.amount)} ({stats.topRecipient.count}x transaksi)
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Control Section */}
      <div className="card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#334155]/40 pb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-[#f8fafc]">Filter & Pencarian Pengeluaran</h2>
          </div>

          <div className="flex items-center gap-2">
            {isFilterActive && (
              <button
                onClick={handleResetFilters}
                className="btn text-xs py-1 px-2.5 flex items-center gap-1.5 text-rose-400 hover:text-rose-300 border-rose-500/30 hover:bg-rose-500/10"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Filter
              </button>
            )}
            <span className="text-xs text-[#94a3b8] font-numeric">
              Menampilkan <span className="text-[#f8fafc] font-bold">{filteredExpenses.length}</span> dari {expenses.length} data
            </span>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. Search Recipient */}
          <div className="space-y-1">
            <label className="text-xs text-[#94a3b8] font-medium">Cari Penerima / Keterangan</label>
            <div className="search-input-wrapper">
              <div className="search-icon-wrapper">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                placeholder="Contoh: KAIN, ANTONI, HONOR..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
          </div>

          {/* 2. Category Selector */}
          <div className="space-y-1">
            <label className="text-xs text-[#94a3b8] font-medium">Kategori Pengeluaran</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2 text-xs text-[#f1f5f9] focus:outline-none focus:border-cyan-500 transition"
            >
              <option value="All">Semua Kategori ({categories.length})</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Date Range */}
          <div className="space-y-1 lg:col-span-2">
            <div className="flex items-center justify-between">
              <label className="text-xs text-[#94a3b8] font-medium">Rentang Tanggal</label>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => handleQuickDatePreset('all')}
                  className="text-[11px] px-1.5 py-0.5 rounded text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#334155]/50 transition"
                >
                  Semua
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDatePreset('this_month')}
                  className="text-[11px] px-1.5 py-0.5 rounded text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#334155]/50 transition"
                >
                  Bulan Ini
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDatePreset('last_7_days')}
                  className="text-[11px] px-1.5 py-0.5 rounded text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#334155]/50 transition"
                >
                  7 Hari
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-2.5 py-1.5 text-xs text-[#f1f5f9] focus:outline-none focus:border-cyan-500 transition"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-2.5 py-1.5 text-xs text-[#f1f5f9] focus:outline-none focus:border-cyan-500 transition"
              />
            </div>
          </div>
        </div>

        {/* Quick Category Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] text-[#64748b] font-semibold mr-1">Filter Cepat:</span>
          <button
            onClick={() => setSelectedCategory('All')}
            className={`text-xs px-2.5 py-1 rounded-full border transition ${
              selectedCategory === 'All'
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-semibold'
                : 'bg-[#0f172a] text-[#94a3b8] border-[#334155] hover:text-[#f1f5f9]'
            }`}
          >
            Semua ({expenses.length})
          </button>
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat;
            const count = expenses.filter(e => e.category === cat).length;
            const color = getCategoryColor(cat);
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(isSelected ? 'All' : cat)}
                className={`text-xs px-2.5 py-1 rounded-full border transition flex items-center gap-1.5 ${
                  isSelected
                    ? 'font-bold'
                    : 'bg-[#0f172a] text-[#94a3b8] border-[#334155] hover:text-[#f1f5f9]'
                }`}
                style={
                  isSelected
                    ? { backgroundColor: `${color}25`, color, borderColor: `${color}60` }
                    : {}
                }
              >
                <span
                  className="w-2 h-2 rounded-full inline-block"
                  style={{ backgroundColor: color }}
                />
                {cat} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Interactive Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Trend Area Chart (7 cols) */}
        <div className="lg:col-span-7">
          <ExpenseTrendChart data={dailyTrends} />
        </div>

        {/* Category Donut Chart (5 cols) */}
        <div className="lg:col-span-5">
          <ExpenseCategoryChart
            data={categorySummaries}
            selectedCategory={selectedCategory}
            onSelectCategory={(cat) => setSelectedCategory(cat)}
          />
        </div>
      </div>

      {/* Top Vendors & Category Breakdown Recap */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Top Vendors Bar Chart (6 cols) */}
        <div className="lg:col-span-6">
          <ExpenseTopVendorsChart
            data={recipientSummaries}
            onSelectRecipient={(rec) => setSearchTerm(rec)}
          />
        </div>

        {/* Category Recap Table (6 cols) */}
        <div className="lg:col-span-6">
          <div className="card h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#f8fafc]">Rekapitulasi Kategori</h3>
                  <p className="text-xs text-[#94a3b8]">Rincian pengeluaran per kategori anggaran</p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#334155] text-[#64748b] uppercase tracking-wider font-semibold">
                    <th className="py-2.5 px-3">Kategori</th>
                    <th className="py-2.5 px-2 text-center">Transaksi</th>
                    <th className="py-2.5 px-3 text-right">Total (Rp)</th>
                    <th className="py-2.5 px-3 text-right">Porsi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#334155]/40 text-[#f1f5f9]">
                  {categorySummaries.map((cat) => {
                    const isSelected = selectedCategory === cat.category;
                    return (
                      <tr
                        key={cat.category}
                        onClick={() => setSelectedCategory(isSelected ? 'All' : cat.category)}
                        className={`cursor-pointer transition ${
                          isSelected ? 'bg-indigo-500/15' : 'hover:bg-[#1e293b]/60'
                        }`}
                      >
                        <td className="py-2 px-3 font-medium">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: cat.color }}
                            />
                            <span>{cat.category}</span>
                          </div>
                        </td>
                        <td className="py-2 px-2 text-center font-numeric text-[#94a3b8]">
                          {cat.count}
                        </td>
                        <td className="py-2 px-3 text-right font-numeric font-bold text-[#f8fafc]">
                          {formatRupiah(cat.totalAmount)}
                        </td>
                        <td className="py-2 px-3 text-right font-numeric">
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-[11px] text-[#94a3b8]">
                              {cat.percentage.toFixed(1)}%
                            </span>
                            <div className="w-12 h-1.5 bg-[#334155] rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${Math.min(100, cat.percentage)}%`,
                                  backgroundColor: cat.color
                                }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Transaction Ledger Table */}
      <div className="card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#334155]/50 pb-3">
          <div>
            <h3 className="text-sm font-bold text-[#f8fafc]">Daftar Rincian Pengeluaran</h3>
            <p className="text-xs text-[#94a3b8]">
              Buku kas transaksi pengeluaran dari sheet Google Docs
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Rows per page selector */}
            <div className="flex items-center gap-1.5 text-xs text-[#94a3b8]">
              <span>Tampilkan:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="bg-[#0f172a] border border-[#334155] rounded px-2 py-1 text-xs text-[#f1f5f9] focus:outline-none"
              >
                <option value={15}>15 baris</option>
                <option value={25}>25 baris</option>
                <option value={50}>50 baris</option>
                <option value={100}>100 baris</option>
                <option value={9999}>Semua</option>
              </select>
            </div>

            {/* CSV Export Button */}
            <button
              onClick={handleExportCSV}
              className="btn btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
              title="Unduh data pengeluaran dalam format CSV"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto rounded-lg border border-[#334155]/60">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#0f172a] border-b border-[#334155] text-[#64748b] uppercase tracking-wider font-bold">
                <th className="py-3 px-3 text-center w-12">#</th>
                <th
                  onClick={() => handleSort('date')}
                  className="py-3 px-3 cursor-pointer select-none hover:text-[#f1f5f9] transition-colors"
                >
                  <div className="flex items-center gap-1">
                    Tanggal
                    {sortField === 'date' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-cyan-400" /> : <ArrowDown className="w-3.5 h-3.5 text-cyan-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-[#475569]" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('recipient')}
                  className="py-3 px-3 cursor-pointer select-none hover:text-[#f1f5f9] transition-colors"
                >
                  <div className="flex items-center gap-1">
                    Penerima / Keterangan
                    {sortField === 'recipient' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-cyan-400" /> : <ArrowDown className="w-3.5 h-3.5 text-cyan-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-[#475569]" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('category')}
                  className="py-3 px-3 cursor-pointer select-none hover:text-[#f1f5f9] transition-colors"
                >
                  <div className="flex items-center gap-1">
                    Kategori
                    {sortField === 'category' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-cyan-400" /> : <ArrowDown className="w-3.5 h-3.5 text-cyan-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-[#475569]" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('amount')}
                  className="py-3 px-3 text-right cursor-pointer select-none hover:text-[#f1f5f9] transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    Nominal (Rp)
                    {sortField === 'amount' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-cyan-400" /> : <ArrowDown className="w-3.5 h-3.5 text-cyan-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-[#475569]" />
                    )}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#334155]/40 text-[#f1f5f9]">
              {paginatedExpenses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[#94a3b8]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <TrendingDown className="w-6 h-6 text-[#64748b]" />
                      <span>Tidak ada data transaksi yang cocok dengan filter.</span>
                      {isFilterActive && (
                        <button
                          onClick={handleResetFilters}
                          className="text-xs text-cyan-400 hover:underline mt-1"
                        >
                          Reset Filter
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedExpenses.map((item, idx) => {
                  const globalIndex = (currentPage - 1) * pageSize + idx + 1;
                  const catColor = getCategoryColor(item.category);
                  return (
                    <tr key={item.id} className="hover:bg-[#1e293b]/70 transition-colors">
                      <td className="py-2.5 px-3 text-center text-[#64748b] font-numeric font-medium">
                        {globalIndex}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[#cbd5e1] whitespace-nowrap">
                        {item.displayDate}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-[#f8fafc]">
                        {item.recipient}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <button
                          onClick={() => setSelectedCategory(item.category)}
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border transition hover:brightness-110"
                          style={{
                            backgroundColor: `${catColor}18`,
                            color: catColor,
                            borderColor: `${catColor}40`
                          }}
                          title={`Filter kategori ${item.category}`}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: catColor }}
                          />
                          {item.category}
                        </button>
                      </td>
                      <td className="py-2.5 px-3 text-right font-numeric font-bold text-cyan-300">
                        {formatRupiah(item.amount)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {/* Table Footer Summary */}
            {paginatedExpenses.length > 0 && (
              <tfoot>
                <tr className="bg-[#0f172a] border-t-2 border-[#334155] font-bold text-xs text-[#f8fafc]">
                  <td colSpan={4} className="py-3 px-3 text-right uppercase tracking-wider text-[#94a3b8]">
                    Total Terpilih ({filteredExpenses.length} transaksi):
                  </td>
                  <td className="py-3 px-3 text-right font-numeric text-cyan-300 text-sm">
                    {formatRupiah(stats.totalAmount)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="text-xs text-[#94a3b8]">
              Halaman <span className="font-bold text-[#f8fafc]">{currentPage}</span> dari{' '}
              <span className="font-bold text-[#f8fafc]">{totalPages}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="btn text-xs py-1 px-3 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Sebelumnya
              </button>

              {/* Page numbers */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let p = i + 1;
                if (totalPages > 5 && currentPage > 3) {
                  p = currentPage - 2 + i;
                  if (p > totalPages) p = totalPages - (4 - i);
                }
                return (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={`w-7 h-7 rounded text-xs font-semibold transition ${
                      currentPage === p
                        ? 'bg-cyan-500 text-[#0f172a] font-bold'
                        : 'bg-[#0f172a] text-[#94a3b8] hover:bg-[#334155] hover:text-[#f8fafc]'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="btn text-xs py-1 px-3 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Berikutnya
              </button>
            </div>
          </div>
        )}
      </div>
        </div>
      )}
    </div>
  );
};
