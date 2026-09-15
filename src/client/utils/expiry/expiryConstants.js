// ============================================================================
// TOP-LEVEL CONSTANTS & CONFIG (STRICT TDZ HOISTING)
// ============================================================================
export const EXPIRY_DAY_MAP = {
  NIFTY: 4,      // Thursday
  BANKNIFTY: 3,  // Wednesday
  SENSEX: 5,     // Friday
  FINNIFTY: 2,   // Tuesday
  MIDCPNIFTY: 1  // Monday
};

export const INDEX_BENCHMARK_BASE = {
  NIFTY: 24250,
  BANKNIFTY: 52100,
  SENSEX: 79800,
  FINNIFTY: 24800,
  MIDCPNIFTY: 12900
};

// NSE/BSE Official Indian Stock Exchange Trading Holidays 2026
export const NSE_HOLIDAYS_2026 = new Set([
  "2026-01-26", // Republic Day
  "2026-03-03", // Holi
  "2026-03-20", // Id-ul-Fitr
  "2026-03-27", // Ram Navami
  "2026-04-03", // Good Friday
  "2026-04-14", // Dr. Ambedkar Jayanti
  "2026-05-01", // Maharashtra Day
  "2026-05-27", // Bakri Id
  "2026-08-15", // Independence Day
  "2026-10-02", // Mahatma Gandhi Jayanti
  "2026-10-20", // Dussehra
  "2026-11-09", // Diwali Laxmi Pujan
  "2026-11-10", // Diwali Balipratipada
  "2026-11-24", // Gurunanak Jayanti
  "2026-12-25"  // Christmas
]);

/**
 * Checks if a given YYYY-MM-DD date string is an NSE holiday
 */
export function isNseHoliday(dateStr) {
  return NSE_HOLIDAYS_2026.has(String(dateStr).trim());
}
