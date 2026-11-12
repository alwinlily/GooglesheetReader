/**
 * Utility functions for date calculations in the dashboard
 */

/**
 * Returns the corresponding date from 1 month ago in YYYY-MM-DD format.
 * Accurately handles month length differences and leap years.
 * e.g., 2026-09-15 -> 2026-08-15
 *       2026-03-31 -> 2026-02-28
 *       2026-01-15 -> 2025-12-15
 */
export function getOneMonthAgoDate(dateStr?: string): string {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return '';

    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10); // 1-12
    const day = parseInt(parts[2], 10); // 1-31

    let prevYear = year;
    let prevMonth = month - 1;
    if (prevMonth === 0) {
        prevMonth = 12;
        prevYear -= 1;
    }

    // Determine the max days in prevMonth of prevYear
    // Date(prevYear, prevMonth, 0) gives the last day of prevMonth
    const maxDaysInPrevMonth = new Date(prevYear, prevMonth, 0).getDate();
    const prevDay = Math.min(day, maxDaysInPrevMonth);

    const pad = (n: number) => String(n).padStart(2, '0');
    return `${prevYear}-${pad(prevMonth)}-${pad(prevDay)}`;
}

/**
 * Formats YYYY-MM-DD to Indonesian short date, e.g. "10 Sep"
 */
export function formatShortDate(dateStr?: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('id-ID', { month: 'short', day: 'numeric' });
}

/**
 * Formats YYYY-MM-DD to Indonesian full date, e.g. "10 Sep 2026"
 */
export function formatFullDate(dateStr?: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Returns today's date in local time as YYYY-MM-DD
 */
export function getTodayDateStr(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
