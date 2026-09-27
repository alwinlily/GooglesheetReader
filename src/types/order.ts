export type OrderStatus = 'In Production' | 'Completed' | 'Shortage' | 'Excess';

export interface OrderRecord {
  dateOrder: string;      // YYYY-MM-DD
  konveksi: string;       // Workshop name (e.g. Anton, Juju)
  brand: string;          // "Rucas" or "Marapthon"
  item: string;           // Product item (e.g. "Special Grey S")
  quantity: number;       // Ordered quantity
  dateReceived: string | null; // YYYY-MM-DD or null
  in: number;             // Quantity received
  reject: number;         // Rejected quantity
  selisih: number;        // Received vs Ordered difference (In - Quantity)
  totalIn: number;
  status: OrderStatus;
}

export interface KonveksiPerformance {
  name: string;
  totalOrders: number;
  activeOrders: number;
  completedOrders: number;
  totalOrderedQty: number;
  totalReceivedQty: number;
  totalRejectedQty: number;
  totalShortageQty: number;
  fulfillmentRate: number; // percentage (received / ordered)
}
