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
            <div className="bg-[#161b22] border border-[#30363d] p-3 rounded-lg shadow-xl">
                <p className="text-[#f0f6fc] text-sm font-bold mb-2">{label}</p>
                <div className="flex flex-col gap-1">
                    {sortedPayload.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center justify-between gap-4">
                            <span style={{ color: entry.color, fontSize: '12px', fontWeight: 'bold' }}>
                                {entry.name} :
                            </span>
                            <span className="text-white text-sm font-bold">
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
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconType="circle" />
                    {minStock !== undefined && metric === 'Stock' && (
                        <ReferenceLine
                            y={minStock}
                            stroke="#da3633"
                            strokeDasharray="3 3"
                            label={{
                                value: `Min Stock: ${minStock}`,
                                position: 'right',
                                fill: '#da3633',
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
                        />
                    ))}
                    {metric === 'Sales' && (
                        <Line
                            type="monotone"
                            dataKey="total"
                            name="Total Sales"
                            stroke="#ffffff"
                            strokeWidth={3}
                            strokeDasharray="5 5"
                            dot={{ r: 5, fill: '#ffffff' }}
                            activeDot={{ r: 8 }}
                        />
                    )}
                </LineChart>
            </ResponsiveContainer>

            {metric === 'Sales' && totalAggregate !== undefined && (
                <div className="mt-4 pt-4 border-t border-[#30363d] flex justify-between items-center">
                    <span className="text-secondary text-xs font-bold uppercase tracking-wider">Total Sales for Period</span>
                    <span className="text-xl font-bold" style={{ color: '#ffffff' }}>
                        {totalAggregate.toLocaleString()}
                    </span>
                </div>
            )}
        </div>
    );
};

export default StockTrendChart;
