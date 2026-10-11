import { useState, useEffect, useMemo } from 'react';
import type { OrderRecord } from '../types/order';
import { parseGoogleSheetsOrderData } from '../utils/orderParser';

export function useOrderData(activeBrand: 'Kaos Dika' | 'Marapthon') {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrderData = async () => {
    setLoading(true);
    setError(null);
    try {
      const sheetId = import.meta.env.VITE_SHEET_ID;
      const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;

      if (!sheetId || !apiKey) {
        throw new Error('Koneksi Google Sheets belum dikonfigurasi. Data order tidak dapat dimuat.');
      }

      const orderRange = 'Order!A:J';
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(orderRange)}?key=${apiKey}`;

      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `Failed to fetch Order sheet: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.values) {
        throw new Error('No values found in the Order sheet.');
      }

      const parsed = parseGoogleSheetsOrderData(result.values);
      setOrders(parsed);
    } catch (err: unknown) {
      console.error('Fetch order error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch order data');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderData();
  }, []);

  // Filter orders based on the active brand
  // "Kaos Dika" maps to brand "Rucas" in the sheet
  // "Marapthon" maps to brand "Marapthon"
  const filteredOrders = useMemo(() => {
    const targetBrand = activeBrand === 'Kaos Dika' ? 'Rucas' : 'Marapthon';
    return orders.filter(
      (order) => order.brand.toLowerCase() === targetBrand.toLowerCase()
    );
  }, [orders, activeBrand]);

  const uniqueKonveksi = useMemo(() => {
    const list = filteredOrders.map(o => o.konveksi);
    return Array.from(new Set(list)).sort();
  }, [filteredOrders]);

  const uniqueItems = useMemo(() => {
    const list = filteredOrders.map(o => o.item);
    return Array.from(new Set(list)).sort();
  }, [filteredOrders]);

  return {
    orders: filteredOrders,
    allOrders: orders,
    uniqueKonveksi,
    uniqueItems,
    loading,
    error,
    refresh: fetchOrderData,
  };
}
