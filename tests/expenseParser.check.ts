import assert from 'node:assert/strict';
import { 
  parseGoogleSheetsExpenseData, 
  parseExpenseDate, 
  parseExpenseAmount,
  calculateExpenseStats,
  calculateCategorySummaries,
  calculateDailyTrends,
  formatRupiah
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

console.log('expense parser checks passed');
