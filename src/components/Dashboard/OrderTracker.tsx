import React, { useState, useMemo, useEffect } from 'react';
import { 
  Package, 
  CheckCircle, 
  AlertTriangle, 
  Search,
  Filter,
  XCircle,
  Activity
} from 'lucide-react';
import type { OrderRecord } from '../../types/order';
import { OrderAccuracyChart } from '../Charts/OrderAccuracyChart';
import { KonveksiPerformanceChart } from '../Charts/KonveksiPerformanceChart';
import { formatFullDate } from '../../utils/dateUtils';

interface OrderTrackerProps {
  orders: OrderRecord[];
  loading: boolean;
  error: string | null;
  uniqueKonveksi: string[];
}

const getFulfillmentDuration = (dateOrder: string, dateReceived: string | null) => {
  if (!dateOrder || !dateReceived) return 'Belum tersedia';

  const start = new Date(`${dateOrder}T00:00:00Z`);
  const end = new Date(`${dateReceived}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 'Belum tersedia';

  const days = Math.floor((end.getTime() - start.getTime()) / 86_400_000);
  return days < 0 ? 'Belum tersedia' : `${days.toLocaleString('id-ID')} hari`;
};

export const OrderTracker: React.FC<OrderTrackerProps> = ({ 
  orders, 
  loading, 
  error,
  uniqueKonveksi
}) => {
  // --- States for Active Production Section ---
  const [activeVendorFilter, setActiveVendorFilter] = useState('All');
  const [activeAgeFilter, setActiveAgeFilter] = useState('All');
  const [collapsedBatches, setCollapsedBatches] = useState<Record<string, boolean>>({});

  // --- States for Fulfillment Alerts Section ---
  const [showAllDiscrepancies, setShowAllDiscrepancies] = useState(false);

  // --- States for Ledger Section ---
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVendor, setSelectedVendor] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [sortField, setSortField] = useState<keyof OrderRecord>('dateOrder');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 50;

  // Reset page when ledger filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedVendor, selectedStatus]);

  useEffect(() => {
    if (selectedVendor !== 'All' && !uniqueKonveksi.includes(selectedVendor)) {
      setSelectedVendor('All');
    }
  }, [selectedVendor, uniqueKonveksi]);



  // Helper: calculate days elapsed since order date
  const getDaysElapsed = (dateStr: string) => {
    if (!dateStr) return null;
    const start = new Date(dateStr);
    if (Number.isNaN(start.getTime())) return null;
    const today = new Date();
    const diff = today.getTime() - start.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    return days >= 0 ? days : 0;
  };

  const missingOrderDates = useMemo(
    () => orders.filter((o) => !o.dateOrder),
    [orders]
  );

  // --- 1. Calculate General Order Summary Stats ---
  const stats = useMemo(() => {
    let activeCount = 0;
    let completedCount = 0;
    let totalQtyOrdered = 0;
    let totalQtyReceived = 0;
    let totalQtyRejected = 0;
    let totalShortage = 0;
    let totalPendingQty = 0;

    orders.forEach((o) => {
      totalQtyOrdered += o.quantity;
      totalQtyReceived += o.in;
      totalQtyRejected += o.reject;

      if (o.status === 'In Production') {
        activeCount++;
        totalPendingQty += o.quantity;
      } else {
        completedCount++;
      }

      if (o.selisih < 0) {
        totalShortage += Math.abs(o.selisih);
      }
    });

    return {
      totalOrders: orders.length,
      activeCount,
      completedCount,
      totalQtyOrdered,
      totalQtyReceived,
      totalQtyRejected,
      totalShortage,
      totalPendingQty
    };
  }, [orders]);

  const AMBANG_PANTAU = 8;
  const AMBANG_KRITIS = 20;

  // Helper for batch product label formatting
  const getBatchLabel = (batchOrders: OrderRecord[]) => {
    const prodOrderCounts: Record<string, number> = {};
    batchOrders.forEach(o => {
      const prodName = o.item.replace(/\s+(S|M|L|XL|XXL)$/i, '').trim();
      prodOrderCounts[prodName] = (prodOrderCounts[prodName] || 0) + 1;
    });

    // Sort unique products by order count descending, then alphabetically ascending
    const sortedProds = Object.keys(prodOrderCounts).sort((a, b) => {
      const diff = prodOrderCounts[b] - prodOrderCounts[a];
      if (diff !== 0) return diff;
      return a.localeCompare(b);
    });

    // Take top 2 and sort them alphabetically descending
    const top2 = sortedProds.slice(0, 2).sort((a, b) => b.localeCompare(a));

    if (top2.length === 0) return "";
    if (top2.length === 1) return top2[0];

    const [n1, n2] = top2;
    const parts1 = n1.split(" ");
    const parts2 = n2.split(" ");
    if (parts1[0] === parts2[0] && parts1.length > 1 && parts2.length > 1) {
      return `${n1} & ${parts2.slice(1).join(" ")}`;
    }
    return `${n1} & ${n2}`;
  };

  // --- 2. Active Production Total Derivation (Section A) ---
  // Note: Only status = 'In Production'
  const activeOrdersList = useMemo(() => {
    return orders.filter((o) => o.status === 'In Production');
  }, [orders]);


  useEffect(() => {
    if (activeVendorFilter !== 'All' && !uniqueKonveksi.includes(activeVendorFilter)) {
      setActiveVendorFilter('All');
    }
  }, [activeVendorFilter, uniqueKonveksi]);

  const filteredActiveOrders = useMemo(() => {
    return activeOrdersList
      .filter((o) => {
        const days = getDaysElapsed(o.dateOrder);
        let bucket = 'unknown';
        if (days !== null) {
          bucket = days > AMBANG_KRITIS ? 'kritis' : days >= AMBANG_PANTAU ? 'pantau' : 'aman';
        }

        const matchVendor = activeVendorFilter === 'All' || o.konveksi === activeVendorFilter;
        const matchAge = activeAgeFilter === 'All' || bucket === activeAgeFilter;
        return matchVendor && matchAge;
      });
  }, [activeOrdersList, activeVendorFilter, activeAgeFilter]);

  // Summary Metrics (Section A.6)
  const activeSummary = useMemo(() => {
    const list = filteredActiveOrders;
    const totalOrders = list.length;
    const totalPcs = list.reduce((sum, o) => sum + o.quantity, 0);
    const uniqueBatches = new Set(list.filter(o => o.dateOrder).map(o => o.dateOrder));
    const uniqueVendors = new Set(list.map(o => o.konveksi));
    
    const datedList = list.filter(o => getDaysElapsed(o.dateOrder) !== null);
    const datedPcs = datedList.reduce((sum, o) => sum + o.quantity, 0);
    const totalDaysPcs = datedList.reduce((sum, o) => sum + (getDaysElapsed(o.dateOrder) ?? 0) * o.quantity, 0);
    const rataUmurTertimbang = datedPcs > 0 ? Math.round(totalDaysPcs / datedPcs) : 0;
    
    // Dynamic critical konveksi
    const criticalKonveksis = Array.from(new Set(
      list.filter(o => (getDaysElapsed(o.dateOrder) ?? -1) > AMBANG_KRITIS).map(o => o.konveksi)
    )).sort();
    const criticalKonveksiText = criticalKonveksis.length > 0 ? criticalKonveksis.join(', ') : '';
    const criticalOrdersCount = list.filter(o => (getDaysElapsed(o.dateOrder) ?? -1) > AMBANG_KRITIS).length;

    return {
      totalOrders,
      totalPcs,
      jumlahBatch: uniqueBatches.size,
      jumlahKonveksi: uniqueVendors.size,
      rataUmurTertimbang,
      criticalKonveksiText,
      criticalOrdersCount
    };
  }, [filteredActiveOrders]);

  const completedDurations = useMemo(() => {
    const completed = orders.filter(o => o.dateOrder && o.dateReceived && o.status !== 'In Production');
    if (completed.length === 0) return { min: 0, max: 0 };
    
    const durations = completed.map(o => {
      const start = new Date(o.dateOrder);
      const end = new Date(o.dateReceived!);
      const diff = end.getTime() - start.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      return days >= 0 ? days : 0;
    });

    return {
      min: Math.min(...durations),
      max: Math.max(...durations)
    };
  }, [orders]);

  // Bucket Totals (Section A.4)
  const bucketTotals = useMemo(() => {
    const totals = {
      aman: { orders: 0, pcs: 0 },
      pantau: { orders: 0, pcs: 0 },
      kritis: { orders: 0, pcs: 0 }
    };

    filteredActiveOrders.forEach(o => {
      const days = getDaysElapsed(o.dateOrder);
      if (days === null) return;
      let bucket: 'aman' | 'pantau' | 'kritis' = 'aman';
      if (days > AMBANG_KRITIS) bucket = 'kritis';
      else if (days >= AMBANG_PANTAU) bucket = 'pantau';

      totals[bucket].orders += 1;
      totals[bucket].pcs += o.quantity;
    });

    return totals;
  }, [filteredActiveOrders]);

  // Konveksi Load (Section A.5)
  const konveksiLoad = useMemo(() => {
    const load: Record<string, { nama: string; totalOrders: number; totalPcs: number; pcsPerBucket: { aman: number; pantau: number; kritis: number } }> = {};
    
    filteredActiveOrders.forEach(o => {
      const days = getDaysElapsed(o.dateOrder);
      const bucket = days === null ? null : days > AMBANG_KRITIS ? 'kritis' : days >= AMBANG_PANTAU ? 'pantau' : 'aman';

      if (!load[o.konveksi]) {
        load[o.konveksi] = {
          nama: o.konveksi,
          totalOrders: 0,
          totalPcs: 0,
          pcsPerBucket: { aman: 0, pantau: 0, kritis: 0 }
        };
      }
      const kl = load[o.konveksi];
      kl.totalOrders += 1;
      kl.totalPcs += o.quantity;
      if (bucket) kl.pcsPerBucket[bucket] += o.quantity;
    });

    return Object.values(load).sort((a, b) => b.totalPcs - a.totalPcs);
  }, [filteredActiveOrders]);

  // Batches (Section A.3)
  const batchesList = useMemo(() => {
    const groups: Record<string, { tanggalMulai: string; umurHari: number | null; items: OrderRecord[]; totalPcs: number; konveksiList: string[]; bucket: 'aman' | 'pantau' | 'kritis' | 'unknown'; label: string }> = {};

    filteredActiveOrders.forEach(o => {
      const date = o.dateOrder;
      if (!groups[date]) {
        const days = getDaysElapsed(date);
        let bucket: 'aman' | 'pantau' | 'kritis' | 'unknown' = 'unknown';
        if (days !== null) bucket = days > AMBANG_KRITIS ? 'kritis' : days >= AMBANG_PANTAU ? 'pantau' : 'aman';

        groups[date] = {
          tanggalMulai: date,
          umurHari: days,
          items: [],
          totalPcs: 0,
          konveksiList: [],
          bucket,
          label: ""
        };
      }
      const g = groups[date];
      g.items.push(o);
      g.totalPcs += o.quantity;
      if (!g.konveksiList.includes(o.konveksi)) {
        g.konveksiList.push(o.konveksi);
      }
    });

    const result = Object.values(groups).map(g => {
      g.label = getBatchLabel(g.items);
      return g;
    });

    return result.sort((a, b) => (b.umurHari ?? -1) - (a.umurHari ?? -1));
  }, [filteredActiveOrders]);

  const getAgeIndicator = (o: OrderRecord) => {
    const days = getDaysElapsed(o.dateOrder);
    if (days === null) {
      return { colorClass: 'bg-[#64748b]', textClass: 'text-[#94a3b8] font-bold', labelText: 'Tanggal belum diisi' };
    }
    let colorClass = 'bg-[var(--status-aman)]';
    let textClass = 'text-[var(--status-aman)] font-bold';
    if (days > AMBANG_KRITIS) {
      colorClass = 'bg-[var(--status-kritis)]';
      textClass = 'text-[var(--status-kritis)] font-bold';
    } else if (days >= AMBANG_PANTAU) {
      colorClass = 'bg-[var(--status-pantau)]';
      textClass = 'text-[var(--status-pantau)] font-bold';
    }
    return { colorClass, textClass, labelText: `${days} hari` };
  };


  // --- 3. Fulfillment Discrepancies Logic (Prioritas 2) ---
  const discrepancies = useMemo(() => {
    return orders.filter((o) => o.status !== 'In Production' && (o.selisih !== 0 || o.reject > 0));
  }, [orders]);

  const alertSummary = useMemo(() => {
    let totalKurang = 0;
    let totalLebih = 0;
    discrepancies.forEach((o) => {
      if (o.selisih < 0) totalKurang += Math.abs(o.selisih);
      if (o.selisih > 0) totalLebih += o.selisih;
    });
    return {
      count: discrepancies.length,
      totalKurang,
      totalLebih
    };
  }, [discrepancies]);

  // Split into shortages and excesses
  const shortagesList = useMemo(() => {
    return discrepancies
      .filter((o) => o.selisih < 0)
      // Sort by absolute difference descending
      .sort((a, b) => Math.abs(b.selisih) - Math.abs(a.selisih));
  }, [discrepancies]);

  const excessesList = useMemo(() => {
    return discrepancies
      .filter((o) => o.selisih > 0)
      // Sort by absolute difference descending
      .sort((a, b) => Math.abs(b.selisih) - Math.abs(a.selisih));
  }, [discrepancies]);

  const displayedShortages = useMemo(() => {
    return showAllDiscrepancies ? shortagesList : shortagesList.slice(0, 8);
  }, [shortagesList, showAllDiscrepancies]);

  const displayedExcesses = useMemo(() => {
    return showAllDiscrepancies ? excessesList : excessesList.slice(0, 8);
  }, [excessesList, showAllDiscrepancies]);



  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchSearch = o.item.toLowerCase().includes(searchTerm.toLowerCase());
      const matchVendor = selectedVendor === 'All' || o.konveksi === selectedVendor;
      
      let matchStatus = true;
      if (selectedStatus === 'In Production') {
        matchStatus = o.status === 'In Production';
      } else if (selectedStatus === 'Completed') {
        matchStatus = o.status !== 'In Production';
      }
      
      return matchSearch && matchVendor && matchStatus;
    });
  }, [orders, searchTerm, selectedVendor, selectedStatus]);

  const sortedOrders = useMemo(() => {
    const sorted = [...filteredOrders];
    sorted.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (valA === null) valA = '';
      if (valB === null) valB = '';

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortDirection === 'asc' 
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      } else if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }
      return 0;
    });
    return sorted;
  }, [filteredOrders, sortField, sortDirection]);

  // Pagination calculations
  const totalPages = Math.ceil(sortedOrders.length / rowsPerPage);
  useEffect(() => {
    setCurrentPage((page) => Math.min(page, Math.max(1, totalPages)));
  }, [totalPages]);

  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return sortedOrders.slice(start, start + rowsPerPage);
  }, [sortedOrders, currentPage]);

  const handleSort = (field: keyof OrderRecord) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Hide Reject column dynamically if all rows are empty/0
  const showRejectColumn = useMemo(() => {
    return orders.some((o) => o.reject > 0);
  }, [orders]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Activity className="w-8 h-8 text-blue-500 animate-spin mb-4" />
        <p className="text-[#9ca3af] text-sm">Loading Order Tracking Page...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card text-center py-12">
        <h3 className="text-danger font-extrabold mb-2">Error Loading Orders</h3>
        <p className="text-[#9ca3af] text-sm mb-4">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-300">
      
      {/* 1. Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        <div className="card stats-card flex flex-col justify-between">
          <div>
            <span className="text-xs text-[#9ca3af] font-bold uppercase tracking-wider block mb-1">Active Production</span>
            <strong className="text-2xl text-[#f1f5f9] font-extrabold">{stats.activeCount} Items</strong>
          </div>
          <span className="text-xs text-amber-500 flex items-center gap-1 font-bold mt-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            In Production
          </span>
        </div>

        <div className="card stats-card flex flex-col justify-between">
          <div>
            <span className="text-xs text-[#9ca3af] font-bold uppercase tracking-wider block mb-1">Total Ordered Qty</span>
            <strong className="text-2xl text-[#f1f5f9] font-extrabold">{stats.totalQtyOrdered.toLocaleString('id-ID')} pcs</strong>
          </div>
          <span className="text-xs text-blue-500 flex items-center gap-1 font-bold mt-2">
            <Package className="w-3.5 h-3.5" /> Total Quantity
          </span>
        </div>

        <div className="card stats-card flex flex-col justify-between">
          <div>
            <span className="text-xs text-[#9ca3af] font-bold uppercase tracking-wider block mb-1">Total Received Qty</span>
            <strong className="text-2xl text-[#10b981] font-extrabold">{stats.totalQtyReceived.toLocaleString('id-ID')} pcs</strong>
          </div>
          <span className="text-xs text-[#10b981] flex items-center gap-1 font-bold mt-2">
            <CheckCircle className="w-3.5 h-3.5" /> Fulfilled successfully
          </span>
        </div>

        <div className="card stats-card flex flex-col justify-between">
          <div>
            <span className="text-xs text-[#9ca3af] font-bold uppercase tracking-wider block mb-1">Defects / Reject</span>
            <strong className="text-2xl text-[#ef4444] font-extrabold">{stats.totalQtyRejected.toLocaleString('id-ID')} pcs</strong>
          </div>
          <span className="text-xs text-[#ef4444] flex items-center gap-1 font-bold mt-2">
            <XCircle className="w-3.5 h-3.5" /> Rejected items
          </span>
        </div>

      </div>

      {/* 2. Graphical Charts Panel */}
      <OrderAccuracyChart orders={orders} />
      <KonveksiPerformanceChart orders={orders} />

      {/* 3. Section: Baju Yang Sedang Diproduksi (Active Production) (Prioritas 3 Redesigned) */}
      <div className="card">
        {/* Section Header */}
        <div className="flex items-center gap-2 mb-2">
          <Activity className="w-5 h-5 text-amber-500" />
          <h3 className="text-[#64748b] text-[0.8rem] font-bold uppercase tracking-[0.1em]">Baju Yang Sedang Diproduksi (Active Production)</h3>
        </div>

        {/* H. Filter Bar */}
        <div className="flex flex-wrap items-center gap-3 w-full border-b border-[#334155]/20 pb-4 mb-6">

          {/* Dropdown Konveksi */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <Filter className="w-3.5 h-3.5 text-[#64748b]" />
            <select
              className="bg-[#0f172a] border border-[#334155] rounded-lg text-xs px-2.5 py-1.5 focus:outline-none focus:border-[#3b82f6] text-[#f1f5f9] w-full sm:w-auto"
              value={activeVendorFilter}
              onChange={(e) => setActiveVendorFilter(e.target.value)}
            >
              <option value="All">Semua Konveksi</option>
              {uniqueKonveksi.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </div>

          {/* Dropdown Umur */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <span className="text-xs text-[#9ca3af] font-semibold">Umur:</span>
            <select
              className="bg-[#0f172a] border border-[#334155] rounded-lg text-xs px-2.5 py-1.5 focus:outline-none focus:border-[#3b82f6] text-[#f1f5f9] w-full sm:w-auto"
              value={activeAgeFilter}
              onChange={(e) => setActiveAgeFilter(e.target.value)}
            >
              <option value="All">Semua Umur</option>
              <option value="kritis">Kritis (&gt; 20 hari)</option>
              <option value="pantau">Perlu dipantau (8–20 hari)</option>
              <option value="aman">Aman (≤ 7 hari)</option>
            </select>
          </div>
        </div>

        {/* C. KOMPONEN 1 — Strip ringkasan (4 stat tile, 1 baris) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {/* Tile 1 */}
          <div className="bg-[#1e293b]/40 border border-[#334155]/40 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <span className="text-xs text-[#9ca3af] font-bold uppercase tracking-wider block mb-1">Order Aktif</span>
              <strong className="text-2xl text-[#f1f5f9] font-extrabold">{activeSummary.totalOrders} order</strong>
            </div>
            <span className="text-xs text-[#9ca3af] mt-2 block font-medium">dalam {activeSummary.jumlahBatch.toLocaleString('id-ID')} batch</span>
          </div>

          {/* Tile 2 */}
          <div className="bg-[#1e293b]/40 border border-[#334155]/40 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <span className="text-xs text-[#9ca3af] font-bold uppercase tracking-wider block mb-1">Volume Berjalan</span>
              <strong className="text-2xl text-[#f1f5f9] font-extrabold">{activeSummary.totalPcs.toLocaleString('id-ID')} pcs</strong>
            </div>
            <span className="text-xs text-[#9ca3af] mt-2 block font-medium">di {activeSummary.jumlahKonveksi.toLocaleString('id-ID')} konveksi</span>
          </div>

          {/* Tile 3 */}
          <div className="bg-[#1e293b]/40 border border-[#334155]/40 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <span className="text-xs text-[#9ca3af] font-bold uppercase tracking-wider block mb-1">Durasi Selesai</span>
              <strong className="text-2xl text-[#f1f5f9] font-extrabold">{completedDurations.min} — {completedDurations.max} hari</strong>
            </div>
            <span className="text-xs text-[#9ca3af] mt-2 block font-medium">Tercepat: {completedDurations.min.toLocaleString('id-ID')} hari · Terlama: {completedDurations.max.toLocaleString('id-ID')} hari</span>
          </div>

          {/* Tile 4 */}
          <div className="bg-[#1e293b]/40 border border-[#334155]/40 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <span className="text-xs text-[#9ca3af] font-bold uppercase tracking-wider block mb-1">Lewat 20 Hari</span>
              {activeSummary.criticalOrdersCount > 0 ? (
                <>
                  <strong className="text-2xl font-extrabold text-[var(--status-kritis)]">
                    {bucketTotals.kritis.pcs} pcs
                  </strong>
                  <span className="text-xs text-[#9ca3af] mt-2 flex items-center gap-1 font-semibold truncate" title={`${activeSummary.criticalOrdersCount} order · ${activeSummary.criticalKonveksiText}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-kritis)] shrink-0" />
                    {activeSummary.criticalOrdersCount} order · {activeSummary.criticalKonveksiText}
                  </span>
                </>
              ) : (
                <>
                  <strong className="text-2xl font-extrabold text-[var(--status-aman)]">
                    tidak ada
                  </strong>
                  <span className="text-xs text-[var(--status-aman)] mt-2 flex items-center gap-1 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-aman)] shrink-0" />
                    0 order
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Charts Row: Umur Produksi (K2) & Beban per Konveksi (K3) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* D. KOMPONEN 2 — "Umur Produksi" */}
          <div className="bg-[#1e293b]/20 border border-[#334155]/40 rounded-xl p-5 flex flex-col justify-between">
            <div>
              <h4 className="text-xs text-[#9ca3af] font-bold uppercase tracking-wider mb-4">Umur Produksi</h4>
              <div className="flex flex-col gap-4">
                {/* Aman */}
                <div>
                  <div className="flex justify-between items-end mb-1">
                    <span className="text-[11px] text-[#9ca3af] flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-aman)]" />
                      Aman <span className="font-mono text-[9px] bg-[#0f172a] px-1.5 py-0.5 rounded border border-[#334155]/20">≤ 7 hari</span>
                    </span>
                    <span className="text-xs font-bold text-[#f1f5f9] font-mono">
                      {bucketTotals.aman.pcs} pcs <span className="text-[#9ca3af] font-normal">({bucketTotals.aman.orders} order)</span>
                    </span>
                  </div>
                  <div className="w-full h-3 bg-white/[0.045] rounded-[3px] overflow-hidden">
                    <div 
                      className="h-full bg-[var(--status-aman)] rounded-r-[4px] transition-all duration-500" 
                      style={{ width: `${(bucketTotals.aman.pcs / Math.max(bucketTotals.aman.pcs, bucketTotals.pantau.pcs, bucketTotals.kritis.pcs, 1)) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Pantau */}
                <div>
                  <div className="flex justify-between items-end mb-1">
                    <span className="text-[11px] text-[#9ca3af] flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-pantau)]" />
                      Perlu dipantau <span className="font-mono text-[9px] bg-[#0f172a] px-1.5 py-0.5 rounded border border-[#334155]/20">8–20 hari</span>
                    </span>
                    <span className="text-xs font-bold text-[#f1f5f9] font-mono">
                      {bucketTotals.pantau.pcs} pcs <span className="text-[#9ca3af] font-normal">({bucketTotals.pantau.orders} order)</span>
                    </span>
                  </div>
                  <div className="w-full h-3 bg-white/[0.045] rounded-[3px] overflow-hidden">
                    <div 
                      className="h-full bg-[var(--status-pantau)] rounded-r-[4px] transition-all duration-500" 
                      style={{ width: `${(bucketTotals.pantau.pcs / Math.max(bucketTotals.aman.pcs, bucketTotals.pantau.pcs, bucketTotals.kritis.pcs, 1)) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Kritis */}
                <div>
                  <div className="flex justify-between items-end mb-1">
                    <span className="text-[11px] text-[#9ca3af] flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-kritis)]" />
                      Kritis <span className="font-mono text-[9px] bg-[#0f172a] px-1.5 py-0.5 rounded border border-[#334155]/20">&gt; 20 hari</span>
                    </span>
                    <span className="text-xs font-bold text-[#f1f5f9] font-mono">
                      {bucketTotals.kritis.pcs} pcs <span className="text-[#9ca3af] font-normal">({bucketTotals.kritis.orders} order)</span>
                    </span>
                  </div>
                  <div className="w-full h-3 bg-white/[0.045] rounded-[3px] overflow-hidden">
                    <div 
                      className="h-full bg-[var(--status-kritis)] rounded-r-[4px] transition-all duration-500" 
                      style={{ width: `${(bucketTotals.kritis.pcs / Math.max(bucketTotals.aman.pcs, bucketTotals.pantau.pcs, bucketTotals.kritis.pcs, 1)) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
            {/* Summary sentence */}
            <div className="text-[11px] text-[#9ca3af] mt-4 pt-3 border-t border-[#334155]/20 select-none">
              💡 <strong className="text-[var(--status-aman)]">{bucketTotals.aman.pcs} dari {activeSummary.totalPcs} pcs</strong> masih dalam batas aman (≤ 7 hari).
            </div>
          </div>

          {/* E. KOMPONEN 3 — "Beban per Konveksi" */}
          <div className="bg-[#1e293b]/20 border border-[#334155]/40 rounded-xl p-5 flex flex-col justify-between">
            <div>
              <h4 className="text-xs text-[#9ca3af] font-bold uppercase tracking-wider mb-4">Beban per Konveksi</h4>
              {konveksiLoad.length === 0 ? (
                <div className="text-center py-6 text-[#9ca3af] text-xs">Tidak ada data beban konveksi</div>
              ) : (
                <div className="flex flex-col gap-4">
                  {konveksiLoad.map((k) => {
                    const maxKonveksiPcs = Math.max(...konveksiLoad.map(item => item.totalPcs), 1);
                    const segments = [];
                    if (k.pcsPerBucket.aman > 0) segments.push({ type: 'aman', pcs: k.pcsPerBucket.aman, color: 'bg-[var(--status-aman)]' });
                    if (k.pcsPerBucket.pantau > 0) segments.push({ type: 'pantau', pcs: k.pcsPerBucket.pantau, color: 'bg-[var(--status-pantau)]' });
                    if (k.pcsPerBucket.kritis > 0) segments.push({ type: 'kritis', pcs: k.pcsPerBucket.kritis, color: 'bg-[var(--status-kritis)]' });

                    return (
                      <div key={k.nama} className="flex items-center gap-3">
                        {/* Name and count */}
                        <div className="w-[100px] shrink-0 flex flex-col">
                          <span className="text-xs font-bold text-[#f1f5f9] truncate" title={k.nama}>{k.nama}</span>
                          <span className="text-[10px] text-[#9ca3af] font-mono tabular-nums">{k.totalOrders} order</span>
                        </div>

                        {/* Stacked bar container */}
                        <div className="flex-grow flex items-center gap-2 min-w-0">
                          <div className="flex-grow bg-white/[0.045] rounded-[3px] h-3 relative min-w-[50px]">
                            <div 
                              className="h-full flex gap-[2px]" 
                              style={{ width: `${(k.totalPcs / maxKonveksiPcs) * 100}%` }}
                            >
                              {segments.map((seg, idx) => (
                                <div
                                  key={seg.type}
                                  className={`${seg.color} h-full ${idx === 0 ? 'rounded-l-[3px]' : ''} ${idx === segments.length - 1 ? 'rounded-r-[3px]' : ''}`}
                                  style={{ width: `${(seg.pcs / k.totalPcs) * 100}%` }}
                                  title={`${seg.type === 'aman' ? 'Aman' : seg.type === 'pantau' ? 'Pantau' : 'Kritis'}: ${seg.pcs} pcs`}
                                />
                              ))}
                            </div>
                          </div>
                          <span className="w-[70px] text-xs font-bold font-mono text-[#f1f5f9] text-right shrink-0 tabular-nums">
                            {k.totalPcs} pcs
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Legend for K3 */}
            <div className="mt-4 pt-3 border-t border-[#334155]/20 flex justify-center gap-4 text-[10px] text-[#9ca3af] font-bold">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-aman)]" />
                Aman
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-pantau)]" />
                Pantau
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-kritis)]" />
                Kritis
              </span>
            </div>
          </div>
        </div>

        {/* F. KOMPONEN 4 — "Batch Produksi — Lama Berjalan" */}
        <div className="bg-[#1e293b]/20 border border-[#334155]/40 rounded-xl p-5 flex flex-col mb-6">
          <h4 className="text-xs text-[#9ca3af] font-bold uppercase tracking-wider mb-5">Batch Produksi — Lama Berjalan</h4>
          {batchesList.length === 0 ? (
            <div className="text-center py-8 text-[#9ca3af] text-xs">Tidak ada data batch produksi</div>
          ) : (
            <div className="flex flex-col gap-5">
              {(() => {
                const maxAge = Math.max(...batchesList.map(b => b.umurHari ?? 0), 1);
                const scaleMax = Math.ceil(maxAge / 10) * 10;

                return (
                  <>
                    {batchesList.map((batch) => {
                      const barWidth = batch.umurHari === null ? 2 : Math.max(2, (batch.umurHari / scaleMax) * 100);
                      let barColor = 'bg-[var(--status-aman)]';
                      if (batch.bucket === 'kritis') barColor = 'bg-[var(--status-kritis)]';
                      else if (batch.bucket === 'pantau') barColor = 'bg-[var(--status-pantau)]';
                      else if (batch.bucket === 'unknown') barColor = 'bg-[#64748b]';

                      const dateObj = new Date(batch.tanggalMulai);
                      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
                      const dateLabel = batch.tanggalMulai ? `${dateObj.getDate()} ${months[dateObj.getMonth()]}` : 'Tanggal belum diisi';

                      return (
                        <div key={batch.tanggalMulai} className="grid grid-cols-[186px_1fr_96px] items-center gap-4">
                          {/* Left Column: Label */}
                          <div className="flex flex-col min-w-0 pr-2">
                            <span className="text-xs font-bold text-[#f1f5f9] truncate" title={batch.label}>
                              {batch.label}
                            </span>
                            <span className="text-[10px] text-[#9ca3af] font-mono mt-0.5 truncate">
                              {dateLabel} · {batch.konveksiList.join(', ')}
                            </span>
                          </div>

                          {/* Center Column: Plot Area */}
                          <div className="h-4 relative flex items-center bg-white/[0.02] rounded-[3px] min-w-0">
                            {/* Gridlines */}
                            <div className="absolute inset-0 pointer-events-none">
                              <div className="absolute top-0 bottom-0 border-l border-white/[0.055]" style={{ left: '0%' }} />
                              {scaleMax >= 10 && (
                                <div className="absolute top-0 bottom-0 border-l border-white/[0.055]" style={{ left: `${(10 / scaleMax) * 100}%` }} />
                              )}
                              {scaleMax >= 30 && (
                                <div className="absolute top-0 bottom-0 border-l border-white/[0.055]" style={{ left: `${(30 / scaleMax) * 100}%` }} />
                              )}
                              {scaleMax >= 20 && (
                                <div className="absolute top-0 bottom-0 border-l border-[var(--status-kritis)]/55 z-10" style={{ left: `${(20 / scaleMax) * 100}%` }} />
                              )}
                            </div>
                            
                            {/* Bar */}
                            <div 
                              className={`h-2.5 ${barColor} rounded-r-[3px] relative z-10 transition-all duration-500`}
                              style={{ width: `${barWidth}%` }}
                            />
                          </div>

                          {/* Right Column: Numbers */}
                          <div className="flex flex-col text-right shrink-0">
                            <span className="text-xs font-bold font-mono text-[#f1f5f9] tabular-nums">
                              {batch.umurHari === null ? 'Umur tidak dihitung' : `${batch.umurHari.toLocaleString('id-ID')} hari`}
                            </span>
                            <span className="text-[10px] text-[#9ca3af] font-mono mt-0.5 tabular-nums">
                              {batch.totalPcs} pcs
                            </span>
                          </div>
                        </div>
                      );
                    })}

                    {/* Scale X Axis */}
                    <div className="grid grid-cols-[186px_1fr_96px] gap-4 mt-1">
                      <div />
                      <div className="relative h-5 text-[9px] text-[#64748b] font-mono font-bold select-none">
                        <span className="absolute transform -translate-x-1/2" style={{ left: '0%' }}>0</span>
                        {scaleMax >= 10 && (
                          <span className="absolute transform -translate-x-1/2" style={{ left: `${(10 / scaleMax) * 100}%` }}>10</span>
                        )}
                        {scaleMax >= 20 && (
                          <span className="absolute transform -translate-x-1/2" style={{ left: `${(20 / scaleMax) * 100}%` }}>20</span>
                        )}
                        {scaleMax >= 30 && (
                          <span className="absolute transform -translate-x-1/2" style={{ left: `${(30 / scaleMax) * 100}%` }}>30</span>
                        )}
                        <span className="absolute right-0 transform translate-x-1/2">{scaleMax} hari</span>
                      </div>
                      <div />
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {/* Scale Legend description */}
          <div className="text-[10px] text-[#64748b] font-bold mt-3 pt-3 border-t border-[#334155]/20 flex items-center gap-1.5 select-none">
            <span className="w-3 h-[1.5px] bg-[var(--status-kritis)]/55 inline-block shrink-0" />
            batas 20 hari, lewat garis ini masuk kategori kritis
          </div>
        </div>
      </div>

      {/* Detail per Item (collapsible table) */}
      <div className="card">
        <h4 className="text-xs text-[#9ca3af] font-bold uppercase tracking-wider mb-4">Detail per Item</h4>
        {batchesList.length === 0 ? (
          <div className="text-center py-6 text-[#9ca3af] text-xs">Tidak ada data detail item</div>
        ) : (
          <div className="overflow-x-auto w-full rounded-xl border border-[#334155]/40">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#334155] text-[#64748b] uppercase tracking-wider font-extrabold select-none bg-[#1e293b]">
                  <th className="py-3.5 px-4 text-left">Item</th>
                  <th className="py-3.5 px-4 text-left">Konveksi</th>
                  <th className="py-3.5 px-4 text-left">Mulai</th>
                  <th className="py-3.5 px-4 text-right">Target</th>
                  <th className="py-3.5 px-4 text-right">Umur</th>
                </tr>
              </thead>
              <tbody className="text-[#f1f5f9]">
                {batchesList.map((batch, idx) => {
                  const isCollapsed = collapsedBatches[batch.tanggalMulai] !== undefined 
                    ? collapsedBatches[batch.tanggalMulai] 
                    : idx !== 0;

                  const dateObj = new Date(batch.tanggalMulai);
                  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
                  const dateLabel = batch.tanggalMulai ? `${dateObj.getDate()} ${months[dateObj.getMonth()]}` : 'Tanggal belum diisi';

                  const toggleBatch = () => {
                    setCollapsedBatches(prev => ({
                      ...prev,
                      [batch.tanggalMulai]: !isCollapsed
                    }));
                  };

                  const handleKeyDown = (e: React.KeyboardEvent) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault();
                      toggleBatch();
                    }
                  };

                  return (
                    <React.Fragment key={batch.tanggalMulai}>
                      {/* Group Header Row */}
                      <tr 
                        role="button"
                        tabIndex={0}
                        aria-expanded={!isCollapsed}
                        onClick={toggleBatch}
                        onKeyDown={handleKeyDown}
                        className="bg-[#1e293b]/60 hover:bg-[#1e293b]/90 border-b border-[#334155]/30 cursor-pointer select-none transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <td colSpan={3} className="py-3.5 px-4 font-bold text-[#f1f5f9]">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-[#9ca3af]">
                              {isCollapsed ? '▸' : '▾'}
                            </span>
                            <span>
                              {dateLabel} — {batch.label}
                            </span>
                          </div>
                        </td>
                        <td colSpan={2} className="py-3.5 px-4 text-right font-bold text-[#9ca3af]">
                          <span className="font-mono tabular-nums">{batch.items.length.toLocaleString('id-ID')} order</span> · <span className="font-mono tabular-nums">{batch.totalPcs.toLocaleString('id-ID')} pcs</span> · <span className="font-mono text-[#f1f5f9]">{batch.umurHari === null ? 'umur tidak dihitung' : `${batch.umurHari.toLocaleString('id-ID')} hari`}</span>
                        </td>
                      </tr>

                      {/* Items under this batch */}
                      {!isCollapsed && batch.items.map((item, itemIdx) => {
                        const age = getAgeIndicator(item);
                        return (
                          <tr 
                            key={itemIdx} 
                            className="border-b border-[#334155]/10 hover:bg-white/[0.04] transition-colors even:bg-white/[0.015]"
                          >
                            <td className="py-3 px-4 font-semibold text-[#f1f5f9] pl-8">
                              {item.item}
                            </td>
                            <td className="py-3 px-4 text-[#e2e8f0]">
                              {item.konveksi}
                            </td>
                            <td className="py-3 px-4 text-[#9ca3af] font-mono">
                              {item.dateOrder ? formatFullDate(item.dateOrder) : 'Belum diisi'}
                            </td>
                            <td className="py-3 px-4 text-right font-mono tabular-nums text-[#f1f5f9]">
                              {item.quantity.toLocaleString('id-ID')}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span className={`inline-flex items-center gap-1.5 ${age.textClass}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${age.colorClass}`} />
                                <span className="font-mono tabular-nums">{age.labelText}</span>
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. Section: Selisih & Ketidakcocokan Penerimaan (Fulfillment Alerts) (Prioritas 2) */}
      <div className="card">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-5 h-5 text-rose-500" />
          <h3 className="text-[#64748b] text-[0.8rem] font-bold uppercase tracking-[0.1em]">Selisih & Ketidakcocokan Penerimaan (Fulfillment Alerts)</h3>
        </div>
        
        {discrepancies.length === 0 ? (
          <div className="text-center py-6 text-[#9ca3af] text-sm bg-[#10b981]/5 rounded-xl border border-dashed border-[#10b981]/20">
            🎉 Semua orderan yang diterima cocok 100% dengan pesanan awal!
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Summary Line */}
            <div className="text-xs text-[#9ca3af] font-semibold border-b border-[#334155]/30 pb-3">
              ⚠️ {alertSummary.count.toLocaleString('id-ID')} order bermasalah · total kurang <strong className="text-rose-400 font-mono">{alertSummary.totalKurang.toLocaleString('id-ID')} pcs</strong> · total lebih <strong className="text-indigo-400 font-mono">{alertSummary.totalLebih.toLocaleString('id-ID')} pcs</strong>
            </div>

            {/* Split Columns (Kurang vs Lebih) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-2">
              
              {/* Left Column: Shortages */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-rose-500/20 pb-2">
                  <span className="text-xs text-rose-400 font-extrabold uppercase tracking-wide">
                    📉 KURANG (SHORTAGE) · {shortagesList.length} item
                  </span>
                </div>
                {displayedShortages.length === 0 ? (
                  <p className="text-[11px] text-[#9ca3af] italic py-3">Tidak ada order yang kurang.</p>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {displayedShortages.map((item, idx) => {
                      const pct = item.quantity > 0 ? Math.round((item.selisih / item.quantity) * 100) : 0;
                      return (
                        <div key={idx} className="flex justify-between items-center py-2.5 px-3 bg-[#1e293b]/20 hover:bg-[#1e293b]/55 border border-[#334155]/20 rounded-xl transition duration-150">
                          <div className="flex flex-col gap-0.5 pr-3 min-w-0">
                            <strong className="text-xs text-[#f1f5f9] font-semibold truncate" title={item.item}>{item.item}</strong>
                            <span className="text-xs text-[#9ca3af]">{item.konveksi}</span>
                            <span className="text-xs text-[#9ca3af]">Order tanggal: {item.dateOrder ? formatFullDate(item.dateOrder) : 'Belum tersedia'}</span>
                            <span className="text-xs text-[#9ca3af]">Selesai tanggal: {item.dateReceived ? formatFullDate(item.dateReceived) : 'Belum tersedia'}</span>
                            <span className="text-xs text-[#9ca3af]">Total hari: {getFulfillmentDuration(item.dateOrder, item.dateReceived)}</span>
                          </div>
                          <div className="flex items-center gap-4 text-xs font-mono shrink-0">
                            <span className="text-[#9ca3af] tabular-nums">{item.quantity.toLocaleString('id-ID')} → {item.in.toLocaleString('id-ID')}</span>
                            <span className="font-extrabold tabular-nums text-right w-[100px] text-rose-400">
                              {item.selisih} ({pct}%)
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Right Column: Excesses */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-[#3b82f6]/20 pb-2">
                  <span className="text-xs text-indigo-400 font-extrabold uppercase tracking-wide">
                    📈 LEBIH (EXCESS) · {excessesList.length} item
                  </span>
                </div>
                {displayedExcesses.length === 0 ? (
                  <p className="text-[11px] text-[#9ca3af] italic py-3">Tidak ada order yang lebih.</p>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {displayedExcesses.map((item, idx) => {
                      const pct = item.quantity > 0 ? Math.round((item.selisih / item.quantity) * 100) : 0;
                      return (
                        <div key={idx} className="flex justify-between items-center py-2.5 px-3 bg-[#1e293b]/20 hover:bg-[#1e293b]/55 border border-[#334155]/20 rounded-xl transition duration-150">
                          <div className="flex flex-col gap-0.5 pr-3 min-w-0">
                            <strong className="text-xs text-[#f1f5f9] font-semibold truncate" title={item.item}>{item.item}</strong>
                            <span className="text-xs text-[#9ca3af]">{item.konveksi}</span>
                            <span className="text-xs text-[#9ca3af]">Order tanggal: {item.dateOrder ? formatFullDate(item.dateOrder) : 'Belum tersedia'}</span>
                            <span className="text-xs text-[#9ca3af]">Selesai tanggal: {item.dateReceived ? formatFullDate(item.dateReceived) : 'Belum tersedia'}</span>
                            <span className="text-xs text-[#9ca3af]">Total hari: {getFulfillmentDuration(item.dateOrder, item.dateReceived)}</span>
                          </div>
                          <div className="flex items-center gap-4 text-xs font-mono shrink-0">
                            <span className="text-[#9ca3af] tabular-nums">{item.quantity.toLocaleString('id-ID')} → {item.in.toLocaleString('id-ID')}</span>
                            <span className="font-extrabold tabular-nums text-right w-[100px] text-indigo-400">
                              +{item.selisih} (+{pct}%)
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>

            {/* Expand / Collapse Button */}
            {discrepancies.length > 8 && (
              <div className="flex justify-center border-t border-[#334155]/20 mt-4 pt-3">
                <button 
                  className="px-4 py-1.5 bg-[#334155]/20 hover:bg-[#334155]/50 border border-[#334155]/60 hover:border-blue-500/40 text-[#f1f5f9] font-bold text-xs rounded-lg transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500" 
                  onClick={() => setShowAllDiscrepancies(prev => !prev)}
                >
                  {showAllDiscrepancies ? 'Sembunyikan detail' : `Lihat Semua (${discrepancies.length} order bermasalah)`}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 5. Daftar Semua Order (Order Ledger) */}
      <div className="card">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-500" />
              <h3 className="text-[#64748b] text-[0.8rem] font-bold uppercase tracking-[0.1em]">Daftar History Order (Ledger)</h3>
            </div>
            {/* Row counter near filters */}
            <p className="text-[11px] text-[#9ca3af] mt-1 font-semibold">
              Menampilkan {sortedOrders.length} dari {orders.length} order
            </p>
            {missingOrderDates.length > 0 && (
              <details className="mt-2 text-xs text-amber-300">
                <summary className="cursor-pointer font-semibold">
                  {missingOrderDates.length.toLocaleString('id-ID')} order tanpa tanggal order
                </summary>
                <ul className="mt-2 max-h-32 overflow-auto space-y-1 text-[#cbd5e1]">
                  {missingOrderDates.map((o, index) => {
                    const sourceRow = o.sourceRow;
                    return <li key={`${sourceRow ?? index}-${o.item}`}>Baris {sourceRow ?? '—'} · {o.item}</li>;
                  })}
                </ul>
              </details>
            )}
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <div className="relative flex-grow sm:flex-grow-0">
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-[#64748b]" />
              <input
                type="text"
                placeholder="Search Item..."
                className="bg-[#0f172a] border border-[#334155] rounded-lg text-xs pl-8 pr-3 py-1.5 focus:outline-none focus:border-[#3b82f6] text-[#f1f5f9] placeholder-[#64748b] w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-[#64748b]" />
              <select
                className="bg-[#0f172a] border border-[#334155] rounded-lg text-xs px-2.5 py-1.5 focus:outline-none focus:border-[#3b82f6] text-[#f1f5f9]"
                value={selectedVendor}
                onChange={(e) => setSelectedVendor(e.target.value)}
              >
                <option value="All">All Konveksi</option>
                {uniqueKonveksi.map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </div>

            <select
              className="bg-[#0f172a] border border-[#334155] rounded-lg text-xs px-2.5 py-1.5 focus:outline-none focus:border-[#3b82f6] text-[#f1f5f9]"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="All">Semua Status</option>
              <option value="In Production">Dalam Produksi (In Production)</option>
              <option value="Completed">Selesai (Completed)</option>
            </select>
          </div>
        </div>

        {/* Ledger Table Container with Fixed Layout */}
        <div className="overflow-x-auto w-full rounded-xl border border-[#334155]/40" style={{ maxHeight: '600px' }}>
          <table className="w-full text-left text-xs border-collapse" style={{ tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '12%' }} />
              <col style={{ width: showRejectColumn ? '28%' : '34%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '16%' }} />
              {showRejectColumn && <col style={{ width: '8%' }} />}
              <col style={{ width: '10%' }} />
              <col style={{ width: '10%' }} />
            </colgroup>
            <thead>
              <tr className="border-b border-[#334155] text-[#64748b] uppercase tracking-wider font-extrabold select-none bg-[#1e293b]">
                <th 
                  className="py-3 px-4 text-left cursor-pointer hover:text-[#f1f5f9] transition sticky top-0 bg-[#1e293b] z-10" 
                  onClick={() => handleSort('dateOrder')}
                >
                  Date Order {sortField === 'dateOrder' && (sortDirection === 'asc' ? ' ▲' : ' ▼')}
                </th>
                <th 
                  className="py-3 px-4 text-left cursor-pointer hover:text-[#f1f5f9] transition sticky top-0 bg-[#1e293b] z-10" 
                  onClick={() => handleSort('item')}
                >
                  Item {sortField === 'item' && (sortDirection === 'asc' ? ' ▲' : ' ▼')}
                </th>
                <th 
                  className="py-3 px-4 text-left cursor-pointer hover:text-[#f1f5f9] transition sticky top-0 bg-[#1e293b] z-10" 
                  onClick={() => handleSort('konveksi')}
                >
                  Konveksi {sortField === 'konveksi' && (sortDirection === 'asc' ? ' ▲' : ' ▼')}
                </th>
                <th 
                  className="py-3 px-4 text-right cursor-pointer hover:text-[#f1f5f9] transition sticky top-0 bg-[#1e293b] z-10" 
                  onClick={() => handleSort('quantity')}
                >
                  Ordered Qty {sortField === 'quantity' && (sortDirection === 'asc' ? ' ▲' : ' ▼')}
                </th>
                <th 
                  className="py-3 px-4 text-left cursor-pointer hover:text-[#f1f5f9] transition sticky top-0 bg-[#1e293b] z-10" 
                  onClick={() => handleSort('dateReceived')}
                >
                  Diterima {sortField === 'dateReceived' && (sortDirection === 'asc' ? ' ▲' : ' ▼')}
                </th>
                {showRejectColumn && (
                  <th 
                    className="py-3 px-4 text-right cursor-pointer hover:text-[#f1f5f9] transition sticky top-0 bg-[#1e293b] z-10" 
                    onClick={() => handleSort('reject')}
                  >
                    Reject {sortField === 'reject' && (sortDirection === 'asc' ? ' ▲' : ' ▼')}
                  </th>
                )}
                <th 
                  className="py-3 px-4 text-right cursor-pointer hover:text-[#f1f5f9] transition sticky top-0 bg-[#1e293b] z-10" 
                  onClick={() => handleSort('selisih')}
                >
                  Selisih {sortField === 'selisih' && (sortDirection === 'asc' ? ' ▲' : ' ▼')}
                </th>
                <th className="py-3 px-4 text-center sticky top-0 bg-[#1e293b] z-10">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#334155]/20 text-[#f1f5f9] bg-[#0f172a]">
              {paginatedOrders.length === 0 ? (
                <tr>
                  <td colSpan={showRejectColumn ? 9 : 8} className="py-8 text-center text-[#9ca3af]">
                    No orders match your filter criteria
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((o, idx) => {
                  const isInProd = o.status === 'In Production';
                  const keyStr = `ledger-row-${idx}`;
                  return (
                    <tr key={keyStr} className="even:bg-white/[0.02] hover:bg-white/[0.05] transition-colors">
                      <td className="py-3 px-4 font-mono text-[#9ca3af]">{o.dateOrder ? formatFullDate(o.dateOrder) : 'Belum diisi'}</td>
                      <td className="py-3 px-4 font-semibold text-[#f1f5f9] break-words">{o.item}</td>
                      <td className="py-3 px-4 text-[#e2e8f0] font-medium">{o.konveksi}</td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-[#f1f5f9]">{o.quantity.toLocaleString('id-ID')}</td>
                      
                      {/* Combined Diterima column */}
                      <td className="py-3 px-4 text-left font-mono text-[#9ca3af]">
                        {isInProd ? '—' : `${formatFullDate(o.dateReceived ?? '')} · ${o.in.toLocaleString('id-ID')}`}
                      </td>
                      
                      {showRejectColumn && (
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-[#ef4444]">
                          {o.reject > 0 ? o.reject.toLocaleString('id-ID') : '—'}
                        </td>
                      )}
                      
                      {/* Selisih column with em-dash for In Production */}
                      <td className={`py-3 px-4 text-right font-mono tabular-nums font-bold ${
                        isInProd ? 'text-[#64748b]' : o.selisih < 0 ? 'text-[#ef4444]' : o.selisih > 0 ? 'text-indigo-400' : 'text-[#9ca3af]'
                      }`}>
                        {isInProd ? '—' : o.selisih === 0 ? '0' : o.selisih > 0 ? `+${o.selisih}` : o.selisih}
                      </td>
                      
                      {/* Status badge column */}
                      <td className="py-3 px-4 text-center">
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${
                          o.status === 'In Production' 
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                            : o.status === 'Completed'
                            ? 'bg-[#10b981]/10 text-[#10b981] border-[#10b981]/20'
                            : o.status === 'Shortage'
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                        }`}>
                          {o.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-6 pt-4 border-t border-[#334155]/30">
            <button
              className="px-3 py-1.5 bg-[#334155]/20 hover:bg-[#334155]/50 disabled:opacity-40 text-[#f1f5f9] text-xs font-semibold rounded-lg transition"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            >
              Sebelumnya
            </button>
            <span className="text-xs text-[#9ca3af] font-medium font-mono">
              Halaman {currentPage} dari {totalPages}
            </span>
            <button
              className="px-3 py-1.5 bg-[#334155]/20 hover:bg-[#334155]/50 disabled:opacity-40 text-[#f1f5f9] text-xs font-semibold rounded-lg transition"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            >
              Berikutnya
            </button>
          </div>
        )}
      </div>

    </div>
  );
};
