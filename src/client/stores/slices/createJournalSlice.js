import { MASTER_INITIAL_TRADES } from "./initialData";
import { persistTradeToBackend, persistTradesBatchToBackend, broadcastTradeAction } from "./tradePersistence";

export const createJournalSlice = (set, get) => ({
  isTimeframeLocked: true,
  toggleTimeframeLock: () => set((state) => ({ isTimeframeLocked: !state.isTimeframeLocked })),
  setTimeframeLock: (val) => set({ isTimeframeLocked: Boolean(val) }),
  paperPnlRange: "all",
  journalRange: "all",
  journalCustomStart: new Date().toISOString().split("T")[0],
  journalCustomEnd: new Date().toISOString().split("T")[0],
  setPaperPnlRange: (range) => set((state) => {
    if (state.isTimeframeLocked) return { paperPnlRange: range, journalRange: range };
    return { paperPnlRange: range };
  }),
  setJournalRange: (range) => set((state) => {
    if (state.isTimeframeLocked) return { paperPnlRange: range, journalRange: range };
    return { journalRange: range };
  }),
  setJournalCustomRange: (start, end) => set((state) => {
    const payload = { journalCustomStart: start, journalCustomEnd: end, journalRange: "custom" };
    if (state.isTimeframeLocked) payload.paperPnlRange = "custom";
    return payload;
  }),
  journalFilter: "ALL",
  setJournalFilter: (filter) => set({ journalFilter: filter }),
  paperLedgerFilter: "all",
  setPaperLedgerFilter: (filter) => set({ paperLedgerFilter: filter }),
  selectedStrategyFilter: null,
  setSelectedStrategyFilter: (name) => set((state) => ({ 
    selectedStrategyFilter: state.selectedStrategyFilter === name ? null : name 
  })),
  clearSelectedStrategyFilter: () => set({ selectedStrategyFilter: null }),
  selectedTradeId: null,
  setSelectedTradeId: (id) => set((state) => ({
    selectedTradeId: state.selectedTradeId === id ? null : id
  })),

  updateTradeDetails: (tradeId, updates) => {
    const list = get().masterTrades || [];
    const next = list.map((t) => (t.id === tradeId ? { ...t, ...updates } : t));
    set({ masterTrades: next, closedAlerts: next, journalTrades: next });
    try {
      localStorage.setItem("portfolio-master-trades", JSON.stringify(next));
      localStorage.setItem("portfolio-journal-trades", JSON.stringify(next));
    } catch {}
  },

  logJournalTrade: (trade) => {
    const newEntry = {
      id: Date.now(),
      symbol: trade.symbol,
      optionType: trade.optionType || (trade.symbol?.includes("PE") ? "PUT" : "CALL"),
      direction: trade.direction || "LONG",
      tradeType: trade.tradeType || "INTRADAY",
      entryDatetime: trade.entryDatetime || new Date().toISOString(),
      exitDatetime: trade.exitDatetime || new Date().toISOString(),
      duration: trade.duration || "15 mins",
      entryPrice: Number(trade.entryPrice || 0),
      exitPrice: Number(trade.exitPrice || 0),
      targetPrice: Number(trade.targetPrice || (Number(trade.entryPrice || 0) + (250 / Math.max(1, Number(trade.quantity || 1) * Number(trade.lotSize || 65))) * 2.0)),
      stopLoss: Number(trade.stopLoss || Math.max(0.1, Number(trade.entryPrice || 0) - (250 / Math.max(1, Number(trade.quantity || 1) * Number(trade.lotSize || 65))))),
      quantity: Number(trade.quantity || 1),
      lotSize: Number(trade.lotSize || 65),
      grossPnl: Number(trade.grossPnl || trade.netPnl || 0),
      taxesAndCharges: Number(trade.taxesAndCharges || 55.20),
      netPnl: Number(trade.netPnl || 0),
      closeReason: trade.closeReason || (trade.netPnl >= 0 ? "TARGET_HIT" : "STOP_LOSS_HIT"),
      strategyTag: trade.strategyTags || trade.strategyTag || "Manual Journal Scalp",
      strategyTags: trade.strategyTags || trade.strategyTag || "Manual Journal Scalp",
      mistakeTags: trade.mistakeTags || "None",
      confidenceScore: Number(trade.confidenceScore || 8),
      followedPlan: trade.followedPlan ?? true,
      catalyst: trade.catalyst || "Technical chart breakout pattern with volume confirmation.",
      executionDetails: trade.executionDetails || "Executed trade as per predefined trade plan.",
      mindsetEmotion: trade.mindsetEmotion || "Disciplined & Patient",
      lessonsLearned: trade.lessonsLearned || "Followed execution rules with zero hesitation."
    };
    const next = [newEntry, ...get().masterTrades];
    set({ masterTrades: next, closedAlerts: next, journalTrades: next });
    try {
      localStorage.setItem("portfolio-master-trades", JSON.stringify(next));
      localStorage.setItem("portfolio-journal-trades", JSON.stringify(next));
    } catch {}
    // Background SQLite Persistence Guard
    persistTradeToBackend(newEntry);
    broadcastTradeAction("JOURNAL_TRADE_LOGGED", { trade: newEntry });
  },

  bulkAddJournalTrades: (trades) => {
    const enriched = trades.map((t, idx) => ({
      id: t.id || Date.now() + idx,
      symbol: t.symbol || "NIFTY 24300 CE",
      optionType: t.optionType || (t.symbol?.includes("PE") ? "PUT" : "CALL"),
      direction: t.direction || "LONG",
      tradeType: t.tradeType || "INTRADAY",
      entryDatetime: t.entryDatetime || new Date().toISOString(),
      exitDatetime: t.exitDatetime || new Date().toISOString(),
      duration: t.duration || "15 mins",
      entryPrice: Number(t.entryPrice || 100),
      exitPrice: Number(t.exitPrice || 110),
      targetPrice: Number(t.targetPrice || 110),
      stopLoss: Number(t.stopLoss || 90),
      quantity: Number(t.quantity || 1),
      lotSize: Number(t.lotSize || 65),
      grossPnl: Number(t.grossPnl || t.netPnl || 0),
      taxesAndCharges: Number(t.taxesAndCharges || 56.0),
      netPnl: Number(t.netPnl || 0),
      closeReason: t.closeReason || (t.netPnl >= 0 ? "TARGET_HIT" : "STOP_LOSS_HIT"),
      strategyTag: t.strategyTags || t.strategyTag || "Imported Trade",
      strategyTags: t.strategyTags || t.strategyTag || "Imported Trade",
      mistakeTags: t.mistakeTags || "None",
      confidenceScore: Number(t.confidenceScore || 8),
      followedPlan: t.followedPlan ?? true,
      catalyst: t.catalyst || "Imported setup catalyst.",
      executionDetails: t.executionDetails || "Imported execution log.",
      mindsetEmotion: t.mindsetEmotion || "Neutral",
      lessonsLearned: t.lessonsLearned || "Imported historical log."
    }));
    const next = [...enriched, ...get().masterTrades];
    set({ masterTrades: next, closedAlerts: next, journalTrades: next });
    try {
      localStorage.setItem("portfolio-master-trades", JSON.stringify(next));
      localStorage.setItem("portfolio-journal-trades", JSON.stringify(next));
    } catch {}
    // Background SQLite Persistence Guard
    persistTradesBatchToBackend(enriched);
    broadcastTradeAction("JOURNAL_TRADES_BATCH_LOGGED", { count: enriched.length });
  },

  resetJournalTrades: () => {
    set({ masterTrades: MASTER_INITIAL_TRADES, closedAlerts: MASTER_INITIAL_TRADES, journalTrades: MASTER_INITIAL_TRADES });
    try {
      localStorage.setItem("portfolio-master-trades", JSON.stringify(MASTER_INITIAL_TRADES));
      localStorage.setItem("portfolio-journal-trades", JSON.stringify(MASTER_INITIAL_TRADES));
    } catch {}
  },

  restoreTradingBrain: (trades) => {
    if (!Array.isArray(trades) || trades.length === 0) return false;
    set({ masterTrades: trades, closedAlerts: trades, journalTrades: trades });
    try {
      localStorage.setItem("portfolio-master-trades", JSON.stringify(trades));
      localStorage.setItem("portfolio-journal-trades", JSON.stringify(trades));
    } catch {}
    return true;
  },
});
