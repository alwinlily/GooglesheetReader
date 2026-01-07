import React from 'react';
import { Trophy } from 'lucide-react';

interface TopSalesData {
    product: string;
    size: string;
    sales: number;
}

interface TopSalesTableProps {
    data: TopSalesData[];
}

const TopSalesTable: React.FC<TopSalesTableProps> = ({ data }) => {
    return (
        <div className="card h-full">
            <div className="flex items-center gap-2 mb-6">
                <Trophy className="w-5 h-5 text-warning" />
                <h3 className="text-secondary text-sm font-bold uppercase tracking-wider">Top 5 Performing Items</h3>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-secondary border-b border-border">
                            <th className="pb-3 text-left font-semibold">Rank</th>
                            <th className="pb-3 text-left font-semibold">Product</th>
                            <th className="pb-3 text-center font-semibold">Size</th>
                            <th className="pb-3 text-right font-semibold">Sales</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                        {data.map((item, index) => (
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
                                    {item.sales.toLocaleString()}
                                </td>
                            </tr>
                        ))}
                        {data.length === 0 && (
                            <tr>
                                <td colSpan={4} className="py-8 text-center text-secondary italic">
                                    No sales data found for the selected period.
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
