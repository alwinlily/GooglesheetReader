import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { Award, ShieldAlert } from 'lucide-react';
import type { OrderRecord, KonveksiPerformance } from '../../types/order';

interface KonveksiPerformanceChartProps {
  orders: OrderRecord[];
}

export const KonveksiPerformanceChart: React.FC<KonveksiPerformanceChartProps> = ({ orders }) => {
  // Aggregate performance data per Konveksi
  const performanceData = React.useMemo(() => {
    const map: Record<string, KonveksiPerformance> = {};

    orders.forEach((o) => {
      const name = o.konveksi || 'Unknown';
      if (!map[name]) {
        map[name] = {
          name,
          totalOrders: 0,
          activeOrders: 0,
          completedOrders: 0,
          totalOrderedQty: 0,
          totalReceivedQty: 0,
          totalRejectedQty: 0,
          totalShortageQty: 0,
          fulfillmentRate: 0,
        };
      }

      const p = map[name];
      p.totalOrders += 1;
      if (o.status === 'In Production') {
        p.activeOrders += 1;
      } else {
        p.completedOrders += 1;
      }

      p.totalOrderedQty += o.quantity;
      p.totalReceivedQty += o.in;
      p.totalRejectedQty += o.reject;
      p.totalShortageQty += o.selisih < 0 ? Math.abs(o.selisih) : 0;
    });

    // Calculate rates
    return Object.values(map).map((p) => {
      p.fulfillmentRate = p.totalOrderedQty > 0 
        ? Math.round((p.totalReceivedQty / p.totalOrderedQty) * 100)
        : 100;
      return p;
    }).sort((a, b) => b.totalOrderedQty - a.totalOrderedQty);
  }, [orders]);

  const bestPerformer = React.useMemo(() => {
    if (performanceData.length === 0) return null;
    
    // Sort by fulfillment rate (and favor more completed orders if rates are equal)
    const list = [...performanceData].sort((a, b) => {
      if (b.fulfillmentRate === a.fulfillmentRate) {
        return b.totalOrderedQty - a.totalOrderedQty;
      }
      return b.fulfillmentRate - a.fulfillmentRate;
    });
    return list[0];
  }, [performanceData]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Chart: Qty Ordered vs Received vs Rejects */}
      <div className="card lg:col-span-2 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-6">
            <Award className="w-5 h-5 text-[#94a3b8]" />
            <h3 className="text-[#64748b] text-[0.8rem] font-bold uppercase tracking-[0.1em]">Workshop (Konveksi) Performance Qty</h3>
          </div>

          {performanceData.length === 0 ? (
            <div className="flex items-center justify-center h-[260px] text-[#64748b] text-sm">
              No workshop data available
            </div>
          ) : (
            <div style={{ height: '240px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={performanceData}
                  margin={{ top: 10, right: 10, left: -10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} tickFormatter={(value) => Number(value).toLocaleString('id-ID')} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9' }}
                    itemStyle={{ fontSize: '12px' }}
                  />
                  <Legend verticalAlign="top" height={36} iconSize={10} wrapperStyle={{ fontSize: '12px' }} />
                  <Bar
                    dataKey="totalOrderedQty"
                    name="Ordered"
                    fill="#3b82f6"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={15}
                  />
                  <Bar
                    dataKey="totalReceivedQty"
                    name="Received"
                    fill="#10b981"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={15}
                  />
                  <Bar
                    dataKey="totalRejectedQty"
                    name="Rejects"
                    fill="#ef4444"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={15}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* KPI & Summary Panel */}
      <div className="card flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-6">
            <ShieldAlert className="w-5 h-5 text-[#94a3b8]" />
            <h3 className="text-[#64748b] text-[0.8rem] font-bold uppercase tracking-[0.1em]">Workshop Accuracy KPI</h3>
          </div>

          {performanceData.length === 0 ? (
            <div className="flex items-center justify-center h-[260px] text-[#64748b] text-sm">
              No workshop data available
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {bestPerformer && (
                <div className="p-3 bg-[#10b981]/10 border border-[#10b981]/20 rounded-xl">
                  <span className="text-xs text-[#10b981] font-bold uppercase tracking-wider block mb-1">👑 Top Fulfillment Accuracy</span>
                  <div className="flex justify-between items-baseline">
                    <strong className="text-[#f1f5f9] text-base font-extrabold">{bestPerformer.name}</strong>
                    <span className="text-[#10b981] text-sm font-black font-mono">{bestPerformer.fulfillmentRate}% accuracy</span>
                  </div>
                  <p className="text-xs text-[#94a3b8] mt-1">Berhasil memenuhi {bestPerformer.totalReceivedQty.toLocaleString('id-ID')} dari {bestPerformer.totalOrderedQty.toLocaleString('id-ID')} pcs.</p>
                </div>
              )}

              <div className="flex flex-col gap-2 mt-2">
                <span className="text-xs text-[#94a3b8] font-bold uppercase tracking-wider block mb-1">All Workshop Scores</span>
                {performanceData.map((p) => (
                  <div key={p.name} className="flex flex-col gap-1 border-b border-[#334155]/20 pb-2 last:border-0">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-[#f1f5f9]">{p.name}</span>
                      <span className={`font-mono font-bold ${p.fulfillmentRate >= 95 ? 'text-[#10b981]' : p.fulfillmentRate >= 80 ? 'text-[#f59e0b]' : 'text-[#ef4444]'}`}>
                        {p.fulfillmentRate}%
                      </span>
                    </div>
                    {/* Visual fulfillment bar */}
                    <div className="w-full h-1.5 bg-[#0f172a] rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${p.fulfillmentRate >= 95 ? 'bg-[#10b981]' : p.fulfillmentRate >= 80 ? 'bg-[#f59e0b]' : 'bg-[#ef4444]'}`}
                        style={{ width: `${Math.min(100, p.fulfillmentRate)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-[#94a3b8] font-mono">
                      <span>Orders: {p.totalOrders} ({p.activeOrders} active)</span>
                      <span>Rejects: {p.totalRejectedQty}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
