import { useState, useEffect, useMemo } from "react";
import type { InventoryRecord } from "../types/inventory";
import { parseGoogleSheetsData } from "../utils/dataParser";
import { MOCK_SHEET_DATA } from "../utils/mockData";

export function useInventoryData() {
    const [data, setData] = useState<InventoryRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const sheetId = import.meta.env.VITE_SHEET_ID;
            const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;

            if (!sheetId || !apiKey) {
                // If keys are missing, we can still fall back to mock data or show a specific error
                // For now, let's fall back to mock data but warn in console
                console.warn("VITE_SHEET_ID or VITE_GOOGLE_API_KEY is missing. Falling back to mock data.");
                const parsed = parseGoogleSheetsData(MOCK_SHEET_DATA);
                setData(parsed);
                return;
            }

            const range = "Invetory Daily!A1:ZZ1000"; // Adjust range as needed
            const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?key=${apiKey}`;

            const response = await fetch(url);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error?.message || `Failed to fetch from Google Sheets: ${response.statusText}`);
            }

            const result = await response.json();

            if (!result.values) {
                throw new Error("No data found in the specified sheet range.");
            }

            const parsed = parseGoogleSheetsData(result.values);
            setData(parsed);
        } catch (err: any) {
            console.error("Fetch error:", err);
            setError(err.message || "Failed to fetch data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const products = useMemo(() => {
        return Array.from(new Set(data.map((r) => r.product)));
    }, [data]);

    const dateRange = useMemo(() => {
        if (data.length === 0) return { min: "", max: "" };
        const dates = data.map((r) => r.date).sort();
        return { min: dates[0], max: dates[dates.length - 1] };
    }, [data]);

    return { data, loading, error, products, dateRange, refresh: fetchData };
}
