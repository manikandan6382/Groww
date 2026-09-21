/**
 * Quantitative Telemetry & Analytics Engine for Market Pulse & Macro Breadth
 */

export const MAJOR_INDICES_KEYS = [
  { key: "NSE_INDEX|Nifty 50", symbol: "NIFTY", name: "NIFTY 50", shortName: "NIFTY", lotSize: 25, fallbackLtp: 25150.25, fallbackChange: 84.50 },
  { key: "NSE_INDEX|Nifty Bank", symbol: "BANKNIFTY", name: "NIFTY BANK", shortName: "BANKNIFTY", lotSize: 15, fallbackLtp: 53820.75, fallbackChange: 260.40 },
  { key: "BSE_INDEX|SENSEX", symbol: "SENSEX", name: "BSE SENSEX", shortName: "SENSEX", lotSize: 10, fallbackLtp: 82450.10, fallbackChange: 290.15 },
  { key: "NSE_INDEX|Nifty Fin Service", symbol: "FINNIFTY", name: "FINNIFTY", shortName: "FINNIFTY", lotSize: 25, fallbackLtp: 24680.50, fallbackChange: 72.10 },
  { key: "NSE_INDEX|India VIX", symbol: "INDIA VIX", name: "INDIA VIX", shortName: "INDIA VIX", lotSize: 1, fallbackLtp: 13.45, fallbackChange: -0.32, isVix: true },
];

export function resolveIndexStrikeInterval(symbol) {
  const sym = String(symbol || "").toUpperCase();
  if (sym.includes("BANK") || sym.includes("SENSEX")) return 100;
  return 50;
}

export const KEY_SECTORS = [
  { id: "banking", name: "Nifty Bank", icon: "🏦", weight: 33.5, changePct: 0.85, status: "LEADER" },
  { id: "it", name: "Nifty IT", icon: "💻", weight: 14.2, changePct: -0.45, status: "DRAGGING" },
  { id: "auto", name: "Nifty Auto", icon: "🚗", weight: 7.8, changePct: 1.15, status: "MOMENTUM" },
  { id: "metal", name: "Nifty Metal", icon: "⚡", weight: 4.1, changePct: 1.82, status: "BREAKOUT" },
  { id: "pharma", name: "Nifty Pharma", icon: "💊", weight: 4.6, changePct: 0.28, status: "NEUTRAL" },
  { id: "fmcg", name: "Nifty FMCG", icon: "🛒", weight: 8.9, changePct: -0.15, status: "DEFENSIVE" },
];

/**
 * Derives the active India VIX Options Volatility Regime
 */
export function getVixVolatilityRegime(vixValue) {
  const vix = Number(vixValue || 13.5);

  if (vix < 12.0) {
    return {
      vix,
      regime: "LOW_VOLATILITY",
      label: "Theta Decay Regime",
      tone: "text-amber-400 bg-amber-500/15 border-amber-500/30",
      description: "Low option premiums & compressed implied volatility. ATM option buying requires fast scalp exits; theta decay accelerates rapidly in choppy sessions.",
      strategyTip: "Tight 3.5-pt stops. Avoid holding long calls/puts through midday consolidation."
    };
  }

  if (vix <= 16.5) {
    return {
      vix,
      regime: "OPTIMAL_SCALP",
      label: "Optimal Scalp Conditions",
      tone: "text-emerald-400 bg-emerald-500/15 border-emerald-500/30",
      description: "Ideal premium pricing & standard directional delta momentum. Standard 1:2.00 Risk-to-Reward targets are reliably achievable with disciplined execution.",
      strategyTip: "Standard 4.0-pt SL (₹250 risk cap). Ride momentum to 8.0-pt target."
    };
  }

  return {
    vix,
    regime: "HIGH_VOLATILITY",
    label: "High Vega Expansion",
    tone: "text-rose-400 bg-rose-500/15 border-rose-500/30",
    description: "Wide intraday price discovery & elevated option premiums. Sharp multi-point swings occur rapidly; widen stop cushions and reduce lot sizing.",
    strategyTip: "Reduce contract sizing by 50%. Beware of post-event IV crush."
  };
}

/**
 * Calculates synthetic market breadth from tracked assets or live quotes
 */
export function calculateMarketBreadth(indicesData = {}) {
  const niftyQuote = indicesData["NSE_INDEX|Nifty 50"];
  const niftyChange = Number(niftyQuote?.change || 84.5);
  const isNiftyBullish = niftyChange >= 0;

  // Calibrate advance / decline based on index magnitude
  const advanceCount = isNiftyBullish
    ? Math.min(44, Math.max(28, 30 + Math.round(Math.abs(niftyChange) / 10)))
    : Math.max(8, Math.min(22, 20 - Math.round(Math.abs(niftyChange) / 10)));
  const declineCount = 50 - advanceCount;
  const advanceRatio = Math.round((advanceCount / 50) * 100);

  const status = advanceRatio >= 65
    ? "BULLISH_EXPANSION"
    : advanceRatio <= 35
      ? "BEARISH_LIQUIDATION"
      : "NEUTRAL_CHOP";

  return {
    advanceCount,
    declineCount,
    advanceRatio,
    status,
    ratioLabel: `${advanceCount} Advances · ${declineCount} Declines`,
    sentiment: advanceRatio >= 60 ? "Strong Breadth (Bullish)" : advanceRatio <= 40 ? "Weak Breadth (Bearish)" : "Mixed Participation"
  };
}

/**
 * Synthesizes institutional smart money flow estimates
 */
export function getInstitutionalFlowData(niftyChangePct = 0.35) {
  const isNetPositive = niftyChangePct >= 0;
  const fiiCash = isNetPositive ? 1420 : -980;
  const diiCash = isNetPositive ? 850 : 1240;
  const totalNet = fiiCash + diiCash;
  const futuresLongRatio = isNetPositive ? 58 : 42;

  return {
    fiiCashCr: `₹${Math.abs(fiiCash).toLocaleString("en-IN")} Cr`,
    fiiCashPositive: fiiCash >= 0,
    diiCashCr: `₹${Math.abs(diiCash).toLocaleString("en-IN")} Cr`,
    diiCashPositive: diiCash >= 0,
    totalNetCr: `${totalNet >= 0 ? "+" : "-"}₹${Math.abs(totalNet).toLocaleString("en-IN")} Cr`,
    totalNetPositive: totalNet >= 0,
    futuresLongRatio,
    sentiment: totalNet >= 0 ? "Net Institutional Accumulation" : "Institutional Distribution"
  };
}

/**
 * Generates smooth interpolated 6-point sparkline for index trajectory
 */
export function generateIndexSparkline(ltp, change, isVix = false) {
  const p = Number(ltp || (isVix ? 13.5 : 25000));
  const c = Number(change || (isVix ? -0.2 : 50));
  const isGain = c >= 0;
  const delta = Math.max(isVix ? 0.2 : 25, Math.abs(c) * 0.8);

  if (isGain) {
    return [
      Number((p - delta).toFixed(2)),
      Number((p - delta * 0.6).toFixed(2)),
      Number((p - delta * 0.35).toFixed(2)),
      Number((p + delta * 0.2).toFixed(2)),
      Number((p + delta * 0.7).toFixed(2)),
      Number(p.toFixed(2)),
    ];
  }
  return [
    Number((p + delta).toFixed(2)),
    Number((p + delta * 0.6).toFixed(2)),
    Number((p + delta * 0.35).toFixed(2)),
    Number((p - delta * 0.2).toFixed(2)),
    Number((p - delta * 0.7).toFixed(2)),
    Number(p.toFixed(2)),
  ];
}
