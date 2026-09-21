import { resolveIndexLotSize } from "../../../stores/slices/tradeHelpers";

/**
 * Algorithmic Behavioral Bias & Execution Leakage Engine
 * Evaluates cognitive leaks and quantifies rupee damages across trades:
 * 1. Disposition Effect: Cutting winning scalps prematurely while leaving >2.0 pts MFE alpha on the table.
 * 2. Loss Aversion / Shield Breach: Allowing downside to breach Manikandan's strict ₹300 maximum risk cap.
 * 3. FOMO Wick Chasing: Chasing extended candles resulting in >1.0 pt adverse fill slippage drag.
 * 4. Revenge Trading Clusters: Entries initiated within 15 minutes of an adverse exit.
 * 5. Midday Chop Traps: Overtrading during the 10:30–13:30 IST theta bleed zone.
 */

// Helper to extract timestamp in milliseconds
function getTradeTime(trade, field = "entryDatetime") {
  const dt = trade[field] || trade.entryDatetime || trade.datetime || trade.createdAt;
  return dt ? new Date(dt).getTime() : 0;
}

// Helper to determine if timestamp falls in 10:30–13:30 IST (05:00–08:00 UTC)
function isMiddayChopTrap(trade) {
  const dt = trade.entryDatetime || trade.datetime || trade.createdAt;
  if (!dt) return false;
  const dateObj = new Date(dt);
  const utcMins = dateObj.getUTCHours() * 60 + dateObj.getUTCMinutes();
  return utcMins >= 300 && utcMins < 480;
}

