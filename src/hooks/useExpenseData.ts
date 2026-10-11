import { useState, useEffect, useMemo, useCallback } from 'react';
import type { ExpenseRecord } from '../types/expense';
import { parseGoogleSheetsExpenseData } from '../utils/expenseParser';
import { MOCK_EXPENSE_SHEET_DATA } from '../utils/mockExpenseData';

export function useExpenseData() {
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUsingMock, setIsUsingMock] = useState(false);

  const fetchExpenseData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sheetId = import.meta.env.VITE_EXPENSE_SHEET_ID || '1pot99JjBoNW9PrW8QVz6jOdxAgFP7NJcwlPbVPj5P3g';
      const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;

      if (!sheetId || !apiKey) {
        console.warn('VITE_EXPENSE_SHEET_ID or VITE_GOOGLE_API_KEY missing. Falling back to mock data.');
        const parsed = parseGoogleSheetsExpenseData(MOCK_EXPENSE_SHEET_DATA);
        setExpenses(parsed);
        setIsUsingMock(true);
        return;
      }

      // Try fetching first with default sheet range Untitled!A:D
      let rows: unknown[][] | null = null;
      let url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Untitled!A:D?key=${apiKey}`;

      try {
        const response = await fetch(url);
        if (response.ok) {
          const result = await response.json();
          if (result.values && result.values.length > 0) {
            rows = result.values;
          }
        }
      } catch (e) {
        console.warn('Direct Untitled fetch failed, will try fetching spreadsheet metadata', e);
      }

      // If Untitled!A:D failed, fetch spreadsheet metadata to dynamically find the title of the first sheet
      if (!rows) {
        const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties.title&key=${apiKey}`;
        const metaRes = await fetch(metaUrl);
        if (!metaRes.ok) {
          const errData = await metaRes.json().catch(() => ({}));
          throw new Error(errData.error?.message || `Gagal mengakses spreadsheet (${metaRes.statusText})`);
        }
        const meta = await metaRes.json();
        const sheetTitle = meta.sheets?.[0]?.properties?.title || 'Untitled';

        const dataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(sheetTitle)}!A:D?key=${apiKey}`;
        const dataRes = await fetch(dataUrl);
        if (!dataRes.ok) {
          const errData = await dataRes.json().catch(() => ({}));
          throw new Error(errData.error?.message || `Gagal mengambil data sheet (${dataRes.statusText})`);
        }
        const dataJson = await dataRes.json();
        rows = dataJson.values || null;
      }

      if (!rows || rows.length < 2) {
        throw new Error('Data pengeluaran tidak ditemukan atau kosong di Google Sheet.');
      }

      const parsed = parseGoogleSheetsExpenseData(rows);
      setExpenses(parsed);
      setIsUsingMock(false);
    } catch (err: unknown) {
      console.error('Fetch expense data error:', err);
      // If network or API quota error, gracefully fallback to mock data so dashboard remains usable
      const parsedMock = parseGoogleSheetsExpenseData(MOCK_EXPENSE_SHEET_DATA);
      setExpenses(parsedMock);
      setIsUsingMock(true);
      setError(err instanceof Error ? err.message : 'Gagal memuat data pengeluaran');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExpenseData();
  }, [fetchExpenseData]);

  const categories = useMemo(() => {
    const set = new Set(expenses.map(e => e.category).filter(Boolean));
    return Array.from(set).sort();
  }, [expenses]);

  const recipients = useMemo(() => {
    const set = new Set(expenses.map(e => e.recipient).filter(Boolean));
    return Array.from(set).sort();
  }, [expenses]);

  const dateRange = useMemo(() => {
    if (expenses.length === 0) return { min: '', max: '' };
    const dates = expenses.map(e => e.date).filter(Boolean).sort();
    return {
      min: dates[0] || '',
      max: dates[dates.length - 1] || ''
    };
  }, [expenses]);

  return {
    expenses,
    loading,
    error,
    isUsingMock,
    categories,
    recipients,
    dateRange,
    refresh: fetchExpenseData
  };
}
