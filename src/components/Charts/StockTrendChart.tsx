import React, { useState, useMemo } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    ReferenceLine
} from 'recharts';
import {
    ArrowLeftRight,
    TrendingUp,
    TrendingDown,
    Minus,
    Table as TableIcon,
    ChevronDown,
    ChevronUp,
    Sparkles
} from 'lucide-react';
import { formatShortDate, formatFullDate } from '../../utils/dateUtils';

export interface TrendDataPoint {
    date: string;
    prevDate?: string;
    total?: number;
    prevTotal?: number;
    S?: number;
    M?: number;
    L?: number;
    XL?: number;
    XXL?: number;
    prev_S?: number;
    prev_M?: number;
    prev_L?: number;
    prev_XL?: number;
    prev_XXL?: number;
    [key: string]: string | number | undefined;
}

interface StockTrendChartProps {
    data: TrendDataPoint[];
    sizes: string[];
    metric: 'Stock' | 'Sales';
    onMetricChange: (metric: 'Stock' | 'Sales') => void;
    minStock?: number;
    totalAggregate?: number;
    selectedProduct?: string;
    selectedSize?: string;
}

interface TooltipPayloadEntry {
    name: string;
    value: number | string;
    color: string;
    dataKey?: string;
    payload?: TrendDataPoint;
}

interface TooltipProps {
    active?: boolean;
    payload?: TooltipPayloadEntry[];
    label?: string;
}

interface ComparisonTooltipProps {
    active?: boolean;
    payload?: TooltipPayloadEntry[];
    sizes: string[];
}

