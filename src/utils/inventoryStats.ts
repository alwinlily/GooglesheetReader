import type { InventoryRecord } from '../types/inventory';

export interface InventoryStats {
    totalStock: number;
    totalIn: number;
    totalOut: number;
    totalReturn: number;
    dailySales: number;
}

export function summarizeInventory(records: InventoryRecord[], start: string, end: string): InventoryStats {
    if (!start || !end || !Number.isFinite(Date.parse(start)) || !Number.isFinite(Date.parse(end)) || start > end) {
        return { totalStock: 0, totalIn: 0, totalReturn: 0, totalOut: 0, dailySales: 0 };
    }
    const stocks = new Map<string, number>();
    let totalIn = 0, totalReturn = 0, totalOut = 0;
    for (const record of [...records].sort((a, b) => a.date.localeCompare(b.date))) {
        if (record.date < start || record.date > end) continue;
        if (record.stock !== null && record.validStock) stocks.set(JSON.stringify([record.product, record.size]), record.stock);
        if (record.isReturn) totalReturn += record.in;
        else totalIn += record.in;
        totalOut += record.out;
    }
    const days = Math.max(1, (Date.parse(end) - Date.parse(start)) / 86400000 + 1);
    return { totalStock: [...stocks.values()].reduce((sum, value) => sum + value, 0), totalIn, totalReturn, totalOut, dailySales: totalOut / days };
}
