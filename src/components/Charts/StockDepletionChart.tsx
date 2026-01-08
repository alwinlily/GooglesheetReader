import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Label } from 'recharts';

interface StockDepletionChartProps {
    data: any[];
    productName: string;
}

const StockDepletionChart: React.FC<StockDepletionChartProps> = ({ data, productName }) => {
    if (data.length === 0) {
        return (
            <div className="card chart-full flex items-center justify-center text-secondary italic" style={{ height: '400px' }}>
                Set a daily sales target in the Master sheet to see stock depletion predictions.
            </div>
        );
    }

    const outOfStockDate = data.find(p => p.stock <= 0)?.date;
    const minStockValue = data[0]?.minStock || 0;

    return (
        <div className="card chart-full" style={{ height: '400px' }}>
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-secondary text-sm font-bold uppercase tracking-wider">
                    Stock Depletion: {productName}
                </h3>
                {outOfStockDate && (
                    <div className="text-xs font-bold text-red-500 bg-red-500/10 px-2 py-1 rounded">
                        Est. Stock Out: {new Date(outOfStockDate).toLocaleDateString()}
                    </div>
                )}
            </div>

            <ResponsiveContainer width="100%" height="80%">
                <AreaChart data={data}>
                    <defs>
                        <linearGradient id="colorStock" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#58a6ff" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#58a6ff" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#30363d" vertical={false} />
                    <XAxis
                        dataKey="date"
                        stroke="#8b949e"
                        fontSize={10}
                        tickFormatter={(str) => {
                            const date = new Date(str);
                            return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                        }}
                    />
                    <YAxis stroke="#8b949e" fontSize={12} />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#161b22', borderColor: '#30363d', color: '#f0f6fc' }}
                        itemStyle={{ fontSize: '12px' }}
                        labelFormatter={(label) => new Date(label).toLocaleDateString(undefined, {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        })}
                    />
                    {minStockValue > 0 && (
                        <ReferenceLine y={minStockValue} stroke="#da3633" strokeDasharray="3 3">
                            <Label value="REORDER" position="left" fill="#da3633" fontSize={10} fontWeight="bold" />
                        </ReferenceLine>
                    )}
                    <Area
                        type="monotone"
                        dataKey="stock"
                        stroke="#58a6ff"
                        fillOpacity={1}
                        fill="url(#colorStock)"
                        strokeWidth={2}
                    />
                </AreaChart>
            </ResponsiveContainer>
            <div className="mt-4 text-[10px] text-secondary italic text-center">
                * Based on current daily sales targets from Master sheet.
            </div>
        </div>
    );
};

export default StockDepletionChart;
