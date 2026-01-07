export type Size = "S" | "M" | "L" | "XL" | "XXL";
export type Metric = "Stock" | "In" | "Out";

export interface InventoryRecord {
  date: string; // ISO format YYYY-MM-DD
  product: string;
  size: Size;
  stock: number | null;
  in: number;
  out: number;
  validStock: boolean;
}

export interface RawHeaderMapping {
  product: string;
  size: Size;
  metric: Metric;
  columnIndex: number;
}
