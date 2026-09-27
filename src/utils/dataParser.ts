import type { InventoryRecord, RawHeaderMapping, Size, Metric } from "../types/inventory";

export const PRODUCT_SIZES: Size[] = ["S", "M", "L", "XL", "XXL"];
export const METRICS: Metric[] = ["Stock", "In", "Out"];

function looksLikeDate(val: any): boolean {
    if (val === undefined || val === null) return false;
    const str = String(val).trim();
    const parts = str.split(/[/\-.]/).map(p => p.trim());
    if (parts.length === 3) {
        const p0 = Number(parts[0]);
        const p1 = Number(parts[1]);
        const p2 = Number(parts[2]);
        if (!isNaN(p0) && !isNaN(p1) && !isNaN(p2)) {
            // Case 1: YYYY-MM-DD
            if (parts[0].length === 4) {
                const year = p0;
                const month = p1;
                const day = p2;
                return year >= 2000 && year < 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31;
            }
            // Case 2: DD-MM-YYYY or MM-DD-YYYY or DD-MM-YY etc.
            const year = parts[2].length === 2 ? 2000 + p2 : p2;
            if (year >= 2000 && year < 2100) {
                const isP0MonthOrDay = p0 >= 1 && p0 <= 31;
                const isP1MonthOrDay = p1 >= 1 && p1 <= 31;
                return isP0MonthOrDay && isP1MonthOrDay;
            }
        }
    }
    return false;
}


