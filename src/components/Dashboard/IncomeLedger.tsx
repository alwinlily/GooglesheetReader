import React, { useState, useMemo } from 'react';
import {
  Search,
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Store,
  Calendar
} from 'lucide-react';
import type { IncomeRecord, IncomeStats } from '../../types/expense';
import { formatRupiah } from '../../utils/expenseParser';

interface IncomeLedgerProps {
  incomes: IncomeRecord[];
  incomeStats?: IncomeStats;
  incomeSources: string[];
  dateRange?: { min: string; max: string };
}

export const IncomeLedger: React.FC<IncomeLedgerProps> = ({
  incomes,
  incomeSources
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSource, setSelectedSource] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortField, setSortField] = useState<'date' | 'source' | 'amount'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const filteredIncomes = useMemo(() => {
    return incomes.filter(inc => {
      // Source filter
      if (selectedSource !== 'All' && inc.source.toLowerCase() !== selectedSource.toLowerCase()) {
        return false;
      }
      // Date filter
      if (startDate && inc.date < startDate) return false;
      if (endDate && inc.date > endDate) return false;
      // Search term
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchSource = inc.source.toLowerCase().includes(term);
        const matchAmount = inc.amount.toString().includes(term) || formatRupiah(inc.amount).toLowerCase().includes(term);
        const matchDate = inc.date.includes(term) || inc.displayDate.toLowerCase().includes(term);
        if (!matchSource && !matchAmount && !matchDate) return false;
      }
      return true;
    });
  }, [incomes, selectedSource, startDate, endDate, searchTerm]);

  const sortedIncomes = useMemo(() => {
    return [...filteredIncomes].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'date') {
        comparison = a.date.localeCompare(b.date);
      } else if (sortField === 'source') {
        comparison = a.source.localeCompare(b.source);
      } else if (sortField === 'amount') {
        comparison = a.amount - b.amount;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredIncomes, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(sortedIncomes.length / pageSize) || 1;
  const paginatedIncomes = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedIncomes.slice(start, start + pageSize);
  }, [sortedIncomes, currentPage, pageSize]);

  const filteredTotalAmount = useMemo(() => {
    return filteredIncomes.reduce((sum, item) => sum + item.amount, 0);
  }, [filteredIncomes]);

  const handleSort = (field: 'date' | 'source' | 'amount') => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedSource('All');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  const handleExportCSV = () => {
    if (sortedIncomes.length === 0) return;
    const headers = ['No', 'Tanggal', 'Platform / Sumber', 'Nominal (Rp)'];
    const rows = sortedIncomes.map((item, idx) => [
      idx + 1,
      item.date,
      `"${item.source.replace(/"/g, '""')}"`,
      item.amount
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Penerimaan-Pemasukan-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="card flex flex-col gap-5">
      {/* Filters Bar */}
      <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search */}
          <div className="relative min-w-[200px] flex-1 max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              placeholder="Cari platform, nominal..."
              className="w-full bg-[#1e293b] border border-[#334155] rounded-lg pl-9 pr-3 py-1.5 text-xs text-[#f8fafc] placeholder-[#64748b] focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Platform Filter */}
          <div className="relative">
            <select
              value={selectedSource}
              onChange={e => { setSelectedSource(e.target.value); setCurrentPage(1); }}
              className="bg-[#1e293b] border border-[#334155] rounded-lg px-3 py-1.5 text-xs text-[#f8fafc] focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="All">Semua Platform</option>
              {incomeSources.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Date Range Inputs */}
          <div className="flex items-center gap-1.5 bg-[#1e293b] border border-[#334155] rounded-lg px-2.5 py-1 text-xs text-[#94a3b8]">
            <Calendar className="w-3.5 h-3.5 text-[#64748b]" />
            <input
              type="date"
              value={startDate}
              onChange={e => { setStartDate(e.target.value); setCurrentPage(1); }}
              className="bg-transparent text-[#f8fafc] text-xs focus:outline-none"
            />
            <span className="text-[#64748b]">s/d</span>
            <input
              type="date"
              value={endDate}
              onChange={e => { setEndDate(e.target.value); setCurrentPage(1); }}
              className="bg-transparent text-[#f8fafc] text-xs focus:outline-none"
            />
          </div>

          {(searchTerm || selectedSource !== 'All' || startDate || endDate) && (
            <button
              onClick={handleResetFilters}
              className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 px-2 py-1.5 rounded hover:bg-rose-500/10"
              title="Reset semua filter"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="btn text-xs py-1.5 px-3 flex items-center gap-1.5 border-[#334155] text-[#94a3b8] hover:text-emerald-400 hover:border-emerald-500/30"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="overflow-x-auto rounded-lg border border-[#334155]">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#1e293b] text-[#94a3b8] border-b border-[#334155]">
            <tr>
              <th className="py-2.5 px-4 font-medium w-12 text-center">No</th>
              <th
                onClick={() => handleSort('date')}
                className="py-2.5 px-4 font-medium cursor-pointer hover:text-[#f8fafc]"
              >
                <div className="flex items-center gap-1.5">
                  Tanggal
                  {sortField === 'date' ? (
                    sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-400" /> : <ArrowDown className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 opacity-40" />
                  )}
                </div>
              </th>
              <th
                onClick={() => handleSort('source')}
                className="py-2.5 px-4 font-medium cursor-pointer hover:text-[#f8fafc]"
              >
                <div className="flex items-center gap-1.5">
                  Platform / Sumber
                  {sortField === 'source' ? (
                    sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-400" /> : <ArrowDown className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 opacity-40" />
                  )}
                </div>
              </th>
              <th
                onClick={() => handleSort('amount')}
                className="py-2.5 px-4 font-medium text-right cursor-pointer hover:text-[#f8fafc]"
              >
                <div className="flex items-center justify-end gap-1.5">
                  Nominal Masuk
                  {sortField === 'amount' ? (
                    sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-400" /> : <ArrowDown className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 opacity-40" />
                  )}
                </div>
              </th>
              <th className="py-2.5 px-4 font-medium text-right w-24">% Porsi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#334155]/60">
            {paginatedIncomes.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-[#64748b]">
                  Tidak ada data penerimaan yang cocok dengan filter
                </td>
              </tr>
            ) : (
              paginatedIncomes.map((item, idx) => {
                const globalIdx = (currentPage - 1) * pageSize + idx + 1;
                const portion = filteredTotalAmount > 0 ? (item.amount / filteredTotalAmount) * 100 : 0;
                return (
                  <tr key={item.id} className="hover:bg-[#1e293b]/50 transition-colors">
                    <td className="py-2.5 px-4 text-center text-[#64748b] font-mono">{globalIdx}</td>
                    <td className="py-2.5 px-4 text-[#cbd5e1] font-mono">{item.displayDate}</td>
                    <td className="py-2.5 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <Store className="w-3 h-3" />
                        {item.source}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-semibold text-emerald-400 font-mono">
                      {formatRupiah(item.amount)}
                    </td>
                    <td className="py-2.5 px-4 text-right text-[#94a3b8] font-mono">
                      {portion.toFixed(1)}%
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {filteredIncomes.length > 0 && (
            <tfoot className="bg-[#1e293b]/80 border-t border-[#334155] font-semibold">
              <tr>
                <td colSpan={3} className="py-2.5 px-4 text-[#f8fafc]">
                  Total Terfilter ({filteredIncomes.length} transaksi)
                </td>
                <td className="py-2.5 px-4 text-right text-emerald-400 font-mono text-sm">
                  {formatRupiah(filteredTotalAmount)}
                </td>
                <td className="py-2.5 px-4 text-right text-[#f8fafc] font-mono">
                  100%
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Pagination Bar */}
      {sortedIncomes.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[#94a3b8] pt-1">
          <div>
            Menampilkan <span className="text-[#f8fafc] font-medium">{(currentPage - 1) * pageSize + 1}</span> -{' '}
            <span className="text-[#f8fafc] font-medium">{Math.min(currentPage * pageSize, sortedIncomes.length)}</span>{' '}
            dari <span className="text-[#f8fafc] font-medium">{sortedIncomes.length}</span> transaksi
          </div>

          <div className="flex items-center gap-2">
            <select
              value={pageSize}
              onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              className="bg-[#1e293b] border border-[#334155] rounded px-2 py-1 text-xs text-[#f8fafc]"
            >
              <option value={10}>10 / hal</option>
              <option value={25}>25 / hal</option>
              <option value={50}>50 / hal</option>
              <option value={100}>100 / hal</option>
            </select>

            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="btn py-1 px-2.5 border-[#334155] text-xs disabled:opacity-40"
            >
              Sebelumnya
            </button>
            <span className="px-1 text-[#f8fafc]">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="btn py-1 px-2.5 border-[#334155] text-xs disabled:opacity-40"
            >
              Berikutnya
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
