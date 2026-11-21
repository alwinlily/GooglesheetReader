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
        <div className="card chart-full forecast-card">
            <div className="forecast-header">
                <div>
                    <h3 className="section-heading mb-1">
                        Unified inventory guide: {productName}
                    </h3>
                </div>

                <div className="flex items-center gap-4">
                    {/* Compact Metrics Row */}
                    <div className="forecast-metrics bg-[#0f172a] rounded-lg border border-[#334155]">
                        <div className="flex items-center gap-2 pr-4 border-r border-[#334155]">
                            <Target className="w-3.5 h-3.5 text-[#94a3b8]" />
                            <div>
                                <div className="forecast-metric-label text-[#94a3b8]">Target</div>
                                <div className="forecast-metric-value text-white">{(data[0]?.target || 0).toLocaleString('id-ID')} <span className="metric-unit">pcs/hari</span></div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 pr-4 border-r border-[#334155]">
                            <Box className="w-3.5 h-3.5 text-[#3b82f6]" />
                            <div>
                                <div className="forecast-metric-label text-[#94a3b8]">Stock</div>
                                <div className="forecast-metric-value text-[#60a5fa]">{(data[0]?.stock || 0).toLocaleString('id-ID')} <span className="metric-unit">pcs</span></div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 pr-4 border-r border-[#334155]">
                            <History className="w-3.5 h-3.5 text-[#94a3b8]" />
                            <div>
                                <div className="forecast-metric-label text-[#94a3b8]">End</div>
                                <div className="forecast-metric-value text-[#cbd5e1]">{(data[data.length - 1]?.stock || 0).toLocaleString('id-ID')} <span className="metric-unit">pcs</span></div>
                            </div>
                        </div>

                        {outOfStockPoint && outOfStockPoint.stock <= 0 ? (
                            <div className="flex items-center gap-2">
                                <CircleArrowDown className="w-3.5 h-3.5 text-[#ef4444]" />
                                <div>
                                    <div className="forecast-metric-label text-[#f87171]">Stock out</div>
                                    <div className="forecast-metric-date text-[#f87171]">
                                        {new Date(outOfStockPoint.date).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <CirclePause className="w-3.5 h-3.5 text-[#64748b] opacity-40" />
                                <div>
                                    <div className="forecast-metric-label text-[#94a3b8]">Stock out</div>
                                    <div className="forecast-metric-date text-[#cbd5e1]">Stable</div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <ResponsiveContainer width="100%" height={360}>
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
                        fontSize={12}
                        minTickGap={40}
                        tickFormatter={(str) => {
                            const date = new Date(str);
                            return date.toLocaleDateString('id-ID', { month: 'short', day: 'numeric' });
                        }}
                    />
                    {/* Left Y-Axis for Sales */}
                    <YAxis
                        yAxisId="left"
                        stroke="#64748b"
                        fontSize={12}
                        label={{ value: 'Sales (pcs)', angle: -90, position: 'insideLeft', style: { fill: '#94a3b8', fontSize: '12px' } }}
                    />
                    {/* Right Y-Axis for Stock */}
                    <YAxis
                        yAxisId="right"
                        orientation="right"
                        stroke="#3b82f6"
                        fontSize={12}
                        label={{ value: 'Stok (pcs)', angle: 90, position: 'insideRight', style: { fill: '#3b82f6', fontSize: '12px' } }}
                    />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9' }}
                        itemStyle={{ fontSize: '12px' }}
                        labelFormatter={(label) => {
                            const date = new Date(label);
                            const pastDate = new Date(date);
                            pastDate.setMonth(date.getMonth() - 1);
                            return `Tanggal Proyeksi: ${date.toLocaleDateString('id-ID')} (vs ${pastDate.toLocaleDateString('id-ID')})`;
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
                            <Label value="REORDER" position="right" fill="#ef4444" fontSize={12} fontWeight="bold" />
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
                        activeDot={{ r: 4 }}
                    />

                    {/* Past Actual Line (Left Axis) */}
                    <Line
                        yAxisId="left"
                        name="Last Month Actual"
                        type="monotone"
                        dataKey="pastActual"
                        stroke="#8b5cf6"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                        connectNulls
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
};

export default UnifiedForecastChart;