export function parseGoogleSheetsData(rows: any[][]): InventoryRecord[] {
    if (rows.length < 2) {
        throw new Error("Invalid sheet format: Missing headers");
    }

    // Dynamically detect header structure: 3-row vs 2-row
    let isThreeRowHeader = false;
    if (rows.length > 2) {
        const row2LooksLikeDate = looksLikeDate(rows[2][0]);
        if (!row2LooksLikeDate) {
            let metricCount = 0;
            const row2 = rows[2];
            for (let i = 1; i < row2.length; i++) {
                const val = row2[i] ? String(row2[i]).trim().toLowerCase() : "";
                if (val === "s" || val === "stock" || val === "in" || val === "out" || val === "x") {
                    metricCount++;
                }
            }
            if (metricCount > 2) {
                isThreeRowHeader = true;
            }
        }
    }

    let productRow: any[];
    let sizeRow: any[] | null = null;
    let metricRow: any[];
    let dataRows: any[][];

    if (isThreeRowHeader) {
        productRow = rows[0];
        sizeRow = rows[1];
        metricRow = rows[2];
        dataRows = rows.slice(3);
    } else {
        productRow = rows[0];
        metricRow = rows[1];
        dataRows = rows.slice(2);
    }

    const mappings: RawHeaderMapping[] = [];

    let currentProduct = "";
    let currentSize: Size | null = null;

    for (let i = 1; i < metricRow.length; i++) {
        if (isThreeRowHeader) {
            const rawProduct = productRow[i] ? String(productRow[i]).trim() : "";
            if (rawProduct) {
                currentProduct = rawProduct;
            }

            const rawSize = sizeRow![i] ? String(sizeRow![i]).trim() : "";
            if (rawSize) {
                if (PRODUCT_SIZES.includes(rawSize as Size)) {
                    currentSize = rawSize as Size;
                } else {
                    currentSize = null;
                }
            }
        } else {
            const rawHeader1 = productRow[i] ? String(productRow[i]).trim() : "";
            if (rawHeader1) {
                const parts = rawHeader1.split(/\s+/);
                const lastPart = parts[parts.length - 1] as Size;

                if (PRODUCT_SIZES.includes(lastPart)) {
                    // Case: "Product S"
                    currentSize = lastPart;
                    if (parts.length > 1) {
                        currentProduct = parts.slice(0, -1).join(" ");
                    }
                } else if (PRODUCT_SIZES.includes(rawHeader1 as Size)) {
                    // Case: "S"
                    currentSize = rawHeader1 as Size;
                } else {
                    // Case: "Product Name" or "Total"
                    currentProduct = rawHeader1;
                    // If the product name changed, clear the size. 
                    // It will be picked up by following cells with size headers.
                    currentSize = null;
                }
            }
        }

        const rawMetric = metricRow[i] ? String(metricRow[i]).trim() : "";
        let metric: Metric | null = null;
        const normalizedMetric = rawMetric.toLowerCase();
        if (normalizedMetric === "s" || normalizedMetric === "stock") {
            metric = "Stock";
        } else if (normalizedMetric === "in") {
            metric = "In";
        } else if (normalizedMetric === "out") {
            metric = "Out";
        }

        if (currentProduct && currentSize && metric) {
            mappings.push({
                product: currentProduct,
                size: currentSize,
                metric,
                columnIndex: i
            });
        }
    }

    // Find the Note column. Usually column FM (index 168) but search for 'Note' or 'Keterangan' to be safe.
    let noteColumnIndex = -1;
    for (let i = 0; i < productRow.length; i++) {
        const val = String(productRow[i]).trim().toLowerCase();
        if (val === "note" || val === "keterangan") {
            noteColumnIndex = i;
            break;
        }
    }
    // Fallback to 168 (FM) if "Note" header is accidentally changed or missing
    if (noteColumnIndex === -1 && productRow.length > 168) {
        noteColumnIndex = 168; // 0-indexed column FM
    }

    if (mappings.length === 0) {
        throw new Error("Invalid sheet format: No valid product/size/metric headers found");
    }

    const records: InventoryRecord[] = [];

    // Detect date format dynamically (DD/MM/YYYY vs MM/DD/YYYY)
    let dateFormat: "DD/MM/YYYY" | "MM/DD/YYYY" = "MM/DD/YYYY";
    for (const row of dataRows) {
        const rawDate = row[0];
        if (!rawDate) continue;
        const parts = String(rawDate).split(/[/\-.]/).map(p => p.trim());
        if (parts.length === 3) {
            // Skip YYYY-MM-DD format for DD/MM vs MM/DD detection
            if (parts[0].length === 4) {
                continue;
            }
            const p0 = Number(parts[0]);
            const p1 = Number(parts[1]);
            if (!isNaN(p0) && p0 > 12 && p0 <= 31) {
                dateFormat = "DD/MM/YYYY";
                break;
            }
            if (!isNaN(p1) && p1 > 12 && p1 <= 31) {
                dateFormat = "MM/DD/YYYY";
                break;
            }
        }
    }

    for (const row of dataRows) {
        const rawDate = row[0];
        if (!rawDate) continue;

        const isoDate = parseDate(rawDate, dateFormat);
        if (!isoDate) continue;

        const isReturn = noteColumnIndex !== -1 && noteColumnIndex < row.length && row[noteColumnIndex]
            ? String(row[noteColumnIndex]).trim().toLowerCase() === "return"
            : false;

        const productSizeGroups: Record<string, Partial<InventoryRecord>> = {};

        for (const mapping of mappings) {
            const key = `${mapping.product}-${mapping.size}`;
            if (!productSizeGroups[key]) {
                productSizeGroups[key] = {
                    date: isoDate,
                    product: mapping.product,
                    size: mapping.size,
                    stock: null,
                    in: 0,
                    out: 0,
                    validStock: true,
                    isReturn: isReturn,
                };
            }

            const rawValue = row[mapping.columnIndex];
            const numValue = rawValue === undefined || rawValue === "" ? null : Number(rawValue);

            if (mapping.metric === "Stock") {
                productSizeGroups[key].rawStockValue = (numValue !== null && !isNaN(numValue)) ? numValue : undefined;
                if (numValue === null || isNaN(numValue)) {
                    productSizeGroups[key].stock = null;
                    productSizeGroups[key].validStock = true;
                } else {
                    productSizeGroups[key].stock = numValue;
                    productSizeGroups[key].validStock = true;
                }
            } else if (mapping.metric === "In") {
                productSizeGroups[key].in = (numValue !== null && !isNaN(numValue)) ? numValue : 0;
            } else if (mapping.metric === "Out") {
                productSizeGroups[key].out = (numValue !== null && !isNaN(numValue)) ? numValue : 0;
            }
        }

        for (const key in productSizeGroups) {
            records.push(productSizeGroups[key] as InventoryRecord);
        }
    }

    return records;
}

function parseDate(rawDate: string, dateFormat: "DD/MM/YYYY" | "MM/DD/YYYY" = "MM/DD/YYYY"): string | null {
    const parts = rawDate.split(/[/\-.]/).map(p => p.trim());
    if (parts.length !== 3) return null;

    let year = "";
    let month = "";
    let day = "";

    // Case 1: YYYY-MM-DD
    if (parts[0].length === 4) {
        year = parts[0];
        month = parts[1].padStart(2, "0");
        day = parts[2].padStart(2, "0");
    } else {
        // Case 2: DD/MM/YYYY or MM/DD/YYYY
        if (dateFormat === "DD/MM/YYYY") {
            day = parts[0].padStart(2, "0");
            month = parts[1].padStart(2, "0");
        } else {
            month = parts[0].padStart(2, "0");
            day = parts[1].padStart(2, "0");
        }

        year = parts[2];
        if (year.length === 2) {
            year = "20" + year;
        }
    }

    const dateStr = `${year}-${month}-${day}`;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : dateStr;
}
