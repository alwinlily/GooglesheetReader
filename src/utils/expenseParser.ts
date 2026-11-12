import type { 
  ExpenseRecord, 
  ExpenseCategorySummary, 
  ExpenseDailyTrend, 
  ExpenseRecipientSummary, 
  ExpenseStats,
  IncomeRecord,
  IncomeStats,
  MonthlyProfitLossRecord,
  DailyProfitLossTrend,
  ProfitLossOverview
} from '../types/expense';

export const CATEGORY_COLORS: Record<string, string> = {
  'Kain': '#6366f1', // Indigo
  'Konveksi': '#3b82f6', // Blue
  'Lain-Lain': '#8b5cf6', // Violet
  'Honor': '#a855f7', // Purple
  'Pengemasan': '#f59e0b', // Amber
  'Kemasan': '#f59e0b',
  'Iklan': '#ec4899', // Pink
  'Biaya Iklan': '#ec4899',
  'Paket': '#06b6d4', // Cyan
  'Biaya Paket': '#06b6d4',
  'Pulsa': '#10b981', // Emerald
  'Transportasi': '#f97316', // Orange
  'Biaya Bank': '#14b8a6', // Teal
  'Listrik': '#eab308', // Yellow
  'Bop': '#38bdf8', // Sky
  'Cash': '#a3e635', // Lime
  'Makan': '#fb923c', // Orange
  'Rokok': '#f43f5e', // Rose
  'Renovasi': '#c084fc', // Purple
  'Kasbon Karyawan': '#fdba74', // Peach
  'Marapthon': '#818cf8', // Indigo
};

const FALLBACK_PALETTE = [
  '#6366f1', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b',
  '#f97316', '#ef4444', '#ec4899', '#a855f7', '#8b5cf6', '#64748b'
];

export function toTitleCase(str: string): string {
  return (str || '')
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function getCategoryColor(category: string, index = 0): string {
  const trimmed = (category || '').trim();
  const title = toTitleCase(trimmed);
  if (CATEGORY_COLORS[title]) {
    return CATEGORY_COLORS[title];
  }
  if (CATEGORY_COLORS[trimmed]) {
    return CATEGORY_COLORS[trimmed];
  }
  return FALLBACK_PALETTE[index % FALLBACK_PALETTE.length];
}

/**
 * Format number to Indonesian Rupiah currency format
 * e.g. 15300000 -> "Rp 15.300.000"
 */
export function formatRupiah(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) return 'Rp 0';
  return 'Rp ' + Math.round(amount).toLocaleString('id-ID');
}

/**
 * Format date from YYYY-MM-DD to Indonesian date
 * e.g. "2026-09-01" -> "1 Sep 2026"
 */
export function formatExpenseDisplayDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Robust date parser supporting MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD, DD/MM, and range strings like "04 S/D 30/09/26"
 */
