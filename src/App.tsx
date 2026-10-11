import React, { useState, useMemo, useRef } from 'react';
import { useInventoryData } from './hooks/useInventoryData';
import { useOrderData } from './hooks/useOrderData';
import { useExpenseData } from './hooks/useExpenseData';
import Header from './components/Dashboard/Header';
import Filters from './components/Dashboard/Filters';
import SummaryCards from './components/Dashboard/SummaryCards';
import StockTrendChart from './components/Charts/StockTrendChart';
import TopSalesTable from './components/Dashboard/TopSalesTable';
import UnifiedForecastChart from './components/Charts/UnifiedForecastChart';
import StockBreakdownChart from './components/Charts/StockBreakdownChart';
import ReplenishmentPlanner from './components/Dashboard/ReplenishmentPlanner';
import { OrderTracker } from './components/Dashboard/OrderTracker';
import { ExpenseTracker } from './components/Dashboard/ExpenseTracker';
import { PinModal } from './components/Dashboard/PinModal';
import type { Size } from './types/inventory';
import { calculateInventoryMismatches } from './utils/inventoryValidation';
import { summarizeInventory } from './utils/inventoryStats';
import { getOneMonthAgoDate } from './utils/dateUtils';
import { AlertOctagon, Lock } from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import './styles/index.css';

const EXPENSE_PIN = import.meta.env.VITE_EXPENSE_PIN || '123456789';

