import { useState, useMemo } from "react";
import { useTradingStore } from "../../../stores/useTradingStore";
import { buildDynamicSessionDataset } from "./dynamicSessionDataset";
import { filterTradesByRange } from "./filterTradesByRange";
import { calculateMatrixStats, calculateGraduationStats } from "./studioStatsCalculator";

export function usePerformanceStudioData() {
  const closedAlerts = useTradingStore((s) => s.closedAlerts);
  const paperPnlRange = useTradingStore((s) => s.paperPnlRange);
  const setPaperPnlRange = useTradingStore((s) => s.setPaperPnlRange);
  const logJournalTrade = useTradingStore((s) => s.logJournalTrade);

  const todayIso = new Date().toISOString().split("T")[0];
  const [isCalendarOpen, setCalendarOpen] = useState(false);
  const [customStart, setCustomStart] = useState(todayIso);
  const [customEnd, setCustomEnd] = useState(todayIso);
  const [postMortemScope, setPostMortemScope] = useState("timeframe");
  const [promoteSuccessToast, setPromoteSuccessToast] = useState(null);

  const [postMortemRange, setPostMortemRange] = useState("all");
  const [pmCalendarOpen, setPmCalendarOpen] = useState(false);
  const [pmCustomStart, setPmCustomStart] = useState("");
  const [pmCustomEnd, setPmCustomEnd] = useState("");
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);

  const handlePromoteToJournal = (trade) => {
    if (!trade) return;
    logJournalTrade({
      symbol: trade.symbol,
      entryPrice: Number(trade.entryPrice || 0),
      exitPrice: Number(trade.exitPrice || 0),
      targetPrice: Number(trade.targetPrice || trade.entryPrice * 1.1),
      stopLoss: Number(trade.stopLoss || trade.entryPrice * 0.9),
      quantity: Number(trade.quantity || 1),
      lotSize: Number(trade.lotSize || 65),
      netPnl: Number(trade.netPnl || 0),
      grossPnl: Number(trade.grossPnl || trade.netPnl || 0),
      closeReason: trade.closeReason || (trade.netPnl >= 0 ? "TARGET_HIT" : "STOP_LOSS_HIT"),
      strategyTags: trade.strategyTag || trade.strategyTags || "Performance Outlier Play",
      followedPlan: true,
      catalyst: trade.catalyst || trade.entryReason || "15m volume expansion & technical level confirmation.",
      executionDetails: trade.executionDetails || "Executed trade as per predefined quantitative risk rules.",
      lessonsLearned: trade.lessonsLearned || "Predetermined level honored with disciplined execution."
    });
    setPromoteSuccessToast(`Trade ${trade.symbol} promoted to Official 4-Act Journal!`);
    setTimeout(() => setPromoteSuccessToast(null), 4000);
  };

  const currentDataset = useMemo(() => {
    return buildDynamicSessionDataset(closedAlerts, paperPnlRange, customStart, customEnd);
  }, [closedAlerts, paperPnlRange, customStart, customEnd]);

  const totalRealizedPnl = currentDataset.totalPnl;
  const winCount = currentDataset.winCount;
  const lossCount = currentDataset.lossCount;
  const totalTradesCount = winCount + lossCount;
  const winRate = ((winCount / (totalTradesCount || 1)) * 100).toFixed(1);
  const profitFactor = currentDataset.profitFactor;

  const timeframeTrades = useMemo(() => {
    return filterTradesByRange(closedAlerts || [], paperPnlRange, customStart, customEnd);
  }, [closedAlerts, paperPnlRange, customStart, customEnd]);

  const matrixTrades = timeframeTrades.length > 0 ? timeframeTrades : (closedAlerts || []);
  const matrixStats = useMemo(() => calculateMatrixStats(matrixTrades), [matrixTrades]);
  const graduationStats = useMemo(() => calculateGraduationStats(closedAlerts || []), [closedAlerts]);

  const postMortemTrades = useMemo(() => {
    return filterTradesByRange(closedAlerts || [], postMortemRange, pmCustomStart, pmCustomEnd);
  }, [closedAlerts, postMortemRange, pmCustomStart, pmCustomEnd]);

  const selectedDay = currentDataset.bars[selectedDayIndex] || currentDataset.bars[0];

  const activePostMortemTrades = useMemo(() => {
    if (postMortemScope === "day" && selectedDay) {
      const selectedDate = selectedDay.dateStr || (selectedDay.date ? `2026-${selectedDay.date}` : null);
      const dayTrades = (closedAlerts || []).filter((t) => {
        const d = t.exitDatetime?.split("T")[0] || t.entryDatetime?.split("T")[0];
        return d === selectedDate || (selectedDay.date && d?.endsWith(selectedDay.date));
      });
      if (dayTrades.length > 0) return dayTrades;
    }
    return postMortemTrades;
  }, [postMortemScope, selectedDay, postMortemTrades, closedAlerts]);

  const activeWinTrades = activePostMortemTrades.filter((t) => (t.netPnl || 0) > 0);
  const activeLossTrades = activePostMortemTrades.filter((t) => (t.netPnl || 0) <= 0);
  const bestAlert = activeWinTrades.length > 0 ? [...activeWinTrades].sort((a, b) => b.netPnl - a.netPnl)[0] : null;
  const worstAlert = activeLossTrades.length > 0 ? [...activeLossTrades].sort((a, b) => a.netPnl - b.netPnl)[0] : null;

  return {
    closedAlerts,
    paperPnlRange,
    setPaperPnlRange,
    isCalendarOpen,
    setCalendarOpen,
    customStart,
    setCustomStart,
    customEnd,
    setCustomEnd,
    postMortemScope,
    setPostMortemScope,
    promoteSuccessToast,
    postMortemRange,
    setPostMortemRange,
    pmCalendarOpen,
    setPmCalendarOpen,
    pmCustomStart,
    setPmCustomStart,
    pmCustomEnd,
    setPmCustomEnd,
    selectedDayIndex,
    setSelectedDayIndex,
    handlePromoteToJournal,
    currentDataset,
    totalRealizedPnl,
    winRate,
    winCount,
    lossCount,
    totalTradesCount,
    profitFactor,
    ...matrixStats,
    ...graduationStats,
    selectedDay,
    bestAlert,
    worstAlert
  };
}
