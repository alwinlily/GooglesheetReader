import React from 'react';
import type { Size } from '../../types/inventory';

interface FiltersProps {
    products: string[];
    selectedProduct: string;
    onProductChange: (product: string) => void;
    selectedSize: Size | 'All';
    onSizeChange: (size: Size | 'All') => void;
    dateRange: { min: string; max: string };
    startDate: string;
    endDate: string;
    onStartDateChange: (date: string) => void;
    onEndDateChange: (date: string) => void;
}

const Filters: React.FC<FiltersProps> = ({
    products,
    selectedProduct,
    onProductChange,
    selectedSize,
    onSizeChange,
    dateRange,
    startDate,
    endDate,
    onStartDateChange,
    onEndDateChange,
}) => {
    return (
        <div className="card filter-grid mb-8 border-b border-[#334155]/60 pb-6">
            <div className="flex flex-col gap-2">
                <label className="text-[#94a3b8] text-[0.8rem] font-bold uppercase tracking-wider">Product</label>
                <select
                    className="btn bg-[#0f172a] border border-[#334155] text-[#f1f5f9] focus:outline-none focus:border-[#3b82f6] px-3 py-2 text-xs w-full"
                    value={selectedProduct}
                    onChange={(e) => onProductChange(e.target.value)}
                >
                    <option value="All">All Products</option>
                    {products.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
            </div>

            <div className="flex flex-col gap-2">
                <label className="text-[#94a3b8] text-[0.8rem] font-bold uppercase tracking-wider">Size</label>
                <select
                    className="btn bg-[#0f172a] border border-[#334155] text-[#f1f5f9] focus:outline-none focus:border-[#3b82f6] px-3 py-2 text-xs w-full"
                    value={selectedSize}
                    onChange={(e) => onSizeChange(e.target.value as Size | 'All')}
                >
                    <option value="All">All Sizes</option>
                    <option value="S">S</option>
                    <option value="M">M</option>
                    <option value="L">L</option>
                    <option value="XL">XL</option>
                    <option value="XXL">XXL</option>
                </select>
            </div>

            <div className="flex flex-col gap-2">
                <label className="text-[#94a3b8] text-[0.8rem] font-bold uppercase tracking-wider">Start Date</label>
                <input
                    type="date"
                    className="btn bg-[#0f172a] border border-[#334155] text-[#f1f5f9] focus:outline-none focus:border-[#3b82f6] px-3 py-2 text-xs w-full"
                    min={dateRange.min}
                    max={dateRange.max}
                    value={startDate}
                    onChange={(e) => onStartDateChange(e.target.value)}
                />
            </div>

            <div className="flex flex-col gap-2">
                <label className="text-[#94a3b8] text-[0.8rem] font-bold uppercase tracking-wider">End Date</label>
                <input
                    type="date"
                    className="btn bg-[#0f172a] border border-[#334155] text-[#f1f5f9] focus:outline-none focus:border-[#3b82f6] px-3 py-2 text-xs w-full"
                    min={dateRange.min}
                    max={dateRange.max}
                    value={endDate}
                    onChange={(e) => onEndDateChange(e.target.value)}
                />
            </div>
        </div>
    );
};

export default Filters;
