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
import type { ExpenseDailyTrend } from '../../types/expense';
import { formatRupiah } from '../../utils/expenseParser';

interface ExpenseTrendChartProps {
  data: ExpenseDailyTrend[];
}

export const ExpenseTrendChart: React.FC<ExpenseTrendChartProps> = ({ data }) => {
  const [metric, setMetric] = useState<'amount' | 'count'>('amount');

  // Format short date for X-Axis tick (e.g. "01 Sep")
  const formatTickDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  };

  // Format Y-Axis ticks in readable numbers (e.g., 5M, 10M, 500rb)
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
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#f8fafc]">Tren Pengeluaran Harian</h3>
            <p className="text-xs text-[#94a3b8]">Aktivitas pengeluaran berdasarkan tanggal</p>
          </div>
        </div>

        <div className="segmented-control">
          <button
            className={`segmented-button ${metric === 'amount' ? 'active' : ''}`}
            onClick={() => setMetric('amount')}
            title="Tampilkan total nominal pengeluaran"
          >
            <DollarSign className="w-3.5 h-3.5 inline mr-1" />
            Nominal (Rp)
          </button>
          <button
            className={`segmented-button ${metric === 'count' ? 'active' : ''}`}
            onClick={() => setMetric('count')}
            title="Tampilkan frekuensi transaksi"
          >
            <Hash className="w-3.5 h-3.5 inline mr-1" />
            Transaksi
          </button>
        </div>
      </div>

      <div style={{ height: '320px', width: '100%' }} className="flex-1">
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-[#94a3b8] text-xs">
            Tidak ada data untuk rentang waktu ini
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="expenseTrendGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="#64748b"
                fontSize={11}
                tickFormatter={formatTickDate}
                tickLine={false}
                axisLine={{ stroke: '#334155' }}
              />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                tickFormatter={formatYAxis}
                tickLine={false}
                axisLine={false}
                width={55}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '10px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                  padding: '10px 14px'
                }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload as ExpenseDailyTrend;
                    return (
                      <div className="text-xs space-y-1">
                        <p className="font-semibold text-[#f8fafc] border-b border-[#334155] pb-1">
                          {item.displayDate || item.date}
                        </p>
                        <div className="flex justify-between gap-4 text-[#94a3b8]">
                          <span>Total Pengeluaran:</span>
                          <span className="font-bold text-cyan-400 font-numeric">
                            {formatRupiah(item.totalAmount)}
                          </span>
                        </div>
                        <div className="flex justify-between gap-4 text-[#94a3b8]">
                          <span>Jumlah Transaksi:</span>
                          <span className="font-bold text-[#f1f5f9] font-numeric">
                            {item.count} transaksi
                          </span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey={metric === 'amount' ? 'totalAmount' : 'count'}
                stroke="#06b6d4"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#expenseTrendGradient)"
                dot={{ stroke: '#06b6d4', strokeWidth: 2, fill: '#0f172a', r: 3 }}
                activeDot={{ stroke: '#06b6d4', strokeWidth: 3, fill: '#38bdf8', r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