export function parseExpenseDate(rawDate: unknown, fallbackYear = 2026): string | null {
  if (!rawDate) return null;
  let str = String(rawDate).trim();
  if (!str) return null;

  // Ignore summary label
  if (/^total/i.test(str)) return null;

  // Handle standard YYYY-MM-DD first
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // Handle range strings e.g. "04 S/D 30/09/26" -> pick the last date "30/09/26"
  if (/s\/?d/i.test(str)) {
    const rangeMatch = str.match(/(\d{1,2}[/.-]\d{1,2}(?:[/.-]\d{2,4})?)$/i);
    if (rangeMatch) {
      str = rangeMatch[1];
    }
  }

  const parts = str.split(/[/\-.]/).map(p => p.trim());

  // Handle DD/MM format (e.g. "01/09" or "25/09")
  if (parts.length === 2) {
    let day = parseInt(parts[0], 10);
    let month = parseInt(parts[1], 10);
    if (!isNaN(day) && !isNaN(month)) {
      if (day <= 12 && month > 12) {
        const tmp = day;
        day = month;
        month = tmp;
      }
      return `${fallbackYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
    return null;
  }

  if (parts.length !== 3) return null;

  let year = '';
  let month = '';
  let day = '';

  if (parts[0].length === 4) {
    // YYYY-MM-DD
    year = parts[0];
    month = parts[1].padStart(2, '0');
    day = parts[2].padStart(2, '0');
  } else {
    const p0 = parseInt(parts[0], 10);
    const p1 = parseInt(parts[1], 10);
    year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];

    if (p0 > 12 && p1 <= 12) {
      day = parts[0].padStart(2, '0');
      month = parts[1].padStart(2, '0');
    } else {
      // If day and month are both <= 12, check if 2-digit year was provided (DD/MM/YY) vs (MM/DD/YYYY)
      if (parts[2].length === 2) {
        day = parts[0].padStart(2, '0');
        month = parts[1].padStart(2, '0');
      } else {
        month = parts[0].padStart(2, '0');
        day = parts[1].padStart(2, '0');
      }
    }
  }

  const result = `${year}-${month}-${day}`;
  const d = new Date(`${result}T00:00:00Z`);
  return !isNaN(d.getTime()) ? result : null;
}

/**
 * Parse numeric amount safely from cell (supports string with "Rp", dots, commas)
 */
export function parseExpenseAmount(rawAmount: unknown): number {
  if (typeof rawAmount === 'number') return isNaN(rawAmount) ? 0 : rawAmount;
  if (!rawAmount) return 0;
  
  const cleanStr = String(rawAmount)
    .replace(/[^\d.,-]/g, '')
    .trim();
  
  if (!cleanStr) return 0;

  // If format is Indonesian (e.g. 2.000.000 or 2000000)
  if (cleanStr.includes('.') && !cleanStr.includes(',')) {
    // Check if dot is thousands separator or decimal
    const parts = cleanStr.split('.');
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
      // Thousands separator e.g. 2.000.000 or 15.000
      return parseFloat(cleanStr.replace(/\./g, '')) || 0;
    }
  }

  const normalized = cleanStr.replace(/,/g, '');
  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Parse raw 2D array from Google Sheets API into ExpenseRecord[]
 */
export function parseGoogleSheetsExpenseData(rows: unknown[][]): ExpenseRecord[] {
  if (!rows || rows.length === 0) return [];

  const rawHeaderRow = (rows[0] || []).map(h => String(h || '').trim().toLowerCase());
  const hasHeaderKeywords = rawHeaderRow.some(h => 
    h.includes('tanggal') || h.includes('date') ||
    h.includes('penerima') || h.includes('recipient') ||
    h.includes('amount') || h.includes('nominal') ||
    h.includes('kategori') || h.includes('category')
  );

  let dataRows: unknown[][];
  let finalDateIdx = 0;
  let finalRecipientIdx = 1;
  let finalAmountIdx = 2;
  let finalCategoryIdx = 3;

  if (hasHeaderKeywords) {
    const dateIdx = rawHeaderRow.findIndex(h => h.includes('tanggal') || h.includes('date'));
    const recipientIdx = rawHeaderRow.findIndex(h => h.includes('penerima') || h.includes('recipient') || h.includes('vendor') || h.includes('keterangan'));
    const amountIdx = rawHeaderRow.findIndex(h => h.includes('amount') || h.includes('jumlah') || h.includes('biaya') || h.includes('total') || h.includes('nominal'));
    const categoryIdx = rawHeaderRow.findIndex(h => h.includes('kategori') || h.includes('category'));

    if (dateIdx !== -1) finalDateIdx = dateIdx;
    if (recipientIdx !== -1) finalRecipientIdx = recipientIdx;
    if (amountIdx !== -1) finalAmountIdx = amountIdx;
    if (categoryIdx !== -1) finalCategoryIdx = categoryIdx;

    dataRows = rows.slice(1);
  } else {
    dataRows = rows;
  }

  const records: ExpenseRecord[] = [];

  dataRows.forEach((row, index) => {
    if (!row || row.length === 0) return;

    const rawDate = row[finalDateIdx];
    const rawRecipient = row[finalRecipientIdx];
    const rawAmount = row[finalAmountIdx];
    const rawCategory = row[finalCategoryIdx];

    // Skip summary / total row
    const strDate = String(rawDate || '').trim().toLowerCase();
    const strRecipient = String(rawRecipient || '').trim().toLowerCase();
    if (strDate === 'total' || strRecipient === 'total') return;

    // If both recipient and amount are missing or empty, skip row
    if (!rawRecipient && (rawAmount === undefined || rawAmount === '')) return;

    const date = parseExpenseDate(rawDate) || '2026-09-01';
    const recipient = String(rawRecipient || 'Lainnya').trim();
    const amount = parseExpenseAmount(rawAmount);
    const category = toTitleCase(String(rawCategory || 'Lain-Lain').trim()) || 'Lain-Lain';

    records.push({
      id: `exp-${index + 1}-${date}-${recipient.replace(/\s+/g, '-').slice(0, 10)}`,
      sourceRow: hasHeaderKeywords ? index + 2 : index + 1,
      date,
      displayDate: formatExpenseDisplayDate(date),
      recipient,
      amount,
      category
    });
  });

  return records;
}

/**
 * Calculate KPI summary statistics
 */
export function calculateExpenseStats(expenses: ExpenseRecord[]): ExpenseStats {
  if (expenses.length === 0) {
    return {
      totalAmount: 0,
      transactionCount: 0,
      dailyAverage: 0,
      avgTransaction: 0,
      topCategory: { name: '-', amount: 0, percentage: 0 },
      topRecipient: { name: '-', amount: 0, count: 0 },
      largestTransaction: { recipient: '-', amount: 0, category: '-', date: '-' }
    };
  }

  let totalAmount = 0;
  const categoryTotals: Record<string, number> = {};
  const recipientTotals: Record<string, { total: number; count: number }> = {};
  const dateSet = new Set<string>();

  let largestTransaction = expenses[0];

  expenses.forEach(item => {
    totalAmount += item.amount;
    dateSet.add(item.date);

    categoryTotals[item.category] = (categoryTotals[item.category] || 0) + item.amount;

    if (!recipientTotals[item.recipient]) {
      recipientTotals[item.recipient] = { total: 0, count: 0 };
    }
    recipientTotals[item.recipient].total += item.amount;
    recipientTotals[item.recipient].count += 1;

    if (item.amount > largestTransaction.amount) {
      largestTransaction = item;
    }
  });

  // Top category
  let topCatName = '-';
  let topCatAmount = 0;
  Object.entries(categoryTotals).forEach(([name, amount]) => {
    if (amount > topCatAmount) {
      topCatAmount = amount;
      topCatName = name;
    }
  });

  // Top recipient
  let topRecName = '-';
  let topRecAmount = 0;
  let topRecCount = 0;
  Object.entries(recipientTotals).forEach(([name, val]) => {
    if (val.total > topRecAmount) {
      topRecAmount = val.total;
      topRecName = name;
      topRecCount = val.count;
    }
  });

  const uniqueDays = Math.max(1, dateSet.size);

  return {
    totalAmount,
    transactionCount: expenses.length,
    dailyAverage: Math.round(totalAmount / uniqueDays),
    avgTransaction: Math.round(totalAmount / expenses.length),
    topCategory: {
      name: topCatName,
      amount: topCatAmount,
      percentage: totalAmount > 0 ? (topCatAmount / totalAmount) * 100 : 0
    },
    topRecipient: {
      name: topRecName,
      amount: topRecAmount,
      count: topRecCount
    },
    largestTransaction: {
      recipient: largestTransaction.recipient,
      amount: largestTransaction.amount,
      category: largestTransaction.category,
      date: largestTransaction.date
    }
  };
}

/**
 * Calculate category breakdown summary sorted by total amount descending
 */
export function calculateCategorySummaries(expenses: ExpenseRecord[]): ExpenseCategorySummary[] {
  const totals: Record<string, { total: number; count: number }> = {};
  let grandTotal = 0;

  expenses.forEach(exp => {
    grandTotal += exp.amount;
    if (!totals[exp.category]) {
      totals[exp.category] = { total: 0, count: 0 };
    }
    totals[exp.category].total += exp.amount;
    totals[exp.category].count += 1;
  });

  return Object.entries(totals)
    .map(([category, val], index) => {
      const percentage = grandTotal > 0 ? (val.total / grandTotal) * 100 : 0;
      return {
        category,
        totalAmount: val.total,
        percentage,
        count: val.count,
        avgAmount: val.count > 0 ? Math.round(val.total / val.count) : 0,
        color: getCategoryColor(category, index)
      };
    })
    .sort((a, b) => b.totalAmount - a.totalAmount);
}

/**
 * Calculate daily trends grouped by date
 */
export function calculateDailyTrends(expenses: ExpenseRecord[]): ExpenseDailyTrend[] {
  const dayMap: Record<string, ExpenseDailyTrend> = {};

  expenses.forEach(exp => {
    if (!dayMap[exp.date]) {
      dayMap[exp.date] = {
        date: exp.date,
        displayDate: formatExpenseDisplayDate(exp.date),
        totalAmount: 0,
        count: 0
      };
    }
    dayMap[exp.date].totalAmount += exp.amount;
    dayMap[exp.date].count += 1;
    dayMap[exp.date][exp.category] = (dayMap[exp.date][exp.category] || 0) + exp.amount;
  });

  return Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Calculate top recipients summary
 */
export function calculateRecipientSummaries(expenses: ExpenseRecord[], topCount = 10): ExpenseRecipientSummary[] {
  const map: Record<string, { total: number; count: number; categoryCount: Record<string, number> }> = {};

  expenses.forEach(exp => {
    if (!map[exp.recipient]) {
      map[exp.recipient] = { total: 0, count: 0, categoryCount: {} };
    }
    map[exp.recipient].total += exp.amount;
    map[exp.recipient].count += 1;
    map[exp.recipient].categoryCount[exp.category] = (map[exp.recipient].categoryCount[exp.category] || 0) + 1;
  });

  return Object.entries(map)
    .map(([recipient, val]) => {
      // Find main category for this recipient
      let mainCat = 'Lain-Lain';
      let maxCount = -1;
      Object.entries(val.categoryCount).forEach(([cat, cnt]) => {
        if (cnt > maxCount) {
          maxCount = cnt;
          mainCat = cat;
        }
      });

      return {
        recipient,
        totalAmount: val.total,
        count: val.count,
        mainCategory: mainCat
      };
    })
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, topCount);
}

/**
 * Format Month-Year string (e.g. "2026-09" or "9/2026") into Indonesian text (e.g. "September 2026")
 */
export function formatMonthYear(monthStr: string): string {
  if (!monthStr) return '';
  let year = '';
  let month = '';
  if (monthStr.includes('-')) {
    const parts = monthStr.split('-');
    year = parts[0];
    month = parts[1];
  } else if (monthStr.includes('/')) {
    const parts = monthStr.split('/');
    month = parts[0].padStart(2, '0');
    year = parts[1].length === 2 ? `20${parts[1]}` : parts[1];
  }
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const mIdx = parseInt(month, 10) - 1;
  if (mIdx >= 0 && mIdx < 12) {
    return `${monthNames[mIdx]} ${year}`;
  }
  return monthStr;
}

/**
 * Parse raw 2D array from Google Sheets "Pemasukan" tab into IncomeRecord[]
 */
export function parseGoogleSheetsIncomeData(rows: unknown[][]): IncomeRecord[] {
  if (!rows || rows.length === 0) return [];

  // Check if first row is header
  const firstRow = rows[0] || [];
  const isHeader = firstRow.some(cell => {
    const s = String(cell || '').trim().toLowerCase();
    return s.includes('tanggal') || s.includes('date') || s.includes('platform') || s.includes('pemasukan') || s.includes('amount');
  });

  const dataRows = isHeader ? rows.slice(1) : rows;
  const records: IncomeRecord[] = [];

  dataRows.forEach((row, i) => {
    if (!row || row.length === 0) return;
    const rawDate = row[0];
    const rawSource = row[1];
    const rawAmount = row[2];

    const dateStr = String(rawDate || '').trim();
    if (!dateStr || /^total/i.test(dateStr)) return;

    const parsedDate = parseExpenseDate(rawDate);
    if (!parsedDate) return;

    const amount = parseExpenseAmount(rawAmount);
    if (amount <= 0) return;

    const source = toTitleCase(String(rawSource || 'Lainnya').trim()) || 'Pemasukan Lain';

    records.push({
      id: `income-${i}-${parsedDate}-${amount}`,
      sourceRow: (isHeader ? 2 : 1) + i,
      date: parsedDate,
      displayDate: formatExpenseDisplayDate(parsedDate),
      source,
      amount
    });
  });

  return records;
}

/**
 * Parse raw 2D array from Google Sheets "Profit/Loss" tab into MonthlyProfitLossRecord[]
 */
export function parseGoogleSheetsProfitLossData(rows: unknown[][]): MonthlyProfitLossRecord[] {
  if (!rows || rows.length === 0) return [];

  const records: MonthlyProfitLossRecord[] = [];

  rows.forEach(row => {
    if (!row || row.length < 3) return;
    const rawMonth = String(row[0] || '').trim();
    if (!rawMonth || /^month/i.test(rawMonth) || /^bulan/i.test(rawMonth)) return;

    // e.g. "9/2026" or "2026-09"
    const income = parseExpenseAmount(row[1]);
    const expense = parseExpenseAmount(row[2]);
    const rawNet = row[3] !== undefined ? parseExpenseAmount(row[3]) : (income - expense);
    const netProfitLoss = rawNet !== 0 ? rawNet : (income - expense);
    const margin = income > 0 ? (netProfitLoss / income) * 100 : 0;
    const status: 'profit' | 'loss' | 'balanced' = netProfitLoss > 0 ? 'profit' : netProfitLoss < 0 ? 'loss' : 'balanced';

    // Normalize month key to "YYYY-MM" if possible
    let monthKey = rawMonth;
    if (rawMonth.includes('/')) {
      const parts = rawMonth.split('/');
      const m = parts[0].padStart(2, '0');
      const y = parts[1].length === 2 ? `20${parts[1]}` : parts[1];
      monthKey = `${y}-${m}`;
    }

    records.push({
      month: monthKey,
      displayMonth: formatMonthYear(rawMonth),
      income,
      expense,
      netProfitLoss,
      margin,
      status
    });
  });

  return records;
}

/**
 * Calculate Income stats (totals, averages, top source)
 */
export function calculateIncomeStats(incomes: IncomeRecord[]): IncomeStats {
  if (incomes.length === 0) {
    return {
      totalAmount: 0,
      transactionCount: 0,
      dailyAverage: 0,
      avgTransaction: 0,
      topSource: { name: '-', amount: 0, percentage: 0 },
      largestTransaction: { source: '-', amount: 0, date: '-' }
    };
  }

  let totalAmount = 0;
  const sourceTotals: Record<string, number> = {};
  const uniqueDates = new Set<string>();
  let largest = incomes[0];

  incomes.forEach(inc => {
    totalAmount += inc.amount;
    sourceTotals[inc.source] = (sourceTotals[inc.source] || 0) + inc.amount;
    uniqueDates.add(inc.date);
    if (inc.amount > largest.amount) {
      largest = inc;
    }
  });

  let topSourceName = '-';
  let topSourceAmount = 0;
  Object.entries(sourceTotals).forEach(([src, amt]) => {
    if (amt > topSourceAmount) {
      topSourceAmount = amt;
      topSourceName = src;
    }
  });

  const daysCount = uniqueDates.size || 1;

  return {
    totalAmount,
    transactionCount: incomes.length,
    dailyAverage: Math.round(totalAmount / daysCount),
    avgTransaction: Math.round(totalAmount / incomes.length),
    topSource: {
      name: topSourceName,
      amount: topSourceAmount,
      percentage: totalAmount > 0 ? Math.round((topSourceAmount / totalAmount) * 1000) / 10 : 0
    },
    largestTransaction: {
      source: largest.source,
      amount: largest.amount,
      date: largest.displayDate
    }
  };
}

/**
 * Calculate overall Profit & Loss Overview
 */
export function calculateProfitLossOverview(incomes: IncomeRecord[], expenses: ExpenseRecord[]): ProfitLossOverview {
  const totalIncome = incomes.reduce((sum, i) => sum + i.amount, 0);
  const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfitLoss = totalIncome - totalExpense;
  const profitMargin = totalIncome > 0 ? (netProfitLoss / totalIncome) * 100 : 0;
  const expenseToIncomeRatio = totalIncome > 0 ? (totalExpense / totalIncome) * 100 : 0;

  return {
    totalIncome,
    totalExpense,
    netProfitLoss,
    profitMargin: Math.round(profitMargin * 10) / 10,
    expenseToIncomeRatio: Math.round(expenseToIncomeRatio * 10) / 10,
    incomeCount: incomes.length,
    expenseCount: expenses.length,
    status: netProfitLoss > 0 ? 'profit' : netProfitLoss < 0 ? 'loss' : 'balanced'
  };
}

/**
 * Calculate daily profit & loss comparison trends
 */
export function calculateDailyProfitLossTrends(incomes: IncomeRecord[], expenses: ExpenseRecord[]): DailyProfitLossTrend[] {
  const dateMap: Record<string, { income: number; expense: number }> = {};

  incomes.forEach(inc => {
    if (!dateMap[inc.date]) {
      dateMap[inc.date] = { income: 0, expense: 0 };
    }
    dateMap[inc.date].income += inc.amount;
  });

  expenses.forEach(exp => {
    if (!dateMap[exp.date]) {
      dateMap[exp.date] = { income: 0, expense: 0 };
    }
    dateMap[exp.date].expense += exp.amount;
  });

  const sortedDates = Object.keys(dateMap).sort();
  let runningNet = 0;

  return sortedDates.map(date => {
    const { income, expense } = dateMap[date];
    const netProfitLoss = income - expense;
    runningNet += netProfitLoss;

    return {
      date,
      displayDate: formatExpenseDisplayDate(date),
      income,
      expense,
      netProfitLoss,
      cumulativeNet: runningNet
    };
  });
}

/**
 * Calculate Monthly Profit Loss summaries, merging computed aggregates with any sheet values
 */
export function calculateMonthlyProfitLoss(
  incomes: IncomeRecord[], 
  expenses: ExpenseRecord[], 
  sheetSummary?: MonthlyProfitLossRecord[]
): MonthlyProfitLossRecord[] {
  const monthMap: Record<string, { income: number; expense: number }> = {};

  incomes.forEach(inc => {
    const m = inc.date.substring(0, 7); // YYYY-MM
    if (!monthMap[m]) monthMap[m] = { income: 0, expense: 0 };
    monthMap[m].income += inc.amount;
  });

  expenses.forEach(exp => {
    const m = exp.date.substring(0, 7);
    if (!monthMap[m]) monthMap[m] = { income: 0, expense: 0 };
    monthMap[m].expense += exp.amount;
  });

  // If sheetSummary provides months not in computed or overrides
  const result: MonthlyProfitLossRecord[] = [];
  const allMonths = Array.from(new Set([
    ...Object.keys(monthMap),
    ...(sheetSummary || []).map(s => s.month)
  ])).sort();

  allMonths.forEach(m => {
    const computed = monthMap[m] || { income: 0, expense: 0 };
    const sheetItem = sheetSummary?.find(s => s.month === m);

    // Prefer computed if it has values, otherwise sheetItem
    const income = computed.income > 0 ? computed.income : (sheetItem?.income || 0);
    const expense = computed.expense > 0 ? computed.expense : (sheetItem?.expense || 0);
    const netProfitLoss = income - expense;
    const margin = income > 0 ? (netProfitLoss / income) * 100 : 0;
    const status: 'profit' | 'loss' | 'balanced' = netProfitLoss > 0 ? 'profit' : netProfitLoss < 0 ? 'loss' : 'balanced';

    result.push({
      month: m,
      displayMonth: sheetItem?.displayMonth || formatMonthYear(m),
      income,
      expense,
      netProfitLoss,
      margin: Math.round(margin * 10) / 10,
      status
    });
  });

  return result;
}
