import { CalendarCheck2, Clock3, Database, RefreshCw } from 'lucide-react';
import type { InventorySource } from '../../utils/inventoryFreshness';
import { formatInventorySyncTime, formatInventoryTransactionDate } from '../../utils/inventoryFreshness';

export interface DataFreshnessProps {
    lastSyncedAt: string | null;
    latestTransactionDate: string | null;
    source: InventorySource;
    loading: boolean;
    error: string | null;
    onRefresh?: () => void;
}

/** Inventory-only status, always outside date/product filters. Timestamps are explicit WIB. */
export default function DataFreshness({
    lastSyncedAt, latestTransactionDate, source, loading, error, onRefresh,
}: DataFreshnessProps) {
    const label = loading ? 'Menyinkronkan…'
        : error ? 'Sinkron gagal'
        : source === 'mock' ? 'Data demo'
        : source === 'cached' ? 'Data tersimpan'
        : source === 'live' ? 'Terhubung ke Sheets' : 'Belum tersinkron';
    const tone = error || source === 'cached' || source === 'mock'
        ? 'border-amber-400/25 bg-amber-400/10 text-amber-200'
        : 'border-slate-600 bg-slate-800 text-slate-200';
    const explanation = error
        ? (source === 'none' ? 'Data inventori belum tersedia. Coba sinkronkan lagi.'
            : 'Menampilkan data sebelumnya; percobaan gagal tidak memperbarui waktu sinkron.')
        : source === 'mock' ? 'Contoh inventori, bukan hasil sinkron Google Sheets.'
        : source === 'cached' ? 'Respons cache atau data sebelumnya; bukan sinkron baru.'
        : 'Transaksi = In/Out bukan nol, termasuk retur; baris kosong, stok bawaan, dan tanggal mendatang diabaikan.';

    return (
        <section aria-label="Kesegaran data inventori" className="rounded-2xl border border-slate-700/80 bg-slate-900/60 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5">
                    <Database aria-hidden="true" className="h-4 w-4 text-sky-300" />
                    <h2 className="text-xs font-semibold text-slate-200">Status data inventori</h2>
                    <span role="status" aria-live="polite" aria-atomic="true" className={`rounded-full border px-2 py-0.5 text-xs font-medium ${tone}`}>{label}</span>
                </div>
                {onRefresh && (
                    <button type="button" onClick={onRefresh} disabled={loading}
                        className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-xs font-semibold text-sky-200 transition-colors hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 disabled:cursor-wait disabled:opacity-60"
                        aria-label="Sinkronkan ulang data inventori">
                        <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />
                        {loading ? 'Menyinkronkan' : 'Sinkron ulang'}
                    </button>
                )}
            </div>
            <dl className="mt-2 grid gap-3 text-xs sm:grid-cols-2">
                <div className="flex items-start gap-2">
                    <Clock3 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    <div>
                        <dt className="text-slate-400">Sinkron terakhir berhasil</dt>
                        <dd className="mt-1 font-medium tabular-nums text-slate-100">
                            {lastSyncedAt ? <time dateTime={lastSyncedAt}>{formatInventorySyncTime(lastSyncedAt)}</time> : 'Belum ada sinkron berhasil'}
                        </dd>
                    </div>
                </div>
                <div className="flex items-start gap-2">
                    <CalendarCheck2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    <div>
                        <dt className="text-slate-400">Transaksi inventori terakhir{source === 'mock' ? ' (demo)' : ''}</dt>
                        <dd className="mt-1 font-medium tabular-nums text-slate-100">
                            {latestTransactionDate ? <time dateTime={latestTransactionDate}>{formatInventoryTransactionDate(latestTransactionDate)}</time> : 'Belum ada transaksi aktual'}
                        </dd>
                    </div>
                </div>
            </dl>
            <p className="mt-3 text-xs leading-relaxed text-slate-400">{explanation} Waktu sinkron bukan waktu edit sheet. Cakupan: seluruh inventori brand aktif.</p>
        </section>
    );
}
