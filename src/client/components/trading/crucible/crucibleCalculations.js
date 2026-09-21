import { diagnoseTradeBiases } from "../journal-story/behavioralBiasEngine";
import { getLocalDateKey } from "../../../utils/dateUtils";

/**
 * Pure Deterministic Mathematical Engine for Section 5: Performance Crucible
 */

// Helper to extract duration in minutes
export function getTradeDurationMinutes(trade) {
  if (trade.durationMinutes && Number(trade.durationMinutes) > 0) {
    return Number(trade.durationMinutes);
  }
  const entry = trade.entryDatetime || trade.datetime || trade.createdAt;
  const exit = trade.exitDatetime || trade.closedAt;
  if (entry && exit) {
    const diffMs = Math.abs(new Date(exit).getTime() - new Date(entry).getTime());
    if (diffMs > 0 && !isNaN(diffMs)) {
      return Math.round((diffMs / 60000) * 10) / 10;
    }
  }
  return 3.5; // Default representative scalp duration in minutes
}

/**
 * 1. Counterfactual "Zero-Leakage" Equity Curve Calculator
 * Reconstructs the theoretical account equity if all cognitive and risk leaks were eliminated.
 */
export function calculateCounterfactualEquity(trades = []) {
  if (!Array.isArray(trades) || trades.length === 0) {
    return {
      curve: [{ x: 0, actualPnl: 0, disciplinedPnl: 0, delta: 0, date: "Start", label: "Start" }],
      totalActualNet: 0,
      totalDisciplinedNet: 0,
      totalCapitalLeakage: 0,
      leakagePercent: 0,
      maxLeakageSingleTrade: 0,
      leakedTradesCount: 0
    };
  }

  // Sort chronologically ascending
  const sorted = [...trades].sort((a, b) => {
    const timeA = new Date(a.entryDatetime || a.exitDatetime || a.createdAt || 0).getTime();
    const timeB = new Date(b.entryDatetime || b.exitDatetime || b.createdAt || 0).getTime();
    return timeA - timeB;
  });

  let runningActual = 0;
  let runningDisciplined = 0;
  let totalCapitalLeakage = 0;
  let maxLeakageSingleTrade = 0;
  let leakedTradesCount = 0;

  const curve = [
    { x: 0, actualPnl: 0, disciplinedPnl: 0, delta: 0, date: "Start", label: "0" }
  ];

  for (let i = 0; i < sorted.length; i++) {
    const t = sorted[i];
    const prior = i > 0 ? sorted[i - 1] : null;
    const { leakedRupees } = diagnoseTradeBiases(t, prior);

    const net = Number(t.netPnl !== undefined ? t.netPnl : 0);
    runningActual += net;

    // Disciplined PnL restores preventable leakage
    const disciplinedTradePnl = net + leakedRupees;
    runningDisciplined += disciplinedTradePnl;

    if (leakedRupees > 0) {
      totalCapitalLeakage += leakedRupees;
      leakedTradesCount++;
      if (leakedRupees > maxLeakageSingleTrade) {
        maxLeakageSingleTrade = leakedRupees;
      }
    }

    const dateKey = getLocalDateKey(t.entryDatetime || t.exitDatetime || t.createdAt);
    curve.push({
      x: i + 1,
      actualPnl: Math.round(runningActual),
      disciplinedPnl: Math.round(runningDisciplined),
      delta: Math.round(runningDisciplined - runningActual),
      tradeLeakage: leakedRupees,
      date: dateKey,
      symbol: t.symbol || "NIFTY",
      label: `#${i + 1}`
    });
  }

  const leakagePercent = runningActual !== 0
    ? Math.abs(Math.round((totalCapitalLeakage / Math.max(1, Math.abs(runningActual))) * 100))
    : 0;

  return {
    curve,
    totalActualNet: Math.round(runningActual),
    totalDisciplinedNet: Math.round(runningDisciplined),
    totalCapitalLeakage: Math.round(totalCapitalLeakage),
    leakagePercent,
    maxLeakageSingleTrade: Math.round(maxLeakageSingleTrade),
    leakedTradesCount
  };
}

/**
 * 2. Institutional Prop-Firm Consistency Scorecard (0–100)
 * Evaluates execution against Manikandan's exact risk and quota invariants.
 */
