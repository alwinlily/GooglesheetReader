import React from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts';
import { ArrowUpDown } from 'lucide-react';

interface InOutDataPoint {
    date: string;
    in: number;
    out: number;
}

interface InOutChartProps {
    data: InOutDataPoint[];
}

const InOutChart: React.FC<InOutChartProps> = ({ data }) => {
    return (
        <div className="card chart-full" style={{ height: '400px' }}>
            <div className="flex items-center gap-2 mb-6">
                <ArrowUpDown className="w-5 h-5 text-[#94a3b8]" />
                <h3 className="text-[#64748b] text-[0.8rem] font-bold uppercase tracking-[0.1em]">Stock Movement (In vs Out)</h3>
            </div>

            <div style={{ height: '300px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={data}
                        margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                        <XAxis
                            dataKey="date"
                            stroke="#64748b"
                            fontSize={12}
                            minTickGap={40}
                            tickFormatter={(str) => {
                                const date = new Date(str);
                                return date.toLocaleDateString('id-ID', { month: 'short', day: 'numeric' });
                            }}
                        />
                        <YAxis stroke="#64748b" fontSize={12} tickFormatter={(value) => Number(value).toLocaleString('id-ID')} />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9' }}
                            itemStyle={{ fontSize: '12px' }}
                            labelFormatter={(label) => {
                                const date = new Date(label);
                                return `Tanggal: ${date.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;
                            }}
                        />
                        <Legend verticalAlign="top" height={36} />
                        <Bar
                            dataKey="in"
                            name="Stock In"
                            fill="#10b981"
                            radius={[4, 4, 0, 0]}
                            maxBarSize={20}
                        />
                        <Bar
                            dataKey="out"
                            name="Stock Out"
                            fill="#ef4444"
                            radius={[4, 4, 0, 0]}
                            maxBarSize={20}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default InOutChart;
