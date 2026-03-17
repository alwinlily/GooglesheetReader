import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Brush } from 'recharts';

interface InOutChartProps {
    data: any[];
}

const InOutChart: React.FC<InOutChartProps> = ({ data }) => {
    return (
        <div className="card" style={{ height: '500px' }}>
            <h3 className="text-secondary text-sm font-bold mb-4">In vs Sales Movement</h3>
            <ResponsiveContainer width="100%" height="90%">
                <BarChart data={data} margin={{ bottom: 20 }}>
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
                    <Legend iconType="circle" verticalAlign="top" height={36} />
                    <Bar dataKey="in" name="In" stackId="inbound" fill="#238636" maxBarSize={40} />
                    <Bar dataKey="returned" name="Returned" stackId="inbound" fill="#d29922" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    <Bar dataKey="out" name="Sales" stackId="outbound" fill="#a371f7" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    <Brush 
                        dataKey="date" 
                        height={30} 
                        stroke="#8b949e"
                        fill="#0d1117"
                        tickFormatter={(str) => new Date(str).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default InOutChart;
