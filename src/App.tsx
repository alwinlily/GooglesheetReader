import React, { useState, useMemo, useRef } from 'react';
import { useInventoryData } from './hooks/useInventoryData';
import Header from './components/Dashboard/Header';
import Filters from './components/Dashboard/Filters';
import SummaryCards from './components/Dashboard/SummaryCards';
import StockTrendChart from './components/Charts/StockTrendChart';
import InOutChart from './components/Charts/InOutChart';
import TopSalesTable from './components/Dashboard/TopSalesTable';
import SalesForecastChart from './components/Charts/SalesForecastChart';
import type { Size } from './types/inventory';
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
    const totalIn = filteredData.reduce((sum, r) => sum + r.in, 0);
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

    return { totalIn, totalOut, totalStock };
  }, [filteredData]);

  const trendData = useMemo(() => {
    // Group by date
    const dateGroups: Record<string, any> = {};

    filteredData.forEach(r => {
      if (!dateGroups[r.date]) {
        dateGroups[r.date] = { date: r.date };
      }

      const value = selectedMetric === 'Stock' ? (r.stock || 0) : r.out;

      if (selectedProduct === 'All') {
        // Aggregate across products if "All" is selected
        dateGroups[r.date][r.size] = (dateGroups[r.date][r.size] || 0) + value;
      } else {
        dateGroups[r.date][r.size] = value;
      }
    });

    return Object.values(dateGroups).sort((a: any, b: any) => a.date.localeCompare(b.date));
  }, [filteredData, selectedProduct, selectedSize, selectedMetric]);

  const inOutData = useMemo(() => {
    const dateGroups: Record<string, any> = {};
    filteredData.forEach(r => {
      if (!dateGroups[r.date]) {
        dateGroups[r.date] = { date: r.date, in: 0, out: 0 };
      }
      dateGroups[r.date].in += r.in;
      dateGroups[r.date].out += r.out;
    });
    return Object.values(dateGroups).sort((a: any, b: any) => a.date.localeCompare(b.date));
  }, [filteredData]);

  const topSalesData = useMemo(() => {
    const salesMap: Record<string, { product: string; size: string; sales: number }> = {};

    filteredData.forEach(r => {
      const key = `${r.product}-${r.size}`;
      if (!salesMap[key]) {
        salesMap[key] = { product: r.product, size: r.size, sales: 0 };
      }
      salesMap[key].sales += r.out;
    });

    return Object.values(salesMap)
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5);
  }, [filteredData]);

  const exportPDF = async () => {
    if (!dashboardRef.current) return;

    const canvas = await html2canvas(dashboardRef.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#0d1117'
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

  const forecastData = useMemo(() => {
    if (selectedProduct === 'All') return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const oneMonthAgo = new Date(today);
    oneMonthAgo.setMonth(today.getMonth() - 1);

    const oneMonthAhead = new Date(today);
    oneMonthAhead.setMonth(today.getMonth() + 1);

    const metadata = productMetadata[selectedProduct];
    let targetDaily = 0;
    if (metadata) {
      if (selectedSize === 'All') {
        // Aggregate daily target across all sizes for the product
        targetDaily = Object.values(metadata).reduce((sum, m) => sum + m.targetSalesDaily, 0);
      } else {
        targetDaily = metadata[selectedSize]?.targetSalesDaily || 0;
      }
    }

    // 1. Past Sales Data
    const pastSalesMap: Record<string, number> = {};
    filteredData.forEach(r => {
      const d = new Date(r.date);
      if (d >= oneMonthAgo && d <= today) {
        pastSalesMap[r.date] = (pastSalesMap[r.date] || 0) + r.out;
      }
    });

    const combinedData: any[] = [];

    // Fill the next 30 days with both Forecast Target and Last Month's Actuals
    for (let d = new Date(today); d <= oneMonthAhead; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];

      // Find corresponding date from one month ago
      const pastDate = new Date(d);
      pastDate.setMonth(d.getMonth() - 1);
      const pastDateStr = pastDate.toISOString().split('T')[0];

      combinedData.push({
        date: dateStr,
        forecast: targetDaily,
        pastActual: pastSalesMap[pastDateStr] || 0
      });
    }

    return combinedData;
  }, [filteredData, selectedProduct, productMetadata]);

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

      {hasInvalidData && (
        <div className="card mb-8" style={{ borderColor: 'var(--warning)', backgroundColor: 'rgba(210, 153, 34, 0.05)' }}>
          <p className="text-sm" style={{ color: 'var(--warning)' }}>
            ⚠️ <strong>Data Warning:</strong> Some stock values were found to be invalid (negative) and have been excluded from the charts.
          </p>
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
      />

      <div className="chart-grid">
        <StockTrendChart
          data={trendData}
          sizes={selectedSize === 'All' ? ['S', 'M', 'L', 'XL', 'XXL'] : [selectedSize]}
          metric={selectedMetric}
          onMetricChange={setSelectedMetric}
          minStock={currentMinStock}
        />
        <div className="chart-full">
          <TopSalesTable data={topSalesData} />
        </div>
        <InOutChart data={inOutData} />
        {selectedProduct !== 'All' && (
          <SalesForecastChart data={forecastData} productName={selectedProduct} />
        )}
      </div>

      <footer className="mt-8 text-center text-secondary text-sm">
        <p>Report generated on {new Date().toLocaleString()}</p>
      </footer>
    </div>
  );
}

export default App;
