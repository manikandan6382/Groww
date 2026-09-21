/**
 * Institutional F&O Option Chain Telemetry & Calculation Utilities
 */

export const OPTION_CHAIN_UNDERLYINGS = [
  { id: "NIFTY", symbol: "NIFTY", name: "NIFTY 50", lotSize: 25, interval: 50, fallbackSpot: 25150.25 },
  { id: "BANKNIFTY", symbol: "BANKNIFTY", name: "BANK NIFTY", lotSize: 15, interval: 100, fallbackSpot: 53820.75 },
  { id: "FINNIFTY", symbol: "FINNIFTY", name: "FIN NIFTY", lotSize: 25, interval: 50, fallbackSpot: 24680.50 },
  { id: "SENSEX", symbol: "SENSEX", name: "BSE SENSEX", lotSize: 10, interval: 100, fallbackSpot: 82450.10 },
];

/**
 * Returns sentiment diagnostics and tactical execution tips based on Put-Call Ratio
 */
export function getPcrSentiment(pcrValue) {
  const pcr = Number(pcrValue || 1.0);

  if (pcr < 0.75) {
    return {
      pcr,
      status: "BEARISH_CALL_WALL",
      label: "Call Writing Wall",
      bias: "Bearish Bias",
      tone: "text-rose-400 bg-rose-500/15 border-rose-500/30",
      pillColor: "text-rose-300 bg-rose-500/20 border-rose-500/40",
      tip: "Heavy call OI overhead. Resistance is active; beware of holding long calls into resistance."
    };
  }

  if (pcr < 0.95) {
    return {
      pcr,
      status: "MILD_BEARISH",
      label: "Mild Bearish Tilt",
      bias: "Cautious",
      tone: "text-amber-400 bg-amber-500/15 border-amber-500/30",
      pillColor: "text-amber-300 bg-amber-500/20 border-amber-500/40",
      tip: "Call writers have slight upper hand. Favour quick scalp exits on upside moves."
    };
  }

  if (pcr <= 1.15) {
    return {
      pcr,
      status: "NEUTRAL_EQUILIBRIUM",
      label: "Neutral Range",
      bias: "Equilibrium",
      tone: "text-cyan-400 bg-cyan-500/15 border-cyan-500/30",
      pillColor: "text-cyan-300 bg-cyan-500/20 border-cyan-500/40",
      tip: "Balanced Call & Put participation. Ideal for two-way momentum scalping."
    };
  }

  if (pcr <= 1.40) {
    return {
      pcr,
      status: "MILD_BULLISH",
      label: "Put Cushion Support",
      bias: "Bullish Bias",
      tone: "text-emerald-400 bg-emerald-500/15 border-emerald-500/30",
      pillColor: "text-emerald-300 bg-emerald-500/20 border-emerald-500/40",
      tip: "Put writers building floors. Dips into support are institutional accumulation zones."
    };
  }

  return {
    pcr,
    status: "STRONG_BULLISH_FLOOR",
    label: "Institutional Put Wall",
    bias: "Strong Bullish",
    tone: "text-emerald-300 bg-emerald-500/25 border-emerald-500/50",
    pillColor: "text-emerald-200 bg-emerald-500/30 border-emerald-500/60",
    tip: "Heavy put writing floor. High probability of upward bounce or short squeeze."
  };
}

/**
 * Formats Open Interest numbers into readable Indian notation (Lakhs / K)
 */
export function formatOi(oi) {
  const n = Number(oi || 0);
  if (n >= 100000) {
    return `${(n / 100000).toFixed(2)}L`;
  }
  if (n >= 1000) {
    return `${(n / 1000).toFixed(1)}K`;
  }
  return n.toLocaleString("en-IN");
}

/**
 * Returns Max Pain expiry context and weight based on active day of week
 */
export function getMaxPainContext(symbol) {
  const day = new Date().getDay(); // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  const expiryDays = {
    NIFTY: 4, // Thursday
    BANKNIFTY: 3, // Wednesday
    FINNIFTY: 2, // Tuesday
    SENSEX: 5 // Friday
  };

  const isExpiryToday = expiryDays[symbol] === day;

  if (isExpiryToday) {
    return {
      isExpiryToday: true,
      tag: "Active Expiry Magnet 🎯",
      shortTag: "Expiry Magnet",
      tip: "Today is weekly expiry! Dealer delta-hedging pulls price toward Max Pain after 01:30 PM.",
      tone: "text-amber-300 bg-amber-500/20 border-amber-500/40"
    };
  }

  return {
    isExpiryToday: false,
    tag: "Settlement Metric",
    shortTag: "Low Intraday Weight",
    tip: "Non-expiry session: Max Pain has low intraday weight. Do not fade strong trend breakouts based on Max Pain.",
    tone: "text-slate-400 bg-white/[0.04] border-white/[0.08]"
  };
}

