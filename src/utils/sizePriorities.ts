import type { InventoryRecord, Size } from '../types/inventory';

export const PRIORITY_SIZES: readonly Size[] = ['S', 'M', 'L', 'XL', 'XXL'];

export interface SizePriorityFilters {
  selectedProduct?: string;
  selectedSize?: Size | 'All';
  startDate?: string;
  endDate?: string;
  /** Local YYYY-MM-DD; callers/tests may pin the snapshot cutoff. */
  today?: string;
}

export interface SizePriorityCell {
  size: Size;
  stock: number | null;
  reason: 'known' | 'missing' | 'invalid' | 'conflict';
}

export interface SizePriorityProduct {
  product: string;
  snapshotDate: string;
  sizes: SizePriorityCell[];
  outSizes: Size[];
  availableSizes: Size[];
  availableUnits: number;
  unknownCount: number;
  isPriority: boolean;
}

export function localInventoryDate(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function isDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/**
 * Compare sizes on ONE latest nonfuture date per product, within the date filter.
 * Never carry older counts forward or infer missing sizes as zero. Duplicate
 * stock observations must agree; stock snapshots are not additive transactions.
 * A priority requires a confirmed zero AND a confirmed positive sibling size.
 * The size filter scopes the zero needing attention, not the sibling evidence.
 */
export function buildSizePriorities(
  data: readonly InventoryRecord[],
  filters: SizePriorityFilters = {},
): SizePriorityProduct[] {
  const today = filters.today ?? localInventoryDate();
  const { startDate = '', endDate = '', selectedProduct = 'All', selectedSize = 'All' } = filters;
  if (!isDate(today) || (startDate && !isDate(startDate)) || (endDate && !isDate(endDate))) return [];
  const cutoff = endDate && endDate < today ? endDate : today;
  if (startDate && startDate > cutoff) return [];

  const products = new Map<string, { date: string; rows: InventoryRecord[] }>();
  for (const row of data) {
    if (!isDate(row.date) || row.date > cutoff || (startDate && row.date < startDate)) continue;
    if (selectedProduct !== 'All' && row.product !== selectedProduct) continue;
    if (!PRIORITY_SIZES.includes(row.size)) continue;
    const existing = products.get(row.product);
    if (!existing || existing.date < row.date) products.set(row.product, { date: row.date, rows: [row] });
    else if (existing.date === row.date) existing.rows.push(row);
  }

  return [...products].map(([product, snapshot]): SizePriorityProduct => {
    const sizes = PRIORITY_SIZES.map((size): SizePriorityCell => {
      const rows = snapshot.rows.filter(row => row.size === size);
      if (!rows.length || rows.every(row => row.stock === null)) return { size, stock: null, reason: 'missing' };
      // Invalid, fractional, negative and mixed unknown observations are not exact stock evidence.
      if (rows.some(row => !row.validStock || row.stock === null || !Number.isSafeInteger(row.stock) || row.stock < 0)) {
        return { size, stock: null, reason: 'invalid' };
      }
      const stock = rows[0].stock;
      if (rows.some(row => row.stock !== stock)) return { size, stock: null, reason: 'conflict' };
      return { size, stock, reason: 'known' };
    });
    const outSizes = sizes.filter(cell => cell.stock === 0).map(cell => cell.size);
    const available = sizes.filter(cell => cell.stock !== null && cell.stock > 0);
    return {
      product,
      snapshotDate: snapshot.date,
      sizes,
      outSizes,
      availableSizes: available.map(cell => cell.size),
      availableUnits: available.reduce((sum, cell) => sum + cell.stock!, 0),
      unknownCount: sizes.filter(cell => cell.stock === null).length,
      isPriority: available.length > 0 && outSizes.some(size => selectedSize === 'All' || selectedSize === size),
    };
  }).sort((a, b) => Number(b.isPriority) - Number(a.isPriority)
    || (b.isPriority ? b.outSizes.length - a.outSizes.length : 0)
    || a.product.localeCompare(b.product, 'id'));
}
