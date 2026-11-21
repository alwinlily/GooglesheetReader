import assert from 'node:assert/strict';
import type { InventoryRecord, Size } from '../src/types/inventory';
import { buildSizePriorities } from '../src/utils/sizePriorities.ts';

const row = (size: Size, stock: number | null, date = '2026-11-20', product = 'Kaos', validStock = true): InventoryRecord => ({
  date, product, size, stock, validStock, in: 0, out: 0, isReturn: false,
});
const options = { today: '2026-11-21' };
let checks = 0;
function check(name: string, run: () => void) { run(); checks++; console.log(`ok: ${name}`); }
check('zero and positive siblings produce exact counts, unknown sizes stay unknown', () => {
  const [result] = buildSizePriorities([row('S', 0), row('M', 17), row('L', 4)], options);
  assert.equal(result.isPriority, true);
  assert.deepEqual(result.outSizes, ['S']);
  assert.deepEqual(result.availableSizes, ['M', 'L']);
  assert.equal(result.availableUnits, 21);
  assert.equal(result.unknownCount, 2);
  assert.equal(result.sizes[3].stock, null);
});
check('equal positive and all-zero stocks are not priorities', () => {
  for (const value of [0, 10]) assert.equal(buildSizePriorities([row('S', value), row('M', value)], options)[0].isPriority, false);
});
check('unequal positive stocks do not invent low-stock thresholds', () => {
  assert.equal(buildSizePriorities([row('S', 1), row('M', 500)], options)[0].isPriority, false);
});
check('unknown, invalid, fractional, negative and nonfinite are never zero', () => {
  for (const stock of [null, -1, 0.5, NaN, Infinity]) {
    const [result] = buildSizePriorities([row('S', stock), row('M', 7)], options);
    assert.equal(result.isPriority, false);
    assert.equal(result.sizes[0].stock, null);
  }
  assert.equal(buildSizePriorities([row('S', 0, undefined, undefined, false), row('M', 7)], options)[0].isPriority, false);
});
check('future rows cannot override the latest nonfuture snapshot', () => {
  const [result] = buildSizePriorities([row('S', 0), row('M', 9), row('S', 100, '2026-11-22')], options);
  assert.equal(result.snapshotDate, '2026-11-20');
  assert.equal(result.isPriority, true);
});
check('no mixing dates or carrying older zero/positive counts forward', () => {
  const [result] = buildSizePriorities([row('S', 0), row('M', 9), row('M', 8, '2026-11-21')], options);
  assert.equal(result.isPriority, false);
  assert.equal(result.sizes[0].stock, null);
});
check('latest unknown snapshot does not resurrect an old issue', () => {
  const [result] = buildSizePriorities([row('S', 0), row('M', 9), row('S', null, '2026-11-21'), row('M', null, '2026-11-21')], options);
  assert.equal(result.isPriority, false);
  assert.equal(result.unknownCount, 5);
});
check('date range and end date cap snapshots without including earlier observations', () => {
  const data = [row('S', 0), row('M', 9), row('S', 6, '2026-11-21')];
  assert.equal(buildSizePriorities(data, { ...options, endDate: '2026-11-20' })[0].isPriority, true);
  assert.equal(buildSizePriorities(data, { ...options, startDate: '2026-11-21' })[0].isPriority, false);
  assert.deepEqual(buildSizePriorities(data, { ...options, startDate: '2026-11-22' }), []);
});
check('size filter targets depleted size while preserving sibling context', () => {
  const data = [row('S', 0), row('M', 9)];
  const [selected] = buildSizePriorities(data, { ...options, selectedSize: 'S' });
  assert.equal(selected.isPriority, true);
  assert.equal(selected.sizes[1].stock, 9);
  assert.equal(buildSizePriorities(data, { ...options, selectedSize: 'M' })[0].isPriority, false);
});
check('products never borrow sibling stock from a different product', () => {
  const data = [row('S', 0), row('M', 9, undefined, 'Other')];
  assert.equal(buildSizePriorities(data, options).some(result => result.isPriority), false);
  assert.deepEqual(buildSizePriorities(data, { ...options, selectedProduct: 'Other' }).map(result => result.product), ['Other']);
});
check('identical duplicates do not sum; conflicting duplicate values are unknown', () => {
  assert.equal(buildSizePriorities([row('S', 0), row('M', 9), row('M', 9)], options)[0].availableUnits, 9);
  const [result] = buildSizePriorities([row('S', 0), row('S', 2), row('M', 9)], options);
  assert.equal(result.isPriority, false);
  assert.equal(result.sizes[0].reason, 'conflict');
  assert.equal(buildSizePriorities([row('S', 0), row('S', null), row('M', 9)], options)[0].isPriority, false);
});
check('invalid calendar dates and invalid filters are rejected', () => {
  assert.deepEqual(buildSizePriorities([row('S', 0, '2026-02-30')], options), []);
  assert.deepEqual(buildSizePriorities([row('S', 0)], { ...options, endDate: 'bad' }), []);
  assert.deepEqual(buildSizePriorities([row('S', 0)], { today: 'bad' }), []);
  assert.deepEqual(buildSizePriorities([row('S', 0)], { ...options, startDate: '2026-11-21', endDate: '2026-11-20' }), []);
});
check('sorting puts confirmed priorities first; input stays unchanged', () => {
  const data = [row('M', 9, undefined, 'A'), row('S', 0, undefined, 'Z'), row('M', 9, undefined, 'Z')];
  const before = JSON.stringify(data);
  assert.equal(buildSizePriorities(data, options)[0].product, 'Z');
  assert.equal(JSON.stringify(data), before);
});
check('empty or entirely future inventory has no observations', () => {
  assert.deepEqual(buildSizePriorities([], options), []);
  assert.deepEqual(buildSizePriorities([row('S', 0, '2026-11-22')], options), []);
});
console.log(`${checks} size-priority checks passed`);
