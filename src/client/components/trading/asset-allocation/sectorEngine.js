/**
 * 🏛️ Sector Classification & Herfindahl Concentration Risk Engine
 * Maps Indian Equities (NSE/BSE) to institutional sector taxonomies
 */

export const SECTOR_TAXONOMY = {
  // Financial Services
  HDFCBANK: "Financial Services",
  ICICIBANK: "Financial Services",
  SBIN: "Financial Services",
  KOTAKBANK: "Financial Services",
  AXISBANK: "Financial Services",
  BAJFINANCE: "Financial Services",
  BAJAJFINSV: "Financial Services",
  INDUSINDBK: "Financial Services",
  BANKBARODA: "Financial Services",
  PNB: "Financial Services",
  FEDERALBNK: "Financial Services",
  HDFCLIFE: "Financial Services",
  SBILIFE: "Financial Services",
  CHOLAFIN: "Financial Services",
  MUTHOOTFIN: "Financial Services",
  JIOFIN: "Financial Services",
  RECLTD: "Financial Services",
  PFC: "Financial Services",
  SHRIRAMFIN: "Financial Services",

  // Information Technology
  TCS: "Technology",
  INFY: "Technology",
  HCLTECH: "Technology",
  WIPRO: "Technology",
  TECHM: "Technology",
  LTIM: "Technology",
  PERSISTENT: "Technology",
  COFORGE: "Technology",
  KPITTECH: "Technology",
  MPHASIS: "Technology",
  TATAELXSI: "Technology",
  LTTS: "Technology",

  // Oil, Gas & Energy
  RELIANCE: "Energy & Utilities",
  ONGC: "Energy & Utilities",
  IOC: "Energy & Utilities",
  BPCL: "Energy & Utilities",
  NTPC: "Energy & Utilities",
  POWERGRID: "Energy & Utilities",
  ADANIGREEN: "Energy & Utilities",
  ADANIPOWER: "Energy & Utilities",
  TATAPOWER: "Energy & Utilities",
  COALINDIA: "Energy & Utilities",
  GAIL: "Energy & Utilities",
  NHPC: "Energy & Utilities",
  SUZLON: "Energy & Utilities",
  IREDA: "Energy & Utilities",

  // Automobile
  TATAMOTORS: "Automobile",
  MARUTI: "Automobile",
  "M&M": "Automobile",
  "BAJAJ-AUTO": "Automobile",
  EICHERMOT: "Automobile",
  HEROMOTOCO: "Automobile",
  TVSMOTOR: "Automobile",
  BHARATFORG: "Automobile",
  MOTHERSON: "Automobile",
  ASHOKLEY: "Automobile",
  BOSCHLTD: "Automobile",

  // Consumer Goods & FMCG
  HINDUNILVR: "Consumer & FMCG",
  ITC: "Consumer & FMCG",
  NESTLEIND: "Consumer & FMCG",
  BRITANNIA: "Consumer & FMCG",
  TATACONSUM: "Consumer & FMCG",
  VBL: "Consumer & FMCG",
  MARICO: "Consumer & FMCG",
  DABUR: "Consumer & FMCG",
  GODREJCP: "Consumer & FMCG",
  COLPAL: "Consumer & FMCG",

  // Metals & Mining
  TATASTEEL: "Metals & Mining",
  JSWSTEEL: "Metals & Mining",
  HINDALCO: "Metals & Mining",
  VEDL: "Metals & Mining",
  JINDALSTEL: "Metals & Mining",
  NMDC: "Metals & Mining",
  SAIL: "Metals & Mining",

  // Healthcare & Pharma
  SUNPHARMA: "Healthcare & Pharma",
  DRREDDY: "Healthcare & Pharma",
  CIPLA: "Healthcare & Pharma",
  DIVISLAB: "Healthcare & Pharma",
  APOLLOHOSP: "Healthcare & Pharma",
  LUPIN: "Healthcare & Pharma",
  TORNTPHARM: "Healthcare & Pharma",
  ZYDUSLIFE: "Healthcare & Pharma",

  // Capital Goods & Industrials
  LT: "Industrials & Infra",
  SIEMENS: "Industrials & Infra",
  ABB: "Industrials & Infra",
  HAL: "Industrials & Infra",
  BEL: "Industrials & Infra",
  BHEL: "Industrials & Infra",
  DLF: "Industrials & Infra",
  ULTRACEMCO: "Industrials & Infra",
  GRASIM: "Industrials & Infra",

  // Gold & Commodities
  GOLDBEES: "Gold & Commodities",
  SILVERBEES: "Gold & Commodities",
  GOLDSHARE: "Gold & Commodities",
  HDFCGOLD: "Gold & Commodities",
  NIPPONCOMMODITY: "Gold & Commodities",
  MCX: "Gold & Commodities",

  // Telecom & Consumer Tech
  BHARTIARTL: "Telecom & Internet",
  ZOMATO: "Telecom & Internet",
  NAUKRI: "Telecom & Internet",
  PAYTM: "Telecom & Internet",
};

