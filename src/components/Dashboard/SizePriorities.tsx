import { useId, useMemo, useState } from 'react';
import { ArrowUpRight, ChevronDown, Layers3, Search, SlidersHorizontal } from 'lucide-react';
import type { InventoryRecord, Size } from '../../types/inventory';
import { buildSizePriorities, localInventoryDate } from '../../utils/sizePriorities';

export interface SizePrioritiesProps {
  /** Pass full brand inventory, NOT size-filtered data: sibling sizes are evidence. */
  data: readonly InventoryRecord[];
  selectedProduct?: string;
  selectedSize?: Size | 'All';
  startDate?: string;
  endDate?: string;
  today?: string;
  loading?: boolean;
  onNavigateToOrder?: (product: string, size?: string) => void;
  id?: string;
}

const count = (value: number) => value.toLocaleString('id-ID');
const dateLabel = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString('id-ID', {
  day: 'numeric', month: 'short', year: 'numeric',
});
const focus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-300';

/** Independent, filter-aware size comparison. No demand forecasts or assumed thresholds. */
export default function SizePriorities({
  data, selectedProduct = 'All', selectedSize = 'All', startDate = '', endDate = '',
  today, loading = false, onNavigateToOrder, id = 'prioritas-ukuran',
}: SizePrioritiesProps) {
  const uid = useId();
  const [view, setView] = useState<'priority' | 'all'>('priority');
  const [query, setQuery] = useState('');
  const cutoff = today ?? localInventoryDate();
  const rows = useMemo(() => buildSizePriorities(data, {
    selectedProduct, selectedSize, startDate, endDate, today: cutoff,
  }), [data, selectedProduct, selectedSize, startDate, endDate, cutoff]);
  const priorities = rows.filter(row => row.isPriority);
  const visible = rows.filter(row => (view === 'all' || row.isPriority)
    && row.product.toLocaleLowerCase('id').includes(query.trim().toLocaleLowerCase('id')));
  const unknown = rows.filter(row => row.unknownCount > 0).length;

  return (
    <section id={id} tabIndex={-1} aria-labelledby={`${uid}-title`} aria-busy={loading}
      className={`min-w-0 scroll-mt-6 overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 text-slate-100 shadow-xl shadow-black/10 ${focus}`}>
      <header className="border-b border-slate-700 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-900 p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1 basis-60">
            <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-sky-300">
              <Layers3 size={16} aria-hidden="true" /> Keseimbangan stok
            </p>
            <h2 id={`${uid}-title`} className="text-lg font-semibold tracking-tight sm:text-xl">Prioritas ukuran</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
              Ukuran habis, sementara ukuran lain dari produk yang sama masih tersedia. Angka aktual, bukan perkiraan kebutuhan.
            </p>
          </div>
          <div className="rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3">
            <p className="text-2xl font-bold tabular-nums text-rose-200">{loading ? '—' : count(priorities.length)}</p>
            <p className="text-xs text-rose-100">produk perlu perhatian</p>
          </div>
        </div>
        <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-slate-300">
          <SlidersHorizontal size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span className="min-w-0 break-words">
            {selectedProduct === 'All' ? 'Semua produk' : selectedProduct} · {selectedSize === 'All' ? 'Semua ukuran' : `Prioritas ukuran ${selectedSize}`}
            {' · '}{startDate ? dateLabel(startDate) : 'Awal data'} – {dateLabel(endDate && endDate < cutoff ? endDate : cutoff)}.
            {' '}Snapshot terakhir per produk dalam rentang; semua ukuran dibandingkan pada tanggal yang sama.
            {selectedSize !== 'All' && ' Ukuran lain tetap ditampilkan sebagai pembanding.'}
          </span>
        </p>
      </header>

      <div className="flex flex-col gap-3 border-b border-slate-700 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1 rounded-xl bg-slate-950/60 p-1" role="group" aria-label="Tampilan prioritas ukuran">
          {([{ value: 'priority', label: `Prioritas (${count(priorities.length)})` }, { value: 'all', label: `Semua (${count(rows.length)})` }] as const).map(option => (
            <button key={option.value} type="button" aria-pressed={view === option.value} onClick={() => setView(option.value)}
              className={`min-h-11 rounded-lg px-3 text-sm font-semibold transition-colors ${focus} ${view === option.value ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-800'}`}>
              {option.label}
            </button>
          ))}
        </div>
        <label className="flex min-h-11 min-w-0 items-center gap-2 rounded-lg border border-slate-600 bg-slate-950/50 px-3 sm:w-64">
          <Search size={16} className="shrink-0 text-slate-400" aria-hidden="true" />
          <span className="sr-only">Cari produk dalam prioritas ukuran</span>
          <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Cari produk…"
            className={`min-h-11 w-full min-w-0 bg-transparent text-sm text-white placeholder:text-slate-400 ${focus}`} />
        </label>
      </div>

      <div className="p-4 sm:p-6">
        <p role="status" className="mb-3 text-xs text-slate-300">
          {loading ? 'Memuat snapshot stok…' : `${count(visible.length)} produk ditampilkan${unknown ? ` · ${count(unknown)} produk memiliki ukuran dengan data belum diketahui` : ''}.`}
        </p>
        {!loading && visible.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-600 bg-slate-800/30 px-4 py-8 text-center">
            <h3 className="text-sm font-semibold text-slate-100">{query.trim() ? 'Tidak ada produk yang cocok' : rows.length === 0 ? 'Belum ada snapshot dalam filter ini' : 'Tidak ada prioritas terkonfirmasi'}</h3>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-slate-300">
              {query.trim() ? 'Ubah pencarian atau pilih tampilan Semua.' : 'Prioritas hanya muncul jika stok 0 dan ada ukuran lain dengan stok lebih dari 0. Data kosong atau tidak valid tidak dianggap habis.'}
            </p>
            {rows.length > 0 && view === 'priority' && !query.trim() && (
              <button type="button" onClick={() => setView('all')} className={`mt-3 min-h-11 rounded-lg px-4 text-sm font-semibold text-sky-300 hover:bg-slate-800 ${focus}`}>Lihat semua ukuran</button>
            )}
          </div>
        ) : !loading && (
          <div className="space-y-3">
            {visible.map(row => (
              <details key={`${row.product}-${row.snapshotDate}`} className="group min-w-0 rounded-xl border border-slate-700 bg-slate-800/40 open:border-slate-500">
                <summary className={`flex min-h-16 cursor-pointer list-none flex-wrap items-center gap-3 rounded-xl p-4 [&::-webkit-details-marker]:hidden ${focus}`}>
                  <span className="min-w-0 flex-1 basis-40">
                    <span className="block break-words text-sm font-bold text-white">{row.product}</span>
                    <span className="mt-1 block text-xs text-slate-300">Snapshot {dateLabel(row.snapshotDate)}</span>
                  </span>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${row.isPriority ? 'bg-rose-400/15 text-rose-200' : 'bg-slate-700 text-slate-200'}`}>
                    {row.isPriority ? `Habis: ${row.outSizes.join(', ')}` : 'Tidak ada prioritas terkonfirmasi'}
                  </span>
                  <span className="text-xs tabular-nums text-slate-300">{count(row.availableUnits)} pcs tersedia{row.unknownCount ? ' • data parsial' : ''}</span>
                  <ChevronDown size={18} aria-hidden="true" className="shrink-0 text-slate-300 group-open:rotate-180" />
                  <span className="sr-only">Buka atau tutup rincian ukuran</span>
                </summary>
                <div className="border-t border-slate-700 p-4">
                  <dl aria-label="Stok per ukuran dalam pcs" className="flex flex-wrap gap-2">
                    {row.sizes.map(cell => (
                      <div key={cell.size} className={`inline-flex min-h-11 max-w-full items-center gap-2 self-start rounded-lg border px-3 text-sm ${cell.stock === 0 ? 'border-rose-400/50 bg-rose-400/10 text-rose-200' : 'border-slate-700 bg-slate-900/50 text-slate-200'} ${selectedSize === cell.size ? 'ring-2 ring-sky-300' : ''}`}>
                        <dt className="font-semibold">{cell.size}{selectedSize === cell.size && <span className="sr-only"> · ukuran dipilih</span>}</dt>
                        <dd className="flex min-w-0 items-center gap-2 tabular-nums"><span aria-hidden="true">·</span>
                          {cell.stock === 0 ? <strong>Habis</strong> : cell.stock !== null ? <span>{count(cell.stock)}<span className="sr-only"> pcs</span></span> : <span className="text-xs text-slate-300">{cell.reason === 'conflict' ? 'Data bertentangan' : cell.reason === 'invalid' ? 'Data tidak valid' : 'Belum diketahui'}</span>}
                          {row.isPriority && cell.stock === 0 && (selectedSize === 'All' || selectedSize === cell.size) && onNavigateToOrder && (
                            <button type="button" onClick={() => onNavigateToOrder(row.product, cell.size)} aria-label={`Lihat pesanan ${row.product} ukuran ${cell.size}`} title="Lihat pesanan" className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-sky-200 hover:bg-slate-800 ${focus}`}><ArrowUpRight size={16} aria-hidden="true" /></button>
                          )}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <p className="mt-3 text-xs leading-relaxed text-slate-300">
                    {row.isPriority ? `Stok habis pada ${row.outSizes.join(', ')}; ${row.availableSizes.join(', ')} masih tersedia (${count(row.availableUnits)} pcs diketahui).` : 'Tidak ada kombinasi stok habis dan ukuran lain tersedia yang cocok dengan filter ukuran.'}
                    {row.unknownCount > 0 && ' Ukuran tanpa data pasti tidak dihitung sebagai stok habis.'}
                  </p>
                </div>
              </details>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
