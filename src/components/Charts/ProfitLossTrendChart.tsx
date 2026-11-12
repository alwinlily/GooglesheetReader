import React, { useState } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { TrendingUp, Layers, Activity } from 'lucide-react';
import type { DailyProfitLossTrend } from '../../types/expense';
import { formatRupiah } from '../../utils/expenseParser';

interface ProfitLossTrendChartProps {
  data: DailyProfitLossTrend[];
}

export const ProfitLossTrendChart: React.FC<ProfitLossTrendChartProps> = ({ data }) => {
  const [viewMode, setViewMode] = useState<'daily' | 'cumulative'>('daily');

  // Format short date for X-Axis tick (e.g. "01 Sep")
  const formatTickDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  };

  // Format Y-Axis ticks in readable numbers (e.g. 10Jt, -5Jt)
  const formatYAxis = (val: number) => {
    const isNegative = val < 0;
    const absVal = Math.abs(val);
    let str = `${absVal}`;
    if (absVal >= 1_000_000_000) str = `${(absVal / 1_000_000_000).toFixed(1)}M`;
    else if (absVal >= 1_000_000) str = `${(absVal / 1_000_000).toFixed(0)}Jt`;
    else if (absVal >= 1_000) str = `${(absVal / 1_000).toFixed(0)}Rb`;
    return isNegative ? `-${str}` : str;
  };

  return (
    <div className="card h-full flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#f8fafc]">Tren Arus Keuangan (Pemasukan vs Pengeluaran)</h3>
            <p className="text-xs text-[#94a3b8]">Perbandingan harian dan akumulasi laba/rugi bersih</p>
          </div>
        </div>

        <div className="segmented-control">
          <button
            className={`segmented-button ${viewMode === 'daily' ? 'active' : ''}`}
            onClick={() => setViewMode('daily')}
            title="Tampilkan perbandingan harian"
          >
            <Layers className="w-3.5 h-3.5 inline mr-1" />
            Harian
          </button>
          <button
            className={`segmented-button ${viewMode === 'cumulative' ? 'active' : ''}`}
            onClick={() => setViewMode('cumulative')}
            title="Tampilkan akumulasi kumulatif laba rugi"
          >
            <Activity className="w-3.5 h-3.5 inline mr-1" />
            Akumulasi Kumulatif
          </button>
        </div>
      </div>

      <div className="h-72 w-full flex-1 min-h-[280px]">
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-[#64748b]">
            Tidak ada data transaksi untuk rentang ini
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="incomeBarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#059669" stopOpacity={0.6} />
                </linearGradient>
                <linearGradient id="expenseBarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#e11d48" stopOpacity={0.6} />
                </linearGradient>
                <linearGradient id="cumulativeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} vertical={false} />

              <XAxis
                dataKey="date"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickFormatter={formatTickDate}
                axisLine={{ stroke: '#334155' }}
                tickLine={false}
              />

              <YAxis
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickFormatter={formatYAxis}
                axisLine={{ stroke: '#334155' }}
                tickLine={false}
              />

              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload as DailyProfitLossTrend;
                    const isProfit = item.netProfitLoss >= 0;
                    return (
                      <div className="bg-[#1e293b] border border-[#334155] rounded-lg p-3 shadow-xl backdrop-blur-md">
                        <p className="text-xs font-semibold text-[#f8fafc] mb-2">{item.displayDate || item.date}</p>
                        <div className="space-y-1.5 text-xs">
                          <div className="flex items-center justify-between gap-4">
                            <span className="flex items-center gap-1.5 text-emerald-400">
                              <span className="w-2 h-2 rounded-full bg-emerald-400" />
                              Pemasukan:
                            </span>
                            <span className="font-semibold text-emerald-400 font-mono">
                              {formatRupiah(item.income)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="flex items-center gap-1.5 text-rose-400">
                              <span className="w-2 h-2 rounded-full bg-rose-400" />
                              Pengeluaran:
                            </span>
                            <span className="font-semibold text-rose-400 font-mono">
                              {formatRupiah(item.expense)}
                            </span>
                          </div>
                          <div className="pt-1.5 border-t border-[#334155] flex items-center justify-between gap-4">
                            <span className="text-[#94a3b8]">Net Bersih:</span>
                            <span className={`font-semibold font-mono ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {isProfit ? '+' : ''}{formatRupiah(item.netProfitLoss)}
                            </span>
                          </div>
                          {item.cumulativeNet !== undefined && (
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-sky-400">Akumulasi Net:</span>
                              <span className={`font-semibold font-mono ${item.cumulativeNet >= 0 ? 'text-sky-400' : 'text-amber-400'}`}>
                                {item.cumulativeNet >= 0 ? '+' : ''}{formatRupiah(item.cumulativeNet)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              <Legend
                verticalAlign="top"
                align="right"
                height={30}
                iconType="circle"
                wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }}
              />

              {viewMode === 'daily' ? (
                <>
                  <Bar
                    dataKey="income"
                    name="Pemasukan"
                    fill="url(#incomeBarGrad)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={28}
                  />
                  <Bar
                    dataKey="expense"
                    name="Pengeluaran"
                    fill="url(#expenseBarGrad)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={28}
                  />
                  <Line
                    type="monotone"
                    dataKey="netProfitLoss"
                    name="Net Profit/Loss"
                    stroke="#38bdf8"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#38bdf8', stroke: '#0f172a', strokeWidth: 1 }}
                    activeDot={{ r: 5 }}
                  />
                </>
              ) : (
                <>
                  <Line
                    type="monotone"
                    dataKey="cumulativeNet"
                    name="Akumulasi Bersih"
                    stroke="#38bdf8"
                    strokeWidth={3}
                    dot={{ r: 3, fill: '#38bdf8', stroke: '#0f172a', strokeWidth: 1 }}
                    activeDot={{ r: 6 }}
                  />
                  <Bar
                    dataKey="income"
                    name="Pemasukan"
                    fill="url(#incomeBarGrad)"
                    opacity={0.3}
                    radius={[3, 3, 0, 0]}
                    maxBarSize={20}
                  />
                  <Bar
                    dataKey="expense"
                    name="Pengeluaran"
                    fill="url(#expenseBarGrad)"
                    opacity={0.3}
                    radius={[3, 3, 0, 0]}
                    maxBarSize={20}
                  />
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
