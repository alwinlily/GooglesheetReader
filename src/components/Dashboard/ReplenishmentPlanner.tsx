import React, { useState, useMemo, useEffect } from 'react';
import { Search, TriangleAlert, CirclePause, Calendar, CircleArrowDown, Info, TrendingDown } from 'lucide-react';
import type { InventoryRecord, Size } from '../../types/inventory';
import type { ProductMetadata } from '../../hooks/useInventoryData';

interface ReplenishmentPlannerProps {
    data: InventoryRecord[];
    productMetadata: Record<string, Record<string, ProductMetadata>>;
    startDate?: string;
    endDate?: string;
}

type ReplenishmentStatus = 'Out of Stock' | 'Order Soon' | 'Hold Order' | 'Stable';

interface PlannerItem {
    product: string;
    size: Size;
    currentStock: number;
    minStock: number; // Stores dynamic safety stock
    restockInterval: number; // Calculated restock cycle in days
    velocity: number;
    daysToStockOut: number;
    status: ReplenishmentStatus;
    daysToReorder: number;
    reorderDateStr: string | null;
    stockoutDateStr: string | null;
    suggestion: string;
    suggestedOrderQty: number;
}

const ReplenishmentPlanner: React.FC<ReplenishmentPlannerProps> = ({ data, productMetadata, startDate, endDate }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'All' | ReplenishmentStatus>('All');
    const [sortBy, setSortBy] = useState<'product' | 'size' | 'currentStock' | 'velocity' | 'restockInterval' | 'minStock' | 'daysToStockOut' | 'status'>('daysToStockOut');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [showExtraCols, setShowExtraCols] = useState(false);

    const [pageSize, setPageSize] = useState<number>(10);
    const [currentPage, setCurrentPage] = useState<number>(1);

    // Reset page to 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter, pageSize]);

    // Calculate unique product-size replenish items
    const plannerItems = useMemo(() => {
        if (data.length === 0) return [];

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Group data by product + size
        const groupedMap: Record<string, InventoryRecord[]> = {};
        const uniqueDates = new Set<string>();

        data.forEach(r => {
            uniqueDates.add(r.date);
            const key = `${r.product}|${r.size}`;
            if (!groupedMap[key]) {
                groupedMap[key] = [];
            }
            groupedMap[key].push(r);
        });

        // Calculate total calendar days in the selected range
        let totalDays = 1;
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;

        if (start && end && !isNaN(start.getTime()) && !isNaN(end.getTime())) {
            const diffTime = Math.abs(end.getTime() - start.getTime());
            totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        } else {
            // Fallback to min and max dates in data
            const dates = data.map(r => r.date).sort();
            if (dates.length > 0) {
                const minD = new Date(dates[0]);
                const maxD = new Date(dates[dates.length - 1]);
                const diffTime = Math.abs(maxD.getTime() - minD.getTime());
                totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            }
        }
        if (totalDays <= 0) totalDays = 1;

        // Process each product-size combination
        const items: PlannerItem[] = [];

        Object.entries(groupedMap).forEach(([key, records]) => {
            const [product, sizeStr] = key.split('|');
            const size = sizeStr as Size;

            // 1. Get latest valid stock
            const sortedRecords = [...records].sort((a, b) => b.date.localeCompare(a.date));
            const latestRecordWithStock = sortedRecords.find(r => r.stock !== null);
            const currentStock = latestRecordWithStock?.stock ?? 0;

            // 2. Calculate actual daily sales velocity (total out in selected range / calendar days)
            const filteredRecords = records.filter(r => 
                (!startDate || r.date >= startDate) && 
                (!endDate || r.date <= endDate)
            );
            const totalOut = filteredRecords.reduce((sum, r) => sum + r.out, 0);
            const velocity = totalOut / totalDays;

            // 3. Calculate restock cycle dynamically from history (average days between in > 0)
            const incomingRecords = [...records]
                .filter(r => r.in > 0)
                .sort((a, b) => a.date.localeCompare(b.date));

            let restockInterval = 30; // Default to 30 days (1 month) as standard safety window
            if (incomingRecords.length >= 2) {
                let totalDiffDays = 0;
                for (let i = 1; i < incomingRecords.length; i++) {
                    const prevD = new Date(incomingRecords[i - 1].date);
                    const currD = new Date(incomingRecords[i].date);
                    const diffTime = Math.abs(currD.getTime() - prevD.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    totalDiffDays += diffDays;
                }
                const avgInterval = totalDiffDays / (incomingRecords.length - 1);
                // Clamp cycle between 7 days (min) and 60 days (max) to avoid extreme outliers
                restockInterval = Math.max(7, Math.min(60, Math.round(avgInterval)));
            }

            // 4. Calculate dynamic safety stock (stok minimum aman)
            // Formula: Minimum Stock = Velocity * Restock Interval
            const minStock = velocity > 0 ? Math.ceil(velocity * restockInterval) : 0;

            // 5. Calculate suggested reorder quantity to cover 60 days (2 months) of sales
            const suggestedOrderQty = velocity > 0 ? Math.max(0, Math.ceil(velocity * 60) - currentStock) : 0;

            // 6. Calculate days to stockout
            const daysToStockOut = velocity > 0 ? (currentStock / velocity) : Infinity;

            // 7. Determine status based on days to stockout (60 days = 2 months threshold)
            let status: ReplenishmentStatus = 'Stable';
            if (currentStock <= 0) {
                status = 'Out of Stock';
            } else if (velocity === 0) {
                status = 'Stable';
            } else if (daysToStockOut < 60) {
                status = 'Order Soon';
            } else {
                status = 'Hold Order';
            }

            // 8. Calculate reorder time and suggestion messages
            let daysToReorder = 0;
            let reorderDateStr: string | null = null;
            let stockoutDateStr: string | null = null;
            let suggestion = '';

            // Formatting date helper
            const formatDateStr = (daysAhead: number) => {
                const targetDate = new Date(today);
                targetDate.setDate(today.getDate() + daysAhead);
                return targetDate.toLocaleDateString('id-ID', { month: 'short', day: 'numeric', year: 'numeric' });
            };

            if (status === 'Out of Stock') {
                suggestion = `Stok habis! Disarankan order ${suggestedOrderQty} unit hari ini untuk mengamankan stok 60 hari.`;
            } else if (status === 'Stable') {
                suggestion = 'Aman. Laju penjualan 0, tidak diperlukan pemesanan baru.';
            } else if (status === 'Hold Order') {
                suggestion = 'Tunda order, Stock cukup.';
            } else {
                // Determine stockout date
                if (daysToStockOut !== Infinity) {
                    stockoutDateStr = formatDateStr(Math.round(daysToStockOut));
                }

                // If stock is below dynamic min stock, order immediately
                if (currentStock <= minStock) {
                    suggestion = `Segera order! Stok saat ini (${currentStock}) di bawah batas aman (${minStock} unit). Disarankan order ${suggestedOrderQty} unit.`;
                    daysToReorder = 0;
                } else if (velocity > 0) {
                    // Y days to reorder = (Stock - MinStock) / Velocity
                    daysToReorder = Math.max(0, Math.floor((currentStock - minStock) / velocity));
                    reorderDateStr = formatDateStr(daysToReorder);

                    if (status === 'Order Soon') {
                        suggestion = `Order segera! Stok habis dalam ${Math.round(daysToStockOut)} hari (${stockoutDateStr}). Disarankan order ${suggestedOrderQty} unit.`;
                    }
                }
            }

            items.push({
                product,
                size,
                currentStock,
                minStock,
                restockInterval,
                velocity,
                daysToStockOut,
                status,
                daysToReorder,
                reorderDateStr,
                stockoutDateStr,
                suggestion,
                suggestedOrderQty
            });
        });

        return items;
    }, [data, productMetadata, startDate, endDate]);

    // Summary counts
    const summary = useMemo(() => {
        const counts = {
            total: 0,
            outOfStock: 0,
            orderSoon: 0,
            holdOrder: 0,
            stable: 0
        };

        plannerItems.forEach(item => {
            counts.total++;
            if (item.status === 'Out of Stock') counts.outOfStock++;
            else if (item.status === 'Order Soon') counts.orderSoon++;
            else if (item.status === 'Hold Order') counts.holdOrder++;
            else if (item.status === 'Stable') counts.stable++;
        });

        return counts;
    }, [plannerItems]);

    // Handle sort toggle
    const handleSort = (field: 'product' | 'size' | 'currentStock' | 'velocity' | 'restockInterval' | 'minStock' | 'daysToStockOut' | 'status') => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder(field === 'product' || field === 'size' || field === 'status' ? 'asc' : 'desc');
        }
    };

    // Filter and Sort items
    const filteredItems = useMemo(() => {
        return plannerItems
            .filter(item => {
                const matchesSearch = item.product.toLowerCase().includes(searchTerm.toLowerCase());
                const matchesStatus = statusFilter === 'All' || item.status === statusFilter;
                return matchesSearch && matchesStatus;
            })
            .sort((a, b) => {
                let valA: any = a[sortBy];
                let valB: any = b[sortBy];

                if (sortBy === 'currentStock') {
                    valA = a.currentStock;
                    valB = b.currentStock;
                } else if (sortBy === 'daysToStockOut') {
                    valA = a.daysToStockOut === Infinity ? 999999 : a.daysToStockOut;
                    valB = b.daysToStockOut === Infinity ? 999999 : b.daysToStockOut;
                }

                if (typeof valA === 'string') {
                    return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
                }

                if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
                if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
                return 0;
            });
    }, [plannerItems, searchTerm, statusFilter, sortBy, sortOrder]);

    // Paginate items
    const paginatedItems = useMemo(() => {
        const startIndex = (currentPage - 1) * pageSize;
        return filteredItems.slice(startIndex, startIndex + pageSize);
    }, [filteredItems, currentPage, pageSize]);

    const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));

    const getStatusBadge = (status: ReplenishmentStatus) => {
        switch (status) {
            case 'Out of Stock':
                return (
                    <span className="status-badge status-badge-out" data-tooltip="Stok produk kosong. Segera buat pemesanan untuk menghindari hilangnya potensi penjualan.">
                        <CircleArrowDown className="w-3.5 h-3.5 flex-shrink-0" />
                        Stok Habis
                    </span>
                );
            case 'Order Soon':
                return (
                    <span className="status-badge status-badge-soon" data-tooltip="Stok menipis dan akan habis dalam < 60 hari. Disarankan segera memesan ulang.">
                        <TriangleAlert className="w-3.5 h-3.5 flex-shrink-0" />
                        Order Segera
                    </span>
                );
            case 'Hold Order':
                return (
                    <span className="status-badge status-badge-hold" data-tooltip="Stok saat ini masih aman di atas batas safety stock. Belum perlu memesan.">
                        <Info className="w-3.5 h-3.5 flex-shrink-0" />
                        Tunda Order
                    </span>
                );
            case 'Stable':
                return (
                    <span className="status-badge status-badge-stable" data-tooltip="Stok stabil dan laju penjualan 0. Tidak diperlukan pemesanan baru.">
                        <CirclePause className="w-3.5 h-3.5 flex-shrink-0" />
                        Stabil
                    </span>
                );
        }
    };

    return (
        <div className="glass-card w-full shadow-soft relative overflow-hidden border border-[#334155]/80">
            {/* Visual glow blobs in background */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-[#3b82f6]/5 rounded-full blur-3xl -z-10 pointer-events-none" style={{ top: 0, right: 0 }}></div>
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#8b5cf6]/5 rounded-full blur-3xl -z-10 pointer-events-none" style={{ bottom: 0, left: 0 }}></div>

            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 border-b border-[#334155]/40 pb-5">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#8b5cf6]/10 to-[#3b82f6]/10 border border-[#3b82f6]/20">
                        <Calendar className="w-5 h-5 text-[#3b82f6]" />
                    </div>
                    <div>
                        <h3 className="text-[#64748b] text-[0.8rem] font-bold uppercase tracking-[0.1em] mb-0.5">
                            Perencanaan Pemesanan Ulang & Kecepatan Produk
                        </h3>
                        <p className="text-xs text-[#94a3b8] italic">
                            Kalkulasi stok minimum aman secara riil berdasarkan laju penambahan stok (siklus restok) dan kecepatan penjualan riil.
                        </p>
                    </div>
                </div>
            </div>

            {/* Quick Metrics Summary Tabs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div 
                    onClick={() => setStatusFilter('Order Soon')}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all duration-300 flex flex-col justify-between ${
                        statusFilter === 'Order Soon' 
                        ? 'bg-[#f59e0b]/10 border-[#f59e0b] shadow-[0_4px_20px_rgba(245,158,11,0.15)] transform -translate-y-0.5' 
                        : 'bg-[#1e293b] border-[#334155] hover:border-[#f59e0b]/30 hover:bg-[#2d3f55]'
                    }`}
                >
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] text-[#94a3b8] font-bold uppercase tracking-wider">Order Segera</span>
                        <div className="p-1 rounded-md bg-[#f59e0b]/10">
                            <TriangleAlert className="w-3.5 h-3.5 text-[#f59e0b]" />
                        </div>
                    </div>
                    <div>
                        <div className="text-[1.8rem] font-extrabold text-[#f59e0b] font-numeric leading-none">{summary.orderSoon}</div>
                        <div className="text-[10px] text-[#94a3b8]/60 mt-1.5">&lt; 60 Hari Habis</div>
                    </div>
                </div>

                <div 
                    onClick={() => setStatusFilter('Hold Order')}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all duration-300 flex flex-col justify-between ${
                        statusFilter === 'Hold Order' 
                        ? 'bg-[#3b82f6]/10 border-[#3b82f6] shadow-[0_4px_20px_rgba(59,130,246,0.15)] transform -translate-y-0.5' 
                        : 'bg-[#1e293b] border-[#334155] hover:border-[#3b82f6]/30 hover:bg-[#2d3f55]'
                    }`}
                >
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] text-[#94a3b8] font-bold uppercase tracking-wider">Tunda Order</span>
                        <div className="p-1 rounded-md bg-[#3b82f6]/10">
                            <Info className="w-3.5 h-3.5 text-[#3b82f6]" />
                        </div>
                    </div>
                    <div>
                        <div className="text-[1.8rem] font-extrabold text-[#3b82f6] font-numeric leading-none">{summary.holdOrder}</div>
                        <div className="text-[10px] text-[#94a3b8]/60 mt-1.5">&gt; 60 Hari Habis</div>
                    </div>
                </div>

                <div 
                    onClick={() => setStatusFilter('Out of Stock')}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all duration-300 flex flex-col justify-between ${
                        statusFilter === 'Out of Stock' 
                        ? 'bg-[#ef4444]/10 border-[#ef4444] shadow-[0_4px_20px_rgba(239,68,68,0.15)] transform -translate-y-0.5' 
                        : 'bg-[#1e293b] border-[#334155] hover:border-[#ef4444]/30 hover:bg-[#2d3f55]'
                    }`}
                >
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] text-[#94a3b8] font-bold uppercase tracking-wider">Stok Habis</span>
                        <div className="p-1 rounded-md bg-[#ef4444]/10">
                            <CircleArrowDown className="w-3.5 h-3.5 text-[#ef4444]" />
                        </div>
                    </div>
                    <div>
                        <div className="text-[1.8rem] font-extrabold text-[#ef4444] font-numeric leading-none">{summary.outOfStock}</div>
                        <div className="text-[10px] text-[#94a3b8]/60 mt-1.5">Kosong (0 unit)</div>
                    </div>
                </div>

                <div 
                    onClick={() => setStatusFilter('All')}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all duration-300 flex flex-col justify-between ${
                        statusFilter === 'All' 
                        ? 'bg-gradient-to-br from-[#1e293b] to-[#2d3f55]/40 border-[#f1f5f9]/30 shadow-soft transform -translate-y-0.5' 
                        : 'bg-[#1e293b] border-[#334155] hover:border-[#f1f5f9]/20 hover:bg-[#2d3f55]'
                    }`}
                >
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] text-[#94a3b8] font-bold uppercase tracking-wider">Total Item</span>
                        <div className="p-1 rounded-md bg-white/5">
                            <TrendingDown className="w-3.5 h-3.5 text-[#3b82f6]" />
                        </div>
                    </div>
                    <div>
                        <div className="text-[1.8rem] font-extrabold text-white font-numeric leading-none">{summary.total}</div>
                        <div className="text-[10px] text-[#94a3b8]/60 mt-1.5">Semua Kombinasi</div>
                    </div>
                </div>
            </div>

            {/* Filter and Search Controls */}
            <div className="flex flex-col lg:flex-row gap-4 items-center justify-between mb-6">
                <div className="flex flex-col sm:flex-row gap-3 items-center w-full lg:max-w-xl">
                    <div className="search-input-wrapper w-full">
                        <span className="search-icon-wrapper">
                            <Search className="w-4 h-4" />
                        </span>
                        <input
                            type="text"
                            placeholder="Cari produk berdasarkan nama..."
                            className="search-input"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => setShowExtraCols(!showExtraCols)}
                        className="btn-header-refresh text-xs py-2 px-3 whitespace-nowrap flex-shrink-0"
                        style={{ height: '38px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                        {showExtraCols ? 'Sembunyikan Laju & Siklus' : 'Tampilkan Laju & Siklus'}
                    </button>
                </div>

                <div className="filter-tabs-container flex-shrink-0">
                    <button 
                        onClick={() => setStatusFilter('All')}
                        className={`filter-tab ${statusFilter === 'All' ? 'active-all' : ''}`}
                    >
                        Semua
                    </button>
                    <button 
                        onClick={() => setStatusFilter('Order Soon')}
                        className={`filter-tab ${statusFilter === 'Order Soon' ? 'active-soon' : ''}`}
                    >
                        Order Segera
                    </button>
                    <button 
                        onClick={() => setStatusFilter('Hold Order')}
                        className={`filter-tab ${statusFilter === 'Hold Order' ? 'active-hold' : ''}`}
                    >
                        Tunda Order
                    </button>
                    <button 
                        onClick={() => setStatusFilter('Out of Stock')}
                        className={`filter-tab ${statusFilter === 'Out of Stock' ? 'active-out' : ''}`}
                    >
                        Stok Habis
                    </button>
                </div>
            </div>

            {/* Main Table */}
            <div className="overflow-x-auto border border-[#334155]/60 rounded-2xl bg-[#1e293b]/25">
                <table className="w-full text-xs planner-table min-w-[900px]">
                    <thead>
                        <tr className="bg-[#0f172a] text-[#64748b] text-xs uppercase tracking-wider border-b border-[#334155]">
                            <th className="py-4 px-5 text-left font-bold tracking-wider cursor-pointer hover:text-white uppercase text-[11px] col-product" onClick={() => handleSort('product')}>
                                Produk {sortBy === 'product' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                            </th>
                            <th className="py-4 px-3 text-center font-bold tracking-wider cursor-pointer hover:text-white uppercase text-[11px] col-size" onClick={() => handleSort('size')}>
                                Ukuran {sortBy === 'size' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                            </th>
                            <th className="py-4 px-4 text-right font-bold tracking-wider cursor-pointer hover:text-white uppercase text-[11px] col-stock" onClick={() => handleSort('currentStock')}>
                                Stok {sortBy === 'currentStock' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                            </th>
                            {showExtraCols && (
                                <>
                                    <th className="py-4 px-4 text-right font-bold tracking-wider cursor-pointer hover:text-white uppercase text-[11px] col-velocity" onClick={() => handleSort('velocity')}>
                                        Laju Jual {sortBy === 'velocity' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                                    </th>
                                    <th className="py-4 px-4 text-right font-bold tracking-wider cursor-pointer hover:text-white uppercase text-[11px] col-cycle" onClick={() => handleSort('restockInterval')}>
                                        Siklus {sortBy === 'restockInterval' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                                    </th>
                                </>
                            )}
                            <th className="py-4 px-4 text-right font-bold tracking-wider cursor-pointer hover:text-white uppercase text-[11px] col-min-stock" onClick={() => handleSort('minStock')}>
                                Stok Min Aman {sortBy === 'minStock' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                            </th>
                            <th className="py-4 px-4 text-right font-bold tracking-wider cursor-pointer hover:text-white uppercase text-[11px] col-stockout" onClick={() => handleSort('daysToStockOut')}>
                                Estimasi Habis {sortBy === 'daysToStockOut' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                            </th>
                            <th className="py-4 px-4 text-center font-bold tracking-wider cursor-pointer hover:text-white uppercase text-[11px] col-status" onClick={() => handleSort('status')}>
                                Status Indikator {sortBy === 'status' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                            </th>
                            <th className="py-4 px-5 text-left font-bold uppercase text-[11px] col-recommendation">Rekomendasi Rencana Pemesanan (Aksi & Estimasi Tanggal)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#334155]/40">
                        {paginatedItems.map(item => {
                            const showProgress = item.daysToStockOut !== Infinity && item.daysToStockOut > 0;
                            const progressWidth = showProgress ? Math.min(100, (item.daysToStockOut / 120) * 100) : 0;
                            
                            // Dynamic color classes based on stock level status
                            let barColorClass = 'bg-gradient-to-r from-[#10b981] to-[#059669] shadow-[0_0_8px_rgba(16,185,129,0.4)]';
                            if (item.status === 'Order Soon') {
                                barColorClass = 'bg-gradient-to-r from-[#f59e0b] to-orange-500 shadow-[0_0_8px_rgba(245,178,60,0.4)]';
                            } else if (item.status === 'Out of Stock') {
                                barColorClass = 'bg-[#ef4444]';
                            }
 
                            return (
                                <tr key={`${item.product}-${item.size}`}>
                                    <td className="py-4.5 px-5 font-bold text-white text-sm col-product">
                                        {item.product}
                                    </td>
                                    <td className="py-4.5 px-3 text-center col-size">
                                        <span className="px-2.5 py-1 rounded bg-[#334155]/45 text-[#cbd5e1] text-[11px] font-black border border-[#334155]">
                                            {item.size}
                                        </span>
                                    </td>
                                    <td className="py-4.5 px-4 text-right font-extrabold text-white font-numeric text-sm col-stock">
                                        {item.currentStock.toLocaleString()}
                                    </td>
                                    {showExtraCols && (
                                        <>
                                            <td className="py-4.5 px-4 text-right text-[#94a3b8] font-numeric font-medium text-sm col-velocity">
                                                {item.velocity.toFixed(2)}
                                                <span className="text-[10px] text-[#94a3b8]/40 block font-normal tracking-wide">(Riil)</span>
                                            </td>
                                            <td className="py-4.5 px-4 text-right text-white font-numeric font-semibold text-xs col-cycle">
                                                {item.restockInterval} Hari
                                            </td>
                                        </>
                                    )}
                                    <td className="py-4.5 px-4 text-right text-[#3b82f6] font-numeric font-extrabold text-sm col-min-stock">
                                        {item.minStock.toLocaleString()}
                                    </td>
                                    <td className="py-4.5 px-4 text-right col-stockout">
                                        {item.currentStock <= 0 ? (
                                            <span className="text-[#ff6b6b] font-bold text-xs">Habis</span>
                                        ) : item.daysToStockOut === Infinity ? (
                                            <span className="text-[#94a3b8]/50 italic font-medium text-xs">Stabil</span>
                                        ) : (
                                            <div className="flex flex-col items-end">
                                                <span className={`font-black font-numeric text-[0.875rem] ${item.status === 'Order Soon' ? 'text-[#fbbf24]' : 'text-[#4ade80]'}`}>
                                                    {Math.round(item.daysToStockOut)} Hari
                                                </span>
                                                <div className="w-16 h-1.5 bg-[#0f172a] rounded-full overflow-hidden mt-1.5 border border-[#334155]/40">
                                                    <div className={`h-full rounded-full ${barColorClass}`} style={{ width: `${progressWidth}%` }}></div>
                                                </div>
                                            </div>
                                        )}
                                    </td>
                                    <td className="py-4.5 px-4 text-center col-status">
                                        <div className="flex justify-center">
                                            {getStatusBadge(item.status)}
                                        </div>
                                    </td>
                                    <td className="py-4.5 px-5 text-left col-recommendation">
                                        <div 
                                            title={item.suggestion}
                                            className={`p-2.5 rounded-xl border leading-relaxed text-xs shadow-sm flex items-center gap-2 w-full ${
                                                item.status === 'Out of Stock' ? 'bg-[#ef4444]/10 border-[#ef4444]/20 text-[#fca5a5]' :
                                                item.status === 'Order Soon' ? 'bg-[#f59e0b]/10 border-[#f59e0b]/20 text-[#fde047]' :
                                                item.status === 'Hold Order' ? 'bg-[#3b82f6]/10 border-[#3b82f6]/20 text-[#93c5fd]' :
                                                'bg-white/5 border-[#334155] text-[#94a3b8]'
                                            }`}
                                        >
                                            <div className="flex-shrink-0">
                                                {item.status === 'Out of Stock' ? (
                                                    <CircleArrowDown className="w-3.5 h-3.5 text-[#ff6b6b] flex-shrink-0" />
                                                ) : item.status === 'Order Soon' ? (
                                                    <TriangleAlert className="w-3.5 h-3.5 animate-bounce text-[#fbbf24] flex-shrink-0" />
                                                ) : item.status === 'Hold Order' ? (
                                                    <Info className="w-3.5 h-3.5 text-[#60a5fa] flex-shrink-0" />
                                                ) : (
                                                    <CirclePause className="w-3.5 h-3.5 text-[#64748b] flex-shrink-0" />
                                                )}
                                            </div>
                                            <div className="text-ellipsis-clip flex-1">{item.suggestion}</div>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {filteredItems.length === 0 && (
                            <tr>
                                <td colSpan={showExtraCols ? 9 : 7} className="py-12 text-center text-[#94a3b8] italic text-xs">
                                    Tidak ada produk yang cocok dengan pencarian atau filter status.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            {filteredItems.length > 0 && (
                <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4 bg-[#1e293b]/30 p-4 rounded-2xl border border-[#334155]/40 text-xs text-[#94a3b8]">
                    <div className="flex items-center gap-3">
                        <span>Tampilkan</span>
                        <select
                            className="bg-[#0f172a] border border-[#334155] text-white rounded-lg px-2.5 py-1 focus:outline-none focus:border-[#3b82f6]"
                            value={pageSize}
                            onChange={(e) => {
                                setPageSize(Number(e.target.value));
                                setCurrentPage(1);
                            }}
                        >
                            <option value={10}>10 Baris</option>
                            <option value={25}>25 Baris</option>
                            <option value={50}>50 Baris</option>
                            <option value={100}>100 Baris</option>
                        </select>
                        <span>
                            Menampilkan {Math.min(filteredItems.length, (currentPage - 1) * pageSize + 1)} - {Math.min(filteredItems.length, currentPage * pageSize)} dari {filteredItems.length} item
                        </span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                        <button
                            className="btn py-1 px-2.5 bg-[#0f172a] border border-[#334155] rounded-lg text-[#94a3b8] hover:text-white disabled:opacity-40 disabled:pointer-events-none"
                            onClick={() => setCurrentPage(1)}
                            disabled={currentPage === 1}
                        >
                            « First
                        </button>
                        <button
                            className="btn py-1 px-2.5 bg-[#0f172a] border border-[#334155] rounded-lg text-[#94a3b8] hover:text-white disabled:opacity-40 disabled:pointer-events-none"
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                        >
                            ‹ Prev
                        </button>
                        
                        <div className="flex items-center gap-1 font-bold text-white px-2">
                            <span>Halaman {currentPage} dari {totalPages}</span>
                        </div>

                        <button
                            className="btn py-1 px-2.5 bg-[#0f172a] border border-[#334155] rounded-lg text-[#94a3b8] hover:text-white disabled:opacity-40 disabled:pointer-events-none"
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                        >
                            Next ›
                        </button>
                        <button
                            className="btn py-1 px-2.5 bg-[#0f172a] border border-[#334155] rounded-lg text-[#94a3b8] hover:text-white disabled:opacity-40 disabled:pointer-events-none"
                            onClick={() => setCurrentPage(totalPages)}
                            disabled={currentPage === totalPages}
                        >
                            Last »
                        </button>
                    </div>
                </div>
            )}

            {/* Premium Info Legend Card */}
            <div className="mt-6 p-4 bg-white/[0.02] border border-[#334155]/60 rounded-2xl flex items-start gap-3 text-xs text-[#94a3b8] leading-relaxed">
                <Info className="w-4 h-4 text-[#3b82f6] flex-shrink-0 mt-0.5" />
                <div>
                    <span className="font-extrabold text-white block mb-1 uppercase tracking-wider text-[10px]">Panduan Kriteria Kecepatan Pemesanan Ulang:</span>
                    <ul className="list-disc pl-4 space-y-1 text-[#94a3b8]/80">
                        <li><strong>Stok Min Aman (Safety Stock)</strong>: Batas minimum stok sebelum Anda kehabisan barang. Nilai ini dihitung secara riil menggunakan rumus: **Laju Jual/Hari x Siklus Restok**.</li>
                        <li><strong>Siklus Restok</strong>: Rata-rata jeda waktu dalam hari antara penambahan stok masuk ('in &gt; 0') di masa lalu. Jika data historis terbatas, sistem secara otomatis menetapkan default **30 Hari (1 Bulan)** sebagai asumsi siklus tunggu pengiriman Anda agar tetap aman.</li>
                        <li><strong>Rekomendasi Jumlah Order</strong>: Dihitung secara cerdas menggunakan selisih antara proyeksi penjualan 60 hari ke depan dengan stok saat ini: **(Laju Jual/Hari x 60 Hari) - Stok Saat Ini**. Hal ini dirancang khusus agar Anda tidak melakukan *over-ordering* untuk produk yang penjualannya lambat (*slow-moving*).</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default ReplenishmentPlanner;
