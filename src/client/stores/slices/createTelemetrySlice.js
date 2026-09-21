import { getLocalDateKey } from "../../utils/dateUtils";
import { resolveIndexLotSize } from "./tradeHelpers";

export const createTelemetrySlice = (set, get) => ({
  getPortfolioTelemetry: (timeframe = "all") => {
    const state = get();
    const startingCapital = Number(state.startingCapital || 100000);
    let closed = state.closedAlerts || [];
    let open = state.openAlerts || [];

    const todayKey = getLocalDateKey(new Date());

    if (timeframe === "today") {
      closed = closed.filter((t) => {
        const dt = t.exitDatetime || t.entryDatetime;
        return dt && getLocalDateKey(new Date(dt)) === todayKey;
      });
      open = open.filter((t) => {
        const dt = t.entryDatetime;
        return dt && getLocalDateKey(new Date(dt)) === todayKey;
      });
    }

    const totalRealizedPnl = closed.reduce((acc, t) => acc + Number(t.netPnl || 0), 0);
    const totalOpenPnl = open.reduce((acc, t) => {
      const mark = Number(t.lastMarkPrice ?? t.entryPrice ?? 0);
      const entry = Number(t.entryPrice ?? 0);
      const lot = resolveIndexLotSize(t.symbol, t.lotSize);
      const qty = Number(t.quantity || 1);
      const isShort = String(t.direction || "LONG").toUpperCase() === "SHORT";
      const diff = isShort ? (entry - mark) : (mark - entry);
      return acc + (diff * lot * qty);
    }, 0);

    const netPnl = totalRealizedPnl + totalOpenPnl;
    const currentAccountValue = startingCapital + netPnl;
    const pnlPct = startingCapital > 0 ? ((netPnl / startingCapital) * 100).toFixed(2) : "0.00";

    const winTrades = closed.filter((t) => Number(t.netPnl || 0) > 0);
    const lossTrades = closed.filter((t) => Number(t.netPnl || 0) <= 0);
    const winCount = winTrades.length;
    const lossCount = lossTrades.length;
    const totalClosed = closed.length;
    const winRateNum = totalClosed > 0 ? (winCount / totalClosed) * 100 : 0.0;
    const winRate = winRateNum.toFixed(1);

    const grossWins = winTrades.reduce((acc, t) => acc + Number(t.netPnl || 0), 0);
    const grossLosses = Math.abs(lossTrades.reduce((acc, t) => acc + Number(t.netPnl || 0), 0));
    const profitFactorNum = grossLosses > 0 ? grossWins / grossLosses : (grossWins > 0 ? 99.9 : 0.0);
    const profitFactor = grossLosses > 0 ? profitFactorNum.toFixed(2) : (grossWins > 0 ? "∞" : "0.00");

    const avgWin = winCount > 0 ? grossWins / winCount : 0;
    const avgLoss = lossCount > 0 ? grossLosses / lossCount : 0;
    const winProb = totalClosed > 0 ? winCount / totalClosed : 0;
    const lossProb = totalClosed > 0 ? lossCount / totalClosed : 0;
    const expectancy = (winProb * avgWin) - (lossProb * avgLoss);
    const expectancyStr = `${expectancy >= 0 ? "+" : ""}₹${Math.abs(expectancy).toFixed(1)}`;

    const statutoryFrictionTotal = closed.reduce((acc, t) => {
      if (t.brokerageCharges != null) return acc + Number(t.brokerageCharges);
      if (t.friction != null) return acc + Number(t.friction);
      return acc + 55.20;
    }, 0);
    const frictionDragPct = grossWins > 0 ? Math.min(100, (statutoryFrictionTotal / grossWins) * 100).toFixed(1) : "0.0";

    // Manikandan's Strict ₹300 Daily Circuit Breaker Runway
    const todayClosed = (state.closedAlerts || []).filter((t) => {
      const dt = t.exitDatetime || t.entryDatetime;
      return dt && getLocalDateKey(new Date(dt)) === todayKey;
    });
    const todayRealizedLoss = todayClosed
      .filter((t) => Number(t.netPnl || 0) < 0)
      .reduce((acc, t) => acc + Number(t.netPnl || 0), 0);
    const dailyLossLimit = 300;
    const currentDailyLossAbs = Math.abs(todayRealizedLoss);
    const lossRunwayRemaining = Math.max(0, dailyLossLimit - currentDailyLossAbs);
    const lossRunwayPct = Math.max(0, Math.min(100, Math.round((lossRunwayRemaining / dailyLossLimit) * 100)));
    const primeTradesRemaining = Math.floor(lossRunwayRemaining / 250);

    // Intraday Session Equity Sparkline Trajectory
    let runningBalance = startingCapital;
    const sparklinePoints = [startingCapital];
    const sortedClosed = [...closed].sort((a, b) => new Date(a.exitDatetime || a.entryDatetime || 0) - new Date(b.exitDatetime || b.entryDatetime || 0));
    for (const trade of sortedClosed) {
      runningBalance += Number(trade.netPnl || 0);
      sparklinePoints.push(runningBalance);
    }
    if (totalOpenPnl !== 0) {
      sparklinePoints.push(currentAccountValue);
    }

    return {
      timeframe,
      startingCapital,
      currentAccountValue,
      totalRealizedPnl,
      totalOpenPnl,
      netPnl,
      pnlPct,
      winCount,
      lossCount,
      totalClosed,
      winRateNum,
      winRate,
      openCount: open.length,
      grossWins,
      grossLosses,
      profitFactor,
      profitFactorNum,
      avgWin,
      avgLoss,
      expectancy,
      expectancyStr,
      statutoryFrictionTotal,
      frictionDragPct,
      dailyLossLimit,
      todayRealizedLoss,
      lossRunwayRemaining,
      lossRunwayPct,
      primeTradesRemaining,
      sparklinePoints
    };
  }
});
