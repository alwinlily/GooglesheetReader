import React from 'react';
import { RefreshCcw, Download } from 'lucide-react';

interface HeaderProps {
    onRefresh: () => void;
    loading: boolean;
    onExportPDF?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onRefresh, loading, onExportPDF }) => {
    return (
        <header className="dashboard-header">
            <div>
                <h1 className="header-title">Inventory Dashboard</h1>
                <p className="header-subtitle">Real time data tracker. Jangan Lupa Update setiap hari!</p>
            </div>
            <div className="flex gap-3 items-center">
                <button
                    className="btn-header-refresh text-xs md:text-sm"
                    onClick={onRefresh}
                    disabled={loading}
                >
                    <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
                {onExportPDF && (
                    <button
                        className="btn-header-export text-xs md:text-sm"
                        onClick={onExportPDF}
                    >
                        <Download className="w-4 h-4" />
                        Export PDF
                    </button>
                )}
            </div>
        </header>
    );
};

export default Header;