const StandardTooltip = ({ active, payload, label }: TooltipProps) => {
    if (active && payload && payload.length) {
        // Sort payload to ensure "Total Sales" is at the bottom
        const sortedPayload = [...payload].sort((a, b) => {
            if (a.name === 'Total Sales') return 1;
            if (b.name === 'Total Sales') return -1;

            // Define size order
            const sizeOrder = ['S', 'M', 'L', 'XL', 'XXL'];
            const aIndex = sizeOrder.indexOf(a.name);
            const bIndex = sizeOrder.indexOf(b.name);

            if (aIndex !== -1 && bIndex !== -1) {
                return aIndex - bIndex;
            }
            return 0;
        });

        return (
            <div className="bg-[#0f172a] border border-[#334155] p-3 rounded-lg shadow-xl">
                <p className="text-[#f1f5f9] text-sm font-bold mb-2">
                    {label ? new Date(label).toLocaleDateString('id-ID', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                </p>
                <div className="flex flex-col gap-1">
                    {sortedPayload.map((entry, index) => (
                        <div key={index} className="flex items-center justify-between gap-4 tooltip-item-bg">
                            <span style={{ color: entry.color, fontSize: '12px', fontWeight: 'bold' }}>
                                {entry.name} :
                            </span>
                            <span className="text-white text-sm font-bold number-stroke">
                                {Number(entry.value).toLocaleString('id-ID')} pcs
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    return null;
};

const ComparisonTooltip = ({ active, payload, sizes }: ComparisonTooltipProps) => {
    if (active && payload && payload.length) {
        const item = payload[0]?.payload;
        if (!item) return null;

        const currentTotal = item.total ?? 0;
        const prevTotal = item.prevTotal ?? 0;
        const diff = currentTotal - prevTotal;
        const pctChange = prevTotal > 0 ? (diff / prevTotal) * 100 : (currentTotal > 0 ? 100 : 0);

        return (
            <div className="bg-[#0f172a] border border-[#334155] p-3.5 rounded-xl shadow-2xl min-w-[280px] max-w-[340px] text-xs">
                {/* Header: Date Comparison */}
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#334155]">
                    <div className="flex flex-col">
                        <span className="text-xs text-[#38bdf8] uppercase font-bold tracking-wider">Periode Ini</span>
                        <span className="text-white font-bold text-xs">{formatFullDate(item.date)}</span>
                    </div>
                    <div className="text-center px-1.5 py-0.5 rounded bg-[#1e293b] border border-[#334155]">
                        <span className="text-[#94a3b8] text-xs font-bold">vs</span>
                    </div>
                    <div className="flex flex-col text-right">
                        <span className="text-xs text-[#94a3b8] uppercase font-bold tracking-wider">1 Bulan Lalu</span>
                        <span className="text-[#cbd5e1] font-bold text-xs">{formatFullDate(item.prevDate)}</span>
                    </div>
                </div>

                {/* Total Comparison Box */}
                <div className="bg-[#1e293b]/70 p-2.5 rounded-lg border border-[#334155]/60 mb-2.5 flex items-center justify-between">
                    <div>
                        <div className="text-xs text-[#94a3b8] uppercase font-semibold">Total Penjualan</div>
                        <div className="flex items-baseline gap-2 mt-0.5">
                            <span className="text-base font-extrabold text-[#38bdf8]">{currentTotal.toLocaleString('id-ID')} pcs</span>
                            <span className="text-xs text-[#cbd5e1] font-mono">({prevTotal.toLocaleString('id-ID')} pcs)</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-xs text-[#94a3b8] uppercase font-semibold">Pertumbuhan</div>
                        <div className={`text-xs font-extrabold mt-0.5 flex items-center justify-end gap-1 ${
                            diff > 0 ? 'text-[#10b981]' : diff < 0 ? 'text-[#ef4444]' : 'text-[#94a3b8]'
                        }`}>
                            {diff > 0 ? <TrendingUp className="w-3 h-3" /> : diff < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                            <span>{diff > 0 ? `+${diff.toLocaleString('id-ID')}` : diff.toLocaleString('id-ID')} ({diff > 0 ? '+' : ''}{pctChange.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%)</span>
                        </div>
                    </div>
                </div>

                {/* Size breakdown if 'All' sizes selected */}
                {sizes.length > 1 && (
                    <div className="space-y-1">
                        <div className="text-xs uppercase font-bold text-[#94a3b8] tracking-wider mb-1 flex justify-between">
                            <span>Ukuran</span>
                            <span className="text-right">Bulan Ini (Bln Lalu) [Selisih]</span>
                        </div>
                        {['S', 'M', 'L', 'XL', 'XXL'].map(s => {
                            const cur = Number(item[s] ?? 0);
                            const prev = Number(item[`prev_${s}`] ?? 0);
                            const sDiff = cur - prev;
                            return (
                                <div key={s} className="flex items-center justify-between py-0.5 px-1.5 rounded hover:bg-[#1e293b]/50">
                                    <span className="font-bold text-[#cbd5e1]">{s}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[#38bdf8] font-mono font-semibold">{cur}</span>
                                        <span className="text-[#94a3b8] text-xs font-mono">({prev})</span>
                                        <span className={`text-xs font-mono font-bold w-12 text-right ${
                                            sDiff > 0 ? 'text-[#10b981]' : sDiff < 0 ? 'text-[#ef4444]' : 'text-[#64748b]'
                                        }`}>
                                            {sDiff > 0 ? `+${sDiff}` : sDiff}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    }
    return null;
};

const StockTrendChart: React.FC<StockTrendChartProps> = ({
    data,
    sizes,
    metric,
    onMetricChange,
    minStock,
    totalAggregate,
    selectedProduct = 'All',
    selectedSize = 'All'
}) => {
    const colors = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444"];
    const [hiddenSizes, setHiddenSizes] = useState<Record<string, boolean>>({});
    const [compareLastMonth, setCompareLastMonth] = useState(false);
    const [showDayToDayTable, setShowDayToDayTable] = useState(false);
    const [displayMode, setDisplayMode] = useState<'total' | 'breakdown'>('total');

    const handleLegendClick = (e: any) => {
        if (!e?.dataKey) return;
        const key = String(e.dataKey);
        setHiddenSizes(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    // Calculate Summary Statistics for Day-to-Day comparison
    const summaryStats = useMemo(() => {
        if (!data || data.length === 0) return null;
        let currentTotal = 0;
        let prevTotal = 0;
        let betterDays = 0;
        let worseDays = 0;
        let equalDays = 0;
        let peakCurrent = { date: '', value: 0 };
        let peakPrev = { date: '', value: 0 };

        data.forEach((d: TrendDataPoint) => {
            const curVal = d.total ?? 0;
            const pVal = d.prevTotal ?? 0;
            currentTotal += curVal;
            prevTotal += pVal;

            if (curVal > pVal) betterDays++;
            else if (curVal < pVal) worseDays++;
            else equalDays++;

            if (curVal > peakCurrent.value) {
                peakCurrent = { date: d.date, value: curVal };
            }
            if (pVal > peakPrev.value) {
                peakPrev = { date: d.prevDate || d.date, value: pVal };
            }
        });

        const diff = currentTotal - prevTotal;
        const pctChange = prevTotal > 0 ? (diff / prevTotal) * 100 : (currentTotal > 0 ? 100 : 0);
        const daysCount = data.length || 1;
        const currentDailyAvg = currentTotal / daysCount;
        const prevDailyAvg = prevTotal / daysCount;
        const winRate = Math.round((betterDays / daysCount) * 100);

        return {
            currentTotal,
            prevTotal,
            diff,
            pctChange,
            currentDailyAvg,
            prevDailyAvg,
            betterDays,
            worseDays,
            equalDays,
            daysCount,
            winRate,
            peakCurrent,
            peakPrev
        };
    }, [data]);

    const isComparing = compareLastMonth && metric === 'Sales';

    return (
        <div className="card chart-full" style={{ minHeight: '440px', height: 'auto' }}>
            {/* Header Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <div>
                    {isComparing ? (
                        <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-white text-sm font-bold uppercase tracking-wider">
                                    Perbandingan Penjualan MoM (Day-to-Day)
                                </h3>
                                <span className="px-2 py-0.5 rounded text-xs font-extrabold uppercase bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30 flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]"></span>
                                    Bulan Ini vs 1 Bulan Lalu
                                </span>
                            </div>
                            <p className="text-xs text-[#94a3b8]">
                                Membandingkan penjualan harian terhadap tanggal yang sama di bulan sebelumnya
                                {selectedProduct !== 'All' ? ` • ${selectedProduct}` : ' • Semua Produk'}
                                {selectedSize !== 'All' ? ` (Size ${selectedSize})` : ''}
                            </p>
                        </div>
                    ) : (
                        <h3 className="text-[#64748b] text-[0.8rem] font-bold uppercase tracking-[0.1em]">
                            {metric} Trends
                        </h3>
                    )}
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                    {/* Toggle Button for 1-Month-Ago Comparison */}
                    <button
                        type="button"
                        onClick={() => {
                            if (metric !== 'Sales') {
                                onMetricChange('Sales');
                                setCompareLastMonth(true);
                            } else {
                                setCompareLastMonth(prev => !prev);
                            }
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 border ${
                            isComparing
                                ? 'bg-[#10b981]/15 border-[#10b981]/50 text-[#10b981]'
                                : 'bg-[#1e293b] border-[#334155] text-[#94a3b8] hover:text-[#f1f5f9] hover:border-[#475569]'
                        }`}
                        title="Bandingkan penjualan periode ini dengan 1 bulan yang lalu secara day-to-day"
                    >
                        <ArrowLeftRight className={`w-3.5 h-3.5 ${isComparing ? 'text-[#10b981]' : 'text-[#94a3b8]'}`} />
                        <span>{isComparing ? 'Bandingkan: Aktif' : 'vs 1 Bulan Lalu'}</span>
                    </button>

                    {/* Stock vs Sales toggle */}
                    <div className="segmented-control">
                        <button
                            onClick={() => onMetricChange('Stock')}
                            className={`segmented-button ${metric === 'Stock' ? 'active' : ''}`}
                        >
                            Stock
                        </button>
                        <button
                            onClick={() => onMetricChange('Sales')}
                            className={`segmented-button ${metric === 'Sales' ? 'active' : ''}`}
                        >
                            Sales
                        </button>
                    </div>
                </div>
            </div>

            {/* Comparison Summary KPI Banner */}
            {isComparing && summaryStats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5 p-3.5 bg-[#0f172a]/70 rounded-xl border border-[#334155]/60 animate-in fade-in duration-200">
                    {/* 1. Bulan Ini Total */}
                    <div className="flex flex-col gap-1 p-2.5 rounded-lg bg-[#1e293b]/60 border border-[#334155]/40">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-[#38bdf8] uppercase font-bold tracking-wider">Total Bulan Ini</span>
                            <span className="w-2 h-2 rounded-full bg-[#38bdf8]"></span>
                        </div>
                        <div className="text-xl font-extrabold text-white">
                            {summaryStats.currentTotal.toLocaleString('id-ID')}{' '}
                            <span className="text-xs font-normal text-[#94a3b8]">pcs</span>
                        </div>
                        <span className="text-xs text-[#94a3b8]">
                            Rata-rata: <strong className="text-white">{summaryStats.currentDailyAvg.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</strong> pcs/hari
                        </span>
                    </div>

                    {/* 2. 1 Bulan Lalu Total */}
                    <div className="flex flex-col gap-1 p-2.5 rounded-lg bg-[#1e293b]/60 border border-[#334155]/40">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-[#94a3b8] uppercase font-bold tracking-wider">Total 1 Bulan Lalu</span>
                            <span className="w-2 h-2 rounded-full bg-[#94a3b8]"></span>
                        </div>
                        <div className="text-xl font-extrabold text-[#cbd5e1]">
                            {summaryStats.prevTotal.toLocaleString('id-ID')}{' '}
                            <span className="text-xs font-normal text-[#94a3b8]">pcs</span>
                        </div>
                        <span className="text-xs text-[#94a3b8]">
                            Rata-rata: <strong className="text-[#cbd5e1]">{summaryStats.prevDailyAvg.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</strong> pcs/hari
                        </span>
                    </div>

                    {/* 3. Pertumbuhan (MoM) */}
                    <div className="flex flex-col gap-1 p-2.5 rounded-lg bg-[#1e293b]/60 border border-[#334155]/40">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-[#94a3b8] uppercase font-bold tracking-wider">Pertumbuhan (MoM)</span>
                            {summaryStats.diff >= 0 ? (
                                <TrendingUp className="w-3.5 h-3.5 text-[#10b981]" />
                            ) : (
                                <TrendingDown className="w-3.5 h-3.5 text-[#ef4444]" />
                            )}
                        </div>
                        <div className={`text-xl font-extrabold ${summaryStats.diff >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                            {summaryStats.diff >= 0 ? `+${summaryStats.diff.toLocaleString('id-ID')}` : summaryStats.diff.toLocaleString('id-ID')}{' '}
                            <span className="text-xs font-normal">pcs</span>
                        </div>
                        <span className={`text-xs font-bold ${summaryStats.diff >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                            {summaryStats.diff >= 0 ? '+' : ''}{summaryStats.pctChange.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}% vs bln lalu
                        </span>
                    </div>

                    {/* 4. Konsistensi Harian */}
                    <div className="flex flex-col gap-1 p-2.5 rounded-lg bg-[#1e293b]/60 border border-[#334155]/40">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-[#94a3b8] uppercase font-bold tracking-wider">Performa Harian</span>
                            <Sparkles className="w-3.5 h-3.5 text-[#94a3b8]" />
                        </div>
                        <div className="text-xl font-extrabold text-white">
                            {summaryStats.betterDays}{' '}
                            <span className="text-xs font-normal text-[#94a3b8]">/ {summaryStats.daysCount} hari</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-full bg-[#334155] rounded-full h-1.5 overflow-hidden">
                                <div
                                    className="bg-[#10b981] h-1.5 rounded-full transition-all duration-500"
                                    style={{ width: `${summaryStats.winRate}%` }}
                                ></div>
                            </div>
                            <span className="text-xs font-bold text-[#10b981] whitespace-nowrap">{summaryStats.winRate}%</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Keep aggregate totals separate from the per-size lines. */}
            {(isComparing || sizes.length > 1) && (
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                        {sizes.length > 1 && (
                            <div className="flex items-center gap-1.5 text-xs">
                                <span className="text-[#94a3b8] font-medium text-xs">Tampilan Garis:</span>
                                <div className="segmented-control">
                                    <button
                                        onClick={() => setDisplayMode('total')}
                                        className={`segmented-button ${displayMode === 'total' ? 'active' : ''}`}
                                    >
                                        Total Saja
                                    </button>
                                    <button
                                        onClick={() => setDisplayMode('breakdown')}
                                        className={`segmented-button ${displayMode === 'breakdown' ? 'active' : ''}`}
                                    >
                                        Per Ukuran
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {isComparing && <button
                        type="button"
                        onClick={() => setShowDayToDayTable(!showDayToDayTable)}
                        className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 bg-[#1e293b] hover:bg-[#334155] border border-[#334155] rounded-lg text-[#94a3b8] hover:text-[#f8fafc] transition-all ml-auto"
                    >
                        <TableIcon className="w-3.5 h-3.5 text-[#94a3b8]" />
                        <span>{showDayToDayTable ? 'Tutup Tabel Day-to-Day' : 'Lihat Tabel Day-to-Day'}</span>
                        {showDayToDayTable ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>}
                </div>
            )}

            {/* Recharts Chart Area */}
            <div style={{ height: '350px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                        <XAxis
                            dataKey="date"
                            stroke="#64748b"
                            fontSize={12}
                            minTickGap={40}
                            interval={Math.max(0, Math.ceil(data.length / 9) - 1)}
                            tickFormatter={(str) => formatShortDate(str)}
                        />
                        <YAxis stroke="#64748b" fontSize={12} tickFormatter={(value) => Number(value).toLocaleString('id-ID')} />
                        <Tooltip
                            content={
                                isComparing ? (
                                    <ComparisonTooltip sizes={sizes} />
                                ) : (
                                    <StandardTooltip />
                                )
                            }
                        />
                        <Legend iconType="circle" onClick={handleLegendClick} />

                        {minStock !== undefined && metric === 'Stock' && (
                            <ReferenceLine
                                y={minStock}
                                stroke="#ef4444"
                                strokeDasharray="3 3"
                                label={{
                                    value: `Min Stock: ${minStock}`,
                                    position: 'right',
                                    fill: '#ef4444',
                                    fontSize: 12,
                                    fontWeight: 'bold'
                                }}
                            />
                        )}

                        {/* Rendering for Comparison Mode */}
                        {isComparing ? (
                            <>
                                {/* 1. Primary Line: Total Bulan Ini */}
                                {(displayMode === 'total' || sizes.length === 1) && <Line
                                    type="monotone"
                                    dataKey="total"
                                    name={sizes.length === 1 ? `${sizes[0]} (Bulan Ini)` : "Total Sales (Bulan Ini)"}
                                    stroke="#38bdf8"
                                    strokeWidth={3}
                                    dot={false}
                                    activeDot={{ r: 4 }}
                                    connectNulls={true}
                                    hide={!!hiddenSizes['total']}
                                />}

                                {/* 2. Comparison Benchmark Line: 1 Bulan Lalu */}
                                {(displayMode === 'total' || sizes.length === 1) && <Line
                                    type="monotone"
                                    dataKey="prevTotal"
                                    name={sizes.length === 1 ? `${sizes[0]} (1 Bulan Lalu)` : "Total Sales (1 Bulan Lalu)"}
                                    stroke="#f59e0b"
                                    strokeWidth={2.5}
                                    strokeDasharray="5 5"
                                    dot={false}
                                    activeDot={{ r: 4 }}
                                    connectNulls={true}
                                    hide={!!hiddenSizes['prevTotal']}
                                />}

                                {/* 3. Breakdown size lines if requested */}
                                {sizes.length > 1 && displayMode === 'breakdown' && (
                                    <>
                                        {sizes.map((size, index) => (
                                            <Line
                                                key={size}
                                                type="monotone"
                                                dataKey={size}
                                                name={`${size} (Bulan Ini)`}
                                                stroke={colors[index % colors.length]}
                                                strokeWidth={2}
                                                dot={false}
                                                activeDot={{ r: 4 }}
                                                connectNulls={false}
                                                hide={!!hiddenSizes[size]}
                                            />
                                        ))}
                                        {sizes.map((size, index) => (
                                            <Line
                                                key={`prev_${size}`}
                                                type="monotone"
                                                dataKey={`prev_${size}`}
                                                name={`${size} (Bulan Lalu)`}
                                                stroke={colors[index % colors.length]}
                                                strokeWidth={1.5}
                                                strokeDasharray="3 3"
                                                dot={false}
                                                activeDot={{ r: 4 }}
                                                opacity={0.7}
                                                connectNulls={false}
                                                hide={!!hiddenSizes[`prev_${size}`]}
                                            />
                                        ))}
                                    </>
                                )}
                            </>
                        ) : (
                            /* Standard Mode Rendering */
                            <>
                                {(displayMode === 'breakdown' || sizes.length === 1) && sizes.map((size, index) => (
                                    <Line
                                        key={size}
                                        type="monotone"
                                        dataKey={size}
                                        stroke={colors[index % colors.length]}
                                        strokeWidth={2}
                                        dot={false}
                                        activeDot={{ r: 4 }}
                                        connectNulls={false}
                                        hide={!!hiddenSizes[size]}
                                    />
                                ))}
                                {displayMode === 'total' && data.length > 0 && 'total' in data[0] && sizes.length > 1 && (
                                    <Line
                                        type="monotone"
                                        dataKey="total"
                                        name={`Total ${metric}`}
                                        stroke="var(--text-primary)"
                                        strokeWidth={3}
                                        strokeDasharray="5 5"
                                        dot={false}
                                        activeDot={{ r: 4 }}
                                        connectNulls={true}
                                        opacity={0.8}
                                        hide={!!hiddenSizes['total']}
                                    />
                                )}
                            </>
                        )}
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Total Period Aggregate footer (when not in comparison mode) */}
            {!isComparing && totalAggregate !== undefined && (
                <div className="mt-4 pt-4 border-t border-[#334155] flex justify-between items-center transition-all duration-300">
                    <span className="text-[#94a3b8] text-xs font-bold uppercase tracking-wider">Total {metric} for Period</span>
                    <span className="text-xl font-bold number-stroke">
                        {totalAggregate.toLocaleString('id-ID')} pcs
                    </span>
                </div>
            )}

            {/* Expandable Day-to-Day Comparison Table */}
            {isComparing && showDayToDayTable && (
                <div className="mt-4 pt-4 border-t border-[#334155]/60 animate-in fade-in duration-200">
                    <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-2">
                            <TableIcon className="w-4 h-4 text-[#94a3b8]" />
                            <h4 className="text-xs font-bold uppercase tracking-wider text-[#f1f5f9]">
                                Rincian Penjualan Harian (Day-to-Day)
                            </h4>
                        </div>
                        <span className="text-xs text-[#94a3b8] font-mono">{data.length} hari perbandingan</span>
                    </div>

                    <div className="overflow-x-auto max-h-80 overflow-y-auto rounded-lg border border-[#334155]/80 bg-[#0f172a]/50">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead className="sticky top-0 bg-[#1e293b] text-[#94a3b8] uppercase font-bold tracking-wider z-10">
                                <tr className="border-b border-[#334155]">
                                    <th className="py-2.5 px-3">Tanggal (Bulan Ini)</th>
                                    <th className="py-2.5 px-3">Tanggal (1 Bln Lalu)</th>
                                    <th className="py-2.5 px-3 text-right">Penjualan Bulan Ini</th>
                                    <th className="py-2.5 px-3 text-right">Penjualan 1 Bln Lalu</th>
                                    <th className="py-2.5 px-3 text-right">Selisih</th>
                                    <th className="py-2.5 px-3 text-right">Pertumbuhan</th>
                                    <th className="py-2.5 px-3 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#334155]/40 text-[#f1f5f9]">
                                {data.map((row: TrendDataPoint, idx: number) => {
                                    const cur = row.total ?? 0;
                                    const prev = row.prevTotal ?? 0;
                                    const diff = cur - prev;
                                    const pct = prev > 0 ? (diff / prev) * 100 : (cur > 0 ? 100 : 0);

                                    return (
                                        <tr key={idx} className="hover:bg-[#1e293b]/60 transition-colors">
                                            <td className="py-2 px-3 font-mono font-medium text-white">
                                                {formatFullDate(row.date)}
                                            </td>
                                            <td className="py-2 px-3 font-mono text-[#94a3b8]">
                                                {formatFullDate(row.prevDate)}
                                            </td>
                                            <td className="py-2 px-3 text-right font-mono font-bold text-[#38bdf8]">
                                                {cur.toLocaleString('id-ID')}
                                            </td>
                                            <td className="py-2 px-3 text-right font-mono text-amber-300">
                                                {prev.toLocaleString('id-ID')}
                                            </td>
                                            <td className={`py-2 px-3 text-right font-mono font-bold ${
                                                diff > 0 ? 'text-[#10b981]' : diff < 0 ? 'text-[#ef4444]' : 'text-[#64748b]'
                                            }`}>
                                                {diff > 0 ? `+${diff.toLocaleString('id-ID')}` : diff.toLocaleString('id-ID')}
                                            </td>
                                            <td className={`py-2 px-3 text-right font-mono ${
                                                diff > 0 ? 'text-[#10b981]' : diff < 0 ? 'text-[#ef4444]' : 'text-[#64748b]'
                                            }`}>
                                                {diff > 0 ? '+' : ''}{pct.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
                                            </td>
                                            <td className="py-2 px-3 text-center">
                                                {diff > 0 ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30">
                                                        <TrendingUp className="w-2.5 h-2.5" /> Naik
                                                    </span>
                                                ) : diff < 0 ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-[#ef4444]/15 text-[#ef4444] border border-[#ef4444]/30">
                                                        <TrendingDown className="w-2.5 h-2.5" /> Turun
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-[#64748b]/15 text-[#94a3b8] border border-[#64748b]/30">
                                                        <Minus className="w-2.5 h-2.5" /> Sama
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            {summaryStats && (
                                <tfoot className="sticky bottom-0 bg-[#1e293b] font-bold border-t-2 border-[#334155] text-white">
                                    <tr>
                                        <td className="py-2.5 px-3 uppercase tracking-wider text-xs">Total Periode</td>
                                        <td className="py-2.5 px-3 text-[#94a3b8]">-</td>
                                        <td className="py-2.5 px-3 text-right font-mono text-[#38bdf8] text-sm">
                                            {summaryStats.currentTotal.toLocaleString('id-ID')}
                                        </td>
                                        <td className="py-2.5 px-3 text-right font-mono text-amber-300 text-sm">
                                            {summaryStats.prevTotal.toLocaleString('id-ID')}
                                        </td>
                                        <td className={`py-2.5 px-3 text-right font-mono text-sm ${
                                            summaryStats.diff > 0 ? 'text-[#10b981]' : summaryStats.diff < 0 ? 'text-[#ef4444]' : 'text-[#64748b]'
                                        }`}>
                                            {summaryStats.diff > 0 ? `+${summaryStats.diff.toLocaleString('id-ID')}` : summaryStats.diff.toLocaleString('id-ID')}
                                        </td>
                                        <td className={`py-2.5 px-3 text-right font-mono text-sm ${
                                            summaryStats.diff > 0 ? 'text-[#10b981]' : summaryStats.diff < 0 ? 'text-[#ef4444]' : 'text-[#64748b]'
                                        }`}>
                                            {summaryStats.diff > 0 ? '+' : ''}{summaryStats.pctChange.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
                                        </td>
                                        <td className="py-2.5 px-3 text-center">
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                                                summaryStats.diff >= 0 ? 'bg-[#10b981]/20 text-[#10b981]' : 'bg-[#ef4444]/20 text-[#ef4444]'
                                            }`}>
                                                {summaryStats.diff >= 0 ? '🟢 Naik' : '🔴 Turun'}
                                            </span>
                                        </td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StockTrendChart;
