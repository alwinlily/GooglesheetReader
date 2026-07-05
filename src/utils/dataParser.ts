import type { InventoryRecord, RawHeaderMapping, Size, Metric } from "../types/inventory";

export const PRODUCT_SIZES: Size[] = ["S", "M", "L", "XL", "XXL"];
export const METRICS: Metric[] = ["Stock", "In", "Out"];

export function parseGoogleSheetsData(rows: any[][]): InventoryRecord[] {
    if (rows.length < 2) {
        throw new Error("Invalid sheet format: Missing headers");
    }

    const row1 = rows[0]; // Product + Size
    const row2 = rows[1]; // Metric

    const mappings: RawHeaderMapping[] = [];

    let currentProduct = "";
    let currentSize: Size | null = null;

    for (let i = 1; i < row2.length; i++) {
        const rawHeader1 = row1[i] ? String(row1[i]).trim() : "";
        const rawMetric = row2[i] ? String(row2[i]).trim() : "";

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
    for (let i = 0; i < row1.length; i++) {
        const val = String(row1[i]).trim().toLowerCase();
        if (val === "note" || val === "keterangan") {
            noteColumnIndex = i;
            break;
        }
    }
    // Fallback to 168 (FM) if "Note" header is accidentally changed or missing
    if (noteColumnIndex === -1 && row1.length > 168) {
        noteColumnIndex = 168; // 0-indexed column FM
    }


    if (mappings.length === 0) {
        throw new Error("Invalid sheet format: No valid product/size/metric headers found");
    }

    const records: InventoryRecord[] = [];
    const dataRows = rows.slice(2);

    // Detect date format dynamically (DD/MM/YYYY vs MM/DD/YYYY)
    let dateFormat: "DD/MM/YYYY" | "MM/DD/YYYY" = "MM/DD/YYYY";
    for (const row of dataRows) {
        const rawDate = row[0];
        if (!rawDate) continue;
        const parts = String(rawDate).split("/");
        if (parts.length === 3) {
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
                if (numValue === null) {
                    productSizeGroups[key].stock = null;
                } else if (numValue < 0 || isNaN(numValue)) {
                    productSizeGroups[key].stock = null;
                    productSizeGroups[key].validStock = false;
                } else {
                    productSizeGroups[key].stock = numValue;
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
    const parts = rawDate.split("/");
    if (parts.length !== 3) return null;

    let month = "";
    let day = "";

    if (dateFormat === "DD/MM/YYYY") {
        day = parts[0].padStart(2, "0");
        month = parts[1].padStart(2, "0");
    } else {
        month = parts[0].padStart(2, "0");
        day = parts[1].padStart(2, "0");
    }

    let year = parts[2];
    if (year.length === 2) {
        year = "20" + year;
    }

    const dateStr = `${year}-${month}-${day}`;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : dateStr;
}
