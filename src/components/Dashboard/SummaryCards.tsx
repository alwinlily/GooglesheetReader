import type { InventoryStats } from '../../utils/inventoryStats';
interface SummaryCardsProps extends InventoryStats { previous?: InventoryStats | null; }
export default function SummaryCards({ totalStock, totalIn, totalOut, totalReturn, dailySales, previous }: SummaryCardsProps) {
    const cards = [
        { key: 'totalStock', label: 'Total stok', value: totalStock, unit: 'pcs' },
        { key: 'totalIn', label: 'Stok masuk', value: totalIn, unit: 'pcs' },
        { key: 'dailySales', label: 'Penjualan harian', value: dailySales, unit: 'pcs/hari' },
        { key: 'totalOut', label: 'Total penjualan', value: totalOut, unit: 'pcs' },
    ] as const;
    return <section className="summary-grid" aria-label="Ringkasan inventori">
        {cards.map(card => {
            const baseline = previous?.[card.key];
            const change = baseline ? (card.value - baseline) / baseline * 100 : null;
            return <div className="kpi-card" key={card.key}>
                <p className="kpi-label">{card.label}</p>
                <p className="kpi-value">{card.value.toLocaleString('id-ID', { maximumFractionDigits: card.key === 'dailySales' ? 1 : 0 })} <span className="kpi-unit">{card.unit}</span></p>
                <p className="kpi-comparison" title="Dibandingkan dengan rentang tanggal yang digeser satu bulan ke belakang.">
                    {change !== null ? (change > 0 ? '▲ ' : change < 0 ? '▼ ' : '— ') + Math.abs(change).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + '% vs bulan lalu' : 'Pembanding bulan lalu belum tersedia'}
                </p>
                {card.key === 'totalIn' && <p className="kpi-comparison">Retur: {totalReturn.toLocaleString('id-ID')} pcs</p>}
            </div>;
        })}
    </section>;
}
