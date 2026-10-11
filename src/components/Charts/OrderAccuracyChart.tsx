import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { CheckCircle } from 'lucide-react';
import type { OrderRecord } from '../../types/order';

interface OrderAccuracyChartProps {
  orders: OrderRecord[];
}

const STATUS_COLORS = {
  'In Production': '#f59e0b', // Amber
  'Completed': '#10b981',    // Emerald
  'Shortage': '#ef4444',     // Rose
  'Excess': '#8b5cf6',       // Purple
};

export const OrderAccuracyChart: React.FC<OrderAccuracyChartProps> = ({ orders }) => {
  // 1. Calculate status distribution for Bar Chart
  const statusCounts = React.useMemo(() => {
    const counts = {
      'In Production': 0,
      'Completed': 0,
      'Shortage': 0,
      'Excess': 0
    };

    orders.forEach((o) => {
      counts[o.status] = (counts[o.status] || 0) + 1;
    });

    return [
      { name: 'In Production', label: 'Dalam Produksi', value: counts['In Production'] },
      { name: 'Completed', label: 'Selesai', value: counts['Completed'] },
      { name: 'Shortage', label: 'Shortage (Kurang)', value: counts['Shortage'] },
      { name: 'Excess', label: 'Excess (Lebih)', value: counts['Excess'] }
    ].filter(item => item.value > 0);
  }, [orders]);

  const totalOrdersCount = orders.length;

  return (
    <div className="w-full">
      {/* Chart: Status Distribution */}
      <div className="card flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-6">
            <CheckCircle className="w-5 h-5 text-[#94a3b8]" />
            <h3 className="text-[#64748b] text-[0.8rem] font-bold uppercase tracking-[0.1em]">Order Fulfillment Status</h3>
          </div>

          {totalOrdersCount === 0 ? (
            <div className="flex items-center justify-center h-[260px] text-[#64748b] text-sm">
              No order data available
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
              
              {/* Bar Chart Column */}
              <div className="lg:col-span-2" style={{ height: '240px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={statusCounts}
                    margin={{ top: 10, right: 10, left: -25, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis
                      dataKey="label"
                      stroke="#64748b"
                      fontSize={12}
                      tickLine={false}
                    />
                    <YAxis 
                      stroke="#64748b" 
                      fontSize={12}
                      allowDecimals={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{ 
                        backgroundColor: '#1e293b', 
                        borderColor: '#475569', 
                        borderRadius: '8px', 
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)'
                      }}
                      itemStyle={{ color: '#f1f5f9', fontSize: '12px', fontWeight: 'semibold' }}
                      labelStyle={{ color: '#e2e8f0', fontWeight: 'bold' }}
                      formatter={(value: any) => [`${value} Orders`]}
                      cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                    />
                    <Bar
                      dataKey="value"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={45}
                    >
                      {statusCounts.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={STATUS_COLORS[entry.name as keyof typeof STATUS_COLORS] || '#64748b'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Legend Column */}
              <div className="flex flex-col gap-3">
                {Object.entries(STATUS_COLORS).map(([status, color]) => {
                  const count = orders.filter((o) => o.status === status).length;
                  const percentage = totalOrdersCount > 0 ? Math.round((count / totalOrdersCount) * 100) : 0;
                  
                  let displayLabel = status;
                  if (status === 'In Production') displayLabel = 'Dalam Produksi (In Production)';
                  else if (status === 'Completed') displayLabel = 'Selesai (Completed)';
                  else if (status === 'Shortage') displayLabel = 'Shortage (Kurang)';
                  else if (status === 'Excess') displayLabel = 'Excess (Lebih)';

                  return (
                    <div key={status} className="flex items-center gap-2 border-b border-[#334155]/20 pb-2 last:border-0">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                      <div className="flex flex-col">
                        <span className="text-xs text-[#e2e8f0] font-bold">{displayLabel}</span>
                        <span className="text-xs text-[#9ca3af]">{count.toLocaleString('id-ID')} order ({percentage}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
};
