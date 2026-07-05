import React from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    LabelList
} from 'recharts';
import { Layers } from 'lucide-react';

interface StockBreakdownProps {
    data: { size: string; stock: number }[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];

const StockBreakdownChart: React.FC<StockBreakdownProps> = ({ data }) => {
    return (
        <div className="card h-full">
            <div className="flex items-center gap-2 mb-6">
                <Layers className="w-5 h-5 text-[#8b5cf6]" />
                <h3 className="text-[#64748b] text-[0.8rem] font-bold uppercase tracking-[0.1em]">Stock Breakdown by Size</h3>
            </div>

            <div style={{ height: '300px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={data}
                        layout="vertical"
                        margin={{ top: 5, right: 45, left: 10, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                        <XAxis type="number" stroke="#64748b" fontSize={11} hide />
                        <YAxis
                            dataKey="size"
                            type="category"
                            stroke="#64748b"
                            fontSize={11}
                            width={35}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9' }}
                            itemStyle={{ fontSize: '12px' }}
                            formatter={(value: any) => [Number(value).toLocaleString(), 'Units']}
                            cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                        />
                        <Bar
                            dataKey="stock"
                            radius={[0, 4, 4, 0]}
                            barSize={20}
                        >
                            {data.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length] || COLORS[0]} />
                            ))}
                            <LabelList 
                                dataKey="stock" 
                                position="right" 
                                fill="#94a3b8" 
                                fontSize={10} 
                                formatter={(v: any) => Number(v).toLocaleString()}
                                offset={8}
                            />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className="mt-6 flex flex-col gap-2.5">
                {data.map((item, index) => (
                    <div key={item.size} className="flex items-center gap-2 border-b border-[#334155]/20 pb-2 last:border-0">
                        <div
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-xs text-[#94a3b8] font-bold uppercase">Ukuran {item.size}</span>
                        <span className="text-xs text-[#f1f5f9] font-extrabold ml-auto">{item.stock.toLocaleString()} Units</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default StockBreakdownChart;
