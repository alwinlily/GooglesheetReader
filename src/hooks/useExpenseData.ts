import { useState, useEffect, useMemo, useCallback } from 'react';
import type { 
  ExpenseRecord, 
  IncomeRecord, 
  MonthlyProfitLossRecord, 
  DailyProfitLossTrend, 
  ProfitLossOverview,
  IncomeStats,
  ExpenseStats
} from '../types/expense';
import { 
  parseGoogleSheetsExpenseData,
  parseGoogleSheetsIncomeData,
  parseGoogleSheetsProfitLossData,
  calculateExpenseStats,
  calculateIncomeStats,
  calculateProfitLossOverview,
  calculateDailyProfitLossTrends,
  calculateMonthlyProfitLoss
} from '../utils/expenseParser';
import { 
  MOCK_EXPENSE_SHEET_DATA, 
  MOCK_INCOME_SHEET_DATA, 
  MOCK_PROFIT_LOSS_SHEET_DATA 
} from '../utils/mockExpenseData';

export function useExpenseData() {
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [incomes, setIncomes] = useState<IncomeRecord[]>([]);
  const [sheetMonthlyPL, setSheetMonthlyPL] = useState<MonthlyProfitLossRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUsingMock, setIsUsingMock] = useState(false);

  const fetchExpenseData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sheetId = import.meta.env.VITE_EXPENSE_SHEET_ID || '1QJiKIOOm1aXcGfpg3tU3npPXZevobOD3hxQxD-sRi-U';
      const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;

      if (!sheetId || !apiKey) {
        console.warn('VITE_EXPENSE_SHEET_ID or VITE_GOOGLE_API_KEY missing. Falling back to mock data.');
        const parsedExpenses = parseGoogleSheetsExpenseData(MOCK_EXPENSE_SHEET_DATA);
        const parsedIncomes = parseGoogleSheetsIncomeData(MOCK_INCOME_SHEET_DATA);
        const parsedPL = parseGoogleSheetsProfitLossData(MOCK_PROFIT_LOSS_SHEET_DATA);
        setExpenses(parsedExpenses);
        setIncomes(parsedIncomes);
        setSheetMonthlyPL(parsedPL);
        setIsUsingMock(true);
        return;
      }

      // Try batchGet across all 3 key tabs: Pengeluaran, Pemasukan, Profit/Loss
      const batchUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values:batchGet?ranges=Pengeluaran!A:D&ranges=Pemasukan!A:D&ranges=${encodeURIComponent('Profit/Loss!A:D')}&key=${apiKey}`;
      const batchRes = await fetch(batchUrl);

      if (batchRes.ok) {
        const batchJson = await batchRes.json();
        const valueRanges = batchJson.valueRanges || [];

        let foundExpenses: ExpenseRecord[] = [];
        let foundIncomes: IncomeRecord[] = [];
        let foundPL: MonthlyProfitLossRecord[] = [];

        valueRanges.forEach((vr: { range?: string; values?: unknown[][] }) => {
          const rangeName = (vr.range || '').toLowerCase();
          if (rangeName.includes('pengeluaran')) {
            foundExpenses = parseGoogleSheetsExpenseData(vr.values || []);
          } else if (rangeName.includes('pemasukan')) {
            foundIncomes = parseGoogleSheetsIncomeData(vr.values || []);
          } else if (rangeName.includes('profit')) {
            foundPL = parseGoogleSheetsProfitLossData(vr.values || []);
          }
        });

        // If any tab was missed in batch, fallback to individual tab check
        if (foundExpenses.length === 0 && valueRanges[0]?.values) {
          foundExpenses = parseGoogleSheetsExpenseData(valueRanges[0].values);
        }

        setExpenses(foundExpenses);
        setIncomes(foundIncomes);
        setSheetMonthlyPL(foundPL);
        setIsUsingMock(false);
        return;
      }

      // If batchGet failed (e.g. 400 because of tab names), fallback to fetching dynamically via metadata
      const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties.title&key=${apiKey}`;
      const metaRes = await fetch(metaUrl);
      if (!metaRes.ok) {
        const errData = await metaRes.json().catch(() => ({}));
        throw new Error(errData.error?.message || `Gagal mengakses spreadsheet (${metaRes.statusText})`);
      }
      const meta = await metaRes.json();
      const sheetTitles: string[] = (meta.sheets || []).map((s: { properties?: { title?: string } }) => s.properties?.title || '');

      // Fetch each detected sheet
      let detectedExpenses: ExpenseRecord[] = [];
      let detectedIncomes: IncomeRecord[] = [];
      let detectedPL: MonthlyProfitLossRecord[] = [];

      for (const title of sheetTitles) {
        try {
          const tabUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(title)}!A:D?key=${apiKey}`;
          const res = await fetch(tabUrl);
          if (res.ok) {
            const data = await res.json();
            const lower = title.toLowerCase();
            if (lower.includes('pengeluaran') || (detectedExpenses.length === 0 && !lower.includes('pemasukan') && !lower.includes('profit'))) {
              detectedExpenses = parseGoogleSheetsExpenseData(data.values || []);
            } else if (lower.includes('pemasukan')) {
              detectedIncomes = parseGoogleSheetsIncomeData(data.values || []);
            } else if (lower.includes('profit')) {
              detectedPL = parseGoogleSheetsProfitLossData(data.values || []);
            }
          }
        } catch (e) {
          console.warn(`Tab fetch for ${title} failed:`, e);
        }
      }

      setExpenses(detectedExpenses);
      setIncomes(detectedIncomes);
      setSheetMonthlyPL(detectedPL);
      setIsUsingMock(false);
    } catch (err: unknown) {
      console.error('Fetch finance data error:', err);
      // Fallback to mock data so dashboard remains fully functional
      const parsedMockExpenses = parseGoogleSheetsExpenseData(MOCK_EXPENSE_SHEET_DATA);
      const parsedMockIncomes = parseGoogleSheetsIncomeData(MOCK_INCOME_SHEET_DATA);
      const parsedMockPL = parseGoogleSheetsProfitLossData(MOCK_PROFIT_LOSS_SHEET_DATA);
      setExpenses(parsedMockExpenses);
      setIncomes(parsedMockIncomes);
      setSheetMonthlyPL(parsedMockPL);
      setIsUsingMock(true);
      setError(err instanceof Error ? err.message : 'Gagal memuat data keuangan');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExpenseData();
  }, [fetchExpenseData]);

  // Derived expense categories & recipients
  const categories = useMemo(() => {
    const set = new Set(expenses.map(e => e.category).filter(Boolean));
    return Array.from(set).sort();
  }, [expenses]);

  const recipients = useMemo(() => {
    const set = new Set(expenses.map(e => e.recipient).filter(Boolean));
    return Array.from(set).sort();
  }, [expenses]);

  // Derived income sources (platforms)
  const incomeSources = useMemo(() => {
    const set = new Set(incomes.map(i => i.source).filter(Boolean));
    return Array.from(set).sort();
  }, [incomes]);

  // Expense date range
  const dateRange = useMemo(() => {
    if (expenses.length === 0) return { min: '', max: '' };
    const dates = expenses.map(e => e.date).filter(Boolean).sort();
    return {
      min: dates[0] || '',
      max: dates[dates.length - 1] || ''
    };
  }, [expenses]);

  // Income date range
  const incomeDateRange = useMemo(() => {
    if (incomes.length === 0) return { min: '', max: '' };
    const dates = incomes.map(i => i.date).filter(Boolean).sort();
    return {
      min: dates[0] || '',
      max: dates[dates.length - 1] || ''
    };
  }, [incomes]);

  // Combined date range
  const overallDateRange = useMemo(() => {
    const allDates = [
      ...expenses.map(e => e.date),
      ...incomes.map(i => i.date)
    ].filter(Boolean).sort();
    if (allDates.length === 0) return { min: '', max: '' };
    return {
      min: allDates[0] || '',
      max: allDates[allDates.length - 1] || ''
    };
  }, [expenses, incomes]);

  // Precomputed stats & overviews
  const expenseStats: ExpenseStats = useMemo(() => calculateExpenseStats(expenses), [expenses]);
  const incomeStats: IncomeStats = useMemo(() => calculateIncomeStats(incomes), [incomes]);
  const plOverview: ProfitLossOverview = useMemo(() => calculateProfitLossOverview(incomes, expenses), [incomes, expenses]);
  const dailyPL: DailyProfitLossTrend[] = useMemo(() => calculateDailyProfitLossTrends(incomes, expenses), [incomes, expenses]);
  const monthlyPL: MonthlyProfitLossRecord[] = useMemo(() => calculateMonthlyProfitLoss(incomes, expenses, sheetMonthlyPL), [incomes, expenses, sheetMonthlyPL]);

  return {
    expenses,
    incomes,
    monthlyPL,
    dailyPL,
    plOverview,
    expenseStats,
    incomeStats,
    loading,
    error,
    isUsingMock,
    categories,
    recipients,
    incomeSources,
    dateRange,
    incomeDateRange,
    overallDateRange,
    refresh: fetchExpenseData
  };
}
