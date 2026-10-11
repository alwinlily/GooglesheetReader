import React, { useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { PieChart as PieIcon } from 'lucide-react';
import type { ExpenseCategorySummary } from '../../types/expense';
import { formatRupiah } from '../../utils/expenseParser';

interface ExpenseCategoryChartProps {
  data: ExpenseCategorySummary[];
  selectedCategory?: string;
  onSelectCategory?: (category: string) => void;
}

export const ExpenseCategoryChart: React.FC<ExpenseCategoryChartProps> = ({
  data,
  selectedCategory = 'All',
  onSelectCategory
}) => {
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  const grandTotal = data.reduce((sum, item) => sum + item.totalAmount, 0);

  // Active slice info for center text in donut chart
  const activeInfo = hoveredCategory
    ? data.find(d => d.category === hoveredCategory)
    : selectedCategory !== 'All'
    ? data.find(d => d.category === selectedCategory)
    : null;

  return (
    <div className="card h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <PieIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#f8fafc]">Distribusi Kategori</h3>
            <p className="text-xs text-[#94a3b8]">Komposisi pengeluaran operasional</p>
          </div>
        </div>

        {selectedCategory !== 'All' && onSelectCategory && (
          <button
            onClick={() => onSelectCategory('All')}
            className="text-xs text-indigo-400 hover:text-indigo-300 transition underline"
          >
            Reset Filter
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center flex-1">
        {/* Donut Chart */}
        <div className="sm:col-span-6 relative flex items-center justify-center" style={{ height: '240px' }}>
          {data.length === 0 ? (
            <div className="text-xs text-[#94a3b8]">Tidak ada data</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload as ExpenseCategorySummary;
                        return (
                          <div className="bg-[#0f172a] border border-[#334155] rounded-lg p-2.5 shadow-xl text-xs space-y-1">
                            <div className="flex items-center gap-2 font-semibold text-[#f8fafc]">
                              <span
                                className="w-2.5 h-2.5 rounded-full inline-block"
                                style={{ backgroundColor: item.color }}
                              />
                              {item.category}
                            </div>
                            <div className="text-indigo-400 font-bold font-numeric">
                              {formatRupiah(item.totalAmount)}
                            </div>
                            <div className="text-[#94a3b8]">
                              {item.percentage.toFixed(1)}% dari total ({item.count} transaksi)
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Pie
                    data={data}
                    dataKey="totalAmount"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    innerRadius={58}
                    outerRadius={88}
                    paddingAngle={3}
                    onMouseEnter={(entry) => setHoveredCategory(entry.category)}
                    onMouseLeave={() => setHoveredCategory(null)}
                    onClick={(entry) => onSelectCategory && onSelectCategory(entry.category === selectedCategory ? 'All' : entry.category)}
                    cursor="pointer"
                  >
                    {data.map((entry) => {
                      const isSelected = selectedCategory === entry.category;
                      const isHovered = hoveredCategory === entry.category;
                      const isDimmed = (selectedCategory !== 'All' && !isSelected) || (hoveredCategory && !isHovered);
                      return (
                        <Cell
                          key={`cell-${entry.category}`}
                          fill={entry.color}
                          opacity={isDimmed ? 0.35 : 1}
                          stroke={isSelected || isHovered ? '#f8fafc' : '#1e293b'}
                          strokeWidth={isSelected || isHovered ? 2 : 1}
                        />
                      );
                    })}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              {/* Center donut label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
                <span className="text-[10px] text-[#94a3b8] uppercase font-semibold tracking-wider">
                  {activeInfo ? activeInfo.category : 'Total'}
                </span>
                <span className="text-xs font-bold text-[#f8fafc] font-numeric mt-0.5 max-w-[110px] truncate">
                  {activeInfo ? `${activeInfo.percentage.toFixed(1)}%` : formatRupiah(grandTotal)}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Category List */}
        <div className="sm:col-span-6 flex flex-col gap-1.5 max-h-[240px] overflow-y-auto pr-1">
          {data.map((item) => {
            const isSelected = selectedCategory === item.category;
            return (
              <div
                key={item.category}
                onClick={() => onSelectCategory && onSelectCategory(isSelected ? 'All' : item.category)}
                onMouseEnter={() => setHoveredCategory(item.category)}
                onMouseLeave={() => setHoveredCategory(null)}
                className={`flex items-center justify-between p-1.5 rounded-lg text-xs cursor-pointer transition ${
                  isSelected
                    ? 'bg-indigo-500/15 border border-indigo-500/30'
                    : 'hover:bg-[#334155]/40 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className={`font-medium truncate ${isSelected ? 'text-indigo-300 font-semibold' : 'text-[#f1f5f9]'}`}>
                    {item.category}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[#94a3b8] font-numeric text-[11px]">
                    {item.percentage.toFixed(1)}%
                  </span>
                  <span className="font-numeric font-semibold text-[#f8fafc] text-[11px]">
                    {formatRupiah(item.totalAmount)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