export function diagnoseTradeBiases(trade, priorTrade = null) {
  const biases = [];
  let leakedRupees = 0;

  const effectiveLotSize = resolveIndexLotSize(trade.symbol, trade.lotSize);
  const rawQty = Number(trade.quantity || 1);
  const qty = Number(trade.totalQty || (rawQty >= effectiveLotSize ? rawQty : rawQty * effectiveLotSize));

  const entry = Number(trade.entryPrice || 0);
  const exit = Number(trade.exitPrice || 0);
  const netPnl = Number(trade.netPnl !== undefined ? trade.netPnl : (exit - entry) * qty - 55.20);
  const pts = Math.abs(exit - entry);

  const mistakeStr = Array.isArray(trade.mistakeTags)
    ? trade.mistakeTags.join(" ").toLowerCase()
    : String(trade.mistakeTags || "").toLowerCase();

  // 1. Loss Aversion / Shield Breach (Net loss exceeds ₹300 hard invariant)
  if (netPnl < -300) {
    const breachDamage = Math.round(Math.abs(netPnl) - 300);
    leakedRupees += breachDamage;
    biases.push({
      id: "SHIELD_BREACH",
      name: "Shield Invariant Breach",
      type: "RISK_VIOLATION",
      leakedRupees: breachDamage,
      severity: "CRITICAL",
      badge: `Exceeded ₹300 Cap (-₹${breachDamage})`,
      description: `Trade breached Manikandan's strict ₹300 stop cap by ₹${breachDamage}. Stop loss was widened or not respected.`
    });
  }

  // 2. FOMO Wick Chasing & Adverse Slippage
  const slippage = Math.abs(Number(trade.entrySlippagePts ?? trade.slippagePts ?? 0));
  const isChased = mistakeStr.includes("chase") || mistakeStr.includes("fomo") || slippage > 1.0;
  if (isChased) {
    const slipPts = slippage > 1.0 ? slippage : 1.2;
    const slipRupees = Math.round(slipPts * qty);
    leakedRupees += slipRupees;
    biases.push({
      id: "FOMO_CHASE",
      name: "FOMO Wick Chasing",
      type: "EXECUTION_DRAG",
      leakedRupees: slipRupees,
      severity: "WARNING",
      badge: `Slippage Drag (₹${slipRupees})`,
      description: `Entered into extended candle or market order slippage (+${slipPts.toFixed(1)} pts drag).`
    });
  }

  // 3. Disposition Effect (Cutting Winners Prematurely)
  const defaultSlPts = Number((250 / Math.max(1, qty)).toFixed(2));
  const defaultTpPts = Number((defaultSlPts * 2.0).toFixed(2));
  const tp = Number(trade.targetPrice || (entry + defaultTpPts));
  const targetPts = Math.abs(tp - entry);
  const mfePts = Number(trade.mfePts ?? (netPnl > 0 ? (targetPts * 0.9) : (targetPts * 0.3)));

  // If trade won but took small profit while MFE was significantly higher (> 2.0 pts left on table)
  if (netPnl > 0 && mfePts > pts + 2.0 && trade.closeReason !== "TARGET_HIT") {
    const unharvestedPts = mfePts - pts;
    const unharvestedRupees = Math.round(unharvestedPts * qty);
    leakedRupees += unharvestedRupees;
    biases.push({
      id: "DISPOSITION_EFFECT",
      name: "Disposition Effect (Early Exit)",
      type: "ALPHA_LEAK",
      leakedRupees: unharvestedRupees,
      severity: "OPPORTUNITY",
      badge: `Left +₹${unharvestedRupees} on Table`,
      description: `Closed winner prematurely (+${pts.toFixed(1)} pts) while MFE reached +${mfePts.toFixed(1)} pts without trailing stop.`
    });
  }

  // 4. Revenge Trading Cluster (Strict same-day entry within 15 minutes of prior losing exit)
  if (priorTrade) {
    const priorExitTime = getTradeTime(priorTrade, "exitDatetime") || getTradeTime(priorTrade, "entryDatetime");
    const currentEntryTime = getTradeTime(trade, "entryDatetime");
    const diffMinutes = (currentEntryTime - priorExitTime) / (1000 * 60);

    const priorDateStr = (priorTrade.entryDatetime || priorTrade.datetime || "").slice(0, 10);
    const currentDateStr = (trade.entryDatetime || trade.datetime || "").slice(0, 10);
    const isSameDay = priorDateStr && currentDateStr ? priorDateStr === currentDateStr : true;

    const priorLost = Number(priorTrade.netPnl ?? 0) < 0;
    const hasRevengeTag = mistakeStr.includes("revenge") || mistakeStr.includes("tilt");
    const isScaleIn = priorTrade.symbol === trade.symbol && diffMinutes >= 0 && diffMinutes < 0.5;

    // Enforce strict intraday precondition (ignore overnight gaps) and exclude instant scale-ins
    const isTrueRevenge = !isScaleIn && isSameDay && priorLost && diffMinutes >= 0.2 && diffMinutes <= 15;

    if (isTrueRevenge || hasRevengeTag) {
      const revengeDamage = netPnl < 0 ? Math.round(Math.abs(netPnl)) : 0;
      leakedRupees += revengeDamage;
      biases.push({
        id: "REVENGE_CLUSTER",
        name: "Revenge Cluster Impulse",
        type: "PSYCHOLOGICAL_TILT",
        leakedRupees: revengeDamage,
        severity: "CRITICAL",
        badge: revengeDamage > 0 ? `Tilt Leak (₹${revengeDamage})` : "Tilt Velocity",
        description: `Triggered within ${Math.round(Math.max(1, diffMinutes))}m of a losing trade. Emotional reset was skipped.`
      });
    }
  }

  // 5. Midday Chop Trap
  if (isMiddayChopTrap(trade) && netPnl < 0) {
    const chopDamage = Math.round(Math.abs(netPnl));
    leakedRupees += chopDamage;
    biases.push({
      id: "MIDDAY_TRAP",
      name: "Midday Theta Trap",
      type: "TIMING_BLINDSPOT",
      leakedRupees: chopDamage,
      severity: "WARNING",
      badge: `Midday Trap (₹${chopDamage})`,
      description: `Entered during 10:30–13:30 IST chop zone. Trapped in low-momentum theta decay.`
    });
  }

  return {
    tradeId: trade.id,
    biases,
    hasBiases: biases.length > 0,
    leakedRupees,
    isCleanDiscipline: biases.length === 0
  };
}

