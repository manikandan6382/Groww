export const INDEX_ASSETS = [
  { key: "NIFTY", name: "NIFTY 50", exchange: "NSE", spot: 23375.00, lot: 65, defaultOption: "PUT", defaultStrike: 23400, defaultEntry: 80.00, defaultSL: 76.00, defaultTP: 88.00, change: "-0.10%", positive: false },
  { key: "BANKNIFTY", name: "BANK NIFTY", exchange: "NSE", spot: 56300.00, lot: 30, defaultOption: "PUT", defaultStrike: 56300, defaultEntry: 180.00, defaultSL: 171.50, defaultTP: 197.00, change: "-0.58%", positive: false },
  { key: "FINNIFTY", name: "FIN NIFTY", exchange: "NSE", spot: 25360.00, lot: 65, defaultOption: "PUT", defaultStrike: 25350, defaultEntry: 65.0, defaultSL: 61.0, defaultTP: 73.0, change: "-0.71%", positive: false },
  { key: "SENSEX", name: "BSE SENSEX", exchange: "BSE", spot: 74750.00, lot: 20, defaultOption: "PUT", defaultStrike: 74700, defaultEntry: 155.0, defaultSL: 142.5, defaultTP: 180.0, change: "-0.05%", positive: false },
];

export function isPowerHourWindow() {
  const now = new Date();
  const timeInMins = now.getHours() * 60 + now.getMinutes();
  return timeInMins >= 840 && timeInMins <= 930; // 14:00 to 15:30 IST
}
