import { useState, useEffect, useMemo } from "react";
import type { InventoryRecord } from "../types/inventory";
import { parseGoogleSheetsData } from "../utils/dataParser";
import { MOCK_SHEET_DATA } from "../utils/mockData";

export interface ProductMetadata {
    minStock: number;
    targetSalesDaily: number;
}

export function useInventoryData() {
    const [data, setData] = useState<InventoryRecord[]>([]);
    const [productMetadata, setProductMetadata] = useState<Record<string, Record<string, ProductMetadata>>>({});
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

            const dailyRange = "dummy!A1:ZZ1000";
            const masterRange = "Inventory_Master!A1:H100";

            const batchUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values:batchGet?ranges=${encodeURIComponent(dailyRange)}&ranges=${encodeURIComponent(masterRange)}&key=${apiKey}`;

            const response = await fetch(batchUrl);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error?.message || `Failed to fetch from Google Sheets: ${response.statusText}`);
            }

            const result = await response.json();

            if (!result.valueRanges || result.valueRanges.length < 2) {
                throw new Error("Required sheet data not found.");
            }

            const dailyValues = result.valueRanges[0].values;
            const masterValues = result.valueRanges[1].values;

            if (!dailyValues) {
                throw new Error("No data found in the Daily sheet.");
            }

            const parsed = parseGoogleSheetsData(dailyValues);
            setData(parsed);

            // Parse Metadata from Master Sheet (Col C: Name, Col E: Size, Col G: Min Stock, Col H: Daily Target)
            const metadataMap: Record<string, Record<string, ProductMetadata>> = {};
            if (masterValues) {
                masterValues.slice(1).forEach((row: any[]) => {
                    const productName = row[2]; // Column C
                    const size = row[4] as string; // Column E
                    const minStock = parseFloat(row[6]); // Column G
                    const targetSalesDaily = parseFloat(row[7]); // Column H

                    if (productName && size) {
                        if (!metadataMap[productName]) {
                            metadataMap[productName] = {};
                        }
                        metadataMap[productName][size] = {
                            minStock: isNaN(minStock) ? 0 : minStock,
                            targetSalesDaily: isNaN(targetSalesDaily) ? 0 : targetSalesDaily
                        };
                    }
                });
            }
            setProductMetadata(metadataMap);
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

    return { data, productMetadata, loading, error, products, dateRange, refresh: fetchData };
}