export function calculatePropFirmScorecard(trades = []) {
  if (!Array.isArray(trades) || trades.length === 0) {
    return {
      compositeScore: 100,
      tier: "Institutional Sovereign",
      tierColor: "text-purple-400 bg-purple-500/10 border-purple-500/30",
      tierBadge: "Hedge-Fund Master",
      pillars: {
        ria: { score: 25, max: 25, label: "Risk Invariant Adherence", detail: "0 Stop Breaches" },
        qd: { score: 25, max: 25, label: "Quota Discipline", detail: "3 Trades/Day Respected" },
        prq: { score: 25, max: 25, label: "Payoff Ratio Quality", detail: "1:2.00 Target Maintained" },
        ee: { score: 25, max: 25, label: "Emotional Equanimity", detail: "Zero Behavioral Leaks" }
      },
      prescription: "Ready for fresh session. Wait for high-conviction 1:2 setups.",
      disciplinedTradesCount: 0,
      totalTradesCount: 0
    };
  }

  // Pillar 1: Risk Invariant Adherence (RIA) - % of losing trades with loss <= ₹300
  const losses = trades.filter((t) => Number(t.netPnl || 0) < 0);
  const disciplinedLosses = losses.filter((t) => Number(t.netPnl || 0) >= -300);
  const riaRate = losses.length === 0 ? 1.0 : disciplinedLosses.length / losses.length;
  const riaScore = Math.round(riaRate * 25);

  // Pillar 2: Quota Discipline (QD) - % of sessions respecting <= 3 trades/day
  const sessions = new Map();
  for (const t of trades) {
    const d = getLocalDateKey(t.entryDatetime || t.exitDatetime || t.createdAt);
    sessions.set(d, (sessions.get(d) || 0) + 1);
  }
  let disciplinedSessions = 0;
  for (const count of sessions.values()) {
    if (count <= 3) disciplinedSessions++;
  }
  const qdRate = sessions.size === 0 ? 1.0 : disciplinedSessions / sessions.size;
  const qdScore = Math.round(qdRate * 25);

  // Pillar 3: Payoff Ratio Quality (PRQ) - Target 1:2.00 RR
  const wins = trades.filter((t) => Number(t.netPnl || 0) > 0);
  const totalWinRupees = wins.reduce((acc, t) => acc + Number(t.netPnl || 0), 0);
  const totalLossRupees = Math.abs(losses.reduce((acc, t) => acc + Number(t.netPnl || 0), 0));
  const avgWin = wins.length > 0 ? totalWinRupees / wins.length : 0;
  const avgLoss = losses.length > 0 ? totalLossRupees / losses.length : 0;
  const payoffRatio = avgLoss > 0 ? avgWin / avgLoss : (avgWin > 0 ? 2.5 : 1.0);
  const prqRate = Math.min(1.0, Math.max(0.2, payoffRatio / 2.0));
  const prqScore = Math.round(prqRate * 25);

  // Pillar 4: Emotional Equanimity (EE) - % of trades with zero bias/leakage
  let cleanTradesCount = 0;
  for (let i = 0; i < trades.length; i++) {
    const prior = i > 0 ? trades[i - 1] : null;
    const { leakedRupees } = diagnoseTradeBiases(trades[i], prior);
    if (leakedRupees === 0) cleanTradesCount++;
  }
  const eeRate = cleanTradesCount / Math.max(1, trades.length);
  const eeScore = Math.round(eeRate * 25);

  const compositeScore = Math.min(100, Math.max(0, riaScore + qdScore + prqScore + eeScore));

  let tier = "Institutional Sovereign";
  let tierColor = "text-purple-400 bg-purple-500/10 border-purple-500/30";
  let tierBadge = "Hedge-Fund Master";

  if (compositeScore < 50) {
    tier = "Capital at Risk";
    tierColor = "text-rose-400 bg-rose-500/10 border-rose-500/30";
    tierBadge = "Intervention Required";
  } else if (compositeScore < 75) {
    tier = "Tilt Vulnerable";
    tierColor = "text-amber-400 bg-amber-500/10 border-amber-500/30";
    tierBadge = "Discipline Alert";
  } else if (compositeScore < 90) {
    tier = "Disciplined Scalper";
    tierColor = "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
    tierBadge = "Fund-Ready Scalper";
  }

  // Generate surgical algorithmic prescription based on lowest scoring pillar
  let prescription = "Excellent disciplined execution. Maintain strict 1:2.00 target pegging.";
  const lowest = Math.min(riaScore, qdScore, prqScore, eeScore);
  if (lowest === riaScore && riaScore < 20) {
    prescription = `Stop breaches detected (${losses.length - disciplinedLosses.length} trade(s) > ₹300). Respect the ₹250 stop loss immediately upon trigger.`;
  } else if (lowest === qdScore && qdScore < 20) {
    prescription = `Overtrading detected in ${sessions.size - disciplinedSessions} session(s). Hard-cap your daily trade quota to 3 orders to preserve capital & avoid tax bleed.`;
  } else if (lowest === prqScore && prqScore < 20) {
    prescription = `Payoff ratio is ${payoffRatio.toFixed(2)}x (target 2.00x). Avoid cutting winning scalps before the 8.0-point target is touched.`;
  } else if (lowest === eeScore && eeScore < 20) {
    prescription = `${trades.length - cleanTradesCount} trade(s) suffered behavioral leaks (FOMO or early exits). Wait for clean candle closes before entry.`;
  }

  return {
    compositeScore,
    tier,
    tierColor,
    tierBadge,
    payoffRatio: Number(payoffRatio.toFixed(2)),
    avgWin: Math.round(avgWin),
    avgLoss: Math.round(avgLoss),
    pillars: {
      ria: { score: riaScore, max: 25, label: "Risk Invariant Adherence", detail: `${Math.round(riaRate * 100)}% Losses Under ₹300 Cap` },
      qd: { score: qdScore, max: 25, label: "Quota Discipline", detail: `${Math.round(qdRate * 100)}% Sessions Under 3 Trades` },
      prq: { score: prqScore, max: 25, label: "Payoff Ratio Quality", detail: `${payoffRatio.toFixed(2)}x Realized R:R (Target 2.0x)` },
      ee: { score: eeScore, max: 25, label: "Emotional Equanimity", detail: `${Math.round(eeRate * 100)}% Leakage-Free Orders` }
    },
    prescription,
    disciplinedTradesCount: cleanTradesCount,
    totalTradesCount: trades.length
  };
}

