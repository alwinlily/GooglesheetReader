import assert from 'node:assert/strict';
import { 
  parseGoogleSheetsExpenseData, 
  parseExpenseDate, 
  parseExpenseAmount,
  calculateExpenseStats,
  calculateCategorySummaries,
  calculateDailyTrends,
  formatRupiah,
  parseGoogleSheetsIncomeData,
  parseGoogleSheetsProfitLossData,
  calculateIncomeStats,
  calculateProfitLossOverview,
  calculateDailyProfitLossTrends,
  formatMonthYear
} from '../src/utils/expenseParser.ts';

// 1. Date parser check
assert.equal(parseExpenseDate('09/01/2026'), '2026-09-01');
assert.equal(parseExpenseDate('09/25/2026'), '2026-09-25');
assert.equal(parseExpenseDate('2026-09-15'), '2026-09-15');
assert.equal(parseExpenseDate('25/09/2026'), '2026-09-25');
assert.equal(parseExpenseDate('01/09'), '2026-09-01');
assert.equal(parseExpenseDate('25/09'), '2026-09-25');
assert.equal(parseExpenseDate('04 S/D 30/09/26'), '2026-09-30');
assert.equal(parseExpenseDate('Total'), null);
assert.equal(parseExpenseDate(null), null);

// 2. Amount parser check
assert.equal(parseExpenseAmount('2000000'), 2000000);
assert.equal(parseExpenseAmount('Rp 2.000.000'), 2000000);
assert.equal(parseExpenseAmount(50000), 50000);
assert.equal(parseExpenseAmount('6500'), 6500);

// 3. Currency format check
assert.equal(formatRupiah(2000000), 'Rp 2.000.000');
assert.equal(formatRupiah(0), 'Rp 0');

// 4. Sample Google Sheets rows parse
const sampleRows = [
  ['Tanggal', 'Penerima', 'Amount', 'Kategori'],
  ['09/01/2026', 'ZAHRA NUR FITRIA', '2000000', 'Honor'],
  ['09/01/2026', 'SEVIRA', '3300000', 'Honor'],
  ['09/02/2026', 'KAIN 6', '48246000', 'Kain'],
  ['09/03/2026', 'FAHMI', '25000', 'Transportasi']
];

const parsed = parseGoogleSheetsExpenseData(sampleRows);
assert.equal(parsed.length, 4);
assert.equal(parsed[0].recipient, 'ZAHRA NUR FITRIA');
assert.equal(parsed[0].amount, 2000000);
assert.equal(parsed[0].date, '2026-09-01');
assert.equal(parsed[0].category, 'Honor');

// 5. Stats calculation
const stats = calculateExpenseStats(parsed);
assert.equal(stats.totalAmount, 53571000);
assert.equal(stats.transactionCount, 4);
assert.equal(stats.topCategory.name, 'Kain');
assert.equal(stats.topRecipient.name, 'KAIN 6');

// 6. Category summaries
const catSummaries = calculateCategorySummaries(parsed);
assert.equal(catSummaries.length, 3);
assert.equal(catSummaries[0].category, 'Kain');
assert.equal(catSummaries[0].totalAmount, 48246000);

// 7. Daily trends
const trends = calculateDailyTrends(parsed);
assert.equal(trends.length, 3);
assert.equal(trends[0].date, '2026-09-01');
assert.equal(trends[0].totalAmount, 5300000);

// 8. Test headerless rows (as in Pengeluaran sheet)
const headerlessRows = [
  ['01/09', 'BIAYA ADM ', '6,500', 'BIAYA BANK'],
  ['01/09', 'BIAYA ADM ', '6,500', 'BIAYA BANK'],
  ['02/09', 'BIAYA ADM BCA', '20,000', 'BIAYA BANK'],
  ['Total', '', '33,000']
];
const parsedHeaderless = parseGoogleSheetsExpenseData(headerlessRows);
assert.equal(parsedHeaderless.length, 3); // 'Total' row skipped
assert.equal(parsedHeaderless[0].recipient, 'BIAYA ADM');
assert.equal(parsedHeaderless[0].amount, 6500);
assert.equal(parsedHeaderless[0].date, '2026-09-01');
assert.equal(parsedHeaderless[0].category, 'Biaya Bank');
assert.equal(parsedHeaderless[2].amount, 20000);

// 9. Income parser check
const sampleIncomeRows = [
  ["1/9/26", "TOKOPEDIA", "18,606,754"],
  ["2/9/26", "TOKOPEDIA", "4,841,597"],
  ["24/9/26", "TOKOPEDIA", "15,000,000", "194,698,351"]
];
const parsedIncomes = parseGoogleSheetsIncomeData(sampleIncomeRows);
assert.equal(parsedIncomes.length, 3);
assert.equal(parsedIncomes[0].date, '2026-09-01');
assert.equal(parsedIncomes[0].source, 'Tokopedia');
assert.equal(parsedIncomes[0].amount, 18606754);
assert.equal(parsedIncomes[2].amount, 15000000);

// 10. Income stats check
const incStats = calculateIncomeStats(parsedIncomes);
assert.equal(incStats.totalAmount, 38448351);
assert.equal(incStats.transactionCount, 3);
assert.equal(incStats.topSource.name, 'Tokopedia');
assert.equal(incStats.largestTransaction.amount, 18606754);

// 11. Profit & Loss parser check
const samplePLRows = [
  [],
  ["Months", "Pemasukan", "Pengeluaran", "Total"],
  ["9/2026", "194,698,351", "213,075,905", "-18,377,554"]
];
const parsedPL = parseGoogleSheetsProfitLossData(samplePLRows);
assert.equal(parsedPL.length, 1);
assert.equal(parsedPL[0].month, '2026-09');
assert.equal(parsedPL[0].displayMonth, 'September 2026');
assert.equal(parsedPL[0].income, 194698351);
assert.equal(parsedPL[0].expense, 213075905);
assert.equal(parsedPL[0].netProfitLoss, -18377554);
assert.equal(parsedPL[0].status, 'loss');

// 12. P&L Overview check
const plOverview = calculateProfitLossOverview(parsedIncomes, parsedHeaderless);
assert.equal(plOverview.totalIncome, 38448351);
assert.equal(plOverview.totalExpense, 33000);
assert.equal(plOverview.netProfitLoss, 38448351 - 33000);
assert.equal(plOverview.status, 'profit');

// 13. Month Year formatting
assert.equal(formatMonthYear('2026-09'), 'September 2026');
assert.equal(formatMonthYear('9/2026'), 'September 2026');

console.log('all expense and income parser checks passed');
