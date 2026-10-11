import type { InventoryRecord } from "../types/inventory";

export interface InventoryMismatch {
    product: string;
    size: string;
    date: string;
    expected: number;
    actual: number;
}

function isValidDate(date: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
    const parsed = new Date(`${date}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}

function isUsable(record: InventoryRecord): boolean {
    return record.validStock
        && Number.isFinite(record.in)
        && Number.isFinite(record.out)
        && (record.stock === null || Number.isFinite(record.stock));
}

export function calculateInventoryMismatches(data: InventoryRecord[]): InventoryMismatch[] {
    const groups = new Map<string, Map<string, Map<string, InventoryRecord[]>>>();

    for (const record of data) {
        if (!record.product.trim() || !record.size || !isValidDate(record.date)) continue;

        let sizes = groups.get(record.product);
        if (!sizes) groups.set(record.product, sizes = new Map());
        let dates = sizes.get(record.size);
        if (!dates) sizes.set(record.size, dates = new Map());
        const records = dates.get(record.date);
        if (records) records.push(record);
        else dates.set(record.date, [record]);
    }

    const mismatches: InventoryMismatch[] = [];

    for (const [product, sizes] of groups) {
        for (const [size, dates] of sizes) {
            let previousDate: string | null = null;
            let expectedOpening: number | null = null;

            for (const date of [...dates.keys()].sort()) {
                const records = dates.get(date)!;
                if (records.some(record => !isUsable(record))) {
                    previousDate = null;
                    expectedOpening = null;
                    continue;
                }
                const unique = new Map(records.map(record => [
                    JSON.stringify([record.stock, record.in, record.out, record.validStock]),
                    record,
                ]));

                // Conflicting rows for one item/date have no provable ordering or balance.
                if (unique.size !== 1) {
                    previousDate = null;
                    expectedOpening = null;
                    continue;
                }

                const record = unique.values().next().value as InventoryRecord;
                if (previousDate !== null && Date.parse(date) - Date.parse(previousDate) !== 86400000) {
                    expectedOpening = null;
                }

                if (record.stock !== null && expectedOpening !== null) {
                    const expected: number = expectedOpening;
                    if (expected !== record.stock) {
                        mismatches.push({ product, size, date, expected, actual: record.stock });
                    }
                }

                const opening: number | null = record.stock ?? expectedOpening;
                expectedOpening = opening === null ? null : opening + record.in - record.out;
                previousDate = date;
            }
        }
    }

    return mismatches;
}