/**
 * 3. Execution Hold Duration Microstructure & Friction Autopsy
 */
export function calculateDurationEfficiency(trades = []) {
  const buckets = {
    hyper: { label: "< 1 Min (Flash Scalp)", count: 0, wins: 0, losses: 0, netPnl: 0, grossPnl: 0, color: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/25" },
    momentum: { label: "1–5 Mins (Sweetspot)", count: 0, wins: 0, losses: 0, netPnl: 0, grossPnl: 0, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/25" },
    pullback: { label: "5–15 Mins (Trend Pullback)", count: 0, wins: 0, losses: 0, netPnl: 0, grossPnl: 0, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/25" },
    extended: { label: "> 15 Mins (Theta Bleed)", count: 0, wins: 0, losses: 0, netPnl: 0, grossPnl: 0, color: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/25" }
  };

  let totalGross = 0;
  let totalFriction = 0;
  let totalNet = 0;

  for (const t of trades) {
    const mins = getTradeDurationMinutes(t);
    const net = Number(t.netPnl !== undefined ? t.netPnl : 0);
    const friction = Number(t.statutoryCharges || t.friction || 55.20);
    const gross = net + friction;

    totalGross += gross;
    totalFriction += friction;
    totalNet += net;

    let targetBucket = buckets.extended;
    if (mins < 1) targetBucket = buckets.hyper;
    else if (mins <= 5) targetBucket = buckets.momentum;
    else if (mins <= 15) targetBucket = buckets.pullback;

    targetBucket.count++;
    if (net > 0) targetBucket.wins++;
    else if (net < 0) targetBucket.losses++;
    targetBucket.netPnl += net;
    targetBucket.grossPnl += gross;
  }

  const list = Object.values(buckets).map((b) => ({
    ...b,
    winRate: b.count > 0 ? Math.round((b.wins / b.count) * 100) : 0,
    netPnl: Math.round(b.netPnl),
    avgPnl: b.count > 0 ? Math.round(b.netPnl / b.count) : 0
  }));

  // Net Alpha Retention Rate (percentage of gross profits kept after taxes & charges)
  const retentionRate = totalGross > 0
    ? Math.max(0, Math.min(100, Math.round((totalNet / totalGross) * 100)))
    : totalNet >= 0 ? 100 : 0;

  return {
    durationBuckets: list,
    totalGross: Math.round(totalGross),
    totalFriction: Math.round(totalFriction),
    totalNet: Math.round(totalNet),
    retentionRate
  };
}

/**
 * 4. Capital Scaling Milestone Ladder ("Road to 2 Lots")
 * Evaluates readiness to scale from 1 lot (65 qty) to 2 lots (130 qty).
 */
export function calculateCapitalScalingLadder(trades = []) {
  const TARGET_STREAK = 20;

  if (!Array.isArray(trades) || trades.length === 0) {
    return {
      currentStreak: 0,
      targetStreak: TARGET_STREAK,
      progressPercent: 0,
      isUnlocked: false,
      consecutiveDisciplined: 0,
      message: "Execute 20 disciplined trades within your ₹250 risk budget to unlock 2-lot position sizing."
    };
  }

  // Count backwards from latest trade to find active streak of disciplined trades
  let streak = 0;
  for (let i = trades.length - 1; i >= 0; i--) {
    const t = trades[i];
    const prior = i > 0 ? trades[i - 1] : null;
    const { leakedRupees } = diagnoseTradeBiases(t, prior);
    const net = Number(t.netPnl !== undefined ? t.netPnl : 0);

    // Disciplined invariant: loss never breaches ₹300, and zero severe tilt leaks
    const isDisciplined = net >= -300 && leakedRupees < 100;
    if (isDisciplined) {
      streak++;
    } else {
      break; // Streak broken by undisciplined execution
    }
  }

  const isUnlocked = streak >= TARGET_STREAK;
  const progressPercent = Math.min(100, Math.round((streak / TARGET_STREAK) * 100));

  return {
    currentStreak: streak,
    targetStreak: TARGET_STREAK,
    progressPercent,
    isUnlocked,
    consecutiveDisciplined: streak,
    message: isUnlocked
      ? "🏆 Capital scaling unlocked: You are quantitatively eligible to scale to 2 lots (130 qty NIFTY)."
      : `${streak} / ${TARGET_STREAK} disciplined trades achieved. ${TARGET_STREAK - streak} more required to unlock 2-lot scale.`
  };
}
