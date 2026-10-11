import assert from "node:assert/strict";
import { parseGoogleSheetsOrderData } from "../src/utils/orderParser.ts";

const headers = [
    "Date Order",
    "Konveksi",
    "Brand",
    "Item",
    "Quantity",
    "Date Received",
    "In",
    "Reject",
    "Selisih",
    "Total In",
];

const duplicate = ["10/01/26", " Anton ", " Rucas ", "Rockstar S", "10", "12/01/26", "10", "0", "0", "10"];
const rows = [
    headers,
    ["31/12/25", " Anton ", " Rucas ", "Alpha S", "10", "2026-01-02", "10", "0", "0", "10"],
    ["2026-01-09", "Juju", "Marapthon", "Beta M", "8", "11/01/26", "8", "0", "0", "8"],
    ["", "Anton", " Rucas ", "Missing Date 1", "", "06/01/26", "6", "1", "6", "5"],
    ["0", "Anton", "Rucas", "Missing Date 2", "12", "", "12", "0", "0", "12"],
    ["", "Subtotal", "Rucas", "", "999", "", "999", "0", "0", "999"],
    ["", "", "", "", "", "", "", "", "", ""],
    ["31/02/26", "Anton", "Rucas", "Missing Date 3", "3", "31/02/26", "3", "0", "0", "3"],
    ["", "Anton", "Rucas", "Missing Date 4", "5", "", "5", "0", "0", "5"],
    ["", "Anton", "Rucas", "Missing Date 5", "3", "", "3", "0", "0", "3"],
    duplicate,
    [...duplicate],
];

const orders = parseGoogleSheetsOrderData(rows);

assert.equal(orders.length, 9);
assert.deepEqual(
    orders.map(order => order.sourceRow),
    [2, 3, 4, 5, 8, 9, 10, 11, 12],
);

assert.deepEqual(
    orders.slice(0, 2).map(order => [order.dateOrder, order.dateReceived]),
    [
        ["2025-12-31", "2026-01-02"],
        ["2026-01-09", "2026-01-11"],
    ],
);

const missingDateRows = orders.filter(order => order.item.startsWith("Missing Date"));
assert.equal(missingDateRows.length, 5);
assert.deepEqual(missingDateRows.map(order => order.dateOrder), ["", "", "", "", ""]);
assert.deepEqual(missingDateRows.map(order => order.in), [6, 12, 3, 5, 3]);
assert.equal(missingDateRows[2].dateReceived, null);

assert.deepEqual({
    brand: missingDateRows[0].brand,
    quantity: missingDateRows[0].quantity,
    dateReceived: missingDateRows[0].dateReceived,
    in: missingDateRows[0].in,
    reject: missingDateRows[0].reject,
    selisih: missingDateRows[0].selisih,
    totalIn: missingDateRows[0].totalIn,
}, {
    brand: "Rucas",
    quantity: 0,
    dateReceived: "2026-01-06",
    in: 6,
    reject: 1,
    selisih: 6,
    totalIn: 5,
});

const rockstarRows = orders.filter(order => order.item === "Rockstar S");
assert.equal(rockstarRows.length, 2);
assert.deepEqual(rockstarRows.map(order => order.sourceRow), [11, 12]);

console.log("order parser checks passed");
