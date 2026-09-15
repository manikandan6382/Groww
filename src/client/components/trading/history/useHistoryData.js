import { useState, useMemo, useEffect } from "react";
import { useTradingStore } from "../../../stores/useTradingStore";
import { getLocalDateKey } from "../../../utils/dateUtils";
import { getTradeOutcome } from "../../../utils/tradeNormalizer";
import { resolveUnderlying, getBatchSlice } from "./historyHelpers";

export function useHistoryData() {
  const closedAlerts = useTradingStore((s) => s.closedAlerts);
  const openAlerts = useTradingStore((s) => s.openAlerts);
  const paperLedgerFilter = useTradingStore((s) => s.paperLedgerFilter);
  const setPaperLedgerFilter = useTradingStore((s) => s.setPaperLedgerFilter);

  const [assetFilter, setAssetFilter] = useState("ALL");
  const [dateRangeFilter, setDateRangeFilter] = useState("all");
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [selectedBatchNum, setSelectedBatchNum] = useState("all");
  const [showAllRows, setShowAllRows] = useState(false);

  const { allCount, niftyCount, bankCount, sensexCount } = useMemo(() => {
    let nifty = 0, bank = 0, sensex = 0;
    for (const t of closedAlerts) {
      const u = resolveUnderlying(t);
      if (u === "NIFTY") nifty++;
      else if (u === "BANKNIFTY") bank++;
      else if (u === "SENSEX") sensex++;
    }
    return { allCount: closedAlerts.length, niftyCount: nifty, bankCount: bank, sensexCount: sensex };
  }, [closedAlerts]);

  const assetFilteredAlerts = useMemo(() => {
    return closedAlerts.filter((trade) => {
      if (assetFilter === "ALL") return true;
      return resolveUnderlying(trade) === assetFilter;
    });
  }, [closedAlerts, assetFilter]);

  const totalSettledCount = assetFilteredAlerts.length;
  const totalBatches = Math.max(1, Math.ceil(totalSettledCount / 20));
  const latestBatchNum = totalBatches;
  const activeBatchNum = selectedBatchNum === "all" 
    ? latestBatchNum 
    : (typeof selectedBatchNum === "number" && selectedBatchNum >= 1 && selectedBatchNum <= totalBatches ? selectedBatchNum : latestBatchNum);

  const batchList = useMemo(() => {
    return Array.from({ length: totalBatches }, (_, i) => {
      const num = i + 1;
      const slice = getBatchSlice(totalSettledCount, num, totalBatches);
      const trades = assetFilteredAlerts.slice(slice.start, slice.end);
      const wins = trades.filter((t) => getTradeOutcome(t).isNetGain).length;
      const losses = trades.length - wins;
      const winRate = trades.length > 0 ? ((wins / trades.length) * 100).toFixed(0) : "0";
      const netPnl = trades.reduce((acc, t) => acc + (t.netPnl || 0), 0);
      return { num, isLatest: num === totalBatches, isComplete: slice.count === 20, count: slice.count, trades, wins, losses, winRate, netPnl };
    });
  }, [totalSettledCount, totalBatches, assetFilteredAlerts]);

  const activeBatchData = useMemo(() => {
    return batchList.find((b) => b.num === activeBatchNum) || batchList[batchList.length - 1];
  }, [batchList, activeBatchNum]);

  const macroStats = useMemo(() => {
    const totalTrades = assetFilteredAlerts.length;
    const wins = assetFilteredAlerts.filter((t) => getTradeOutcome(t).isNetGain).length;
    const losses = totalTrades - wins;
    const winRateNum = totalTrades > 0 ? (wins / totalTrades) : 0;
    const winRate = (winRateNum * 100).toFixed(0);
    const netPnl = assetFilteredAlerts.reduce((acc, t) => acc + (t.netPnl || 0), 0);
    const totalFriction = assetFilteredAlerts.reduce((acc, t) => acc + (getTradeOutcome(t).charges || 0), 0);
    const se = totalTrades > 0 ? Math.sqrt((winRateNum * (1 - winRateNum)) / totalTrades) : 0;
    return { totalTrades, wins, losses, winRate, netPnl, totalFriction, avgFrictionPerTrade: totalTrades > 0 ? (totalFriction / totalTrades).toFixed(1) : "87.5", sePercent: (se * 100).toFixed(1), isStatisticallySignificant: totalTrades >= 100, progressTo100: Math.min(100, Math.round((totalTrades / 100) * 100)) };
  }, [assetFilteredAlerts]);

  const filteredAlerts = useMemo(() => {
    const batchScoped = selectedBatchNum === "all" ? assetFilteredAlerts : (activeBatchData?.trades || assetFilteredAlerts);
    const todayKey = getLocalDateKey();
    const dateFiltered = batchScoped.filter((trade) => {
      const tradeDate = getLocalDateKey(trade.exitDatetime || trade.entryDatetime);
      if (dateRangeFilter === "today") return tradeDate === todayKey;
      if (dateRangeFilter === "yesterday") {
        const yDate = new Date(); yDate.setDate(yDate.getDate() - 1);
        return tradeDate === getLocalDateKey(yDate);
      }
      if (dateRangeFilter === "week") {
        const d = new Date(), day = d.getDay(), monday = new Date(d);
        monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1)); monday.setHours(0, 0, 0, 0);
        const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6); sunday.setHours(23, 59, 59, 999);
        return tradeDate >= getLocalDateKey(monday) && tradeDate <= getLocalDateKey(sunday);
      }
      if (dateRangeFilter === "month") {
        const d = new Date();
        return tradeDate.startsWith(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
      }
      if (dateRangeFilter === "custom") {
        if (!customStart) return true;
        if (customStart && !customEnd) return tradeDate >= customStart;
        return tradeDate >= customStart && tradeDate <= customEnd;
      }
      return true;
    });

    return dateFiltered.filter((trade) => {
      const outcome = getTradeOutcome(trade);
      if (paperLedgerFilter === "win") return outcome.isNetGain;
      if (paperLedgerFilter === "friction") return outcome.type === "TRAILED_BE_DRAG" || outcome.type === "TRUE_BREAKEVEN";
      if (paperLedgerFilter === "loss") return outcome.type === "STOP_CUT";
      return true;
    });
  }, [assetFilteredAlerts, selectedBatchNum, activeBatchData, dateRangeFilter, customStart, customEnd, paperLedgerFilter]);

  const { totalRealizedPnl, totalGrossPnl, totalCharges, winCount, lossCount } = useMemo(() => {
    let pnl = 0, gross = 0, charges = 0, wins = 0, losses = 0;
    for (const t of filteredAlerts) {
      pnl += (t.netPnl || 0);
      const oc = getTradeOutcome(t);
      gross += (oc.grossPnl ?? (t.grossPnl || t.netPnl || 0));
      charges += Number(t.charges ?? oc.charges ?? 55.20);
      if (oc.isNetGain) wins++; else losses++;
    }
    return { totalRealizedPnl: pnl, totalGrossPnl: gross, totalCharges: charges, winCount: wins, lossCount: losses };
  }, [filteredAlerts]);

  const visibleAlerts = showAllRows ? filteredAlerts : filteredAlerts.slice(0, 20);
  const activeAlertsMatchingFilters = useMemo(() => {
    return openAlerts.filter((trade) => {
      if (assetFilter !== "ALL" && resolveUnderlying(trade) !== assetFilter) return false;
      if (dateRangeFilter === "yesterday") return false;
      return true;
    });
  }, [openAlerts, assetFilter, dateRangeFilter]);

  const displayAlerts = useMemo(() => {
    if (orderStatusFilter === "active") return activeAlertsMatchingFilters;
    if (orderStatusFilter === "settled") return visibleAlerts;
    return [...activeAlertsMatchingFilters, ...visibleAlerts];
  }, [orderStatusFilter, activeAlertsMatchingFilters, visibleAlerts]);

  return {
    closedAlerts, openAlerts, assetFilter, setAssetFilter, dateRangeFilter, setDateRangeFilter,
    orderStatusFilter, setOrderStatusFilter, customStart, setCustomStart, customEnd, setCustomEnd,
    selectedBatchNum, setSelectedBatchNum, showAllRows, setShowAllRows, paperLedgerFilter, setPaperLedgerFilter,
    allCount, niftyCount, bankCount, sensexCount, batchList, activeBatchData, totalBatches,
    macroStats, filteredAlerts, totalRealizedPnl, totalGrossPnl, totalCharges, winCount, lossCount,
    visibleAlerts, activeAlertsMatchingFilters, displayAlerts
  };
}
