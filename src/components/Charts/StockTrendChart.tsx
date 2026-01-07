import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface StockTrendChartProps {
    data: any[];
    sizes: string[];
    metric: 'Stock' | 'Sales';
    onMetricChange: (metric: 'Stock' | 'Sales') => void;
}

const StockTrendChart: React.FC<StockTrendChartProps> = ({ data, sizes, metric, onMetricChange }) => {
    const colors = ["#58a6ff", "#238636", "#d29922", "#da3633", "#ab7df8"];

    return (
        <div className="card chart-full" style={{ height: '400px' }}>
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-secondary text-sm font-bold uppercase tracking-wider">{metric} Trends</h3>
                <div className="flex bg-[#161b22] border border-[#30363d] rounded-lg p-1 shadow-inner">
                    <button
                        onClick={() => onMetricChange('Stock')}
                        className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all duration-200 ${metric === 'Stock'
                                ? 'bg-accent-primary text-white shadow-lg scale-105'
                                : 'text-secondary hover:text-primary hover:bg-[#30363d]'
                            }`}
                    >
                        Stock
                    </button>
                    <button
                        onClick={() => onMetricChange('Sales')}
                        className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all duration-200 ${metric === 'Sales'
                                ? 'bg-[#a371f7] text-white shadow-lg scale-105'
                                : 'text-secondary hover:text-primary hover:bg-[#30363d]'
                            }`}
                    >
                        Sales
                    </button>
                </div>
            </div>
            <ResponsiveContainer width="100%" height="85%">
                <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#30363d" vertical={false} />
                    <XAxis
                        dataKey="date"
                        stroke="#8b949e"
                        fontSize={12}
                        tickFormatter={(str) => new Date(str).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    />
                    <YAxis stroke="#8b949e" fontSize={12} />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#161b22', borderColor: '#30363d', color: '#f0f6fc' }}
                        itemStyle={{ fontSize: '12px' }}
                    />
                    <Legend iconType="circle" />
                    {sizes.map((size, index) => (
                        <Line
                            key={size}
                            type="monotone"
                            dataKey={size}
                            stroke={colors[index % colors.length]}
                            strokeWidth={2}
                            dot={{ r: 4, fill: colors[index % colors.length] }}
                            activeDot={{ r: 6 }}
                            connectNulls={false} // Gap for missing stock as per PRD
                        />
                    ))}
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

export default StockTrendChart;
