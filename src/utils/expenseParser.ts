import type { 
  ExpenseRecord, 
  ExpenseCategorySummary, 
  ExpenseDailyTrend, 
  ExpenseRecipientSummary, 
  ExpenseStats 
} from '../types/expense';

export const CATEGORY_COLORS: Record<string, string> = {
  'Kain': '#6366f1', // Indigo
  'Konveksi': '#3b82f6', // Blue
  'Lain-Lain': '#8b5cf6', // Violet
  'Honor': '#a855f7', // Purple
  'Pengemasan': '#f59e0b', // Amber
  'Iklan': '#ec4899', // Pink
  'Paket': '#06b6d4', // Cyan
  'Pulsa': '#10b981', // Emerald
  'Transportasi': '#f97316', // Orange
  'Biaya Bank': '#14b8a6', // Teal
  'Listrik': '#eab308', // Yellow
};

const FALLBACK_PALETTE = [
  '#6366f1', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b',
  '#f97316', '#ef4444', '#ec4899', '#a855f7', '#8b5cf6', '#64748b'
];

export function getCategoryColor(category: string, index = 0): string {
  const trimmed = category.trim();
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
 * Robust date parser supporting MM/DD/YYYY, DD/MM/YYYY, and YYYY-MM-DD
 */
export function parseExpenseDate(rawDate: unknown): string | null {
  if (!rawDate) return null;
  const str = String(rawDate).trim();
  if (!str) return null;

  // Handle standard YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  const parts = str.split(/[/\-.]/).map(p => p.trim());
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
    // Check two parts: parts[0] and parts[1]
    const p0 = parseInt(parts[0], 10);
    const p1 = parseInt(parts[1], 10);
    year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];

    // If p0 > 12, then p0 must be day and p1 month (DD/MM/YYYY)
    // If p1 > 12, then p1 must be day and p0 month (MM/DD/YYYY)
    // In our Google Sheet, format is MM/DD/YYYY (e.g. 09/01/2026 = Sept 1)
    if (p0 > 12 && p1 <= 12) {
      day = parts[0].padStart(2, '0');
      month = parts[1].padStart(2, '0');
    } else {
      // Default to MM/DD/YYYY as seen in Google Sheets
      month = parts[0].padStart(2, '0');
      day = parts[1].padStart(2, '0');
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
  if (!rows || rows.length < 2) return [];

  const headers = rows[0].map(h => String(h || '').trim().toLowerCase());

  // Find column indexes
  const dateIdx = headers.findIndex(h => h.includes('tanggal') || h.includes('date'));
  const recipientIdx = headers.findIndex(h => h.includes('penerima') || h.includes('recipient') || h.includes('vendor') || h.includes('keterangan'));
  const amountIdx = headers.findIndex(h => h.includes('amount') || h.includes('jumlah') || h.includes('biaya') || h.includes('total') || h.includes('nominal'));
  const categoryIdx = headers.findIndex(h => h.includes('kategori') || h.includes('category'));

  // Default fallback column positions if headers slightly differ
  const finalDateIdx = dateIdx !== -1 ? dateIdx : 0;
  const finalRecipientIdx = recipientIdx !== -1 ? recipientIdx : 1;
  const finalAmountIdx = amountIdx !== -1 ? amountIdx : 2;
  const finalCategoryIdx = categoryIdx !== -1 ? categoryIdx : 3;

  const records: ExpenseRecord[] = [];

  rows.slice(1).forEach((row, index) => {
    if (!row || row.length === 0) return;

    const rawDate = row[finalDateIdx];
    const rawRecipient = row[finalRecipientIdx];
    const rawAmount = row[finalAmountIdx];
    const rawCategory = row[finalCategoryIdx];

    // If both recipient and amount are missing or empty, skip row
    if (!rawRecipient && (rawAmount === undefined || rawAmount === '')) return;

    const date = parseExpenseDate(rawDate) || '1970-01-01';
    const recipient = String(rawRecipient || 'Lainnya').trim();
    const amount = parseExpenseAmount(rawAmount);
    const category = String(rawCategory || 'Lain-Lain').trim() || 'Lain-Lain';

    records.push({
      id: `exp-${index + 1}-${date}-${recipient.replace(/\s+/g, '-').slice(0, 10)}`,
      sourceRow: index + 2,
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
