export const INDEX_ASSETS = [
  { key: "NIFTY", name: "NIFTY 50", exchange: "NSE", spot: 22650.00, lot: 65, defaultOption: "CALL", defaultStrike: 22650, defaultEntry: 145.00, defaultSL: 141.15, defaultTP: 152.70, change: "+0.26%", positive: true },
  { key: "BANKNIFTY", name: "BANK NIFTY", exchange: "NSE", spot: 55100.00, lot: 30, defaultOption: "CALL", defaultStrike: 55100, defaultEntry: 180.00, defaultSL: 171.70, defaultTP: 196.60, change: "+0.45%", positive: true },
  { key: "FINNIFTY", name: "FIN NIFTY", exchange: "NSE", spot: 24900.00, lot: 65, defaultOption: "CALL", defaultStrike: 24900, defaultEntry: 65.0, defaultSL: 61.15, defaultTP: 72.70, change: "+0.15%", positive: true },
  { key: "SENSEX", name: "BSE SENSEX", exchange: "BSE", spot: 72800.00, lot: 20, defaultOption: "CALL", defaultStrike: 72800, defaultEntry: 155.0, defaultSL: 142.5, defaultTP: 180.0, change: "+0.20%", positive: true },
];

export function isPowerHourWindow() {
  const now = new Date();
  const timeInMins = now.getHours() * 60 + now.getMinutes();
  return timeInMins >= 840 && timeInMins <= 930; // 14:00 to 15:30 IST
}
