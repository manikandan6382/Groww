import { useMemo } from "react";
import { useTradingStore, resolveIndexLotSize } from "../stores/useTradingStore";
import { getLocalDateKey } from "../utils/dateUtils";

/**
 * ⚡ Unified Single-Source-of-Truth Session Telemetry Hook
 * Eliminates duplicate inline math across Sidebar, Header, Modals, and Cards.
 * Guarantees zero discrepancy between left sidebar and top indices strip.
 */
export function useSessionTelemetry() {
  const closedAlerts = useTradingStore((s) => s.closedAlerts || []);
  const openAlerts = useTradingStore((s) => s.openAlerts || []);
  const startingCapital = useTradingStore((s) => Number(s.startingCapital || 100000));

  return useMemo(() => {
    const todayKey = getLocalDateKey();

    // 1. Filter settled trades belonging to today's active session
    const todayClosed = closedAlerts.filter((t) => {
      const exitKey = t.exitDatetime ? getLocalDateKey(t.exitDatetime) : null;
      const entryKey = t.entryDatetime ? getLocalDateKey(t.entryDatetime) : null;
      return exitKey === todayKey || entryKey === todayKey;
    });

    // 2. Realized Session P&L (Strictly today's closed trades)
    const sessionRealizedPnl = todayClosed.reduce((acc, t) => acc + Number(t.netPnl || 0), 0);

    // 3. Unrealized MTM P&L on active open positions
    const sessionOpenPnl = openAlerts.reduce((acc, t) => {
      const mark = Number(t.lastMarkPrice ?? t.entryPrice ?? 0);
      const entry = Number(t.entryPrice ?? 0);
      const lot = resolveIndexLotSize(t.symbol, t.lotSize);
      const rawQty = Number(t.quantity || 1);
      const lots = (rawQty >= lot && rawQty % lot === 0) ? (rawQty / lot) : rawQty;
      const totalQty = t.totalQty ? Number(t.totalQty) : (Math.max(1, lots) * lot);
      const isShort = String(t.direction || "LONG").toUpperCase() === "SHORT" || t.direction === "SELL";
      const diff = isShort ? (entry - mark) : (mark - entry);
      return acc + (diff * totalQty);
    }, 0);

    // 4. Unified Session Net P&L (Realized + MTM)
    const sessionNetPnl = sessionRealizedPnl + sessionOpenPnl;
    const sessionPnlPct = startingCapital > 0 ? ((sessionNetPnl / startingCapital) * 100).toFixed(2) : "0.00";
    const isSessionProfitable = sessionNetPnl >= 0;

    // 5. Session Win/Loss Ratios & Quota Tracking
    const todayOpen = openAlerts.filter((t) => {
      const entryKey = t.entryDatetime ? getLocalDateKey(t.entryDatetime) : null;
      return entryKey === todayKey;
    });
    const todayTradesCount = todayClosed.length + todayOpen.length;
    const todayWins = todayClosed.filter((t) => Number(t.netPnl || 0) > 0).length;
    const todayLosses = todayClosed.filter((t) => Number(t.netPnl || 0) <= 0).length;
    const sessionWinRate = todayClosed.length > 0 ? Math.round((todayWins / todayClosed.length) * 100) : 0;

    // 6. Dynamic Compounding Equity Sparkline
    let sparklineData = [startingCapital, startingCapital];
    if (todayClosed.length > 0) {
      const sorted = [...todayClosed].sort(
        (a, b) => new Date(a.exitDatetime || 0).getTime() - new Date(b.exitDatetime || 0).getTime()
      );
      let run = startingCapital;
      sparklineData = [startingCapital];
      for (const t of sorted) {
        run += Number(t.netPnl || 0);
        sparklineData.push(run);
      }
    }

    return {
      todayKey,
      todayClosed,
      sessionRealizedPnl,
      sessionOpenPnl,
      sessionNetPnl,
      sessionPnlPct,
      isSessionProfitable,
      todayTradesCount,
      todayWins,
      todayLosses,
      sessionWinRate,
      sparklineData,
      startingCapital
    };
  }, [closedAlerts, openAlerts, startingCapital]);
}
