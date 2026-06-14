import React from 'react';
import { Download, RefreshCcw } from 'lucide-react';

interface HeaderProps {
    onExport: () => void;
    onRefresh: () => void;
    loading: boolean;
}

const Header: React.FC<HeaderProps> = ({ onExport, onRefresh, loading }) => {
    return (
        <header className="dashboard-header">
            <div>
                <h1 className="header-title">Inventory Dashboard</h1>
                <p className="header-subtitle">Real-time inventory movement from Google Sheets</p>
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
                <button
                    className="btn-header-export text-xs md:text-sm"
                    onClick={onExport}
                >
                    <Download className="w-4 h-4" />
                    Export PDF
                </button>
            </div>
        </header>
    );
};

export default Header;
