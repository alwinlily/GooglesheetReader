import React from 'react';
import { Package, ArrowUpRight, ShoppingCart, Activity } from 'lucide-react';

interface SummaryCardsProps {
    totalStock: number;
    totalIn: number;
    totalOut: number;
    totalReturn?: number;
}

const SummaryCards: React.FC<SummaryCardsProps> = ({ totalStock, totalIn, totalOut, totalReturn = 0 }) => {
    return (
        <div className="filter-grid mb-8">
            {/* Total Stock */}
            <div className="kpi-card kpi-card-stock">
                <div className="p-3 rounded-xl bg-[#3b82f6]/10">
                    <Package className="w-6 h-6 text-[#3b82f6]" />
                </div>
                <div>
                    <p className="kpi-label">Total Stock</p>
                    <p className="kpi-value font-numeric">{totalStock.toLocaleString()}</p>
                </div>
            </div>

            {/* Total In */}
            <div className="kpi-card kpi-card-in">
                <div className="p-3 rounded-xl bg-[#10b981]/10">
                    <ArrowUpRight className="w-6 h-6 text-[#10b981]" />
                </div>
                <div>
                    <p className="kpi-label">Total In</p>
                    <p className="kpi-value font-numeric">+{totalIn.toLocaleString()}</p>
                </div>
            </div>

            {/* Total Sales */}
            <div className="kpi-card kpi-card-sales">
                <div className="p-3 rounded-xl bg-[#f59e0b]/10">
                    <ShoppingCart className="w-6 h-6 text-[#f59e0b]" />
                </div>
                <div>
                    <p className="kpi-label">Total Sales</p>
                    <p className="kpi-value font-numeric">{totalOut.toLocaleString()}</p>
                </div>
            </div>

            {/* Total Returned */}
            <div className="kpi-card kpi-card-returned">
                <div className="p-3 rounded-xl bg-[#8b5cf6]/10">
                    <Activity className="w-6 h-6 text-[#8b5cf6]" />
                </div>
                <div>
                    <p className="kpi-label">Total Returned</p>
                    <p className="kpi-value font-numeric">
                        +{totalReturn.toLocaleString()}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SummaryCards;
