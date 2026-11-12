import React, { useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { TrendingUp, DollarSign, Hash } from 'lucide-react';
import type { IncomeRecord } from '../../types/expense';
import { formatRupiah, formatExpenseDisplayDate } from '../../utils/expenseParser';

interface IncomeTrendChartProps {
  incomes: IncomeRecord[];
}

export const IncomeTrendChart: React.FC<IncomeTrendChartProps> = ({ incomes }) => {
  const [metric, setMetric] = useState<'amount' | 'count'>('amount');

  // Aggregate incomes by date
  const dailyData = React.useMemo(() => {
    const map: Record<string, { date: string; displayDate: string; totalAmount: number; count: number }> = {};
    incomes.forEach(inc => {
      if (!map[inc.date]) {
        map[inc.date] = {
          date: inc.date,
          displayDate: inc.displayDate || formatExpenseDisplayDate(inc.date),
          totalAmount: 0,
          count: 0
        };
      }
      map[inc.date].totalAmount += inc.amount;
      map[inc.date].count += 1;
    });

    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
  }, [incomes]);

  const formatTickDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  };

  const formatYAxis = (val: number) => {
    if (metric === 'count') return `${val}`;
    if (val >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(1)}M`;
    if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(0)}Jt`;
    if (val >= 1_000) return `${(val / 1_000).toFixed(0)}Rb`;
    return `${val}`;
  };

  return (
    <div className="card h-full flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#f8fafc]">Tren Penerimaan Harian</h3>
            <p className="text-xs text-[#94a3b8]">Pergerakan omset masuk berdasarkan tanggal</p>
          </div>
        </div>

        <div className="segmented-control">
          <button
            className={`segmented-button ${metric === 'amount' ? 'active' : ''}`}
            onClick={() => setMetric('amount')}
            title="Tampilkan total nominal penerimaan"
          >
            <DollarSign className="w-3.5 h-3.5 inline mr-1" />
            Nominal (Rp)
          </button>
          <button
            className={`segmented-button ${metric === 'count' ? 'active' : ''}`}
            onClick={() => setMetric('count')}
            title="Tampilkan frekuensi pencairan"
          >
            <Hash className="w-3.5 h-3.5 inline mr-1" />
            Frekuensi
          </button>
        </div>
      </div>

      <div className="h-72 w-full flex-1 min-h-[260px]">
        {dailyData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-[#64748b]">
            Tidak ada data penerimaan untuk rentang ini
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailyData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="incomeAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
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
                    const d = payload[0].payload as { displayDate: string; totalAmount: number; count: number };
                    return (
                      <div className="bg-[#1e293b] border border-[#334155] rounded-lg p-3 shadow-xl backdrop-blur-md">
                        <p className="text-xs font-semibold text-[#f8fafc] mb-1">{d.displayDate}</p>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-emerald-400 font-medium">
                            {metric === 'amount' ? 'Total Masuk:' : 'Pencairan:'}
                          </span>
                          <span className="font-semibold text-[#f8fafc] font-mono">
                            {metric === 'amount' ? formatRupiah(d.totalAmount) : `${d.count} transaksi`}
                          </span>
                        </div>
                        {metric === 'amount' && (
                          <p className="text-[11px] text-[#94a3b8] mt-1">{d.count} transaksi pencairan</p>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />

              <Area
                type="monotone"
                dataKey={metric === 'amount' ? 'totalAmount' : 'count'}
                stroke="#10b981"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#incomeAreaGrad)"
                dot={{ r: 3, fill: '#10b981', stroke: '#0f172a', strokeWidth: 1.5 }}
                activeDot={{ r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
