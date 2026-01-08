import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface SalesForecastChartProps {
    data: any[];
    productName: string;
}

const SalesForecastChart: React.FC<SalesForecastChartProps> = ({ data, productName }) => {
    return (
        <div className="card chart-full" style={{ height: '400px' }}>
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-secondary text-sm font-bold uppercase tracking-wider">
                    Sales Forecast: {productName}
                </h3>
                <div className="text-xs text-secondary italic">
                    Comparing Past Month Actuals vs Next Month Target
                </div>
            </div>

            <ResponsiveContainer width="100%" height="85%">
                <LineChart data={data}>
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
                        labelFormatter={(label) => {
                            const date = new Date(label);
                            const pastDate = new Date(date);
                            pastDate.setMonth(date.getMonth() - 1);
                            return `Forecast: ${date.toLocaleDateString()} (vs ${pastDate.toLocaleDateString()})`;
                        }}
                    />
                    <Legend verticalAlign="bottom" height={36} />

                    <Line
                        name="Last Month Actual"
                        type="monotone"
                        dataKey="pastActual"
                        stroke="#a371f7"
                        strokeWidth={2}
                        dot={{ r: 3, fill: "#a371f7" }}
                        activeDot={{ r: 5 }}
                        connectNulls
                    />
                    <Line
                        name="Target Forecast"
                        type="monotone"
                        dataKey="forecast"
                        stroke="#58a6ff"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={false}
                        activeDot={{ r: 4 }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

export default SalesForecastChart;
