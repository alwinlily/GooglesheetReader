import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';

interface StockTrendChartProps {
    data: any[];
    sizes: string[];
    metric: 'Stock' | 'Sales';
    onMetricChange: (metric: 'Stock' | 'Sales') => void;
    minStock?: number;
    totalAggregate?: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
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
                <p className="text-[#f1f5f9] text-sm font-bold mb-2">{label}</p>
                <div className="flex flex-col gap-1">
                    {sortedPayload.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center justify-between gap-4 tooltip-item-bg">
                            <span style={{ color: entry.color, fontSize: '12px', fontWeight: 'bold' }}>
                                {entry.name} :
                            </span>
                            <span className="text-white text-sm font-bold number-stroke">
                                {entry.value}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    return null;
};

const StockTrendChart: React.FC<StockTrendChartProps> = ({ data, sizes, metric, onMetricChange, minStock, totalAggregate }) => {
    const colors = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444"];
    const [hiddenSizes, setHiddenSizes] = useState<Record<string, boolean>>({});

    const handleLegendClick = (e: any) => {
        const { dataKey } = e;
        setHiddenSizes(prev => ({
            ...prev,
            [dataKey]: !prev[dataKey]
        }));
    };

    return (
        <div className="card chart-full" style={{ height: '400px' }}>
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-[#64748b] text-[0.8rem] font-bold uppercase tracking-[0.1em]">{metric} Trends</h3>
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
            <ResponsiveContainer width="100%" height="85%">
                <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis
                        dataKey="date"
                        stroke="#64748b"
                        fontSize={11}
                        tickFormatter={(str) => new Date(str).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    />
                    <YAxis stroke="#64748b" fontSize={11} />
                    <Tooltip content={<CustomTooltip />} />
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
                                fontSize: 10,
                                fontWeight: 'bold'
                            }}
                        />
                    )}
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
                            hide={!!hiddenSizes[size]}
                        />
                    ))}
                    {data.length > 0 && 'total' in data[0] && (
                        <Line
                            type="monotone"
                            dataKey="total"
                            name={`Total ${metric}`}
                            stroke="var(--text-primary)"
                            strokeWidth={3}
                            strokeDasharray="5 5"
                            dot={{ r: 5, fill: 'var(--text-primary)' }}
                            activeDot={{ r: 8 }}
                            connectNulls={true}
                            opacity={0.8}
                            hide={!!hiddenSizes['total']}
                        />
                    )}
                </LineChart>
            </ResponsiveContainer>

            {totalAggregate !== undefined && (
                <div className="mt-4 pt-4 border-t border-[#334155] flex justify-between items-center transition-all duration-300">
                    <span className="text-[#94a3b8] text-xs font-bold uppercase tracking-wider">Total {metric} for Period</span>
                    <span className="text-xl font-bold number-stroke">
                        {totalAggregate.toLocaleString()}
                    </span>
                </div>
            )}
        </div>
    );
};

export default StockTrendChart;
