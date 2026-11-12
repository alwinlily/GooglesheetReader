import React, { useState, useMemo } from 'react';
import type { ReactNode } from 'react';
import { Search, TriangleAlert, CirclePause, Calendar, CircleArrowDown, Info, TrendingDown, Package } from 'lucide-react';
import type { InventoryRecord, Size } from '../../types/inventory';
import type { ProductMetadata } from '../../hooks/useInventoryData';
import type { OrderRecord } from '../../types/order';
import { findActiveOrderForProduct } from '../../utils/productMatching';
import { formatFullDate } from '../../utils/dateUtils';

interface ReplenishmentPlannerProps {
    data: InventoryRecord[];
    productMetadata: Record<string, Record<string, ProductMetadata>>;
    orders?: OrderRecord[];
    startDate?: string;
    endDate?: string;
    children?: ReactNode;
}

export type ReplenishmentStatus = 'Out of Stock' | 'Order Soon' | 'On Order' | 'Hold Order' | 'Stable';

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
    isOnOrder: boolean;
    orderedQty: number;
    latestOrderDate: string | null;
    latestVendor: string | null;
}

const ReplenishmentPlanner: React.FC<ReplenishmentPlannerProps> = ({ data, orders = [], startDate, endDate, children }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'All' | ReplenishmentStatus>('All');
    const [sortBy, setSortBy] = useState<'product' | 'size' | 'currentStock' | 'velocity' | 'restockInterval' | 'minStock' | 'daysToStockOut' | 'status'>('daysToStockOut');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [showExtraCols, setShowExtraCols] = useState(false);

    const [pageSize, setPageSize] = useState<number>(10);
    const [currentPage, setCurrentPage] = useState<number>(1);

    const [prevSearchTerm, setPrevSearchTerm] = useState(searchTerm);
    const [prevStatusFilter, setPrevStatusFilter] = useState(statusFilter);
    const [prevPageSize, setPrevPageSize] = useState(pageSize);

    if (searchTerm !== prevSearchTerm || statusFilter !== prevStatusFilter || pageSize !== prevPageSize) {
        setPrevSearchTerm(searchTerm);
        setPrevStatusFilter(statusFilter);
        setPrevPageSize(pageSize);
        setCurrentPage(1);
    }

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

            // 7. Check if item has already been ordered in Order Tracker (Status: In Production)
            const activeOrderInfo = findActiveOrderForProduct(product, size, orders);
            const { isOnOrder, totalOrderedQty: orderedQty, latestOrderDate, latestVendor } = activeOrderInfo;

            // 8. Determine status based on active order or days to stockout (60 days = 2 months threshold)
            let status: ReplenishmentStatus = 'Stable';
            if (isOnOrder) {
                status = 'On Order';
            } else if (currentStock <= 0) {
                status = 'Out of Stock';
            } else if (velocity === 0) {
                status = 'Stable';
            } else if (daysToStockOut < 60) {
                status = 'Order Soon';
            } else {
                status = 'Hold Order';
            }

            // 9. Calculate reorder time and suggestion messages
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

            if (status === 'On Order') {
                const vendorPart = latestVendor ? ` ke vendor ${latestVendor}` : '';
                const datePart = latestOrderDate ? ` pada tanggal ${formatFullDate(latestOrderDate)}` : '';
                suggestion = `Barang sudah diorder sebanyak ${orderedQty.toLocaleString('id-ID')} pcs di Order Tracker (Status: Dalam Produksi)${vendorPart}${datePart}. Stok saat ini: ${currentStock.toLocaleString('id-ID')} unit (Batas aman: ${minStock.toLocaleString('id-ID')} unit).`;
            } else if (status === 'Out of Stock') {
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
                suggestedOrderQty,
                isOnOrder,
                orderedQty,
                latestOrderDate,
                latestVendor
            });
        });

        return items;
    }, [data, startDate, endDate, orders]);

    // Summary counts
    const summary = useMemo(() => {
        const counts = {
            total: 0,
            outOfStock: 0,
            orderSoon: 0,
            onOrder: 0,
            holdOrder: 0,
            stable: 0
        };

        plannerItems.forEach(item => {
            counts.total++;
            if (item.status === 'Out of Stock') counts.outOfStock++;
            else if (item.status === 'Order Soon') counts.orderSoon++;
            else if (item.status === 'On Order') counts.onOrder++;
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
        const statusPriority: Record<ReplenishmentStatus, number> = {
            'Out of Stock': 1,
            'Order Soon': 2,
            'On Order': 3,
            'Hold Order': 4,
            'Stable': 5,
        };

        return plannerItems
            .filter(item => {
                const matchesSearch = item.product.toLowerCase().includes(searchTerm.toLowerCase());
                const matchesStatus = statusFilter === 'All'
                    || item.status === statusFilter
                    || (statusFilter === 'Hold Order' && item.status === 'Stable');
                return matchesSearch && matchesStatus;
            })
            .sort((a, b) => {
                let valA: string | number = a[sortBy];
                let valB: string | number = b[sortBy];

                if (sortBy === 'status') {
                    valA = statusPriority[a.status] ?? 99;
                    valB = statusPriority[b.status] ?? 99;
                } else if (sortBy === 'currentStock') {
                    valA = a.currentStock;
                    valB = b.currentStock;
                } else if (sortBy === 'daysToStockOut') {
                    valA = a.daysToStockOut === Infinity ? 999999 : a.daysToStockOut;
                    valB = b.daysToStockOut === Infinity ? 999999 : b.daysToStockOut;
                }

                if (typeof valA === 'string' && typeof valB === 'string') {
                    return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
                }

                if (typeof valA === 'number' && typeof valB === 'number') {
                    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
                    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
                }
                return 0;
            });
    }, [plannerItems, searchTerm, statusFilter, sortBy, sortOrder]);

    // Paginate items
    const paginatedItems = useMemo(() => {
        const startIndex = (currentPage - 1) * pageSize;
        return filteredItems.slice(startIndex, startIndex + pageSize);
    }, [filteredItems, currentPage, pageSize]);

    const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));

    if (currentPage > totalPages) setCurrentPage(totalPages);

    const getStatusBadge = (item: PlannerItem) => {
        switch (item.status) {
            case 'On Order':
                return (
                    <span 
                        className="status-badge status-badge-ordered" 
                        data-tooltip={`Barang sudah diorder (${item.orderedQty.toLocaleString('id-ID')} pcs) di Order Tracker. Status: Dalam Produksi.`}
                    >
                        <Package className="w-3.5 h-3.5 flex-shrink-0" />
                        Sudah Diorder
                    </span>
                );
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
                    <span className="status-badge !bg-[#22c55e]/10 !border-[#22c55e]/30 !text-[#86efac]" data-tooltip="Stok saat ini masih aman di atas batas safety stock. Belum perlu memesan.">
                        <Info className="w-3.5 h-3.5 flex-shrink-0" />
                        Tunda Order
                    </span>
                );
            case 'Stable':
                return (
                    <span className="status-badge !bg-[#22c55e]/10 !border-[#22c55e]/30 !text-[#86efac]" data-tooltip="Stok stabil dan laju penjualan 0. Tidak diperlukan pemesanan baru.">
                        <CirclePause className="w-3.5 h-3.5 flex-shrink-0" />
                        Stabil
                    </span>
                );
        }
    };

    return (
        <section className="planner-section w-full">
            <div className="flex flex-wrap gap-2 mb-6" aria-label="Filter status pemesanan">
                <button type="button"
                    onClick={() => setStatusFilter('Order Soon')}
                    aria-pressed={statusFilter === 'Order Soon'}
                    className={`min-h-10 px-3 py-2 rounded-xl border cursor-pointer transition-colors flex items-center gap-2 ${
                        statusFilter === 'Order Soon' 
                        ? 'bg-[#f59e0b]/10 border-[#f59e0b]'
                        : 'bg-[#1e293b] border-[#334155] hover:border-[#f59e0b]/50'
                    }`}
                >
                    <TriangleAlert className="w-4 h-4 text-[#f59e0b]" />
                    <span className="text-xs text-[#cbd5e1] font-bold">Order Segera</span>
                    <span className="text-sm text-[#fbbf24] font-extrabold font-numeric">{summary.orderSoon}</span>
                </button>

                <button type="button"
                    onClick={() => setStatusFilter('On Order')}
                    aria-pressed={statusFilter === 'On Order'}
                    className={`min-h-10 px-3 py-2 rounded-xl border cursor-pointer transition-colors flex items-center gap-2 ${
                        statusFilter === 'On Order'
                        ? 'bg-[#0284c7]/20 border-[#38bdf8]'
                        : 'bg-[#1e293b] border-[#334155] hover:border-[#38bdf8]/50'
                    }`}
                >
                    <Package className="w-4 h-4 text-[#38bdf8]" />
                    <span className="text-xs text-[#cbd5e1] font-bold">Sudah Diorder</span>
                    <span className="text-sm text-[#38bdf8] font-extrabold font-numeric">{summary.onOrder}</span>
                </button>

                <button type="button"
                    onClick={() => setStatusFilter('Out of Stock')}
                    aria-pressed={statusFilter === 'Out of Stock'}
                    className={`min-h-10 px-3 py-2 rounded-xl border cursor-pointer transition-colors flex items-center gap-2 ${
                        statusFilter === 'Out of Stock'
                        ? 'bg-[#ef4444]/10 border-[#ef4444]'
                        : 'bg-[#1e293b] border-[#334155] hover:border-[#ef4444]/50'
                    }`}
                >
                    <CircleArrowDown className="w-4 h-4 text-[#ef4444]" />
                    <span className="text-xs text-[#cbd5e1] font-bold">Stok Habis</span>
                    <span className="text-sm text-[#f87171] font-extrabold font-numeric">{summary.outOfStock}</span>
                </button>

                <button type="button"
                    onClick={() => setStatusFilter('Hold Order')}
                    aria-pressed={statusFilter === 'Hold Order'}
                    className={`min-h-10 px-3 py-2 rounded-xl border cursor-pointer transition-colors flex items-center gap-2 ${
                        statusFilter === 'Hold Order'
                        ? 'bg-[#22c55e]/10 border-[#22c55e]'
                        : 'bg-[#1e293b] border-[#334155] hover:border-[#22c55e]/50'
                    }`}
                >
                    <CirclePause className="w-4 h-4 text-[#22c55e]" />
                    <span className="text-xs text-[#cbd5e1] font-bold">Tunda</span>
                    <span className="text-sm text-[#4ade80] font-extrabold font-numeric">{summary.holdOrder + summary.stable}</span>
                </button>

                <button type="button"
                    onClick={() => setStatusFilter('All')}
                    aria-pressed={statusFilter === 'All'}
                    className={`min-h-10 px-3 py-2 rounded-xl border cursor-pointer transition-colors flex items-center gap-2 ${
                        statusFilter === 'All' 
                        ? 'bg-white/10 border-[#94a3b8]'
                        : 'bg-[#1e293b] border-[#334155] hover:border-[#94a3b8]/50'
                    }`}
                >
                    <TrendingDown className="w-4 h-4 text-[#94a3b8]" />
                    <span className="text-xs text-[#cbd5e1] font-bold">Semua</span>
                    <span className="text-sm text-white font-extrabold font-numeric">{summary.total}</span>
                </button>
            </div>

            {children && <div className="mb-8">{children}</div>}

            <div className="glass-card w-full shadow-soft border border-[#334155]/80">

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-[#334155]/40 pb-5">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-white/5 border border-[#334155]">
                        <Calendar className="w-5 h-5 text-[#94a3b8]" />
                    </div>
                    <div>
                        <h3 className="text-[#64748b] text-[0.8rem] font-bold uppercase tracking-[0.1em] mb-0.5">
                            Rencana Pemesanan
                        </h3>
                        <p className="text-xs text-[#94a3b8]">
                            Stok minimum dihitung dari laju penjualan dan siklus restok aktual.
                        </p>
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
                        onClick={() => setStatusFilter('On Order')}
                        className={`filter-tab ${statusFilter === 'On Order' ? 'active-ordered' : ''}`}
                    >
                        Sudah Diorder
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
            <div className="max-h-[65vh] overflow-auto border border-[#334155]/60 rounded-2xl bg-[#1e293b]/25">
                <table className="w-full text-xs planner-table min-w-[1080px]">
                    <thead className="sticky top-0 z-10">
                        <tr className="bg-[#0f172a] text-[#64748b] text-xs uppercase tracking-wider border-b border-[#334155]">
                            <th className="py-4 px-5 text-left font-bold tracking-wider cursor-pointer hover:text-white uppercase text-xs col-product" onClick={() => handleSort('product')}>
                                Produk {sortBy === 'product' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                            </th>
                            <th className="py-4 px-3 text-center font-bold tracking-wider cursor-pointer hover:text-white uppercase text-xs col-size" onClick={() => handleSort('size')}>
                                Ukuran {sortBy === 'size' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                            </th>
                            <th className="py-4 px-4 text-right font-bold tracking-wider cursor-pointer hover:text-white uppercase text-xs col-stock" onClick={() => handleSort('currentStock')}>
                                Stok {sortBy === 'currentStock' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                            </th>
                            {showExtraCols && (
                                <>
                                    <th className="py-4 px-4 text-right font-bold tracking-wider cursor-pointer hover:text-white uppercase text-xs col-velocity" onClick={() => handleSort('velocity')}>
                                        Laju Jual {sortBy === 'velocity' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                                    </th>
                                    <th className="py-4 px-4 text-right font-bold tracking-wider cursor-pointer hover:text-white uppercase text-xs col-cycle" onClick={() => handleSort('restockInterval')}>
                                        Siklus {sortBy === 'restockInterval' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                                    </th>
                                </>
                            )}
                            <th className="py-4 px-4 text-right font-bold tracking-wider cursor-pointer hover:text-white uppercase text-xs col-min-stock" onClick={() => handleSort('minStock')}>
                                Stok Min Aman {sortBy === 'minStock' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                            </th>
                            <th className="py-4 px-4 text-right font-bold tracking-wider cursor-pointer hover:text-white uppercase text-xs col-stockout" onClick={() => handleSort('daysToStockOut')}>
                                Estimasi Habis {sortBy === 'daysToStockOut' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                            </th>
                            <th className="py-4 px-4 text-center font-bold tracking-wider cursor-pointer hover:text-white uppercase text-xs col-status" onClick={() => handleSort('status')}>
                                Status Indikator {sortBy === 'status' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                            </th>
                            <th className="py-4 px-4 text-right font-bold uppercase text-xs">Order</th>
                            <th className="py-4 px-4 text-left font-bold uppercase text-xs">Batas Order</th>

                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#334155]/40">
                        {paginatedItems.map(item => (
                                <tr key={`${item.product}-${item.size}`} className="odd:bg-white/[0.025] even:bg-transparent hover:bg-white/[0.05]">
                                    <td className="py-4.5 px-5 font-bold text-white text-sm col-product">
                                        {item.product}

                                        <details className="group max-w-sm text-xs font-normal mt-1 whitespace-normal">
                                            <summary className="cursor-pointer text-[#cbd5e1] font-semibold hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#10b981] rounded">
                                                Lihat detail
                                            </summary>
                                            <p className="mt-2 leading-relaxed text-[#94a3b8]">{item.suggestion}</p>
                                        </details>

                                    </td>
                                    <td className="py-4.5 px-3 text-center col-size">
                                        <span className="px-2.5 py-1 rounded bg-[#334155]/45 text-[#cbd5e1] text-xs font-black border border-[#334155]">
                                            {item.size}
                                        </span>
                                    </td>
                                    <td className="py-4.5 px-4 text-right font-extrabold text-white font-numeric text-sm col-stock">
                                        {item.currentStock.toLocaleString('id-ID')} pcs
                                    </td>
                                    {showExtraCols && (
                                        <>
                                            <td className="py-4.5 px-4 text-right text-[#94a3b8] font-numeric font-medium text-sm col-velocity">
                                                {item.velocity.toLocaleString('id-ID', { maximumFractionDigits: 2 })} pcs/hari
                                            </td>
                                            <td className="py-4.5 px-4 text-right text-white font-numeric font-semibold text-xs col-cycle">
                                                {item.restockInterval.toLocaleString('id-ID')} hari
                                            </td>
                                        </>
                                    )}
                                    <td className="py-4.5 px-4 text-right text-[#cbd5e1] font-numeric font-semibold text-sm col-min-stock">
                                        {item.minStock.toLocaleString('id-ID')} pcs
                                    </td>
                                    <td className="py-4.5 px-4 text-right col-stockout">
                                        {item.currentStock <= 0 ? (
                                            <span className="text-[#cbd5e1] font-medium text-xs">Habis</span>
                                        ) : item.daysToStockOut === Infinity ? (
                                            <span className="text-[#94a3b8]/50 italic font-medium text-xs">Stabil</span>
                                        ) : (
                                            <div className="flex flex-col items-end">
                                                <span className="font-semibold font-numeric text-sm text-[#cbd5e1]">
                                                    {Math.round(item.daysToStockOut).toLocaleString('id-ID')} hari
                                                </span>
                                            </div>
                                        )}
                                    </td>
                                    <td className="py-4.5 px-4 text-center col-status">
                                        <div className="flex justify-center">
                                            {getStatusBadge(item)}
                                        </div>
                                    </td>
                                    <td className="py-4.5 px-4 text-right text-[#cbd5e1] font-semibold whitespace-nowrap">
                                        {item.status === 'On Order' ? (
                                            <div className="flex flex-col items-end">
                                                <span className="font-bold text-[#38bdf8] font-numeric">
                                                    {item.orderedQty.toLocaleString('id-ID')} pcs
                                                </span>
                                                <span className="text-[10px] text-[#94a3b8] font-medium">dipesan</span>
                                            </div>
                                        ) : (
                                            `${item.suggestedOrderQty.toLocaleString('id-ID')} pcs`
                                        )}
                                    </td>
                                    <td className="py-4.5 px-4 text-left text-[#cbd5e1] whitespace-nowrap">
                                        {item.status === 'On Order' ? (
                                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium text-[#38bdf8] bg-[#0284c7]/10 border border-[#38bdf8]/20">
                                                <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8] animate-pulse"></span>
                                                Dalam Produksi
                                            </span>
                                        ) : item.status === 'Out of Stock' || (item.status === 'Order Soon' && item.daysToReorder === 0)
                                            ? 'Hari ini'
                                            : item.reorderDateStr ?? '—'}
                                    </td>

                                </tr>
                            ))}
                        {filteredItems.length === 0 && (
                            <tr>
                                <td colSpan={showExtraCols ? 10 : 8} className="py-12 text-center text-[#94a3b8] italic text-xs">
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
                <Info className="w-4 h-4 text-[#94a3b8] flex-shrink-0 mt-0.5" />
                <div>
                    <span className="font-extrabold text-white block mb-1 uppercase tracking-wider text-xs">Panduan Kriteria Kecepatan Pemesanan Ulang:</span>
                    <ul className="list-disc pl-4 space-y-1 text-[#94a3b8]/80">
                        <li><strong>Stok Min Aman (Safety Stock)</strong>: Batas minimum stok sebelum Anda kehabisan barang. Rumus: <strong>Laju Jual/Hari × Siklus Restok</strong>.</li>
                        <li><strong>Siklus Restok</strong>: Rata-rata jeda hari antara stok masuk di masa lalu. Jika data historis terbatas, sistem memakai asumsi <strong>30 hari (1 bulan)</strong>.</li>
                        <li><strong>Rekomendasi Jumlah Order</strong>: Selisih antara proyeksi penjualan 60 hari dan stok saat ini: <strong>(Laju Jual/Hari × 60 Hari) − Stok Saat Ini</strong>. Rumus ini membantu mengurangi pesanan berlebih untuk produk yang bergerak lambat.</li>
                    </ul>
                </div>
            </div>
            </div>
        </section>
    );
};

export default ReplenishmentPlanner;
