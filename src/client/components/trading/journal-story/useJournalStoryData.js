import { useState, useEffect } from "react";
import { useTradingStore } from "../../../stores/useTradingStore";
import { soundEngine } from "../../../utils/soundEngine";
import { exportTaxCsv } from "./exportTaxCsv";
import { 
  getDateFilteredTrades, 
  getFilteredTrades, 
  getRangeLabel 
} from "./filterJournalTrades";

export function useJournalStoryData() {
  const { 
    journalTrades, 
    journalRange, 
    setJournalRange, 
    journalCustomStart, 
    journalCustomEnd, 
    setJournalCustomRange, 
    journalFilter, 
    setJournalFilter, 
    deleteJournalTradeWithUndo, 
    selectedStrategyFilter, 
    clearSelectedStrategyFilter,
    selectedTradeId,
    setSelectedTradeId
  } = useTradingStore();

  const [expandedTradeIds, setExpandedTradeIds] = useState(new Set([101]));
  const [searchQuery, setSearchQuery] = useState("");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [copiedTradeId, setCopiedTradeId] = useState(null);
  const [visibleCount, setVisibleCount] = useState(25);

  const dateFilteredTrades = getDateFilteredTrades(
    journalTrades, 
    journalRange, 
    journalCustomStart, 
    journalCustomEnd
  );

  const filteredTrades = getFilteredTrades(
    dateFilteredTrades, 
    selectedStrategyFilter, 
    journalFilter, 
    searchQuery
  );

  // Auto-unmask filter, expand batch, and focus card when selected from Section 3
  useEffect(() => {
    if (!selectedTradeId) return;

    // Check if the target trade is hidden by active filters or search query
    const targetInFiltered = filteredTrades.find((t) => t.id === selectedTradeId);
    if (!targetInFiltered) {
      // Check if it exists in the date range
      const targetInDate = dateFilteredTrades.find((t) => t.id === selectedTradeId);
      if (!targetInDate && journalTrades.some((t) => t.id === selectedTradeId)) {
        setJournalRange("all");
      }
      if (journalFilter !== "ALL") setJournalFilter("ALL");
      if (searchQuery) setSearchQuery("");
      if (selectedStrategyFilter) clearSelectedStrategyFilter();
    }

    // Auto-expand the target card
    setExpandedTradeIds((prev) => {
      const next = new Set(prev);
      next.add(selectedTradeId);
      return next;
    });

    // Expand visible window if selected trade is beyond current batch
    const tradeIndex = filteredTrades.findIndex((t) => t.id === selectedTradeId);
    if (tradeIndex >= visibleCount) {
      setVisibleCount(tradeIndex + 10);
    }

    // Smooth scroll into view after DOM paint
    const timer = setTimeout(() => {
      const el = document.getElementById(`trade-story-card-${selectedTradeId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [selectedTradeId, dateFilteredTrades.length, filteredTrades.length]);

  // Reset pagination window when filters change
  useEffect(() => {
    setVisibleCount(25);
  }, [journalFilter, searchQuery, selectedStrategyFilter, journalRange]);

  const loadMore = () => setVisibleCount((prev) => prev + 25);
  const hasMore = filteredTrades.length > visibleCount;
  const displayTrades = filteredTrades.slice(0, visibleCount);

  const inspectInEquityCurve = (tradeId) => {
    soundEngine?.playTick?.();
    setSelectedTradeId(tradeId);
    const equityDeck = document.getElementById("equity-curve-deck") || document.querySelector("[data-deck='equity-curve']");
    if (equityDeck) {
      equityDeck.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const toggleExpand = (id) => {
    setExpandedTradeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleExpandAll = (allIds) => {
    if (expandedTradeIds.size === allIds.length) {
      setExpandedTradeIds(new Set());
    } else {
      setExpandedTradeIds(new Set(allIds));
    }
  };

  const copyTradeMarkdown = (trade) => {
    const isWin = (trade.netPnl ?? 0) >= 0;
    const strat = Array.isArray(trade.strategyTags) 
      ? (trade.strategyTags.join(", ") || trade.strategyTag || "Delta Momentum") 
      : (trade.strategyTags || trade.strategyTag || "Delta Momentum");
    const text = `📊 **TRADE AUTOPSY: ${trade.symbol}** (${trade.direction || "LONG"})\n` +
      `• **Outcome**: ${isWin ? "🟢 TARGET HIT" : "🛑 STOP LOSS"} (Net: ${trade.netPnl >= 0 ? "+" : ""}₹${trade.netPnl?.toFixed(2)})\n` +
      `• **Entry / Exit**: ₹${trade.entryPrice} → ₹${trade.exitPrice} (Target: ₹${trade.targetPrice} | SL: ₹${trade.stopLoss})\n` +
      `• **Strategy**: ${strat}\n` +
      `• **Catalyst**: ${trade.catalyst || "Technical VWAP structure breakout"}\n` +
      `• **Execution**: ${trade.executionDetails || "Market fill at planned entry"}\n` +
      `• **Mindset**: ${trade.mindsetEmotion || "Calm & Disciplined"}\n` +
      `• **Lesson**: ${trade.lessonsLearned || "Flawless risk execution"}\n` +
      `— *Logged with PortfolioX Quant Terminal*`;

    navigator.clipboard?.writeText(text).then(() => {
      soundEngine.playSuccessTone();
      setCopiedTradeId(trade.id);
      setTimeout(() => setCopiedTradeId(null), 2500);
    });
  };

  const handleDeleteWithUndo = (trade) => {
    soundEngine.playDeleteTone();
    deleteJournalTradeWithUndo(trade);
  };

  const rangeLabel = getRangeLabel(journalRange, journalCustomStart, journalCustomEnd);
  const totalNet = dateFilteredTrades.reduce((acc, t) => acc + (t.netPnl || 0), 0);
  const winCount = dateFilteredTrades.filter((t) => (t.netPnl || 0) > 0).length;
  const lossCount = dateFilteredTrades.filter((t) => (t.netPnl || 0) <= 0).length;

  return {
    journalTrades, journalRange, setJournalRange,
    journalCustomStart, journalCustomEnd, setJournalCustomRange,
    journalFilter, setJournalFilter,
    selectedStrategyFilter, clearSelectedStrategyFilter,
    expandedTradeIds, searchQuery, setSearchQuery,
    calendarOpen, setCalendarOpen, copiedTradeId,
    toggleExpand, toggleExpandAll, copyTradeMarkdown,
    handleDeleteWithUndo, exportTaxCsv: () => exportTaxCsv(filteredTrades, journalRange),
    dateFilteredTrades, filteredTrades, displayTrades,
    loadMore, hasMore, rangeLabel,
    totalNet, winCount, lossCount,
    selectedTradeId, setSelectedTradeId, inspectInEquityCurve
  };
}
