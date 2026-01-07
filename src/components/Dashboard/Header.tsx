import React from 'react';
import { Download, RefreshCcw } from 'lucide-react';

interface HeaderProps {
    onExport: () => void;
    onRefresh: () => void;
    loading: boolean;
}

const Header: React.FC<HeaderProps> = ({ onExport, onRefresh, loading }) => {
    return (
        <header className="flex justify-between items-center mb-8">
            <div>
                <h1 className="text-xl font-bold">Inventory Dashboard</h1>
                <p className="text-secondary text-sm">Real-time inventory movement from Google Sheets</p>
            </div>
            <div className="flex gap-2">
                <button
                    className="btn"
                    onClick={onRefresh}
                    disabled={loading}
                >
                    <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
                <button
                    className="btn btn-primary"
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
