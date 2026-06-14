import React, { useState, useMemo, useRef } from 'react';
import { useInventoryData } from './hooks/useInventoryData';
import Header from './components/Dashboard/Header';
import Filters from './components/Dashboard/Filters';
import SummaryCards from './components/Dashboard/SummaryCards';
import StockTrendChart from './components/Charts/StockTrendChart';
import TopSalesTable from './components/Dashboard/TopSalesTable';
import UnifiedForecastChart from './components/Charts/UnifiedForecastChart';
import StockBreakdownChart from './components/Charts/StockBreakdownChart';
import ReplenishmentPlanner from './components/Dashboard/ReplenishmentPlanner';
import type { Size } from './types/inventory';
import { TriangleAlert, AlertOctagon } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import './styles/index.css';

function App() {
  const { data, productMetadata, loading, error, products, dateRange, refresh } = useInventoryData();
  const dashboardRef = useRef<HTMLDivElement>(null);

  const [selectedProduct, setSelectedProduct] = useState('All');
  const [selectedSize, setSelectedSize] = useState<Size | 'All'>('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [selectedMetric, setSelectedMetric] = useState<'Stock' | 'Sales'>('Stock');

  // Set default dates once data is loaded
  React.useEffect(() => {
    if (dateRange.min && !startDate) {
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

  const stats = useMemo(() => {
    const totalIn = filteredData.filter(r => !r.isReturn).reduce((sum, r) => sum + r.in, 0);
    const totalReturn = filteredData.filter(r => r.isReturn).reduce((sum, r) => sum + r.in, 0);
    const totalOut = filteredData.reduce((sum, r) => sum + r.out, 0);

    // Total stock: latest valid stock per distinct product+size
    const latestStocks: Record<string, number> = {};
    const sortedData = [...filteredData].sort((a, b) => b.date.localeCompare(a.date));

    for (const r of sortedData) {
      const key = `${r.product}-${r.size}`;
      if (r.stock !== null && latestStocks[key] === undefined) {
        latestStocks[key] = r.stock;
      }
    }

    const totalStock = Object.values(latestStocks).reduce((sum, val) => sum + val, 0);

    return { totalIn, totalReturn, totalOut, totalStock };
  }, [filteredData]);

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

    // Remove "total" if a specific size is selected to avoid redundancy
    if (selectedSize !== 'All') {
      Object.values(dateGroups).forEach((g: any) => {
        delete g.total;
      });
    }

    return Object.values(dateGroups).sort((a: any, b: any) => a.date.localeCompare(b.date));
  }, [filteredData, selectedProduct, selectedSize, selectedMetric]);


  const validationMismatches = useMemo(() => {
    const mismatches: Array<{ product: string; size: string; date: string; expected: number; actual: number }> = [];

    // Group by product and size from the full dataset to ensure continuous history
    const grouped = data.reduce((acc, curr) => {
      const key = `${curr.product}|${curr.size}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(curr);
      return acc;
    }, {} as Record<string, any[]>);

    Object.entries(grouped).forEach(([key, records]) => {
      const [product, size] = key.split('|');
      const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));

      for (let i = 1; i < sorted.length; i++) {
        const prev = sorted[i - 1];
        const curr = sorted[i];

        if (prev.stock !== null && curr.stock !== null && prev.validStock && curr.validStock) {
          const expected = prev.stock + prev.in - prev.out;
          if (expected !== curr.stock) {
            mismatches.push({
              product,
              size,
              date: curr.date,
              expected,
              actual: curr.stock
            });
          }
        }
      }
    });

    return mismatches;
  }, [data]);

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

  const exportPDF = async () => {
    if (!dashboardRef.current) return;

    const canvas = await html2canvas(dashboardRef.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#060913'
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('l', 'mm', 'a4');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`inventory-report-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const hasInvalidData = useMemo(() => filteredData.some(r => !r.validStock), [filteredData]);

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

  if (error) {
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
      <Header onExport={exportPDF} onRefresh={refresh} loading={loading} />

      {(hasInvalidData || validationMismatches.length > 0) && (
        <div className="flex flex-col gap-4 mb-8">
          {hasInvalidData && (
            <div className="flex items-start gap-3 p-4 bg-[#f59e0b]/10 border-l-4 border-[#f59e0b] rounded-lg text-[#fbbf24] shadow-[0_4px_12px_rgba(245,158,11,0.05)]">
              <TriangleAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="font-extrabold uppercase tracking-wide text-xs block mb-1">Data Warning</strong>
                <p className="text-sm text-[#fbbf24]/90">Some stock values were found to be invalid (negative) and have been excluded from calculations.</p>
              </div>
            </div>
          )}
          {validationMismatches.length > 0 && (
            <div className="flex items-start gap-3 p-4 bg-[#ef4444]/10 border-l-4 border-[#ef4444] rounded-lg text-[#fca5a5] shadow-[0_4px_12px_rgba(239,68,68,0.05)]">
              <AlertOctagon className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="font-extrabold uppercase tracking-wide text-xs block mb-1">Validation Issue</strong>
                <p className="text-sm text-[#fca5a5]/90">{validationMismatches.length} stock mismatch(es) detected. Expected stock (from yesterday's movement) does not match reported stock.</p>
              </div>
            </div>
          )}
        </div>
      )}

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

      <SummaryCards
        totalStock={stats.totalStock}
        totalIn={stats.totalIn}
        totalOut={stats.totalOut}
        totalReturn={stats.totalReturn}
      />

      <div className="flex flex-col gap-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TopSalesTable data={topSalesData} />
          <StockBreakdownChart data={stockBreakdown} />
        </div>

        <div className="grid grid-cols-1 gap-6">
          <StockTrendChart
            data={trendData}
            sizes={selectedSize === 'All' ? ['S', 'M', 'L', 'XL', 'XXL'] : [selectedSize]}
            metric={selectedMetric}
            onMetricChange={setSelectedMetric}
            minStock={currentMinStock}
            totalAggregate={selectedMetric === 'Stock' ? stats.totalStock : stats.totalOut}
          />
        </div>

        <ReplenishmentPlanner
          data={data}
          productMetadata={productMetadata}
          startDate={startDate}
          endDate={endDate}
        />

        {selectedProduct !== 'All' && (
          <UnifiedForecastChart data={unifiedForecastData} productName={selectedProduct} />
        )}
      </div>

      <footer className="mt-8 text-center text-secondary text-sm">
        <p>Report generated on {new Date().toLocaleString()}</p>
      </footer>
    </div>
  );
}

export default App;
