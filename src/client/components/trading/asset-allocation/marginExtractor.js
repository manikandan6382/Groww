/**
 * Robust margin extraction utility to parse Kite Connect's nested margin object schema
 */
export function extractAvailableMargin(margins) {
  if (margins == null) return 0;
  if (typeof margins === "number") return Number.isFinite(margins) ? margins : 0;
  if (typeof margins.available === "number") return margins.available;
  if (typeof margins.available === "object" && margins.available !== null) {
    const val = Number(margins.available.live_balance ?? margins.available.cash ?? margins.available.opening_balance);
    if (Number.isFinite(val)) return val;
  }
  if (typeof margins.net === "number") return margins.net;
  if (typeof margins.equity === "object" && margins.equity !== null) {
    return extractAvailableMargin(margins.equity);
  }
  const fallback = parseFloat(margins?.available?.live_balance ?? margins?.available?.cash ?? margins?.net ?? margins?.available ?? 0);
  return Number.isFinite(fallback) ? fallback : 0;
}
