import { useState, useEffect, useMemo } from "react";
import type { InventoryRecord } from "../types/inventory";
import { parseGoogleSheetsData } from "../utils/dataParser";
import { MOCK_SHEET_DATA, MOCK_MARAPTHON_SHEET_DATA, MOCK_MARAPTHON_MASTER_SHEET } from "../utils/mockData";

export interface ProductMetadata {
    minStock: number;
    targetSalesDaily: number;
}

export function useInventoryData(brand: "Kaos Dika" | "Marapthon") {
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
                console.warn("VITE_SHEET_ID or VITE_GOOGLE_API_KEY is missing. Falling back to mock data.");
                const parsed = parseGoogleSheetsData(brand === "Kaos Dika" ? MOCK_SHEET_DATA : MOCK_MARAPTHON_SHEET_DATA);
                setData(parsed);

                // Populate mock metadata based on brand
                const metadataMap: Record<string, Record<string, ProductMetadata>> = {};
                if (brand === "Marapthon") {
                    const masterValues = MOCK_MARAPTHON_MASTER_SHEET;
                    const headers = masterValues[0].map(h => String(h).trim().toLowerCase());
                    const productColIndex = headers.findIndex((h) => h === "item name" || h === "edisi" || h === "produk");
                    const sizeColIndex = headers.findIndex((h) => h === "size" || h === "ukuran");
                    const minStockColIndex = headers.findIndex((h) => h === "min stock" || h === "min_stock");
                    const targetSalesColIndex = headers.findIndex((h) => h === "target sales daily" || h === "target sales" || h === "target_sales");

                    masterValues.slice(1).forEach((row: any[]) => {
                        const productName = productColIndex !== -1 ? row[productColIndex] : null;
                        const size = sizeColIndex !== -1 ? (row[sizeColIndex] as string) : null;
                        const minStock = minStockColIndex !== -1 ? parseFloat(row[minStockColIndex]) : 0;
                        const targetSalesDaily = targetSalesColIndex !== -1 ? parseFloat(row[targetSalesColIndex]) : 0;

                        if (productName && size) {
                            const trimmedProduct = String(productName).trim();
                            const trimmedSize = String(size).trim();
                            if (!metadataMap[trimmedProduct]) {
                                metadataMap[trimmedProduct] = {};
                            }
                            metadataMap[trimmedProduct][trimmedSize] = {
                                minStock: isNaN(minStock) ? 0 : minStock,
                                targetSalesDaily: isNaN(targetSalesDaily) ? 0 : targetSalesDaily
                            };
                        }
                    });
                } else {
                    parsed.forEach(record => {
                        if (!metadataMap[record.product]) {
                            metadataMap[record.product] = {};
                        }
                        metadataMap[record.product][record.size] = {
                            minStock: 20,
                            targetSalesDaily: 2
                        };
                    });
                }
                setProductMetadata(metadataMap);
                return;
            }

            const dailyRange = brand === "Kaos Dika" ? "Invetory Daily!A1:ZZ1000" : "Daily Marapthon!A1:ZZ1000";
            const masterRange = brand === "Kaos Dika" ? "Inventory_Master!A1:H100" : "Master Marapthon!A1:H100";

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

            // Parse Metadata dynamically from Master Sheet
            const metadataMap: Record<string, Record<string, ProductMetadata>> = {};
            if (masterValues && masterValues.length > 0) {
                const headers = masterValues[0].map((h: any) => String(h).trim().toLowerCase());
                const productColIndex = headers.findIndex((h: string) => h === "item name" || h === "edisi" || h === "produk");
                const sizeColIndex = headers.findIndex((h: string) => h === "size" || h === "ukuran");
                const minStockColIndex = headers.findIndex((h: string) => h === "min stock" || h === "min_stock");
                const targetSalesColIndex = headers.findIndex((h: string) => h === "target sales daily" || h === "target sales" || h === "target_sales");

                masterValues.slice(1).forEach((row: any[]) => {
                    const productName = productColIndex !== -1 ? row[productColIndex] : null;
                    const size = sizeColIndex !== -1 ? (row[sizeColIndex] as string) : null;
                    const minStock = minStockColIndex !== -1 ? parseFloat(row[minStockColIndex]) : 0;
                    const targetSalesDaily = targetSalesColIndex !== -1 ? parseFloat(row[targetSalesColIndex]) : 0;

                    if (productName && size) {
                        const trimmedProduct = String(productName).trim();
                        const trimmedSize = String(size).trim();
                        if (!metadataMap[trimmedProduct]) {
                            metadataMap[trimmedProduct] = {};
                        }
                        metadataMap[trimmedProduct][trimmedSize] = {
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
    }, [brand]);

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
