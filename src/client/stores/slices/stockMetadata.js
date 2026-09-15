export const DEFAULT_WATCHLIST = [
  "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ICICIBANK.NS", "SBIN.NS", "ITC.NS", "GOLDBEES.NS"
];

export const INDIAN_STOCK_META = {
  "RELIANCE.NS": { name: "Reliance Industries", sector: "Energy & Conglomerate", color: "#00d5ff", tag: "Heavyweight", price: 1307.20, change: -6.00, changePct: -0.46 },
  "TCS.NS": { name: "Tata Consultancy Services", sector: "IT & Tech Services", color: "#a855f7", tag: "Tech Titan", price: 2268.10, change: -29.90, changePct: -1.30 },
  "HDFCBANK.NS": { name: "HDFC Bank", sector: "Private Banking & NBFC", color: "#3b82f6", tag: "Banking Leader", price: 729.65, change: 4.60, changePct: 0.63 },
  "INFY.NS": { name: "Infosys Technologies", sector: "IT & Enterprise Cloud", color: "#06b6d4", tag: "Tech Bluechip", price: 1121.10, change: -8.90, changePct: -0.79 },
  "ICICIBANK.NS": { name: "ICICI Bank", sector: "Private Banking & Retail", color: "#f97316", tag: "Growth Bank", price: 1438.00, change: 26.10, changePct: 1.85 },
  "SBIN.NS": { name: "State Bank of India", sector: "Public Sector Banking", color: "#10b981", tag: "PSU Giant", price: 1056.00, change: 8.00, changePct: 0.76 },
  "ITC.NS": { name: "ITC Limited", sector: "FMCG & Agri Business", color: "#eab308", tag: "Defensive King", price: 271.60, change: -0.05, changePct: -0.02 },
  "GOLDBEES.NS": { name: "Nippon India Gold ETF", sector: "Gold Commodity ETF", color: "#f59e0b", tag: "Safe Haven", price: 132.87, change: 3.99, changePct: 3.10 },
  "TATAMOTORS.NS": { name: "Tata Motors", sector: "Automotive & EV", color: "#38bdf8", tag: "EV Leader", price: 985.40, change: 12.60, changePct: 1.30 },
  "BHARTIARTL.NS": { name: "Bharti Airtel", sector: "Telecom & 5G Data", color: "#ef4444", tag: "Telecom Giant", price: 1680.50, change: 15.20, changePct: 0.91 },
  "LT.NS": { name: "Larsen & Toubro", sector: "Infrastructure & Defense", color: "#8b5cf6", tag: "Infra Giant", price: 3450.00, change: -18.40, changePct: -0.53 },
  "KOTAKBANK.NS": { name: "Kotak Mahindra Bank", sector: "Banking & Wealth", color: "#ec4899", tag: "Private Bank", price: 1780.00, change: 8.50, changePct: 0.48 },
  "BAJFINANCE.NS": { name: "Bajaj Finance", sector: "Consumer NBFC", color: "#14b8a6", tag: "Fintech Leader", price: 7120.00, change: 45.00, changePct: 0.64 },
  "MARUTI.NS": { name: "Maruti Suzuki", sector: "Automobile Leader", color: "#6366f1", tag: "Auto Giant", price: 11850.00, change: -80.00, changePct: -0.67 },
  "SUNPHARMA.NS": { name: "Sun Pharma", sector: "Healthcare & Pharma", color: "#84cc16", tag: "Pharma Leader", price: 1720.00, change: 14.00, changePct: 0.82 },
  "WIPRO.NS": { name: "Wipro Limited", sector: "Enterprise IT", color: "#a855f7", tag: "IT Services", price: 495.00, change: -3.20, changePct: -0.64 },
  "ZOMATO.NS": { name: "Zomato Limited", sector: "Food Delivery & Quick Commerce", color: "#ef4444", tag: "Growth Star", price: 235.50, change: 4.80, changePct: 2.08 },
  "SUZLON.NS": { name: "Suzlon Energy", sector: "Green Energy & Wind Power", color: "#10b981", tag: "Renewable Power", price: 68.40, change: 1.20, changePct: 1.79 },
  "JIOFIN.NS": { name: "Jio Financial Services", sector: "Fintech & NBFC", color: "#00d5ff", tag: "Reliance NBFC", price: 324.80, change: -2.10, changePct: -0.64 },
  "HAL.NS": { name: "Hindustan Aeronautics", sector: "Defense & Aerospace", color: "#3b82f6", tag: "Defense Leader", price: 4350.00, change: 65.00, changePct: 1.52 },
  "BEL.NS": { name: "Bharat Electronics", sector: "Defense & Electronics", color: "#06b6d4", tag: "PSU Tech", price: 298.00, change: 3.40, changePct: 1.15 },
  "TRENT.NS": { name: "Trent Limited", sector: "Retail & Fashion (Zudio)", color: "#a855f7", tag: "Retail Star", price: 6850.00, change: 120.00, changePct: 1.78 },
  "NIFTYBEES.NS": { name: "Nippon India Nifty 50 ETF", sector: "Index Fund ETF", color: "#00d5ff", tag: "Index Core", price: 262.50, change: 1.10, changePct: 0.42 }
};

export function getStockMeta(symbol = "") {
  const clean = String(symbol || "").toUpperCase();
  const ns = clean.endsWith(".NS") ? clean : `${clean}.NS`;
  return INDIAN_STOCK_META[clean] || INDIAN_STOCK_META[ns] || {
    name: clean.replace(".NS", ""),
    sector: "Equities & F&O",
    color: "#6366f1",
    tag: "NSE Stock",
    price: 100.0,
    change: 0.0,
    changePct: 0.0
  };
}
