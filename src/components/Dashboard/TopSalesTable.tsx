import React from 'react';
import { Trophy, Target, Box, TriangleAlert } from 'lucide-react';

interface TopSalesData {
    product: string;
    size: string;
    sales: number;
    stock: number;
    target: number;
    stockOutDate: string | null;
    hasMismatch?: boolean;
    isInsufficient?: boolean;
}

interface TopSalesTableProps {
    data: TopSalesData[];
}

const TopSalesTable: React.FC<TopSalesTableProps> = ({ data }) => {
    const getRankStyle = (idx: number) => {
        if (idx === 0) return 'rank-badge-1';
        if (idx === 1) return 'rank-badge-2';
        if (idx === 2) return 'rank-badge-3';
        return 'rank-badge-other';
    };

    return (
        <div className="card h-full">
            <div className="flex items-center gap-2.5 mb-6">
                <Trophy className="w-5 h-5 text-[#f59e0b]" />
                <h3 className="text-[#64748b] text-[0.8rem] font-bold uppercase tracking-[0.1em]">Inventory Status Summary</h3>
            </div>

            <div className="overflow-x-auto rounded-lg border border-[#334155]/40 bg-[#0f172a]/20">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-[#0f172a] text-[#64748b] text-[0.75rem] uppercase tracking-[0.06em] border-b border-[#334155]/85">
                            <th className="py-3.5 px-4 text-left font-bold">Rank</th>
                            <th className="py-3.5 px-4 text-left font-bold">Item</th>
                            <th className="py-3.5 px-3 text-center font-bold">Size</th>
                            <th className="py-3.5 px-4 text-right font-bold">
                                <div className="flex items-center justify-end gap-1.5">
                                    <Target className="w-3.5 h-3.5" />
                                    <span>Target</span>
                                </div>
                            </th>
                            <th className="py-3.5 px-4 text-right font-bold">
                                <div className="flex items-center justify-end gap-1.5">
                                    <Box className="w-3.5 h-3.5" />
                                    <span>Stock</span>
                                </div>
                            </th>
                            <th className="py-3.5 px-4 text-right font-bold">
                                <div className="flex items-center justify-end gap-1.5">
                                    <TriangleAlert className="w-3.5 h-3.5" />
                                    <span>Stock Out</span>
                                </div>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#334155]/40">
                        {data.map((item, index) => {
                             const stockOutDate = item.stockOutDate ? new Date(item.stockOutDate) : null;
                             const isCritical = item.isInsufficient ?? (item.stock <= (item.target * 3)); // Critical if insufficient or less than 3 days of stock

                             return (
                                 <tr 
                                     key={`${item.product}-${item.size}`} 
                                     className={`hover:bg-[#3b82f6]/[0.06] transition-colors duration-150 ${index % 2 === 1 ? 'bg-white/[0.015]' : ''}`}
                                 >
                                     <td className="py-3.5 px-4">
                                         <div className={`rank-badge font-numeric ${getRankStyle(index)}`}>
                                             {index + 1}
                                         </div>
                                     </td>
                                     <td className="py-3.5 px-4 font-semibold text-[#e2e8f0]">
                                         {item.product}
                                     </td>
                                     <td className="py-3.5 px-3 text-center">
                                         <span className="px-2 py-0.5 rounded bg-[#334155]/50 text-[#94a3b8] text-xs font-bold">
                                             {item.size}
                                         </span>
                                     </td>
                                     <td className="py-3.5 px-4 text-right font-bold text-[#f59e0b] font-numeric">
                                         {item.target.toLocaleString()}
                                     </td>
                                     <td className={`py-3.5 px-4 text-right font-bold font-numeric ${item.isInsufficient ? 'text-[#ef4444]' : 'text-[#f1f5f9]'}`}>
                                         <div className="flex items-center justify-end gap-1.5">
                                             {item.hasMismatch && (
                                                 <TriangleAlert className="w-3.5 h-3.5 text-[#ef4444]" />
                                             )}
                                             {item.stock.toLocaleString()}
                                         </div>
                                     </td>
                                     <td className="py-3.5 px-4 text-right">
                                         {stockOutDate ? (
                                             <div className={`text-xs font-bold px-2 py-1 rounded inline-block font-numeric ${isCritical ? 'bg-[#ef4444]/15 text-[#ef4444]' : 'bg-[#10b981]/15 text-[#10b981]'}`}>
                                                 {stockOutDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                             </div>
                                         ) : (
                                             <span className="text-[#94a3b8]/60 italic">N/A</span>
                                         )}
                                     </td>
                                 </tr>
                             );
                        })}
                        {data.length === 0 && (
                            <tr>
                                <td colSpan={6} className="py-8 text-center text-[#94a3b8]/60 italic">
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
