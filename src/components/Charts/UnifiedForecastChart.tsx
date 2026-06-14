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
import { Target, Box, History, CircleArrowDown, CirclePause } from 'lucide-react';

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
                    <h3 className="text-[#64748b] text-[0.8rem] font-bold uppercase tracking-[0.1em] mb-1">
                        Unified Inventory Guide: {productName}
                    </h3>
                </div>

                <div className="flex items-center gap-4">
                    {/* Compact Metrics Row */}
                    <div className="flex items-center gap-4 bg-[#0f172a] px-4 py-2 rounded-lg border border-[#334155]">
                        <div className="flex items-center gap-2 pr-4 border-r border-[#334155]">
                            <Target className="w-3.5 h-3.5 text-[#94a3b8]" />
                            <div>
                                <div className="text-[10px] text-[#64748b] uppercase font-bold leading-tight">Target</div>
                                <div className="text-sm font-extrabold text-white leading-tight">{data[0]?.target || 0}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 pr-4 border-r border-[#334155]">
                            <Box className="w-3.5 h-3.5 text-[#3b82f6]" />
                            <div>
                                <div className="text-[10px] text-[#64748b] uppercase font-bold leading-tight">Stock</div>
                                <div className="text-sm font-extrabold text-[#3b82f6] leading-tight">{data[0]?.stock || 0}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 pr-4 border-r border-[#334155]">
                            <History className="w-3.5 h-3.5 text-[#94a3b8]" />
                            <div>
                                <div className="text-[10px] text-[#64748b] uppercase font-bold leading-tight">End</div>
                                <div className="text-sm font-extrabold text-white opacity-60 leading-tight">{data[data.length - 1]?.stock || 0}</div>
                            </div>
                        </div>

                        {outOfStockPoint && outOfStockPoint.stock <= 0 ? (
                            <div className="flex items-center gap-2">
                                <CircleArrowDown className="w-3.5 h-3.5 text-[#ef4444]" />
                                <div>
                                    <div className="text-[10px] text-[#ef4444]/70 uppercase font-bold leading-tight">Stock Out</div>
                                    <div className="text-sm font-extrabold text-[#ef4444] leading-tight">
                                        {new Date(outOfStockPoint.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <CirclePause className="w-3.5 h-3.5 text-[#64748b] opacity-40" />
                                <div>
                                    <div className="text-[10px] text-[#64748b]/40 uppercase font-bold leading-tight">Stock Out</div>
                                    <div className="text-sm font-extrabold text-[#64748b]/40 leading-tight">Stable</div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <ResponsiveContainer width="100%" height="80%">
                <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <defs>
                        <linearGradient id="colorStockUnified" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis
                        dataKey="date"
                        stroke="#64748b"
                        fontSize={11}
                        tickFormatter={(str) => {
                            const date = new Date(str);
                            return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                        }}
                    />
                    {/* Left Y-Axis for Sales */}
                    <YAxis
                        yAxisId="left"
                        stroke="#64748b"
                        fontSize={11}
                        label={{ value: 'Sales Units', angle: -90, position: 'insideLeft', style: { fill: '#64748b', fontSize: '11px' } }}
                    />
                    {/* Right Y-Axis for Stock */}
                    <YAxis
                        yAxisId="right"
                        orientation="right"
                        stroke="#3b82f6"
                        fontSize={11}
                        label={{ value: 'Stock Level', angle: 90, position: 'insideRight', style: { fill: '#3b82f6', fontSize: '11px' } }}
                    />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9' }}
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
                        stroke="#3b82f6"
                        fillOpacity={1}
                        fill="url(#colorStockUnified)"
                        strokeWidth={2}
                    />

                    {/* Reference line for Reorder (Right Axis) */}
                    {minStockValue > 0 && (
                        <ReferenceLine yAxisId="right" y={minStockValue} stroke="#ef4444" strokeDasharray="3 3">
                            <Label value="REORDER" position="right" fill="#ef4444" fontSize={10} fontWeight="bold" />
                        </ReferenceLine>
                    )}

                    {/* Target Line (Left Axis) */}
                    <Line
                        yAxisId="left"
                        name="Target Sales"
                        type="monotone"
                        dataKey="target"
                        stroke="#94a3b8"
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
                        stroke="#8b5cf6"
                        strokeWidth={2}
                        dot={{ r: 3, fill: "#8b5cf6" }}
                        activeDot={{ r: 5 }}
                        connectNulls
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
};

export default UnifiedForecastChart;
