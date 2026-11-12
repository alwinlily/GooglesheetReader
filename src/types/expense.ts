export interface ExpenseRecord {
  id: string;
  sourceRow: number;
  date: string; // YYYY-MM-DD
  displayDate: string; // e.g. "09 Sep 2026"
  recipient: string; // Penerima / Vendor
  amount: number; // Nilai pengeluaran dlm Rupiah
  category: string; // Kategori pengeluaran
}

export interface ExpenseCategorySummary {
  category: string;
  totalAmount: number;
  percentage: number;
  count: number;
  avgAmount: number;
  color: string;
  [key: string]: any;
}

export interface ExpenseFilterState {
  category: string;
  searchTerm: string;
  startDate: string;
  endDate: string;
  minAmount?: string;
  maxAmount?: string;
}

export interface ExpenseDailyTrend {
  date: string;
  displayDate: string;
  totalAmount: number;
  count: number;
  [category: string]: any;
}

export interface ExpenseRecipientSummary {
  recipient: string;
  totalAmount: number;
  count: number;
  mainCategory: string;
}

export interface ExpenseStats {
  totalAmount: number;
  transactionCount: number;
  dailyAverage: number;
  avgTransaction: number;
  topCategory: {
    name: string;
    amount: number;
    percentage: number;
  };
  topRecipient: {
    name: string;
    amount: number;
    count: number;
  };
  largestTransaction: {
    recipient: string;
    amount: number;
    category: string;
    date: string;
  };
}

export interface IncomeRecord {
  id: string;
  sourceRow: number;
  date: string; // YYYY-MM-DD
  displayDate: string; // e.g. "1 Sep 2026"
  source: string; // Platform / Sumber penerimaan e.g. "TOKOPEDIA"
  amount: number; // Nilai penerimaan dlm Rupiah
}

export interface IncomeStats {
  totalAmount: number;
  transactionCount: number;
  dailyAverage: number;
  avgTransaction: number;
  topSource: {
    name: string;
    amount: number;
    percentage: number;
  };
  largestTransaction: {
    source: string;
    amount: number;
    date: string;
  };
}

export interface MonthlyProfitLossRecord {
  month: string; // e.g. "9/2026" or "2026-09"
  displayMonth: string; // e.g. "September 2026"
  income: number;
  expense: number;
  netProfitLoss: number;
  margin: number; // in %: (net / income) * 100
  status: 'profit' | 'loss' | 'balanced';
}

export interface DailyProfitLossTrend {
  date: string; // YYYY-MM-DD
  displayDate: string; // e.g. "01 Sep"
  income: number;
  expense: number;
  netProfitLoss: number;
  cumulativeNet: number;
}

export interface ProfitLossOverview {
  totalIncome: number;
  totalExpense: number;
  netProfitLoss: number;
  profitMargin: number; // in %
  expenseToIncomeRatio: number; // in %
  incomeCount: number;
  expenseCount: number;
  status: 'profit' | 'loss' | 'balanced';
}
