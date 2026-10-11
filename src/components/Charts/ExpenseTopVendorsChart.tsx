import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { Users } from 'lucide-react';
import type { ExpenseRecipientSummary } from '../../types/expense';
import { formatRupiah, getCategoryColor } from '../../utils/expenseParser';

interface ExpenseTopVendorsChartProps {
  data: ExpenseRecipientSummary[];
  onSelectRecipient?: (recipient: string) => void;
}

export const ExpenseTopVendorsChart: React.FC<ExpenseTopVendorsChartProps> = ({
  data,
  onSelectRecipient
}) => {
  const topList = data.slice(0, 8);

  const formatXAxis = (val: number) => {
    if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(0)}Jt`;
    if (val >= 1_000) return `${(val / 1_000).toFixed(0)}Rb`;
    return `${val}`;
  };

  return (
    <div className="card h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#f8fafc]">Top 8 Penerima Terbesar</h3>
            <p className="text-xs text-[#94a3b8]">Vendor & pihak penerima alokasi dana terbesar</p>
          </div>
        </div>
      </div>

      <div style={{ height: '240px', width: '100%' }} className="flex-1">
        {topList.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-[#94a3b8]">
            Tidak ada data
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={topList}
              layout="vertical"
              margin={{ top: 5, right: 35, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
              <XAxis
                type="number"
                stroke="#64748b"
                fontSize={11}
                tickFormatter={formatXAxis}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                dataKey="recipient"
                type="category"
                stroke="#94a3b8"
                fontSize={11}
                width={120}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val: string) => val.length > 15 ? val.slice(0, 15) + '...' : val}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload as ExpenseRecipientSummary;
                    return (
                      <div className="p-2 space-y-1 text-xs">
                        <div className="font-bold text-[#f8fafc]">{item.recipient}</div>
                        <div className="text-emerald-400 font-bold font-numeric">
                          {formatRupiah(item.totalAmount)}
                        </div>
                        <div className="text-[#94a3b8]">
                          Kategori: <span className="text-[#f1f5f9]">{item.mainCategory}</span>
                        </div>
                        <div className="text-[#94a3b8]">
                          Jumlah Transaksi: <span className="text-[#f1f5f9]">{item.count} kali</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
                cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
              />
              <Bar
                dataKey="totalAmount"
                radius={[0, 6, 6, 0]}
                barSize={16}
                onClick={(entry: any) => onSelectRecipient && onSelectRecipient(entry?.recipient || entry?.payload?.recipient || '')}
                cursor="pointer"
              >
                {topList.map((item, index) => (
                  <Cell
                    key={`bar-${index}`}
                    fill={getCategoryColor(item.mainCategory, index)}
                    opacity={0.85}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-[#334155]/40 flex items-center justify-between text-xs text-[#94a3b8]">
        <span>💡 Klik nama penerima untuk memfilter daftar transaksi</span>
      </div>
    </div>
  );
};
