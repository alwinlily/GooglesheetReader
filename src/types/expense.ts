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
