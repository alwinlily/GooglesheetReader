import assert from "node:assert/strict";
import type { InventoryRecord } from "../src/types/inventory";
import { summarizeInventory } from "../src/utils/inventoryStats.ts";
import { calculateInventoryMismatches } from "../src/utils/inventoryValidation.ts";

const record = (
    date: string,
    stock: number | null,
    incoming = 0,
    outgoing = 0,
    validStock = true,
    isReturn = false,
    product = "Shirt",
): InventoryRecord => ({
    date,
    product,
    size: "M",
    stock,
    in: incoming,
    out: outgoing,
    validStock,
    isReturn,
});

const openingBalanceRows = [
    record("2026-01-01", 10, 0, 1),
    record("2026-01-02", 9, 5, 2),
    record("2026-01-03", null, 0, 1),
    record("2026-01-04", 11),
];
assert.deepEqual(calculateInventoryMismatches(openingBalanceRows), []);

assert.deepEqual(calculateInventoryMismatches([
    record("2026-01-01", 10, 0, 1),
    record("2026-01-02", 8),
]), [{ product: "Shirt", size: "M", date: "2026-01-02", expected: 9, actual: 8 }]);

// A missing calendar date makes the intervening movements unknowable.
assert.deepEqual(calculateInventoryMismatches([
    record("2026-01-01", 10, 0, 1),
    record("2026-01-03", 4),
]), []);

const duplicate = record("2026-02-01", 5, 0, 1);
assert.deepEqual(calculateInventoryMismatches([
    duplicate,
    { ...duplicate },
    record("2026-02-02", 4, 0, 1),
]), []);

assert.deepEqual(calculateInventoryMismatches([
    record("2026-03-01", 10),
    record("2026-03-02", 8),
    record("2026-03-02", 9),
    record("2026-03-03", 7, 0, 1),
    record("2026-03-04", Number.NaN),
    record("2026-03-05", 6, 0, 1),
]), []);

assert.deepEqual(summarizeInventory([
    record("2026-04-01", 20, 4, 3),
    record("2026-04-02", 19, 2, 3),
    record("2026-04-03", 999, 5, 6, false),
    record("2026-04-03", 7, 6, 3, true, true, "Hat"),
], "2026-04-01", "2026-04-03"), {
    totalStock: 26,
    totalIn: 11,
    totalOut: 15,
    totalReturn: 6,
    dailySales: 5,
});

assert.equal(summarizeInventory([], '', '').dailySales, 0);
assert.equal(summarizeInventory([], '2026-04-03', '2026-04-01').dailySales, 0);
console.log("inventory checks passed");
