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
        <div className="card filter-grid mb-8">
            <div className="flex flex-col gap-1">
                <label className="text-secondary text-sm font-bold">Product</label>
                <select
                    className="btn"
                    value={selectedProduct}
                    onChange={(e) => onProductChange(e.target.value)}
                >
                    <option value="All">All Products</option>
                    {products.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
            </div>

            <div className="flex flex-col gap-1">
                <label className="text-secondary text-sm font-bold">Size</label>
                <select
                    className="btn"
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

            <div className="flex flex-col gap-1">
                <label className="text-secondary text-sm font-bold">Start Date</label>
                <input
                    type="date"
                    className="btn"
                    min={dateRange.min}
                    max={dateRange.max}
                    value={startDate}
                    onChange={(e) => onStartDateChange(e.target.value)}
                />
            </div>

            <div className="flex flex-col gap-1">
                <label className="text-secondary text-sm font-bold">End Date</label>
                <input
                    type="date"
                    className="btn"
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
