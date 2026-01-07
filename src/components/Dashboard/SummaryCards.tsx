import React from 'react';
import { Package, ArrowUpRight, ShoppingCart, Activity } from 'lucide-react';

interface SummaryCardsProps {
    totalStock: number;
    totalIn: number;
    totalOut: number;
}

const SummaryCards: React.FC<SummaryCardsProps> = ({ totalStock, totalIn, totalOut }) => {
    const netMovement = totalIn - totalOut;

    return (
        <div className="filter-grid mb-8">
            <div className="card flex items-center gap-4">
                <div className="p-3 rounded-md" style={{ backgroundColor: 'rgba(88, 166, 255, 0.1)' }}>
                    <Package className="w-6 h-6 text-accent-primary" style={{ color: 'var(--accent-primary)' }} />
                </div>
                <div>
                    <p className="text-secondary text-sm font-bold">Total Stock</p>
                    <p className="text-xl font-bold">{totalStock.toLocaleString()}</p>
                </div>
            </div>

            <div className="card flex items-center gap-4">
                <div className="p-3 rounded-md" style={{ backgroundColor: 'rgba(35, 134, 54, 0.1)' }}>
                    <ArrowUpRight className="w-6 h-6" style={{ color: 'var(--success)' }} />
                </div>
                <div>
                    <p className="text-secondary text-sm font-bold">Total In</p>
                    <p className="text-xl font-bold" style={{ color: 'var(--success)' }}>+{totalIn.toLocaleString()}</p>
                </div>
            </div>

            <div className="card flex items-center gap-4">
                <div className="p-3 rounded-md" style={{ backgroundColor: 'rgba(163, 113, 247, 0.1)' }}>
                    <ShoppingCart className="w-6 h-6" style={{ color: '#a371f7' }} />
                </div>
                <div>
                    <p className="text-secondary text-sm font-bold">Total Sales</p>
                    <p className="text-xl font-bold" style={{ color: '#a371f7' }}>{totalOut.toLocaleString()}</p>
                </div>
            </div>

            <div className="card flex items-center gap-4">
                <div className="p-3 rounded-md" style={{ backgroundColor: 'rgba(210, 153, 34, 0.1)' }}>
                    <Activity className="w-6 h-6" style={{ color: 'var(--warning)' }} />
                </div>
                <div>
                    <p className="text-secondary text-sm font-bold">Net Movement</p>
                    <p className="text-xl font-bold" style={{ color: netMovement >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                        {netMovement > 0 ? '+' : ''}{netMovement.toLocaleString()}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SummaryCards;