export const SECTOR_COLORS = {
  "Financial Services": { bg: "bg-blue-500/20", border: "border-blue-500/40", text: "text-blue-300", hex: "#3b82f6" },
  "Technology": { bg: "bg-cyan-500/20", border: "border-cyan-500/40", text: "text-cyan-300", hex: "#06b6d4" },
  "Energy & Utilities": { bg: "bg-emerald-500/20", border: "border-emerald-500/40", text: "text-emerald-300", hex: "#10b981" },
  "Automobile": { bg: "bg-pink-500/20", border: "border-pink-500/40", text: "text-pink-300", hex: "#ec4899" },
  "Consumer & FMCG": { bg: "bg-purple-500/20", border: "border-purple-500/40", text: "text-purple-300", hex: "#a855f7" },
  "Metals & Mining": { bg: "bg-rose-500/20", border: "border-rose-500/40", text: "text-rose-300", hex: "#f43f5e" },
  "Healthcare & Pharma": { bg: "bg-teal-500/20", border: "border-teal-500/40", text: "text-teal-300", hex: "#14b8a6" },
  "Industrials & Infra": { bg: "bg-indigo-500/20", border: "border-indigo-500/40", text: "text-indigo-300", hex: "#6366f1" },
  "Gold & Commodities": { bg: "bg-amber-500/20", border: "border-amber-500/40", text: "text-amber-300", hex: "#f59e0b" },
  "Telecom & Internet": { bg: "bg-sky-500/20", border: "border-sky-500/40", text: "text-sky-300", hex: "#0284c7" },
  "Diversified Core": { bg: "bg-slate-500/20", border: "border-slate-500/40", text: "text-slate-300", hex: "#64748b" },
};

/**
 * Resolves sector for an Indian stock symbol using dictionary lookup or pattern heuristics
 */
export function resolveSector(tradingsymbol = "") {
  const sym = String(tradingsymbol).toUpperCase().trim();
  if (SECTOR_TAXONOMY[sym]) return SECTOR_TAXONOMY[sym];

  if (sym.includes("GOLD") || sym.includes("SILVER") || sym.includes("BEES")) {
    return "Gold & Commodities";
  }
  if (sym.includes("BANK") || sym.includes("FIN") || sym.includes("CAP")) {
    return "Financial Services";
  }
  if (sym.includes("TECH") || sym.includes("SOFT") || sym.includes("INFO")) {
    return "Technology";
  }
  if (sym.includes("POWER") || sym.includes("ENERGY") || sym.includes("GAS") || sym.includes("OIL")) {
    return "Energy & Utilities";
  }
  if (sym.includes("PHARMA") || sym.includes("HEALTH") || sym.includes("LAB")) {
    return "Healthcare & Pharma";
  }
  if (sym.includes("AUTO") || sym.includes("MOT")) {
    return "Automobile";
  }

  return "Diversified Core";
}

/**
 * Calculates complete sector weights and Herfindahl-Hirschman Index (HHI) concentration score
 */
export function calculateSectorBreakdown(holdings = [], totalPortfolioVal = 0) {
  const items = Array.isArray(holdings) ? holdings : [];
  if (items.length === 0) {
    return {
      sectors: [],
      topSector: null,
      topSectorPct: "0.0",
      activeSectorCount: 0,
      hhiScore: 0,
      diversificationLabel: "Empty Portfolio",
      diversificationColor: "slate",
      betaEstimate: "0.85",
    };
  }

  const sectorMap = {};
  let totalEquityVal = 0;

  items.forEach((h) => {
    const val = Number(h.quantity || 0) * Number(h.last_price || h.average_price || 0);
    const sector = resolveSector(h.tradingsymbol);
    totalEquityVal += val;

    if (!sectorMap[sector]) {
      sectorMap[sector] = {
        name: sector,
        value: 0,
        symbols: [],
      };
    }
    sectorMap[sector].value += val;
    sectorMap[sector].symbols.push(h.tradingsymbol);
  });

  const baseVal = totalPortfolioVal > 0 ? totalPortfolioVal : totalEquityVal;

  const sectors = Object.values(sectorMap)
    .map((s) => {
      const pct = baseVal > 0 ? (s.value / baseVal) * 100 : 0;
      const theme = SECTOR_COLORS[s.name] || SECTOR_COLORS["Diversified Core"];
      return {
        ...s,
        percentage: Number(pct.toFixed(1)),
        pctFormatted: `${pct.toFixed(1)}%`,
        color: theme.hex,
        theme,
      };
    })
    .sort((a, b) => b.value - a.value);

  const topSector = sectors[0] || null;
  const topSectorPct = topSector ? topSector.pctFormatted : "0.0%";
  const activeSectorCount = sectors.length;

  // HHI = Sum(weight_pct ^ 2). Normal scale 0 - 10,000
  let hhi = 0;
  sectors.forEach((s) => {
    hhi += Math.pow(s.percentage, 2);
  });

  let diversificationLabel = "Optimal Balance";
  let diversificationColor = "emerald";

  if (hhi > 4500 || (topSector && topSector.percentage > 55)) {
    diversificationLabel = "High Sector Bias";
    diversificationColor = "rose";
  } else if (hhi > 2800 || (topSector && topSector.percentage > 35)) {
    diversificationLabel = "Moderate Tilt";
    diversificationColor = "amber";
  } else {
    diversificationLabel = `${activeSectorCount} Sectors · Balanced`;
    diversificationColor = "emerald";
  }

  return {
    sectors,
    topSector,
    topSectorPct,
    activeSectorCount,
    hhiScore: Math.round(hhi),
    diversificationLabel,
    diversificationColor,
    betaEstimate: (0.76 + Math.min(0.20, (hhi / 10000) * 0.3)).toFixed(2),
  };
}