export function analyzeBehavioralBiases(trades = []) {
  if (!Array.isArray(trades) || trades.length === 0) {
    return {
      totalPreventableLeakageRupees: 0,
      totalBiasedTrades: 0,
      cleanTradesCount: 0,
      disciplineRate: 100,
      biasBreakdown: {
        disposition: { count: 0, leakedRupees: 0, tradeIds: [] },
        shieldBreach: { count: 0, leakedRupees: 0, tradeIds: [] },
        fomoChase: { count: 0, leakedRupees: 0, tradeIds: [] },
        revengeCluster: { count: 0, leakedRupees: 0, tradeIds: [] },
        middayTrap: { count: 0, leakedRupees: 0, tradeIds: [] }
      },
      diagnosesMap: {}
    };
  }

  // Sort trades chronologically to detect revenge sequences
  const sorted = [...trades].sort((a, b) => getTradeTime(a) - getTradeTime(b));

  const diagnosesMap = {};
  let totalPreventableLeakageRupees = 0;
  let totalBiasedTrades = 0;

  const biasBreakdown = {
    disposition: { count: 0, leakedRupees: 0, tradeIds: [] },
    shieldBreach: { count: 0, leakedRupees: 0, tradeIds: [] },
    fomoChase: { count: 0, leakedRupees: 0, tradeIds: [] },
    revengeCluster: { count: 0, leakedRupees: 0, tradeIds: [] },
    middayTrap: { count: 0, leakedRupees: 0, tradeIds: [] }
  };

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    const prior = i > 0 ? sorted[i - 1] : null;
    const diag = diagnoseTradeBiases(current, prior);
    diagnosesMap[current.id] = diag;

    if (diag.hasBiases) {
      totalBiasedTrades++;
      totalPreventableLeakageRupees += diag.leakedRupees;

      diag.biases.forEach((b) => {
        if (b.id === "DISPOSITION_EFFECT") {
          biasBreakdown.disposition.count++;
          biasBreakdown.disposition.leakedRupees += b.leakedRupees;
          biasBreakdown.disposition.tradeIds.push(current.id);
        } else if (b.id === "SHIELD_BREACH") {
          biasBreakdown.shieldBreach.count++;
          biasBreakdown.shieldBreach.leakedRupees += b.leakedRupees;
          biasBreakdown.shieldBreach.tradeIds.push(current.id);
        } else if (b.id === "FOMO_CHASE") {
          biasBreakdown.fomoChase.count++;
          biasBreakdown.fomoChase.leakedRupees += b.leakedRupees;
          biasBreakdown.fomoChase.tradeIds.push(current.id);
        } else if (b.id === "REVENGE_CLUSTER") {
          biasBreakdown.revengeCluster.count++;
          biasBreakdown.revengeCluster.leakedRupees += b.leakedRupees;
          biasBreakdown.revengeCluster.tradeIds.push(current.id);
        } else if (b.id === "MIDDAY_TRAP") {
          biasBreakdown.middayTrap.count++;
          biasBreakdown.middayTrap.leakedRupees += b.leakedRupees;
          biasBreakdown.middayTrap.tradeIds.push(current.id);
        }
      });
    }
  }

  const cleanTradesCount = sorted.length - totalBiasedTrades;
  const disciplineRate = Math.round((cleanTradesCount / Math.max(1, sorted.length)) * 100);

  return {
    totalPreventableLeakageRupees,
    totalBiasedTrades,
    cleanTradesCount,
    disciplineRate,
    biasBreakdown,
    diagnosesMap
  };
}
