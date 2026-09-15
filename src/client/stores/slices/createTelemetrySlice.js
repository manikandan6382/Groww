import { getLocalDateKey } from "../../utils/dateUtils";
import { resolveIndexLotSize } from "./tradeHelpers";

export const createTelemetrySlice = (set, get) => ({
  getPortfolioTelemetry: (timeframe = "all") => {
    const state = get();
    const startingCapital = Number(state.startingCapital || 100000);
    let closed = state.closedAlerts || [];
    let open = state.openAlerts || [];

    if (timeframe === "today") {
      const todayKey = getLocalDateKey(new Date());
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
      const diff = t.optionType === "PUT" || t.symbol?.includes("PE") ? (entry - mark) : (mark - entry);
      return acc + (diff * lot * qty);
    }, 0);

    const netPnl = totalRealizedPnl + totalOpenPnl;
    const currentAccountValue = startingCapital + netPnl;
    const pnlPct = startingCapital > 0 ? ((netPnl / startingCapital) * 100).toFixed(2) : "0.00";

    const winCount = closed.filter((t) => Number(t.netPnl || 0) > 0).length;
    const lossCount = closed.filter((t) => Number(t.netPnl || 0) <= 0).length;
    const totalClosed = closed.length;
    const winRateNum = totalClosed > 0 ? (winCount / totalClosed) * 100 : 0.0;
    const winRate = winRateNum.toFixed(1);

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
      openCount: open.length
    };
  }
});
