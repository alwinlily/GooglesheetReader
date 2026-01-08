import React from 'react';
import {
    ComposedChart,
    Area,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    ReferenceLine,
    Label
} from 'recharts';
import { Target, Box, History, AlertTriangle } from 'lucide-react';

interface UnifiedForecastChartProps {
    data: any[];
    productName: string;
}

const UnifiedForecastChart: React.FC<UnifiedForecastChartProps> = ({ data, productName }) => {
    if (data.length === 0) return null;

    const outOfStockPoint = data.find(p => p.stock <= 0);
    const minStockValue = data[0]?.minStock || 0;

    return (
        <div className="card chart-full" style={{ height: '500px' }}>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-secondary text-sm font-bold uppercase tracking-wider mb-1">
                        Unified Inventory Guide: {productName}
                    </h3>
                    <div className="text-[10px] text-secondary italic">
                        Strategic Alignment of Sales Targets & Stock Levels
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    {/* Compact Metrics Row */}
                    <div className="flex items-center gap-4 bg-[#161b22] px-4 py-2 rounded-lg border border-[#30363d]">
                        <div className="flex items-center gap-2 pr-4 border-r border-[#30363d]">
                            <Target className="w-3.5 h-3.5 text-secondary" />
                            <div>
                                <div className="text-[10px] text-secondary uppercase font-bold leading-tight">Target</div>
                                <div className="text-sm font-extrabold text-white leading-tight">{data[0]?.target || 0}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 pr-4 border-r border-[#30363d]">
                            <Box className="w-3.5 h-3.5 text-accent-primary" />
                            <div>
                                <div className="text-[10px] text-secondary uppercase font-bold leading-tight">Stock</div>
                                <div className="text-sm font-extrabold text-[#58a6ff] leading-tight">{data[0]?.stock || 0}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <History className="w-3.5 h-3.5 text-secondary" />
                            <div>
                                <div className="text-[10px] text-secondary uppercase font-bold leading-tight">End</div>
                                <div className="text-sm font-extrabold text-white opacity-60 leading-tight">{data[data.length - 1]?.stock || 0}</div>
                            </div>
                        </div>
                    </div>

                    {outOfStockPoint && outOfStockPoint.stock <= 0 && (
                        <div className="flex items-center gap-3 bg-red-500/5 px-4 py-2 rounded-lg border border-red-500/20">
                            <AlertTriangle className="w-4 h-4 text-red-500" />
                            <div>
                                <div className="text-[10px] text-red-500/70 uppercase font-extrabold leading-tight">Stock Out</div>
                                <div className="text-sm font-black text-red-500 leading-tight">
                                    {new Date(outOfStockPoint.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <ResponsiveContainer width="100%" height="80%">
                <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <defs>
                        <linearGradient id="colorStockUnified" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#58a6ff" stopOpacity={0.1} />
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
                    {/* Left Y-Axis for Sales */}
                    <YAxis
                        yAxisId="left"
                        stroke="#8b949e"
                        fontSize={12}
                        label={{ value: 'Sales Units', angle: -90, position: 'insideLeft', style: { fill: '#8b949e', fontSize: '10px' } }}
                    />
                    {/* Right Y-Axis for Stock */}
                    <YAxis
                        yAxisId="right"
                        orientation="right"
                        stroke="#58a6ff"
                        fontSize={12}
                        label={{ value: 'Stock Level', angle: 90, position: 'insideRight', style: { fill: '#58a6ff', fontSize: '10px' } }}
                    />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#161b22', borderColor: '#30363d', color: '#f0f6fc' }}
                        itemStyle={{ fontSize: '12px' }}
                        labelFormatter={(label) => {
                            const date = new Date(label);
                            const pastDate = new Date(date);
                            pastDate.setMonth(date.getMonth() - 1);
                            return `Forecast Date: ${date.toLocaleDateString()} (vs ${pastDate.toLocaleDateString()})`;
                        }}
                    />
                    <Legend verticalAlign="top" height={36} />

                    {/* Stock Area (Right Axis) */}
                    <Area
                        yAxisId="right"
                        name="Projected Stock"
                        type="monotone"
                        dataKey="stock"
                        stroke="#58a6ff"
                        fillOpacity={1}
                        fill="url(#colorStockUnified)"
                        strokeWidth={2}
                    />

                    {/* Reference line for Reorder (Right Axis) */}
                    {minStockValue > 0 && (
                        <ReferenceLine yAxisId="right" y={minStockValue} stroke="#da3633" strokeDasharray="3 3">
                            <Label value="REORDER" position="right" fill="#da3633" fontSize={10} fontWeight="bold" />
                        </ReferenceLine>
                    )}

                    {/* Target Line (Left Axis) */}
                    <Line
                        yAxisId="left"
                        name="Target Sales"
                        type="monotone"
                        dataKey="target"
                        stroke="#8b949e"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={false}
                    />

                    {/* Past Actual Line (Left Axis) */}
                    <Line
                        yAxisId="left"
                        name="Last Month Actual"
                        type="monotone"
                        dataKey="pastActual"
                        stroke="#a371f7"
                        strokeWidth={2}
                        dot={{ r: 3, fill: "#a371f7" }}
                        activeDot={{ r: 5 }}
                        connectNulls
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </div >
    );
};

export default UnifiedForecastChart;
