import { useId } from 'react';
import type { InventoryMismatch } from '../../utils/inventoryValidation';

interface InventoryMismatchDetailsProps {
    product: string;
    size: string;
    mismatches: readonly InventoryMismatch[];
}

/** Native disclosure keeps each item keyboard-accessible without a modal/focus trap. */
export default function InventoryMismatchDetails({ product, size, mismatches }: InventoryMismatchDetailsProps) {
    const descriptionId = useId();
    const itemMismatches = mismatches
        .filter(mismatch => mismatch.product === product && mismatch.size === size)
        .sort((a, b) => b.date.localeCompare(a.date));

    if (itemMismatches.length === 0) return null;

    return (
        <details className="mt-2 max-w-sm text-left text-xs font-normal whitespace-normal">
            <summary
                className="min-h-10 cursor-pointer rounded-lg border border-[#f59e0b]/40 bg-[#f59e0b]/10 px-3 py-2 text-[#fbbf24] font-semibold hover:bg-[#f59e0b]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fbbf24]"
                aria-label={`Cek stok dulu: ${product} (${size}), ${itemMismatches.length} selisih`}
                aria-describedby={descriptionId}
            >
                Cek stok dulu ({itemMismatches.length.toLocaleString('id-ID')})
            </summary>
            <div className="mt-2 rounded-lg border border-[#334155] bg-[#0f172a] p-3 text-[#cbd5e1]">
                <p className="font-semibold text-white">Selisih stok: {product} ({size})</p>
                <p id={descriptionId} className="mt-1 leading-relaxed text-[#94a3b8]">
                    Stok awal tercatat berbeda dari hasil stok awal sebelumnya + masuk − keluar.
                    Selisih = tercatat − seharusnya. Periksa data sebelum memesan; rekomendasi order tetap ditampilkan.
                </p>
                <ul className="mt-3 max-h-64 overflow-y-auto space-y-3" aria-label={`Riwayat selisih ${product} (${size})`}>
                    {itemMismatches.map((mismatch, index) => {
                        const delta = mismatch.actual - mismatch.expected;
                        return (
                            <li key={`${mismatch.date}-${index}`} className="border-t border-[#334155]/60 pt-2">
                                <time dateTime={mismatch.date} className="font-semibold text-white">{mismatch.date}</time>
                                <dl className="mt-1 space-y-1 font-numeric">
                                    <div className="flex justify-between gap-3"><dt>Seharusnya</dt><dd>{mismatch.expected.toLocaleString('id-ID')} pcs</dd></div>
                                    <div className="flex justify-between gap-3"><dt>Tercatat</dt><dd>{mismatch.actual.toLocaleString('id-ID')} pcs</dd></div>
                                    <div className="flex justify-between gap-3 text-[#fbbf24]"><dt>Selisih (tercatat − seharusnya)</dt><dd>{delta > 0 ? '+' : ''}{delta.toLocaleString('id-ID')} pcs</dd></div>
                                </dl>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </details>
    );
}
