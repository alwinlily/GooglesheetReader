import type { InventoryRecord } from '../types/inventory';

export const INVENTORY_TIME_ZONE = 'Asia/Jakarta';
export type InventorySource = 'none' | 'live' | 'cached' | 'mock';

export interface InventorySyncState {
    /** Timestamp of a completed, uncached Sheets read, not a sheet edit timestamp. */
    lastSyncedAt: string | null;
    source: InventorySource;
}

export const INITIAL_INVENTORY_SYNC: InventorySyncState = { lastSyncedAt: null, source: 'none' };

/** A cached response, mock fallback or failed attempt must never advance the clock. */
export function updateInventorySync(
    previous: InventorySyncState,
    outcome: 'live' | 'cached' | 'mock' | 'failure',
    completedAt: Date,
): InventorySyncState {
    if (outcome === 'live') return { lastSyncedAt: completedAt.toISOString(), source: 'live' };
    if (outcome === 'failure') {
        return { ...previous, source: previous.source === 'live' ? 'cached' : previous.source };
    }
    return { lastSyncedAt: previous.lastSyncedAt, source: outcome };
}

/** Locale-independent calendar key; never uses the viewer's browser timezone. */
export function getWibDateKey(now: Date): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: INVENTORY_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(now);
    const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(p => p.type === type)?.value;
    return `${part('year')}-${part('month')}-${part('day')}`;
}

function isCalendarDate(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/**
 * Actual movement only: a finite, nonzero In or Out (including returns/corrections).
 * Carried-forward stock, zero/blank template rows and future dates are not transactions.
 * Call with the full brand dataset, not the dashboard's date/product filters.
 */
export function getLatestInventoryTransactionDate(records: readonly InventoryRecord[], now: Date): string | null {
    const today = getWibDateKey(now);
    let latest: string | null = null;
    for (const record of records) {
        const hasMovement = (Number.isFinite(record.in) && record.in !== 0)
            || (Number.isFinite(record.out) && record.out !== 0);
        if (hasMovement && isCalendarDate(record.date) && record.date <= today && (!latest || record.date > latest)) {
            latest = record.date;
        }
    }
    return latest;
}

/** no-store is requested too; explicitly marked intermediary cache hits stay labelled cached. */
export function isCachedInventoryResponse(headers: Headers): boolean {
    return Number(headers.get('age')) > 0 || /\bhit\b/i.test(headers.get('x-cache') ?? '')
        || /\bhit\b/i.test(headers.get('cf-cache-status') ?? '');
}

export function formatInventorySyncTime(timestamp: string): string {
    return `${new Intl.DateTimeFormat('id-ID', {
        timeZone: INVENTORY_TIME_ZONE, day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    }).format(new Date(timestamp))} WIB`;
}

export function formatInventoryTransactionDate(date: string): string {
    return `${new Intl.DateTimeFormat('id-ID', {
        timeZone: INVENTORY_TIME_ZONE, day: 'numeric', month: 'short', year: 'numeric',
    }).format(new Date(`${date}T00:00:00+07:00`))} WIB`;
}
