import { useState } from "react";
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
    clearSelectedStrategyFilter 
  } = useTradingStore();

  const [expandedTradeIds, setExpandedTradeIds] = useState(new Set([101]));
  const [searchQuery, setSearchQuery] = useState("");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [copiedTradeId, setCopiedTradeId] = useState(null);

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
    dateFilteredTrades, filteredTrades, rangeLabel,
    totalNet, winCount, lossCount
  };
}
