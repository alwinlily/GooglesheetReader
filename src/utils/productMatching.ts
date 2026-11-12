import type { OrderRecord } from '../types/order';

export const KNOWN_PRODUCT_ALIASES: Record<string, string[]> = {
  'juna hp': ['juna', 'juna hp'],
  'odds hitam': ['odds black', 'odds', 'odds hitam'],
  'juna putih': ['juna white', 'juna putih'],
  'juna hihi': ['juna hihi', 'hihi'],
  'pyton': ['python', 'pyton', 'pyhon'],
  'pyton grey': ['python grey', 'pyton grey'],
  'mtrl grey': ['special grey', 'mtrl grey'],
  'mtrl brown': ['special brown', 'mtrl brown'],
  'vlntne blue': ['valentine blue', 'vlntne blue'],
  'vlntne pink': ['valentine pink', 'vlntne pink'],
};

/**
 * Normalizes text for robust comparison:
 * lowercase, replaces punctuation with spaces, collapses whitespace, and trims.
 */
export function normalizeProductText(text: string): string {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Checks if an Order item string corresponds to a specific inventory product and size.
 * Examples:
 * - invProduct: "Juna hp", invSize: "L", orderItem: "Juna L" -> true
 * - invProduct: "Odds hitam", invSize: "XL", orderItem: "Odds Black XL" -> true
 * - invProduct: "Pyton", invSize: "XL", orderItem: "Python XL" -> true
 * - invProduct: "SPIDEY WHITE", invSize: "S", orderItem: "Spidey S White" -> true
 * - invProduct: "Mtrl Grey", invSize: "XL", orderItem: "Special Grey S" -> false (wrong size)
 * - invProduct: "Pyton", invSize: "XL", orderItem: "Python grey XL" -> false (Pyton grey != Pyton)
 */
export function matchProductAndSize(
  invProduct: string,
  invSize: string,
  orderItem: string
): boolean {
  if (!invProduct || !invSize || !orderItem) return false;

  const normItem = normalizeProductText(orderItem);
  const normSize = normalizeProductText(invSize);

  // Size boundary match: e.g. " l " or " xl " as standalone tokens
  const sizeRegex = new RegExp(`(?:^|\\s)${normSize}(?:\\s|$)`);
  if (!sizeRegex.test(normItem)) {
    return false;
  }

  // Remove the matched size token to inspect the remaining product name tokens
  const itemWithoutSize = normItem.replace(sizeRegex, ' ').replace(/\s+/g, ' ').trim();

  const cleanInvProd = normalizeProductText(invProduct);
  const aliases = (KNOWN_PRODUCT_ALIASES[cleanInvProd] || [cleanInvProd]).map(normalizeProductText);
  if (!aliases.includes(cleanInvProd)) {
    aliases.push(cleanInvProd);
  }

  const itemTokensSorted = itemWithoutSize.split(' ').sort().join(' ');

  for (const alias of aliases) {
    if (itemWithoutSize === alias) return true;
    const aliasTokensSorted = alias.split(' ').sort().join(' ');
    if (itemTokensSorted === aliasTokensSorted) return true;
  }

  return false;
}

export interface ActiveOrderMatch {
  isOnOrder: boolean;
  totalOrderedQty: number;
  latestOrderDate: string | null;
  latestVendor: string | null;
  matchingOrders: OrderRecord[];
}

/**
 * Finds all active orders (status === 'In Production') in the Order Tracker
 * that match the specified product and size.
 */
export function findActiveOrderForProduct(
  product: string,
  size: string,
  orders: OrderRecord[] = []
): ActiveOrderMatch {
  const activeOrders = orders.filter(o => o.status === 'In Production');
  const matchingOrders = activeOrders.filter(o =>
    matchProductAndSize(product, size, o.item)
  );

  const totalOrderedQty = matchingOrders.reduce(
    (sum, o) => sum + (Number.isFinite(o.quantity) ? o.quantity : 0),
    0
  );

  // Sort by dateOrder descending to identify the latest order details
  const sorted = [...matchingOrders].sort((a, b) =>
    (b.dateOrder || '').localeCompare(a.dateOrder || '')
  );

  const latest = sorted[0] || null;

  return {
    isOnOrder: matchingOrders.length > 0,
    totalOrderedQty,
    latestOrderDate: latest?.dateOrder || null,
    latestVendor: latest?.konveksi || null,
    matchingOrders,
  };
}

