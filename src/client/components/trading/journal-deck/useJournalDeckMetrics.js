import { useMemo } from "react";
import { useTradingStore } from "../../../stores/useTradingStore";
import { getLocalDateKey } from "../../../utils/dateUtils";

export function useJournalDeckMetrics() {
  const { 
    journalTrades = [], 
    journalRange = "today", 
    journalCustomStart, 
    journalCustomEnd, 
    startingCapital = 100000 
  } = useTradingStore();

  return useMemo(() => {
    // 1. Filter trades based on journalRange in canonical IST
    const filteredTrades = (journalTrades || []).filter((t) => {
      const tradeDate = getLocalDateKey(t.exitDatetime || t.entryDatetime);
      const todayStr = getLocalDateKey();

      if (journalRange === "today") return tradeDate === todayStr;
      if (journalRange === "week") {
        const d = new Date();
        const day = d.getDay();
        const monday = new Date(d);
        monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
        monday.setHours(0, 0, 0, 0);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);
        return tradeDate >= getLocalDateKey(monday) && tradeDate <= getLocalDateKey(sunday);
      }
      if (journalRange === "month") {
        const now = new Date();
        const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        return tradeDate.startsWith(prefix);
      }
      if (journalRange === "custom") {
        if (!journalCustomStart) return true;
        if (journalCustomStart && !journalCustomEnd) return tradeDate >= journalCustomStart;
        return tradeDate >= journalCustomStart && tradeDate <= journalCustomEnd;
      }
      return true;
    });

    // 2. Sort chronologically for equity curve & streak accuracy
    const chronologicalTrades = [...filteredTrades].sort((a, b) => {
      const tA = new Date(a.entryDatetime || a.exitDatetime || 0).getTime();
      const tB = new Date(b.entryDatetime || b.exitDatetime || 0).getTime();
      return tA - tB;
    });

    const n = filteredTrades.length;
    const totalNetPnl = filteredTrades.reduce((acc, t) => acc + (t.netPnl || 0), 0);
    const winTrades = filteredTrades.filter((t) => (t.netPnl || 0) > 0);
    const lossTrades = filteredTrades.filter((t) => (t.netPnl || 0) <= 0);
    const breakevenTrades = filteredTrades.filter((t) => (t.netPnl || 0) === 0);

    const winRate = n > 0 ? ((winTrades.length / n) * 100).toFixed(1) : "0.0";
    const winRateNum = n > 0 ? Number(winRate) : 0;

    const grossWins = winTrades.reduce((acc, t) => acc + (t.netPnl || 0), 0);
    const grossLosses = Math.abs(lossTrades.reduce((acc, t) => acc + (t.netPnl || 0), 0));

    // 🛡️ Safe Profit Factor calculation (Prevents NaN crashes on zero-loss samples)
    const isZeroLossWinning = grossLosses === 0 && grossWins > 0;
    const profitFactorNum = grossLosses > 0 
      ? Number((grossWins / grossLosses).toFixed(2)) 
      : isZeroLossWinning 
        ? 99.99 
        : 0.0;
    const profitFactor = grossLosses > 0 
      ? (grossWins / grossLosses).toFixed(2) 
      : isZeroLossWinning 
        ? "MAX" 
        : "0.00";

    // Average Win & Average Loss
    const avgWin = winTrades.length > 0 ? grossWins / winTrades.length : 0;
    const avgLoss = lossTrades.length > 0 ? grossLosses / lossTrades.length : 0;

    // Realized Payoff Ratio (Avg Win / Avg Loss)
    const payoffRatioNum = avgLoss > 0 ? Number((avgWin / avgLoss).toFixed(2)) : (avgWin > 0 ? 99.99 : 0);
    const payoffRatio = avgLoss > 0 ? (avgWin / avgLoss).toFixed(2) : (avgWin > 0 ? "MAX" : "0.00");

    // Net Expectancy per Trade (E in ₹)
    const avgNet = n > 0 ? totalNetPnl / n : 0;
    const expectancy = Number(avgNet.toFixed(2));
    // Edge per ₹1 Risked: Expectancy / AvgLoss
    const returnOnRisk = avgLoss > 0 ? Number((expectancy / avgLoss).toFixed(2)) : (expectancy > 0 ? 99.99 : 0);

    // 95% Wilson Score Interval Floor (Lower Bound)
    let wilsonFloor = "0.0";
    if (n > 0) {
      const p = winTrades.length / n;
      const z = 1.96;
      const numerator = p + (z * z) / (2 * n) - z * Math.sqrt((p * (1 - p) + (z * z) / (4 * n)) / n);
      const denominator = 1 + (z * z) / n;
      wilsonFloor = Math.max(0, (numerator / denominator) * 100).toFixed(1);
    }

    // Capital & Yield
    const cap = Number(startingCapital || 100000);
    const netYieldPct = cap > 0 ? (totalNetPnl / cap) * 100 : 0;

    // Friction & Statutory Fees
    const totalFriction = filteredTrades.reduce((acc, t) => acc + Number(t.taxesAndCharges || 55.20), 0);
    const frictionDragPct = grossWins > 0 ? Math.min(100, Number(((totalFriction / grossWins) * 100).toFixed(1))) : 0;

    // Manikandan's Risk Invariant (₹200–₹300 Max Loss Hard Cap)
    // Identify trades exceeding ₹305 (allowing ₹5 buffer for live market slippage)
    const breachedTrades = lossTrades.filter((t) => Math.abs(t.netPnl || 0) > 305);
    const breachedLossCount = breachedTrades.length;
    const riskInvariantViolated = breachedLossCount > 0;
    const maxLoss = lossTrades.length > 0 ? Math.min(...lossTrades.map((t) => t.netPnl || 0)) : 0;
    const maxLossBreached = Math.abs(maxLoss) > 305;

    // Honest Unbiased Streak Tracking (from newest trade backwards)
    let streakType = "none"; // "win" | "loss" | "none"
    let streakCount = 0;
    if (chronologicalTrades.length > 0) {
      const lastTradePnl = chronologicalTrades[chronologicalTrades.length - 1].netPnl || 0;
      if (lastTradePnl > 0) {
        streakType = "win";
        for (let i = chronologicalTrades.length - 1; i >= 0; i--) {
          if ((chronologicalTrades[i].netPnl || 0) > 0) streakCount++;
          else break;
        }
      } else if (lastTradePnl < 0) {
        streakType = "loss";
        for (let i = chronologicalTrades.length - 1; i >= 0; i--) {
          if ((chronologicalTrades[i].netPnl || 0) < 0) streakCount++;
          else break;
        }
      }
    }

    // Rule Discipline % (Combines explicit plan tagging + ₹300 risk boundary)
    let compliantCount = 0;
    for (const t of filteredTrades) {
      const lossExceeded = (t.netPnl || 0) < -305;
      const brokeExplicitPlan = t.followedPlan === false;
      if (!lossExceeded && !brokeExplicitPlan) {
        compliantCount++;
      }
    }
    const ruleDisciplinePct = n > 0 ? Math.round((compliantCount / n) * 100) : 100;

    // Dual Concentric Activity Rings Geometry:
    // Outer Ring: Win Rate (Radius 38, Circumference = 2 * PI * 38 = 238.76)
    const winAngle = Math.min(238.76, ((winTrades.length || 0) / (n || 1)) * 238.76);
    // Inner Ring: Discipline Rate (Radius 27, Circumference = 2 * PI * 27 = 169.65)
    const disciplineAngle = Math.min(169.65, (ruleDisciplinePct / 100) * 169.65);

    // Cumulative Equity Sparkline Path Generation (ViewBox: 160 x 36)
    let sparklinePath = "";
    let sparklineArea = "";
    if (chronologicalTrades.length > 0) {
      const cumPoints = [0];
      let running = 0;
      for (const t of chronologicalTrades) {
        running += Number(t.netPnl || 0);
        cumPoints.push(running);
      }
      const minVal = Math.min(...cumPoints);
      const maxVal = Math.max(...cumPoints);
      const rangeVal = maxVal - minVal || 1;
      const width = 160;
      const height = 36;
      const padding = 4;
      const usableHeight = height - padding * 2;

      const coords = cumPoints.map((val, idx) => {
        const x = (idx / (cumPoints.length - 1)) * width;
        const y = padding + usableHeight - ((val - minVal) / rangeVal) * usableHeight;
        return { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) };
      });

      sparklinePath = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`).join(" ");
      sparklineArea = `${sparklinePath} L ${width} ${height} L 0 ${height} Z`;
    }

    // Top Strategy Setup Attribution
    const strategyPnlMap = {};
    for (const t of filteredTrades) {
      const rawTag = Array.isArray(t.strategyTags)
        ? (t.strategyTags[0] || t.strategyTag || t.entryReason || "Manual Scalp")
        : (t.strategyTags || t.strategyTag || t.entryReason || "Manual Scalp");
      const tag = String(rawTag || "Manual Scalp").trim();
      const pnl = Number(t.netPnl || 0);
      strategyPnlMap[tag] = (strategyPnlMap[tag] || 0) + pnl;
    }
    let topSetup = "General Scalp";
    let topSetupPnl = -Infinity;
    for (const [tag, pnl] of Object.entries(strategyPnlMap)) {
      if (pnl > topSetupPnl) {
        topSetupPnl = pnl;
        topSetup = tag;
      }
    }
    if (n === 0) topSetup = "No Trades";

    const rangeLabel = journalRange === "today" 
      ? "Today" 
      : journalRange === "week" 
      ? "This Week" 
      : journalRange === "month" 
      ? "This Month" 
      : journalRange === "custom" 
      ? `${journalCustomStart} to ${journalCustomEnd}` 
      : "All Time";

    return {
      filteredTrades,
      tradeCount: n,
      totalNetPnl,
      winTrades,
      lossTrades,
      breakevenTrades,
      winRate,
      winRateNum,
      grossWins,
      grossLosses,
      profitFactor,
      profitFactorNum,
      isZeroLossWinning,
      avgWin,
      avgLoss,
      payoffRatio,
      payoffRatioNum,
      avgNet: avgNet.toFixed(2),
      expectancy,
      returnOnRisk,
      wilsonFloor,
      winAngle,
      disciplineAngle,
      netYieldPct,
      totalFriction,
      frictionDragPct,
      ruleDisciplinePct,
      streakType,
      streakCount,
      maxLoss,
      maxLossBreached,
      breachedLossCount,
      riskInvariantViolated,
      sparklinePath,
      sparklineArea,
      topSetup,
      topSetupPnl,
      rangeLabel
    };
  }, [journalTrades, journalRange, journalCustomStart, journalCustomEnd, startingCapital]);
}

export default useJournalDeckMetrics;
