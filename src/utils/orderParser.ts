import type { OrderRecord, OrderStatus } from '../types/order';

// Convert DD/MM/YY or DD/MM/YYYY to YYYY-MM-DD
function parseOrderDate(rawDate: unknown): string | null {
  if (!rawDate) return null;
  const parts = String(rawDate).trim().split(/[/\-.]/).map(p => p.trim());
  if (parts.length !== 3) return null;

  let day = "";
  let month = "";
  let year = "";

  // Check if first part is a 4-digit year (YYYY-MM-DD)
  if (parts[0].length === 4) {
    year = parts[0];
    month = parts[1].padStart(2, "0");
    day = parts[2].padStart(2, "0");
  } else {
    // Standard sheet format: DD/MM/YY or DD/MM/YYYY
    day = parts[0].padStart(2, "0");
    month = parts[1].padStart(2, "0");
    year = parts[2];
    if (year.length === 2) {
      year = "20" + year;
    }
  }

  const dateStr = `${year}-${month}-${day}`;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const d = new Date(`${dateStr}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === dateStr ? dateStr : null;
}

export function parseGoogleSheetsOrderData(rows: unknown[][]): OrderRecord[] {
  if (rows.length < 2) return [];

  const headers = rows[0].map(h => String(h).trim().toLowerCase());
  
  // Find column indexes dynamically (case-insensitive and trimmed)
  const dateOrderIdx = headers.findIndex(h => h === "date order" || h === "date_order" || h.includes("date order") || h.includes("order"));
  const konveksiIdx = headers.findIndex(h => h === "konveksi" || h === "vendor");
  const brandIdx = headers.findIndex(h => h === "brand");
  const itemIdx = headers.findIndex(h => h === "item" || h === "produk" || h === "product");
  const quantityIdx = headers.findIndex(h => h === "quantity" || h === "qty" || h === "jumlah");
  const dateReceivedIdx = headers.findIndex(h => h === "date received" || h === "date_received" || h.includes("received") || h.includes("selesai"));
  const inIdx = headers.findIndex(h => h === "in" || h === "masuk" || h === "diterima");
  const rejectIdx = headers.findIndex(h => h === "reject" || h === "cacat" || h === "rusak");
  const selisihIdx = headers.findIndex(h => h === "selisih" || h === "diff" || h === "difference");
  const totalInIdx = headers.findIndex(h => h === "total in" || h === "total_in" || h === "total");

  if (dateOrderIdx === -1 || brandIdx === -1 || itemIdx === -1 || quantityIdx === -1) {
    throw new Error('Kolom Date Order, Brand, Item, atau Quantity tidak ditemukan di tab Order.');
  }

  const records: OrderRecord[] = [];

  rows.slice(1).forEach((row, index) => {
    // An item identifies a record. A missing date must not erase received stock.
    const item = String(row[itemIdx] ?? '').trim();
    if (!item) return;
    const rawDateOrder = dateOrderIdx !== -1 && dateOrderIdx < row.length ? row[dateOrderIdx] : null;
    const dateOrder = parseOrderDate(rawDateOrder) ?? '';

    const konveksi = konveksiIdx !== -1 && konveksiIdx < row.length ? String(row[konveksiIdx]).trim() : "Unknown";
    const brand = brandIdx !== -1 && brandIdx < row.length ? String(row[brandIdx]).trim() : "Unknown";
    
    const rawQty = quantityIdx !== -1 && quantityIdx < row.length ? row[quantityIdx] : "";
    const quantity = rawQty === "" || isNaN(Number(rawQty)) ? 0 : Number(rawQty);

    const rawDateReceived = dateReceivedIdx !== -1 && dateReceivedIdx < row.length ? row[dateReceivedIdx] : null;
    const dateReceived = parseOrderDate(rawDateReceived);

    const rawIn = inIdx !== -1 && inIdx < row.length ? row[inIdx] : "";
    const inVal = rawIn === "" || isNaN(Number(rawIn)) ? 0 : Number(rawIn);

    const rawReject = rejectIdx !== -1 && rejectIdx < row.length ? row[rejectIdx] : "";
    const reject = rawReject === "" || isNaN(Number(rawReject)) ? 0 : Number(rawReject);

    const rawSelisih = selisihIdx !== -1 && selisihIdx < row.length ? row[selisihIdx] : "";
    // If selisih column is missing, compute it as inVal - quantity
    const selisih = rawSelisih === "" || isNaN(Number(rawSelisih)) ? (inVal - quantity) : Number(rawSelisih);

    const rawTotalIn = totalInIdx !== -1 && totalInIdx < row.length ? row[totalInIdx] : "";
    const totalIn = rawTotalIn === "" || isNaN(Number(rawTotalIn)) ? inVal : Number(rawTotalIn);

    // Determine status
    let status: OrderStatus = 'In Production';
    if (dateReceived) {
      if (inVal === quantity) {
        status = 'Completed';
      } else if (inVal < quantity) {
        status = 'Shortage';
      } else {
        status = 'Excess';
      }
    }

    records.push({
      sourceRow: index + 2,
      dateOrder,
      konveksi,
      brand,
      item,
      quantity,
      dateReceived,
      in: inVal,
      reject,
      selisih,
      totalIn,
      status
    });
  });

  return records;
}
