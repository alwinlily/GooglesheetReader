import assert from 'node:assert/strict';
import { matchProductAndSize, findActiveOrderForProduct } from '../src/utils/productMatching.ts';
import type { OrderRecord } from '../src/types/order.ts';

// 1. Exact & alias matching tests
assert.equal(matchProductAndSize('Juna hp', 'L', 'Juna L'), true);
assert.equal(matchProductAndSize('Juna hp', 'M', 'Juna L'), false);
assert.equal(matchProductAndSize('Odds hitam', 'XL', 'Odds Black XL'), true);
assert.equal(matchProductAndSize('Odds hitam', 'M', 'Odds Black M'), true);
assert.equal(matchProductAndSize('Odds hitam', 'L', 'Odds Black XL'), false); // size mismatch

assert.equal(matchProductAndSize('Pyton', 'XL', 'Python XL'), true);
assert.equal(matchProductAndSize('Pyton', 'XL', 'Python grey XL'), false); // grey should not match Pyton
assert.equal(matchProductAndSize('Pyton grey', 'XL', 'Python grey XL'), true);

assert.equal(matchProductAndSize('Mtrl Grey', 'XL', 'Special Grey XL'), true);
assert.equal(matchProductAndSize('Mtrl Grey', 'S', 'Special Grey S'), true);
assert.equal(matchProductAndSize('Mtrl Brown', 'M', 'Special Brown M'), true);

assert.equal(matchProductAndSize('Vlntne Blue', 'XXL', 'Valentine Blue XXL'), true);
assert.equal(matchProductAndSize('Juna hihi', 'XXL', 'HIHI XXL'), true);
assert.equal(matchProductAndSize('Juna putih', 'L', 'Juna White L'), true);

// Size in middle tests
assert.equal(matchProductAndSize('SPIDEY WHITE', 'S', 'Spidey S White'), true);
assert.equal(matchProductAndSize('SPIDEY BLACK', 'XL', 'Spidey XL Black'), true);

// 2. Active orders test
const mockOrders: OrderRecord[] = [
  {
    dateOrder: '2026-11-05',
    konveksi: 'Indra',
    brand: 'Rucas',
    item: 'Odds Black L',
    quantity: 30,
    dateReceived: null,
    in: 0,
    reject: 0,
    selisih: -30,
    totalIn: 0,
    status: 'In Production',
  },
  {
    dateOrder: '2026-11-07',
    konveksi: 'Fahmi',
    brand: 'Rucas',
    item: 'Juna L',
    quantity: 30,
    dateReceived: null,
    in: 0,
    reject: 0,
    selisih: -30,
    totalIn: 0,
    status: 'In Production',
  },
  {
    dateOrder: '2026-05-26',
    konveksi: 'Anton',
    brand: 'Rucas',
    item: 'Special Grey XL',
    quantity: 30,
    dateReceived: '2026-08-08',
    in: 22,
    reject: 0,
    selisih: -8,
    totalIn: 22,
    status: 'Shortage', // Not 'In Production'
  },
];

// Test active order found
const junaMatch = findActiveOrderForProduct('Juna hp', 'L', mockOrders);
assert.equal(junaMatch.isOnOrder, true);
assert.equal(junaMatch.totalOrderedQty, 30);
assert.equal(junaMatch.latestVendor, 'Fahmi');
assert.equal(junaMatch.latestOrderDate, '2026-11-07');

const oddsMatch = findActiveOrderForProduct('Odds hitam', 'L', mockOrders);
assert.equal(oddsMatch.isOnOrder, true);
assert.equal(oddsMatch.totalOrderedQty, 30);
assert.equal(oddsMatch.latestVendor, 'Indra');

// Test completed / shortage order is NOT considered actively on order
const mtrlMatch = findActiveOrderForProduct('Mtrl Grey', 'XL', mockOrders);
assert.equal(mtrlMatch.isOnOrder, false);
assert.equal(mtrlMatch.totalOrderedQty, 0);

// Test non-ordered item
const pytonMatch = findActiveOrderForProduct('Pyton', 'S', mockOrders);
assert.equal(pytonMatch.isOnOrder, false);
assert.equal(pytonMatch.totalOrderedQty, 0);

console.log('product matching checks passed');

