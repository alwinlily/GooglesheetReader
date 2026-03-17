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
import { Layers } from 'lucide-react';

interface StockBreakdownProps {
    data: { size: string; stock: number }[];
}

const COLORS = ['#58a6ff', '#3fb950', '#a371f7', '#d29922', '#f85149'];

const StockBreakdownChart: React.FC<StockBreakdownProps> = ({ data }) => {
    return (
        <div className="card h-full">
            <div className="flex items-center gap-2 mb-6">
                <Layers className="w-5 h-5 text-[#a371f7]" />
                <h3 className="text-secondary text-sm font-bold uppercase tracking-wider">Stock Breakdown by Size</h3>
            </div>

            <div style={{ height: '300px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={data}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#30363d" horizontal={false} />
                        <XAxis type="number" stroke="#8b949e" fontSize={12} hide />
                        <YAxis
                            dataKey="size"
                            type="category"
                            stroke="#8b949e"
                            fontSize={12}
                            width={40}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#161b22', borderColor: '#30363d', color: '#f0f6fc' }}
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
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
                {data.map((item, index) => (
                    <div key={item.size} className="flex items-center gap-2">
                        <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-[10px] text-secondary font-bold uppercase">{item.size}</span>
                        <span className="text-[10px] text-white font-extrabold ml-auto">{item.stock.toLocaleString()}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default StockBreakdownChart;
