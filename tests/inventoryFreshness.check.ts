import assert from 'node:assert/strict';
import type { InventoryRecord } from '../src/types/inventory';
import {
    INITIAL_INVENTORY_SYNC, getLatestInventoryTransactionDate, getWibDateKey,
    updateInventorySync, isCachedInventoryResponse, formatInventorySyncTime, formatInventoryTransactionDate,
} from '../src/utils/inventoryFreshness.ts';

const row = (date: string, incoming = 0, outgoing = 0, stock: number | null = 100): InventoryRecord => ({
    date, product: 'Shirt', size: 'M', in: incoming, out: outgoing, stock, validStock: true, isReturn: false,
});
const beforeMidnight = new Date('2026-11-21T16:59:59Z');
const midnight = new Date('2026-11-21T17:00:00Z');
assert.equal(getWibDateKey(beforeMidnight), '2026-11-21');
assert.equal(getWibDateKey(midnight), '2026-11-22');
const records = [
    row('2026-11-19', 0, 5), row('2026-11-20', 2),
    row('2026-11-21'), // a repeated stock balance is not a transaction
    row('2026-11-22', 0, 7), // future even though present in the sheet
    row('2026-11-23', 999), row('2026-11-21', NaN, Infinity),
    row('2026-11-31', 8), row('2026-02-30', 1), row('2026-1-01', 1),
];
assert.equal(getLatestInventoryTransactionDate(records, beforeMidnight), '2026-11-20');
assert.equal(getLatestInventoryTransactionDate(records, midnight), '2026-11-22');
assert.equal(getLatestInventoryTransactionDate([], midnight), null);
assert.equal(getLatestInventoryTransactionDate([row('2026-11-21', 0, 0, 0)], midnight), null);
assert.equal(getLatestInventoryTransactionDate([row('2026-11-21', 0, 0, null)], midnight), null);
assert.equal(getLatestInventoryTransactionDate([row('2026-11-21', -1)], midnight), '2026-11-21');
assert.equal(getLatestInventoryTransactionDate([{ ...row('2026-11-21', 1), isReturn: true }], midnight), '2026-11-21');

const synced = updateInventorySync(INITIAL_INVENTORY_SYNC, 'live', beforeMidnight);
assert.deepEqual(synced, { lastSyncedAt: beforeMidnight.toISOString(), source: 'live' });
for (const outcome of ['mock', 'cached', 'failure'] as const) {
    assert.equal(updateInventorySync(synced, outcome, midnight).lastSyncedAt, synced.lastSyncedAt);
    assert.equal(updateInventorySync(INITIAL_INVENTORY_SYNC, outcome, midnight).lastSyncedAt, null);
}
assert.equal(updateInventorySync(synced, 'failure', midnight).source, 'cached');
assert.equal(updateInventorySync(INITIAL_INVENTORY_SYNC, 'failure', midnight).source, 'none');
assert.equal(updateInventorySync(synced, 'live', midnight).lastSyncedAt, midnight.toISOString());
assert.equal(isCachedInventoryResponse(new Headers()), false);
assert.equal(isCachedInventoryResponse(new Headers({ age: '0', 'x-cache': 'MISS' })), false);
assert.equal(isCachedInventoryResponse(new Headers({ age: '30' })), true);
assert.equal(isCachedInventoryResponse(new Headers({ 'x-cache': 'HIT from intermediary' })), true);
assert.equal(isCachedInventoryResponse(new Headers({ 'cf-cache-status': 'HIT' })), true);
assert.match(formatInventorySyncTime(midnight.toISOString()), /22 Nov 2026.*00[.:]00[.:]00 WIB/);
assert.equal(formatInventoryTransactionDate('2026-11-21'), '21 Nov 2026 WIB');
console.log('inventory freshness checks passed (movement, WIB midnight, invalid/future dates, cache/failure/demo clocks)');