function App() {
  const [activePage, setActivePage] = useState<'inventory' | 'orders' | 'expenses'>('inventory');
  const [isExpenseUnlocked, setIsExpenseUnlocked] = useState<boolean>(() => {
    return typeof window !== 'undefined' && sessionStorage.getItem('expense_tracker_unlocked') === 'true';
  });
  const [showPinModal, setShowPinModal] = useState(false);
  const [targetPendingPage, setTargetPendingPage] = useState<'inventory' | 'orders' | 'expenses' | null>(null);

  const [activeBrand, setActiveBrand] = useState<'Kaos Dika' | 'Marapthon'>('Kaos Dika');
  const { data, productMetadata, loading, error, products, dateRange, refresh } = useInventoryData(activeBrand);
  const { 
    orders: orderData, 
    uniqueKonveksi, 
    loading: ordersLoading, 
    error: ordersError, 
    refresh: refreshOrders 
  } = useOrderData(activeBrand);
  const {
    expenses: expenseData,
    loading: expensesLoading,
    error: expensesError,
    isUsingMock: isExpenseMock,
    categories: expenseCategories,
    dateRange: expenseDateRange,
    refresh: refreshExpenses
  } = useExpenseData();
  
  const dashboardRef = useRef<HTMLDivElement>(null);

  const [selectedProduct, setSelectedProduct] = useState('All');
  const [selectedSize, setSelectedSize] = useState<Size | 'All'>('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [selectedMetric, setSelectedMetric] = useState<'Stock' | 'Sales'>('Stock');

  const [showValidationModal, setShowValidationModal] = useState(false);
  const [modalSortColumn, setModalSortColumn] = useState<'date' | 'product' | 'difference'>('difference');
  const [modalSortDirection, setModalSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleBrandChange = (brand: 'Kaos Dika' | 'Marapthon') => {
    setActiveBrand(brand);
    setSelectedProduct('All');
    setSelectedSize('All');
    setStartDate('');
    setEndDate('');
  };

  const handlePageSwitch = (page: 'inventory' | 'orders' | 'expenses') => {
    if (page === 'expenses' && !isExpenseUnlocked) {
      setTargetPendingPage('expenses');
      setShowPinModal(true);
      return;
    }
    setActivePage(page);
  };

  const handlePinSuccess = () => {
    setIsExpenseUnlocked(true);
    sessionStorage.setItem('expense_tracker_unlocked', 'true');
    setShowPinModal(false);
    if (targetPendingPage) {
      setActivePage(targetPendingPage);
      setTargetPendingPage(null);
    } else {
      setActivePage('expenses');
    }
  };

  const handlePinCancel = () => {
    setShowPinModal(false);
    setTargetPendingPage(null);
  };

  const handleLockExpense = () => {
    setIsExpenseUnlocked(false);
    sessionStorage.removeItem('expense_tracker_unlocked');
    setActivePage('inventory');
  };

  // Set default dates once data is loaded
  React.useEffect(() => {
    if (dateRange.min) {
      setStartDate(dateRange.min);
      setEndDate(dateRange.max);
    }
  }, [dateRange]);

  const filteredData = useMemo(() => {
    return data.filter(r => {
      const matchProduct = selectedProduct === 'All' || r.product === selectedProduct;
      const matchSize = selectedSize === 'All' || r.size === selectedSize;
      const matchDate = (!startDate || r.date >= startDate) && (!endDate || r.date <= endDate);
      return matchProduct && matchSize && matchDate;
    });
  }, [data, selectedProduct, selectedSize, startDate, endDate]);

  const scopedData = useMemo(() => data.filter(r => (selectedProduct === 'All' || r.product === selectedProduct) && (selectedSize === 'All' || r.size === selectedSize)), [data, selectedProduct, selectedSize]);
  const stats = useMemo(() => summarizeInventory(scopedData, startDate || dateRange.min, endDate || dateRange.max), [scopedData, startDate, endDate, dateRange]);
  const previousStats = useMemo(() => {
    const start = getOneMonthAgoDate(startDate || dateRange.min);
    const end = getOneMonthAgoDate(endDate || dateRange.max);
    if (!start || !end || start < dateRange.min || end > dateRange.max || !scopedData.some(r => r.date >= start && r.date <= end)) return null;
    return summarizeInventory(scopedData, start, end);
  }, [scopedData, startDate, endDate, dateRange]);

  // Pre-aggregated sales by date and size across full dataset for Day-to-Day comparison
  const historicalSalesMap = useMemo(() => {
    const map: Record<string, { total: number; sizes: Record<string, number> }> = {};

    data.forEach(r => {
      if (selectedProduct !== 'All' && r.product !== selectedProduct) return;

      if (!map[r.date]) {
        map[r.date] = { total: 0, sizes: { 'S': 0, 'M': 0, 'L': 0, 'XL': 0, 'XXL': 0 } };
      }
      map[r.date].sizes[r.size] = (map[r.date].sizes[r.size] || 0) + r.out;
      map[r.date].total += r.out;
    });

    return map;
  }, [data, selectedProduct]);

  const trendData = useMemo(() => {
    // Group by date
    const dateGroups: Record<string, any> = {};
    const todayStr = new Date().toISOString().split('T')[0];

    filteredData.forEach(r => {
      if (r.date > todayStr) return; // Cap at today

      if (!dateGroups[r.date]) {
        dateGroups[r.date] = { date: r.date, total: 0 };
      }

      const value = selectedMetric === 'Stock' ? (r.stock ?? undefined) : r.out;

      if (selectedProduct === 'All') {
        // Aggregate across products if "All" is selected
        if (value !== undefined) {
          dateGroups[r.date][r.size] = (dateGroups[r.date][r.size] || 0) + value;
          dateGroups[r.date].total += value;
        }
      } else {
        dateGroups[r.date][r.size] = value;
        if (value !== undefined) {
          dateGroups[r.date].total += value;
        }
      }
    });

    // Populate 1-month-ago day-to-day comparison fields
    const SIZES: Size[] = ['S', 'M', 'L', 'XL', 'XXL'];
    Object.values(dateGroups).forEach((g: any) => {
      const prevDateStr = getOneMonthAgoDate(g.date);
      g.prevDate = prevDateStr;

      const prevData = historicalSalesMap[prevDateStr];
      if (selectedSize === 'All') {
        g.prevTotal = prevData ? prevData.total : 0;
        SIZES.forEach(s => {
          g[`prev_${s}`] = prevData ? (prevData.sizes[s] || 0) : 0;
        });
      } else {
        const sizeVal = prevData ? (prevData.sizes[selectedSize] || 0) : 0;
        g.prevTotal = sizeVal;
        g[`prev_${selectedSize}`] = sizeVal;
      }
    });

    // Remove "total" if a specific size is selected and metric is Stock to avoid redundancy
    if (selectedMetric === 'Stock' && selectedSize !== 'All') {
      Object.values(dateGroups).forEach((g: any) => {
        delete g.total;
      });
    }

    return Object.values(dateGroups).sort((a: any, b: any) => a.date.localeCompare(b.date));
  }, [filteredData, selectedProduct, selectedSize, selectedMetric, historicalSalesMap]);



  const handleExportPDF = async () => {
    if (!dashboardRef.current) return;

    // Select all components to hide during print/export
    const exportButtons = document.querySelectorAll('.btn-header-refresh, .btn-header-export, .segmented-control, select, input');
    exportButtons.forEach(btn => (btn as HTMLElement).style.display = 'none');

    try {
      const canvas = await html2canvas(dashboardRef.current, {
        backgroundColor: '#0f172a',
        scale: 2,
        useCORS: true
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      const pagePrefix = activePage === 'inventory' 
        ? `Inventory-Dashboard-${activeBrand}` 
        : activePage === 'orders' 
        ? `Order-Tracker-${activeBrand}` 
        : 'Expense-Tracker';
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`${pagePrefix}-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (e) {
      console.error('PDF export failed:', e);
    } finally {
      exportButtons.forEach(btn => (btn as HTMLElement).style.display = '');
    }
  };



  const validationMismatches = useMemo(() => calculateInventoryMismatches(data), [data]);

  const sortedValidationMismatches = useMemo(() => {
    const list = [...validationMismatches];
    list.sort((a, b) => {
      let valA: any;
      let valB: any;

      if (modalSortColumn === 'date') {
        valA = a.date;
        valB = b.date;
      } else if (modalSortColumn === 'product') {
        valA = a.product;
        valB = b.product;
      } else { // difference
        valA = Math.abs(a.actual - a.expected);
        valB = Math.abs(b.actual - b.expected);
      }

      if (typeof valA === 'string') {
        return modalSortDirection === 'asc' 
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      } else {
        return modalSortDirection === 'asc'
          ? valA - valB
          : valB - valA;
      }
    });
    return list;
  }, [validationMismatches, modalSortColumn, modalSortDirection]);

  const handleModalSort = (column: 'date' | 'product' | 'difference') => {
    if (modalSortColumn === column) {
      setModalSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setModalSortColumn(column);
      setModalSortDirection(column === 'difference' ? 'desc' : 'asc');
    }
  };

  const topSalesData = useMemo(() => {
    const salesMap: Record<string, { product: string; size: string; sales: number }> = {};

    filteredData.forEach(r => {
      const key = `${r.product}-${r.size}`;
      if (!salesMap[key]) {
        salesMap[key] = { product: r.product, size: r.size, sales: 0 };
      }
      salesMap[key].sales += r.out;
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate total calendar days in the selected range
    let totalDays = 1;
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    if (start && end && !isNaN(start.getTime()) && !isNaN(end.getTime())) {
      const diffTime = Math.abs(end.getTime() - start.getTime());
      totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    } else {
      const dates = data.map(r => r.date).sort();
      if (dates.length > 0) {
        const minD = new Date(dates[0]);
        const maxD = new Date(dates[dates.length - 1]);
        const diffTime = Math.abs(maxD.getTime() - minD.getTime());
        totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      }
    }
    if (totalDays <= 0) totalDays = 1;

    return Object.values(salesMap)
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 10)
      .map(item => {
        // Find all history records for this specific item
        const itemHistory = data.filter(r => r.product === item.product && r.size === item.size);

        // Find latest valid stock for this specific item
        const sortedRecords = [...itemHistory].sort((a, b) => b.date.localeCompare(a.date));
        const latestRecordWithStock = sortedRecords.find(r => r.stock !== null);
        const stock = latestRecordWithStock?.stock ?? 0;

        const metadata = productMetadata[item.product]?.[item.size];
        const targetDaily = metadata?.targetSalesDaily || 0;

        // Calculate velocity (total out in selected range / calendar days)
        const rangeRecords = itemHistory.filter(r => 
          (!startDate || r.date >= startDate) && 
          (!endDate || r.date <= endDate)
        );
        const totalOut = rangeRecords.reduce((sum, r) => sum + r.out, 0);
        const velocity = totalOut / totalDays;

        // Calculate restock interval
        const incomingRecords = itemHistory.filter(r => r.in > 0).sort((a, b) => a.date.localeCompare(b.date));
        let restockInterval = 30; // Default to 30 days
        if (incomingRecords.length >= 2) {
          let totalDiffDays = 0;
          for (let i = 1; i < incomingRecords.length; i++) {
            const prevD = new Date(incomingRecords[i - 1].date);
            const currD = new Date(incomingRecords[i].date);
            const diffDays = Math.ceil(Math.abs(currD.getTime() - prevD.getTime()) / (1000 * 60 * 60 * 24));
            totalDiffDays += diffDays;
          }
          restockInterval = Math.max(7, Math.min(60, Math.round(totalDiffDays / (incomingRecords.length - 1))));
        }

        // Safety stock threshold
        const calculatedMinStock = velocity > 0 ? Math.ceil(velocity * restockInterval) : 0;
        const isInsufficient = stock <= calculatedMinStock;

        let stockOutDate: string | null = null;
        if (velocity > 0) {
          const daysToStockOut = Math.floor(stock / velocity);
          const outDate = new Date(today);
          outDate.setDate(today.getDate() + daysToStockOut);
          stockOutDate = outDate.toISOString().split('T')[0];
        }

        const itemMismatches = validationMismatches.filter(m => m.product === item.product && m.size === item.size);
        const hasMismatch = itemMismatches.length > 0;

        return {
          ...item,
          stock,
          target: targetDaily,
          stockOutDate,
          hasMismatch,
          isInsufficient
        };
      });
  }, [data, filteredData, productMetadata, validationMismatches, startDate, endDate]);



  const stockBreakdown = useMemo(() => {
    const breakdown: Record<string, number> = { 'S': 0, 'M': 0, 'L': 0, 'XL': 0, 'XXL': 0 };

    // Get latest stock per product+size from the full filtered dataset
    const latestStocks: Record<string, number> = {};
    const sortedData = [...filteredData].sort((a, b) => b.date.localeCompare(a.date));

    for (const r of sortedData) {
      const key = `${r.product}-${r.size}`;
      if (r.stock !== null && latestStocks[key] === undefined) {
        latestStocks[key] = r.stock;
        breakdown[r.size] = (breakdown[r.size] || 0) + r.stock;
      }
    }

    return Object.entries(breakdown).map(([size, stock]) => ({ size, stock }));
  }, [filteredData]);

  const currentMinStock = useMemo(() => {
    if (selectedProduct === 'All') return undefined;
    const metadata = productMetadata[selectedProduct];
    if (!metadata) return undefined;

    if (selectedSize === 'All') {
      // Aggregate min stock across all sizes for the product
      return Object.values(metadata).reduce((sum, m) => sum + m.minStock, 0);
    }
    return metadata[selectedSize]?.minStock;
  }, [selectedProduct, selectedSize, productMetadata]);

  const unifiedForecastData = useMemo(() => {
    if (selectedProduct === 'All') return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const oneMonthAhead = new Date(today);
    oneMonthAhead.setMonth(today.getMonth() + 1);

    const metadata = productMetadata[selectedProduct];
    let targetDaily = 0;
    let minStockTotal = 0;

    if (metadata) {
      if (selectedSize === 'All') {
        targetDaily = Object.values(metadata).reduce((sum, m) => sum + m.targetSalesDaily, 0);
        minStockTotal = Object.values(metadata).reduce((sum, m) => sum + m.minStock, 0);
      } else {
        targetDaily = metadata[selectedSize]?.targetSalesDaily || 0;
        minStockTotal = metadata[selectedSize]?.minStock || 0;
      }
    }

    // 1. Past Sales Data Mapping (for overlay)
    const pastSalesMap: Record<string, number> = {};
    filteredData.forEach(r => {
      const d = new Date(r.date);
      if (d <= today) {
        pastSalesMap[r.date] = (pastSalesMap[r.date] || 0) + r.out;
      }
    });

    // 2. Current stock
    const latestDate = dateRange.max;
    const currentStock = filteredData
      .filter(r => r.date === latestDate)
      .reduce((sum, r) => sum + (r.stock || 0), 0);

    const dataPoints: any[] = [];
    let projectedStock = currentStock;

    // Combine into a 30-60 day forecast window
    // We'll show 30 days of forecast as requested previously
    for (let i = 0; i <= 30; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];

      // Past date for overlay
      const pastDate = new Date(d);
      pastDate.setMonth(d.getMonth() - 1);
      const pastDateStr = pastDate.toISOString().split('T')[0];

      dataPoints.push({
        date: dateStr,
        target: targetDaily,
        pastActual: pastSalesMap[pastDateStr] || 0,
        stock: Math.max(0, projectedStock),
        minStock: minStockTotal
      });

      projectedStock -= targetDaily;
    }

    return dataPoints;
  }, [filteredData, selectedProduct, selectedSize, productMetadata, dateRange]);

  if (activePage === 'inventory' && error) {
    return (
      <div className="dashboard-container flex items-center justify-center" style={{ height: '100vh' }}>
        <div className="card text-center">
          <h2 style={{ color: 'var(--danger)' }}>Error Loading Data</h2>
          <p className="text-secondary mb-4">{error}</p>
          <button className="btn btn-primary" onClick={refresh}>Try Again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container" ref={dashboardRef}>
      <Header
        onRefresh={() => {
          refresh();
          refreshOrders();
          refreshExpenses();
        }}
        loading={loading || ordersLoading || expensesLoading}
        onExportPDF={handleExportPDF}
        title={
          activePage === 'inventory'
            ? 'Inventory Dashboard'
            : activePage === 'orders'
            ? 'Order Tracker'
            : 'Expense Tracker'
        }
        subtitle={
          activePage === 'inventory'
            ? 'Pantau stok dan rencanakan pemesanan.'
            : activePage === 'orders'
            ? 'Lacak status produksi pesanan dan konveksi.'
            : 'Catatan & analisis rincian pengeluaran operasional.'
        }
      >
        <nav className="header-navigation" aria-label="Navigasi dashboard">
          <div className="segmented-control">
            <button
              className={activePage === 'inventory' ? 'segmented-button active' : 'segmented-button'}
              aria-pressed={activePage === 'inventory'}
              onClick={() => handlePageSwitch('inventory')}
            >
              Stock Dashboard
            </button>
            <button
              className={activePage === 'orders' ? 'segmented-button active' : 'segmented-button'}
              aria-pressed={activePage === 'orders'}
              onClick={() => handlePageSwitch('orders')}
            >
              Order Tracker
            </button>
            <button
              className={activePage === 'expenses' ? 'segmented-button active' : 'segmented-button'}
              aria-pressed={activePage === 'expenses'}
              onClick={() => handlePageSwitch('expenses')}
            >
              {!isExpenseUnlocked && <Lock className="w-3 h-3 inline mr-1 text-amber-400" />}
              Expense Tracker
            </button>
          </div>
          {activePage !== 'expenses' ? (
            <div className="segmented-control" aria-label="Brand">
              {(['Kaos Dika', 'Marapthon'] as const).map(brand => (
                <button
                  key={brand}
                  className={activeBrand === brand ? 'segmented-button active' : 'segmented-button'}
                  aria-pressed={activeBrand === brand}
                  onClick={() => handleBrandChange(brand)}
                >
                  {brand}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="segmented-control" aria-label="Operasional">
                <span className="segmented-button active cursor-default">Operasional Umum</span>
              </div>
              {isExpenseUnlocked && (
                <button
                  onClick={handleLockExpense}
                  className="btn text-xs py-1 px-2.5 flex items-center gap-1.5 text-[#94a3b8] hover:text-rose-400 border-[#334155] hover:border-rose-500/30"
                  title="Kunci kembali akses Expense Tracker"
                >
                  <Lock className="w-3 h-3 text-amber-400" />
                  Kunci PIN
                </button>
              )}
            </div>
          )}
          {activePage === 'inventory' && validationMismatches.length > 0 && (
            <button className="validation-badge" onClick={() => setShowValidationModal(true)}>
              ⚠ {validationMismatches.length.toLocaleString('id-ID')} selisih data
            </button>
          )}
        </nav>
      </Header>
      {activePage === 'inventory' && (
        <>
          <Filters
            products={products}
            selectedProduct={selectedProduct}
            onProductChange={setSelectedProduct}
            selectedSize={selectedSize}
            onSizeChange={setSelectedSize}
            dateRange={dateRange}
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
          />

          <ReplenishmentPlanner data={scopedData} productMetadata={productMetadata} startDate={startDate} endDate={endDate}>
            <SummaryCards {...stats} previous={previousStats} />
            <StockTrendChart
              data={trendData}
              sizes={selectedSize === 'All' ? ['S', 'M', 'L', 'XL', 'XXL'] : [selectedSize]}
              metric={selectedMetric}
              onMetricChange={setSelectedMetric}
              minStock={currentMinStock}
              totalAggregate={selectedMetric === 'Stock' ? stats.totalStock : stats.totalOut}
              selectedProduct={selectedProduct}
              selectedSize={selectedSize}
            />
          </ReplenishmentPlanner>

          <div className="flex flex-col gap-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TopSalesTable data={topSalesData} />
              <StockBreakdownChart data={stockBreakdown} />
            </div>

            {selectedProduct !== 'All' && (
              <UnifiedForecastChart data={unifiedForecastData} productName={selectedProduct} />
            )}
          </div>
        </>
      )}

      {activePage === 'orders' && (
        <OrderTracker
          orders={orderData}
          loading={ordersLoading}
          error={ordersError}
          uniqueKonveksi={uniqueKonveksi}
        />
      )}

      {activePage === 'expenses' && (
        isExpenseUnlocked ? (
          <ExpenseTracker
            expenses={expenseData}
            loading={expensesLoading}
            error={expensesError}
            isUsingMock={isExpenseMock}
            categories={expenseCategories}
            dateRange={expenseDateRange}
            onRefresh={refreshExpenses}
          />
        ) : (
          <div className="card text-center py-24 flex flex-col items-center justify-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Lock className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#f8fafc]">Halaman Diproteksi PIN</h2>
              <p className="text-xs text-[#94a3b8] max-w-sm mt-1">
                Data keuangan operasional memerlukan verifikasi PIN untuk dapat dilihat.
              </p>
            </div>
            <button
              onClick={() => setShowPinModal(true)}
              className="btn btn-primary text-xs py-2 px-5 flex items-center gap-2"
            >
              <Lock className="w-4 h-4" />
              Masukkan PIN
            </button>
          </div>
        )
      )}

      <footer className="mt-8 text-center text-secondary text-sm pb-8">
        <p>Data per {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}, {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }).replace(/\./g, ':')}</p>
      </footer>

      {/* PIN Verification Modal */}
      <PinModal
        isOpen={showPinModal}
        onSuccess={handlePinSuccess}
        onCancel={handlePinCancel}
        correctPin={EXPENSE_PIN}
      />

      {/* Validation Modal */}
      {showValidationModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#010409]/80 backdrop-blur-md transition-all duration-200"
          style={{ top: 0, left: 0, right: 0, bottom: 0 }}
        >
          <div className="bg-[#1e293b] border border-[#334155] rounded-2xl p-6 w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-[#334155]">
              <div className="flex items-center gap-2 text-[#ff6b6b]">
                <AlertOctagon className="w-5 h-5" />
                <h3 className="text-base font-bold text-[#f8fafc]">Detail selisih stok</h3>
              </div>
              <button 
                onClick={() => setShowValidationModal(false)}
                className="text-[#94a3b8] hover:text-[#f8fafc] text-sm font-semibold transition"
              >
                Tutup
              </button>
            </div>
            <div className="overflow-y-auto pr-2 flex-grow">
              <p className="text-xs text-[#94a3b8] mb-4">
                Setiap selisih adalah satu pemeriksaan produk, ukuran, dan tanggal; satu item bisa memiliki beberapa selisih. Mengikuti definisi stok awal: stok hari ini = stok kemarin + masuk kemarin − keluar kemarin. Tanggal yang terputus atau data tidak valid tidak dibandingkan.
              </p>
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#334155] text-[#64748b] uppercase tracking-wider font-bold">
                    <th 
                      onClick={() => handleModalSort('date')}
                      className="py-2.5 px-3 cursor-pointer select-none hover:text-[#f1f5f9] transition-colors duration-150"
                    >
                      Tanggal {modalSortColumn === 'date' && (modalSortDirection === 'asc' ? ' ▲' : ' ▼')}
                    </th>
                    <th 
                      onClick={() => handleModalSort('product')}
                      className="py-2.5 px-3 cursor-pointer select-none hover:text-[#f1f5f9] transition-colors duration-150"
                    >
                      Produk {modalSortColumn === 'product' && (modalSortDirection === 'asc' ? ' ▲' : ' ▼')}
                    </th>
                    <th className="py-2.5 px-3">Ukuran</th>
                    <th className="py-2.5 px-3 text-right">Ekspektasi</th>
                    <th className="py-2.5 px-3 text-right">Aktual</th>
                    <th 
                      onClick={() => handleModalSort('difference')}
                      className="py-2.5 px-3 text-right cursor-pointer select-none hover:text-[#f1f5f9] transition-colors duration-150"
                    >
                      Selisih {modalSortColumn === 'difference' && (modalSortDirection === 'asc' ? ' ▲' : ' ▼')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#334155]/40 text-[#f1f5f9]">
                  {sortedValidationMismatches.map((m, i) => (
                    <tr key={i} className="hover:bg-[#1e293b]/60">
                      <td className="py-2.5 px-3 font-mono">{new Date(m.date).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                      <td className="py-2.5 px-3 font-semibold">{m.product}</td>
                      <td className="py-2.5 px-3 uppercase">{m.size}</td>
                      <td className="py-2.5 px-3 text-right text-[#94a3b8] font-mono">{m.expected.toLocaleString('id-ID')}</td>
                      <td className="py-2.5 px-3 text-right text-[#ff6b6b] font-bold font-mono">{m.actual.toLocaleString('id-ID')}</td>
                      <td className="py-2.5 px-3 text-right text-[#ff6b6b] font-mono">{(m.actual - m.expected).toLocaleString('id-ID')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
