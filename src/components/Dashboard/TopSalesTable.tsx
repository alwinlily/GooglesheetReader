import React from 'react';
import { Trophy, Target, Box, AlertTriangle } from 'lucide-react';

interface TopSalesData {
    product: string;
    size: string;
    sales: number;
    stock: number;
    target: number;
    stockOutDate: string | null;
    hasMismatch?: boolean;
}

interface TopSalesTableProps {
    data: TopSalesData[];
}

const TopSalesTable: React.FC<TopSalesTableProps> = ({ data }) => {
    return (
        <div className="card h-full">
            <div className="flex items-center gap-2 mb-6">
                <Trophy className="w-5 h-5 text-warning" />
                <h3 className="text-secondary text-sm font-bold uppercase tracking-wider">Inventory Status Summary</h3>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-secondary border-b border-border">
                            <th className="pb-3 text-left font-semibold">Rank</th>
                            <th className="pb-3 text-left font-semibold">Item</th>
                            <th className="pb-3 text-center font-semibold">Size</th>
                            <th className="pb-3 text-right font-semibold">
                                <div className="flex items-center justify-end gap-1">
                                    <Target className="w-3 h-3" />
                                    <span>Target</span>
                                </div>
                            </th>
                            <th className="pb-3 text-right font-semibold">
                                <div className="flex items-center justify-end gap-1">
                                    <Box className="w-3 h-3" />
                                    <span>Stock</span>
                                </div>
                            </th>
                            <th className="pb-3 text-right font-semibold">
                                <div className="flex items-center justify-end gap-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    <span>Stock Out</span>
                                </div>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                        {data.map((item, index) => {
                            const stockOutDate = item.stockOutDate ? new Date(item.stockOutDate) : null;
                            const isCritical = item.stock <= (item.target * 3); // Critical if less than 3 days of stock

                            return (
                                <tr key={`${item.product}-${item.size}`} className="hover:bg-white/5 transition-colors">
                                    <td className="py-4 font-bold text-secondary">
                                        #{index + 1}
                                    </td>
                                    <td className="py-4 font-medium text-primary">
                                        {item.product}
                                    </td>
                                    <td className="py-4 text-center">
                                        <span className="px-2 py-1 rounded bg-border text-secondary text-xs font-bold">
                                            {item.size}
                                        </span>
                                    </td>
                                    <td className="py-4 text-right font-bold text-accent-secondary">
                                        {item.target.toLocaleString()}
                                    </td>
                                    <td className="py-4 text-right font-bold text-white number-stroke">
                                        <div className="flex items-center justify-end gap-1">
                                            {item.hasMismatch && (
                                                <AlertTriangle className="w-3 h-3 text-red-500" />
                                            )}
                                            {item.stock.toLocaleString()}
                                        </div>
                                    </td>
                                    <td className="py-4 text-right">
                                        {stockOutDate ? (
                                            <div className={`text-xs font-bold px-2 py-1 rounded inline-block ${isCritical ? 'bg-red-500/20 text-red-500' : 'bg-green-500/20 text-green-500'}`}>
                                                {stockOutDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                            </div>
                                        ) : (
                                            <span className="text-secondary italic">N/A</span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                        {data.length === 0 && (
                            <tr>
                                <td colSpan={6} className="py-8 text-center text-secondary italic">
                                    No items found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default TopSalesTable;
