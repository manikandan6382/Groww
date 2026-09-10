import React, { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useTradingStore, resolveIndexLotSize } from "../../stores/useTradingStore";
import { useLivePriceStore } from "../../stores/useLivePriceStore";
import { soundEngine } from "../../utils/soundEngine";
import { LuxuryDateRangePicker } from "../common/LuxuryDateRangePicker";
import { 
  formatLocalDateTime, 
  getLocalDateKey, 
  calculateTradeDuration, 
  formatLocalTime12h 
} from "../../utils/dateUtils";
import { 
  Download, 
  Upload, 
  FileJson, 
  CheckCircle2, 
  ShieldAlert, 
  Calendar as CalendarIcon, 
  Filter, 
  ShieldCheck, 
  Clock, 
  BookOpen, 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  Zap, 
  TrendingUp, 
  Layers, 
  Activity, 
  RotateCcw,
  Lock,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Trash2,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import { getTradeOutcome, normalizeTrade, formatTimeShort } from "../../utils/tradeNormalizer";
import { calculateHeldToExpiryMetrics, parseOptionContract } from "../../utils/expiryUtils";
import { TradeMarketJourneyTimeline } from "./TradeMarketJourneyTimeline";

// TDZ Prevention & Top-Level Variable Hoisting: Helper to resolve underlying asset
function resolveUnderlying(trade) {
  const sym = String(trade.underlyingSymbol || trade.symbol || "").toUpperCase();
  if (sym.includes("BANK")) return "BANKNIFTY";
  if (sym.includes("SENSEX")) return "SENSEX";
  if (sym.includes("NIFTY")) return "NIFTY";
  return "OTHER";
}

// TDZ Prevention & Top-Level Variable Hoisting: Helpers to resolve live LTP and MTM metrics for open trades
function getLiveLtp(trade, ticks) {
  const sym = trade.symbol;
  const tick = (trade.serverId && ticks?.[trade.serverId]) ||
    ticks?.[trade.id] ||
    ticks?.[sym] ||
    (trade.tokenKey && ticks?.[trade.tokenKey]);
  return Number(tick?.ltp || trade.lastMarkPrice || trade.entryPrice || 0);
}

function calculateLiveMetrics(trade, currentLtp) {
  const lotSize = Number(trade.lotSize || resolveIndexLotSize(trade.symbol) || 65);
  const qty = Number(trade.quantity || 1) * lotSize;
  const isShort = trade.direction === "SHORT";
  const grossPnl = (currentLtp - Number(trade.entryPrice || 0)) * (isShort ? -1 : 1) * qty;
  const grossPts = (currentLtp - Number(trade.entryPrice || 0)) * (isShort ? -1 : 1);
  const friction = 55.20;
  const netPnl = grossPnl - friction;
  const capital = Number(trade.entryPrice || 0) * qty;
  const returnPct = capital > 0 ? (netPnl / capital) * 100 : 0;
  return { grossPnl, grossPts, friction, netPnl, returnPct };
}

export const TriggeredHistorySection = React.memo(function TriggeredHistorySection() {
  const closedAlerts = useTradingStore((s) => s.closedAlerts);
  const openAlerts = useTradingStore((s) => s.openAlerts);
  const squareOffTrade = useTradingStore((s) => s.squareOffTrade);
  const ticks = useLivePriceStore((s) => s.ticks);
  const paperLedgerFilter = useTradingStore((s) => s.paperLedgerFilter);
  const setPaperLedgerFilter = useTradingStore((s) => s.setPaperLedgerFilter);
  const bulkAddJournalTrades = useTradingStore((s) => s.bulkAddJournalTrades);
  const deleteJournalTradesWithUndo = useTradingStore((s) => s.deleteJournalTradesWithUndo || s.deleteJournalTradeWithUndo);
  const purgeStaleMockTrades = useTradingStore((s) => s.purgeStaleMockTrades);
  const undoTradeBackup = useTradingStore((s) => s.undoTradeBackup);
  const undoCountdown = useTradingStore((s) => s.undoCountdown);
  const executeUndoTrade = useTradingStore((s) => s.executeUndoTrade);
  const dismissUndoTrade = useTradingStore((s) => s.dismissUndoTrade);

  // Selection state for multi-trade delete operations
  const [selectedTradeIds, setSelectedTradeIds] = useState(new Set());

  // Primary Navigation & Filtering State — Default to ALL (Displays all today trades across NIFTY, BANKNIFTY, SENSEX)
  const [assetFilter, setAssetFilter] = useState("ALL"); // "ALL" | "NIFTY" | "BANKNIFTY" | "SENSEX"
  const [dateRangeFilter, setDateRangeFilter] = useState("all"); // "all" | "today" | "week" | "month" | "custom"
  const [orderStatusFilter, setOrderStatusFilter] = useState("all"); // "all" | "active" | "settled"
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [isCalendarOpen, setCalendarOpen] = useState(false);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [selectedBatchNum, setSelectedBatchNum] = useState("all"); // "all" = show all trades without batch constraint, number = specific batch
  const [showPrinciplesDrawer, setShowPrinciplesDrawer] = useState(false);
  const [highlightedTradeId, setHighlightedTradeId] = useState(null);
  const [activeTimelineTrade, setActiveTimelineTrade] = useState(null);
  const [timelineFlightScope, setTimelineFlightScope] = useState("scalp"); // "scalp" | "expiry"

  // Direct SQLite database hydration on mount to ensure today's trades are instantly loaded
  useEffect(() => {
    let isMounted = true;
    fetch("/api/paper-lab")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!isMounted || !data) return;
        if (Array.isArray(data.closedTrades) && data.closedTrades.length > 0) {
          useTradingStore.getState().syncBackendTrades(data.closedTrades);
        }
        if (Array.isArray(data.openTrades)) {
          useTradingStore.getState().syncBackendOpenTrades(data.openTrades);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  const [showAllRows, setShowAllRows] = useState(false);
  const [matrixLayout, setMatrixLayout] = useState(() => {
    try {
      return localStorage.getItem("portfoliox_matrix_layout") || "10";
    } catch {
      return "10";
    }
  });

  const handleSetMatrixLayout = (layout) => {
    soundEngine.playTabSwitchTone();
    setMatrixLayout(layout);
    try {
      localStorage.setItem("portfoliox_matrix_layout", layout);
    } catch {}
  };
  const fileInputRef = useRef(null);

  // Asset-level count metrics (Memoized)
  


  const { allCount, niftyCount, bankCount, sensexCount } = useMemo(() => {
    let nifty = 0;
    let bank = 0;
    let sensex = 0;
    for (const t of closedAlerts) {
      const u = resolveUnderlying(t);
      if (u === "NIFTY") nifty++;
      else if (u === "BANKNIFTY") bank++;
      else if (u === "SENSEX") sensex++;
    }
    return {
      allCount: closedAlerts.length,
      niftyCount: nifty,
      bankCount: bank,
      sensexCount: sensex,
    };
  }, [closedAlerts]);

  // 1. Primary Asset Filtering (Memoized)
  const assetFilteredAlerts = useMemo(() => {
    return closedAlerts.filter((trade) => {
      if (assetFilter === "ALL") return true;
      const u = resolveUnderlying(trade);
      if (assetFilter === "NIFTY") return u === "NIFTY";
      if (assetFilter === "BANKNIFTY") return u === "BANKNIFTY";
      if (assetFilter === "SENSEX") return u === "SENSEX";
      return true;
    });
  }, [closedAlerts, assetFilter]);

  // 2. Mark Douglas Chapter 11: Multi-Batch 20-Trade Matrix Engine (Memoized)
  const totalSettledCount = assetFilteredAlerts.length;
  const totalBatches = Math.max(1, Math.ceil(totalSettledCount / 20));
  const latestBatchNum = totalBatches;
  const activeBatchNum = selectedBatchNum === "all" 
    ? latestBatchNum 
    : (typeof selectedBatchNum === "number" && selectedBatchNum >= 1 && selectedBatchNum <= totalBatches ? selectedBatchNum : latestBatchNum);

  const batchList = useMemo(() => {
    const getBatchSlice = (N, k, totalB) => {
      if (N === 0) return { start: 0, end: 0, count: 0 };
      let startIndex, endIndex;
      if (k === totalB) {
        startIndex = 0;
        const rem = N % 20;
        endIndex = rem === 0 && N > 0 ? 20 : rem;
      } else {
        endIndex = N - ((k - 1) * 20);
        startIndex = Math.max(0, endIndex - 20);
      }
      return { start: startIndex, end: endIndex, count: Math.max(0, endIndex - startIndex) };
    };

    return Array.from({ length: totalBatches }, (_, i) => {
      const num = i + 1;
      const slice = getBatchSlice(totalSettledCount, num, totalBatches);
      const trades = assetFilteredAlerts.slice(slice.start, slice.end);
      const wins = trades.filter((t) => getTradeOutcome(t).isNetGain).length;
      const losses = trades.length - wins;
      const winRate = trades.length > 0 ? ((wins / trades.length) * 100).toFixed(0) : "0";
      const netPnl = trades.reduce((acc, t) => acc + (t.netPnl || 0), 0);
      return {
        num,
        currentBatchNum: num,
        isLatest: num === totalBatches,
        isComplete: slice.count === 20,
        count: slice.count,
        effectiveBatchCount: slice.count,
        trades,
        wins,
        losses,
        batchWins: wins,
        batchLosses: losses,
        winRate,
        batchWinRate: winRate,
        netPnl,
        batchNetPnl: netPnl,
      };
    });
  }, [totalSettledCount, totalBatches, assetFilteredAlerts]);

  // Level 3 Elite: Auto-sanitize selectedBatchNum on asset tab change (prevents orphaned state)
  useEffect(() => {
    if (typeof selectedBatchNum === "number" && selectedBatchNum > totalBatches) {
      setSelectedBatchNum("all");
    }
  }, [totalBatches, selectedBatchNum]);

  const activeBatchData = useMemo(() => {
    return batchList.find((b) => b.num === activeBatchNum) || batchList[batchList.length - 1];
  }, [batchList, activeBatchNum]);

  // Level 3 Elite: Macro Cumulative Edge telemetry & 100-Trade Statistical Significance Gate
  const macroStats = useMemo(() => {
    const totalTrades = assetFilteredAlerts.length;
    const wins = assetFilteredAlerts.filter((t) => getTradeOutcome(t).isNetGain).length;
    const losses = totalTrades - wins;
    const winRateNum = totalTrades > 0 ? (wins / totalTrades) : 0;
    const winRate = (winRateNum * 100).toFixed(0);
    const netPnl = assetFilteredAlerts.reduce((acc, t) => acc + (t.netPnl || 0), 0);
    const totalFriction = assetFilteredAlerts.reduce((acc, t) => acc + (getTradeOutcome(t).charges || 0), 0);
    const completedBatches = batchList.filter((b) => b.isComplete).length;

    // Central Limit Theorem: Standard Error of Proportion SE = sqrt(p*(1-p)/N)
    const se = totalTrades > 0 ? Math.sqrt((winRateNum * (1 - winRateNum)) / totalTrades) : 0;
    const sePercent = (se * 100).toFixed(1);

    // 100-Trade Quantitative Gate: N >= 100 proves statistical significance over pure variance
    const isStatisticallySignificant = totalTrades >= 100;
    const progressTo100 = Math.min(100, Math.round((totalTrades / 100) * 100));

    return { 
      totalTrades, 
      wins, 
      losses, 
      winRate, 
      netPnl, 
      totalFriction,
      avgFrictionPerTrade: totalTrades > 0 ? (totalFriction / totalTrades).toFixed(1) : "87.5",
      completedBatches, 
      sePercent, 
      isStatisticallySignificant, 
      progressTo100 
    };
  }, [assetFilteredAlerts, batchList]);

  // Level 3 Elite: Dedicated batch selector that clears colliding date filters on past batches
  const handleSelectBatch = (numOrAll) => {
    soundEngine.playTabSwitchTone();
    setSelectedBatchNum(numOrAll);
    if (numOrAll !== "all" && dateRangeFilter !== "all") {
      setDateRangeFilter("all");
      setCustomStart("");
      setCustomEnd("");
    }
  };

  // Backward compatibility alias for milestone check
  const batchData = activeBatchData;

  // 3. Multi-Pass Filter Pipeline: Batch-Scoped + Date + Outcome (Memoized to kill frame drops)
  const filteredAlerts = useMemo(() => {
    const batchScoped = selectedBatchNum === "all"
      ? assetFilteredAlerts
      : (activeBatchData?.trades || assetFilteredAlerts);

    const dateFiltered = batchScoped.filter((trade) => {
      const todayKey = getLocalDateKey();
      const tradeDate = getLocalDateKey(trade.exitDatetime || trade.entryDatetime);

      if (dateRangeFilter === "today") {
        return tradeDate === todayKey;
      }
      if (dateRangeFilter === "yesterday") {
        const yDate = new Date();
        yDate.setDate(yDate.getDate() - 1);
        const yesterdayKey = getLocalDateKey(yDate);
        return tradeDate === yesterdayKey;
      }
      if (dateRangeFilter === "week") {
        const d = new Date();
        const day = d.getDay();
        const monday = new Date(d);
        monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
        monday.setHours(0, 0, 0, 0);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);
        const startKey = getLocalDateKey(monday);
        const endKey = getLocalDateKey(sunday);
        return tradeDate >= startKey && tradeDate <= endKey;
      }
      if (dateRangeFilter === "month") {
        const d = new Date();
        const currentMonthPrefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        return tradeDate.startsWith(currentMonthPrefix);
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

  // Telemetry Aggregates (Memoized)
  const { totalRealizedPnl, totalGrossPnl, totalCharges, winCount, lossCount } = useMemo(() => {
    let pnl = 0;
    let gross = 0;
    let charges = 0;
    let wins = 0;
    let losses = 0;
    for (const t of filteredAlerts) {
      pnl += (t.netPnl || 0);
      const oc = getTradeOutcome(t);
      gross += (oc.grossPnl ?? (t.grossPnl || t.netPnl || 0));
      charges += Number(t.charges ?? oc.charges ?? 55.20);
      if (oc.isNetGain) wins++;
      else losses++;
    }
    return { totalRealizedPnl: pnl, totalGrossPnl: gross, totalCharges: charges, winCount: wins, lossCount: losses };
  }, [filteredAlerts]);

  // Paginated Viewport
  const visibleAlerts = showAllRows ? filteredAlerts : filteredAlerts.slice(0, 20);

  // Active in-flight orders matching the current asset and date filters
  const activeAlertsMatchingFilters = useMemo(() => {
    return openAlerts.filter((trade) => {
      if (assetFilter !== "ALL") {
        const u = resolveUnderlying(trade);
        if (assetFilter === "NIFTY" && u !== "NIFTY") return false;
        if (assetFilter === "BANKNIFTY" && u !== "BANKNIFTY") return false;
        if (assetFilter === "SENSEX" && u !== "SENSEX") return false;
      }
      if (dateRangeFilter === "yesterday") return false;
      return true;
    });
  }, [openAlerts, assetFilter, dateRangeFilter]);

  // Unified viewport alerts: conditionally include active orders based on orderStatusFilter
  const displayAlerts = useMemo(() => {
    if (orderStatusFilter === "active") {
      return activeAlertsMatchingFilters;
    }
    if (orderStatusFilter === "settled") {
      return visibleAlerts;
    }
    // "all": active in-flight trades at the very top, followed by settled trades
    return [...activeAlertsMatchingFilters, ...visibleAlerts];
  }, [orderStatusFilter, activeAlertsMatchingFilters, visibleAlerts]);

  // Active trade index within the current table view (displayAlerts) - declared after displayAlerts (Zero TDZ)
  const activeTradeList = displayAlerts;

  // Multi-Trade Selection & Batch Deletion Handlers
  const handleToggleSelectTrade = useCallback((tradeId) => {
    setSelectedTradeIds((prev) => {
      const next = new Set(prev);
      if (next.has(tradeId)) next.delete(tradeId);
      else next.add(tradeId);
      return next;
    });
  }, []);

  const handleSelectAllVisible = useCallback(() => {
    const selectable = displayAlerts.filter((t) => t.status !== "OPEN" && !openAlerts.some((o) => o.id === t.id));
    if (selectedTradeIds.size === selectable.length && selectable.length > 0) {
      setSelectedTradeIds(new Set());
    } else {
      setSelectedTradeIds(new Set(selectable.map((t) => t.id)));
    }
  }, [selectedTradeIds.size, displayAlerts, openAlerts]);

  const handleClearSelection = useCallback(() => {
    setSelectedTradeIds(new Set());
  }, []);

  const handleDeleteSelected = useCallback(() => {
    const toDelete = visibleAlerts.filter((t) => selectedTradeIds.has(t.id));
    if (toDelete.length === 0) return;
    soundEngine.playDeleteTone();
    deleteJournalTradesWithUndo(toDelete);
    setSelectedTradeIds(new Set());
  }, [deleteJournalTradesWithUndo, selectedTradeIds, visibleAlerts]);

  const activeTradeIndex = useMemo(() => {
    if (!activeTimelineTrade) return -1;
    return activeTradeList.findIndex((t) => t.id === activeTimelineTrade.id);
  }, [activeTradeList, activeTimelineTrade]);

  const lastNavTimeRef = useRef(0);

  const handlePrevTimelineTrade = useCallback(() => {
    const now = Date.now();
    if (now - lastNavTimeRef.current < 90) return;
    lastNavTimeRef.current = now;

    if (activeTradeIndex > 0) {
      soundEngine.playTabSwitchTone();
      const prevTrade = activeTradeList[activeTradeIndex - 1];
      setActiveTimelineTrade(prevTrade);
      setHighlightedTradeId(prevTrade.id);
      const rowElem = document.getElementById(`trade-row-${prevTrade.id}`);
      rowElem?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      if (typeof soundEngine.playErrorTone === 'function') {
        soundEngine.playErrorTone();
      }
    }
  }, [activeTradeIndex, activeTradeList]);

  const handleNextTimelineTrade = useCallback(() => {
    const now = Date.now();
    if (now - lastNavTimeRef.current < 90) return;
    lastNavTimeRef.current = now;

    if (activeTradeIndex >= 0 && activeTradeIndex < activeTradeList.length - 1) {
      soundEngine.playTabSwitchTone();
      const nextTrade = activeTradeList[activeTradeIndex + 1];
      setActiveTimelineTrade(nextTrade);
      setHighlightedTradeId(nextTrade.id);
      const rowElem = document.getElementById(`trade-row-${nextTrade.id}`);
      rowElem?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      if (typeof soundEngine.playErrorTone === 'function') {
        soundEngine.playErrorTone();
      }
    }
  }, [activeTradeIndex, activeTradeList]);

  // Keyboard & Body Scroll Management for Timeline Modal + Hotkey Batch Carousel (← / →) with CLS Compensation & Input Guard
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!activeTimelineTrade) return;
      // Focus guard: ignore hotkeys if user is editing form inputs/textareas
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) || e.target.isContentEditable) return;

      if (e.key === "Escape") {
        setActiveTimelineTrade(null);
      } else if (e.key === "ArrowLeft" || e.key === "[") {
        e.preventDefault();
        handlePrevTimelineTrade();
      } else if (e.key === "ArrowRight" || e.key === "]") {
        e.preventDefault();
        handleNextTimelineTrade();
      }
    };
    if (activeTimelineTrade) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = "hidden";
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeTimelineTrade, handlePrevTimelineTrade, handleNextTimelineTrade]);

  const hasActiveFilters = dateRangeFilter !== "all" || paperLedgerFilter !== "all" || (selectedBatchNum !== "all" && selectedBatchNum !== null) || assetFilter !== "ALL" || orderStatusFilter !== "all";

  const recentHiddenCount = useMemo(() => {
    if (!hasActiveFilters) return 0;
    const now = Date.now();
    const displayIds = new Set((displayAlerts || []).map((t) => String(t.id)));
    const allRecent = [...(openAlerts || []), ...(closedAlerts || [])].filter((t) => {
      const entryTime = new Date(t.entryDatetime || t.createdAt || 0).getTime();
      const exitTime = new Date(t.exitDatetime || t.updatedAt || 0).getTime();
      return (now - entryTime < 20 * 60 * 1000) || (now - exitTime < 20 * 60 * 1000);
    });
    return allRecent.filter((t) => !displayIds.has(String(t.id))).length;
  }, [hasActiveFilters, displayAlerts, openAlerts, closedAlerts]);

  const handleApplyCustomRange = (start, end) => {
    setCustomStart(start);
    setCustomEnd(end);
    setDateRangeFilter("custom");
  };

  const handleResetFilters = () => {
    soundEngine.playTabSwitchTone();
    setDateRangeFilter("all");
    setCustomStart("");
    setCustomEnd("");
    setPaperLedgerFilter("all");
    setSelectedBatchNum("all");
    setAssetFilter("ALL");
    setOrderStatusFilter("all");
  };

  // Interactive 20-Slot Matrix Jump: Click slot to navigate & glow corresponding row
  const handleSlotClick = (trade) => {
    if (!trade?.id) return;
    soundEngine.playTabSwitchTone();
    setHighlightedTradeId(trade.id);
    const rowElem = document.getElementById(`trade-row-${trade.id}`);
    if (rowElem) {
      rowElem.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    setTimeout(() => {
      setHighlightedTradeId(null);
    }, 2500);
  };

  // Safe Blob-based CSV Export (Zero memory leak & no 2MB URL limit)
  const exportCsv = () => {
    const headers = [
      "Symbol", "OptionType", "EntryTime", "ExitTime", "EntryPrice", 
      "ExitPrice", "StopLoss", "TargetPrice", "NetPnl", "CloseReason", 
      "OutcomeType", "Strategy"
    ];
    const rows = filteredAlerts.map((t) => {
      const outcome = getTradeOutcome(t);
      return [
        t.symbol,
        t.optionType,
        t.entryDatetime,
        t.exitDatetime,
        t.entryPrice,
        t.exitPrice,
        t.stopLoss,
        t.targetPrice,
        t.netPnl,
        t.closeReason,
        outcome.label,
        t.strategyTag || "Practice Scalp"
      ];
    });

    const escapeCell = (val) => `"${String(val ?? "").replace(/"/g, '""')}"`;
    const csvContent = [
      headers.map(escapeCell).join(","), 
      ...rows.map((r) => r.map(escapeCell).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `portfoliox_ledger_${assetFilter}_${dateRangeFilter}_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportJsonBackup = () => {
    const jsonStr = JSON.stringify(closedAlerts, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `portfoliox_ledger_backup_${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportJson = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result);
        if (Array.isArray(parsed) && parsed.length > 0) {
          bulkAddJournalTrades(parsed);
          alert(`Successfully imported ${parsed.length} trades into your ledger!`);
        } else {
          alert("Invalid backup file: expected an array of trade records.");
        }
      } catch (err) {
        alert("Error parsing JSON backup file.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const rangeLabel = dateRangeFilter === "today" 
    ? "Today" 
    : dateRangeFilter === "yesterday"
    ? "Yesterday"
    : dateRangeFilter === "week" 
    ? "This Week" 
    : dateRangeFilter === "month" 
    ? "This Month" 
    : dateRangeFilter === "custom" 
    ? `${customStart} to ${customEnd}` 
    : "All Time";

  const assetLabel = assetFilter === "NIFTY" 
    ? "NIFTY 20" 
    : assetFilter === "BANKNIFTY" 
    ? "Bank" 
    : assetFilter === "SENSEX" 
    ? "Sensex" 
    : "All Assets";

  return (
    <div id="trade-history-ledger" className="p-5 sm:p-7 rounded-3xl bg-app-card/85 backdrop-blur-2xl border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.5)] space-y-5 relative overflow-hidden min-h-[420px]">
      {/* Soft Ambient Radial Lighting Accent */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/[0.04] rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/[0.03] rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

      {/* Master Header */}
      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/25 whitespace-nowrap shadow-sm">
              AUDIT TRAIL &amp; ORDER HISTORY
            </span>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/25 whitespace-nowrap shadow-sm">
              {displayAlerts.length} Orders ({activeAlertsMatchingFilters.length} Active · {filteredAlerts.length} Settled)
            </span>
            <span className="text-[10px] font-bold text-cyan-300 bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/25 whitespace-nowrap shadow-sm flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-cyan-400" />
              <span>Real Statutory Friction (STT+GST) Active</span>
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
            Triggered Trade History
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
            Resolved practice executions, verified execution timestamps, and net realized P&amp;L after turnover-proportional friction.
          </p>
        </div>

        {/* Realized Stats Cards */}
        <div className="flex items-center gap-3 text-xs flex-wrap sm:flex-nowrap flex-shrink-0">
          <div className="p-3 px-4 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl text-right shadow-sm min-w-[170px]">
            <span className="text-[10px] text-slate-400 font-semibold block mb-0.5">Realized Net ({rangeLabel})</span>
            <strong className={clsx("font-mono text-sm sm:text-base font-black block", totalRealizedPnl >= 0 ? "text-emerald-400" : "text-rose-400")}>
              {totalRealizedPnl >= 0 ? "+" : ""}₹{totalRealizedPnl.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </strong>
            <div className="text-[10px] font-mono text-slate-400 flex items-center justify-end gap-1.5 mt-0.5" title="Gross Real Profit vs Upstox Statutory Charges & Brokerage">
              <span>Real: <strong className={clsx(totalGrossPnl >= 0 ? "text-emerald-300" : "text-rose-300")}>{totalGrossPnl >= 0 ? "+" : ""}₹{totalGrossPnl.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong></span>
              <span className="text-slate-600">·</span>
              <span title="Flat ₹40 Upstox Brokerage + STT + GST & Regulatory Fees">Charges: <strong className="text-cyan-300/90 font-medium">₹{totalCharges.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong></span>
            </div>
          </div>

          <div className="p-3 px-4 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl text-right shadow-sm min-w-[120px]">
            <span className="text-[10px] text-slate-400 font-semibold block mb-0.5">Win / Stop Ratio</span>
            <strong className="font-mono text-sm sm:text-base font-black text-cyan-300">{winCount}W · {lossCount}L</strong>
          </div>
        </div>
      </div>
      {/* Mark Douglas Chapter 11: 20-Trade Casino Batch Cockpit Card */}
      <div className="p-5 sm:p-6 rounded-3xl bg-app-card/85 backdrop-blur-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] space-y-5 relative overflow-hidden">
        {/* Soft Ambient Radial Accents */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-cyan-500/[0.04] rounded-full blur-3xl pointer-events-none" />
        <div className={clsx(
          "absolute bottom-0 right-0 w-80 h-80 rounded-full blur-3xl pointer-events-none",
          (selectedBatchNum === "all" ? macroStats.netPnl : activeBatchData.netPnl) >= 0 ? "bg-emerald-500/[0.04]" : "bg-rose-500/[0.04]"
        )} />

        {/* Level 1: Sleek Cockpit Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.08] relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-emerald-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-sm flex-shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-black text-white tracking-tight">
                  20-Trade Probabilistic Edge Cockpit
                </h3>
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-bold">
                  Mark Douglas Ch. 11
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Discrete 20-trade sample corridors to eliminate emotional variance and prove mathematical edge.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              soundEngine.playTabSwitchTone();
              setShowPrinciplesDrawer(!showPrinciplesDrawer);
            }}
            className={clsx(
              "px-3.5 py-2 rounded-xl border text-xs font-mono font-bold transition-all flex items-center gap-2 cursor-pointer active:scale-95 shadow-sm self-start sm:self-auto flex-shrink-0",
              showPrinciplesDrawer
                ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                : "bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border-white/10 hover:border-white/20"
            )}
          >
            <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
            <span>{showPrinciplesDrawer ? "Hide Principles" : "Trading Principles"}</span>
            {showPrinciplesDrawer ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
          </button>
        </div>

        {/* 🚀 Active Positions Live in Flight Indicator */}
        {openAlerts && openAlerts.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 px-4 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-sky-950/30 to-[#0e1626]/40 border border-cyan-500/30 backdrop-blur-xl text-xs font-mono shadow-sm relative z-10">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-400"></span>
              </span>
              <span className="text-slate-200">
                <strong className="text-cyan-300">{openAlerts.length} Active Position{openAlerts.length > 1 ? "s" : ""} Live:</strong>{" "}
                {openAlerts.map((t) => `${t.symbol} (Entry ₹${t.entryPrice})`).join(", ")}
              </span>
              <span className="text-slate-400 text-[11px] hidden md:inline">
                · Note: Automatically enters this 20-trade cockpit once squared off or Target/SL is hit.
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                const activeSec = document.getElementById("active-practice-trades");
                if (activeSec) activeSec.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className="px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 font-bold text-xs transition cursor-pointer active:scale-95 shadow-sm self-start sm:self-auto flex-shrink-0"
            >
              Inspect Active Positions ➔
            </button>
          </div>
        )}
        {/* Proactive Zero-Data-Loss Shield: Notice when filters hide recent test trades */}
        {recentHiddenCount > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 px-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs shadow-lg relative z-10">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="p-1.5 rounded-xl bg-amber-500/20 text-amber-300 font-black">
                ⚠️
              </span>
              <span className="text-slate-200">
                <strong className="text-amber-300">{recentHiddenCount} recent trade{recentHiddenCount > 1 ? "s" : ""}</strong> placed/settled recently {recentHiddenCount > 1 ? "are" : "is"} hidden by current active filters ({[
                  orderStatusFilter !== "all" && `Status: ${orderStatusFilter}`,
                  selectedBatchNum !== "all" && `Batch #${selectedBatchNum}`,
                  assetFilter !== "ALL" && `Asset: ${assetFilter}`,
                  dateRangeFilter !== "all" && `Date: ${dateRangeFilter}`,
                  paperLedgerFilter !== "all" && `Outcome: ${paperLedgerFilter}`
                ].filter(Boolean).join(", ")}).
              </span>
            </div>
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 text-black font-extrabold text-xs transition cursor-pointer active:scale-95 shadow-md flex-shrink-0"
            >
              Show All Orders &amp; Batches ➔
            </button>
          </div>
        )}

        {/* Level 2: 4-Column High-Key HUD Telemetry Cards (Zero Truncation, Perfectly Balanced) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 relative z-10">
          {/* Card 1: Sample Size & Statistical Significance Gate */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.08] backdrop-blur-xl space-y-2 transition-all">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-slate-400 uppercase tracking-wider">Sample Size (N)</span>
              <span className={clsx(
                "px-2 py-0.5 rounded-md text-[10px] font-mono font-bold flex items-center gap-1",
                macroStats.isStatisticallySignificant 
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
              )}>
                {macroStats.isStatisticallySignificant ? <ShieldCheck className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                {macroStats.isStatisticallySignificant ? "SE ≤ ±3.1%" : `SE ±${macroStats.sePercent}%`}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <strong className="text-xl font-mono font-black text-white">
                {macroStats.totalTrades}
              </strong>
              <span className="text-xs font-mono text-slate-400">/ 100 Trades</span>
            </div>
            {/* Slim Confidence Horizon Progress */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>Confidence Horizon</span>
                <span className="text-cyan-300 font-bold">{macroStats.progressTo100}%</span>
              </div>
              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                <div 
                  className={clsx(
                    "h-full rounded-full transition-all duration-500",
                    macroStats.isStatisticallySignificant 
                      ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" 
                      : "bg-gradient-to-r from-cyan-400 to-emerald-400"
                  )}
                  style={{ width: `${macroStats.progressTo100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Card 2: Win Rate & Edge Ratios */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.08] backdrop-blur-xl space-y-1.5 transition-all">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-slate-400 uppercase tracking-wider">
                {selectedBatchNum === "all" ? "Macro Win Rate" : `Batch #${activeBatchData.num} Win Rate`}
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                BE: &gt;62%
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <strong className={clsx(
                "text-xl font-mono font-black",
                (selectedBatchNum === "all" ? Number(macroStats.winRate) : Number(activeBatchData.winRate)) >= 50
                  ? "text-emerald-400" 
                  : "text-amber-400"
              )}>
                {selectedBatchNum === "all" ? macroStats.winRate : activeBatchData.winRate}%
              </strong>
              <span className="text-xs font-mono text-slate-400">
                ({selectedBatchNum === "all" ? `${macroStats.wins}W · ${macroStats.losses}L` : `${activeBatchData.wins}W · ${activeBatchData.losses}L`})
              </span>
            </div>
            <div className="text-[10px] font-mono text-slate-400 pt-1 border-t border-white/5 flex items-center justify-between">
              <span>Status:</span>
              <span className="text-slate-200 font-bold">
                {macroStats.completedBatches} of {totalBatches} Batches Locked
              </span>
            </div>
          </div>

          {/* Card 3: Net Realized P&L (Tabular Nums, Never Clipped) */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-b from-white/[0.05] to-white/[0.02] hover:from-white/[0.08] border border-white/[0.08] backdrop-blur-xl space-y-1.5 transition-all">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-slate-400 uppercase tracking-wider">
                {selectedBatchNum === "all" ? "Macro Net Realized" : `Batch #${activeBatchData.num} Net P&L`}
              </span>
              <span className="text-[10px] font-mono text-emerald-400/80 font-bold">
                After Friction
              </span>
            </div>
            <div className="flex items-baseline">
              <strong className={clsx(
                "text-xl font-mono font-black tabular-nums tracking-tight",
                (selectedBatchNum === "all" ? macroStats.netPnl : activeBatchData.netPnl) >= 0 ? "text-emerald-400" : "text-rose-400"
              )}>
                {(selectedBatchNum === "all" ? macroStats.netPnl : activeBatchData.netPnl) >= 0 ? "+" : ""}₹{(selectedBatchNum === "all" ? macroStats.netPnl : activeBatchData.netPnl).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </strong>
            </div>
            <div className="text-[10px] font-mono text-slate-400 pt-1 border-t border-white/5 flex items-center justify-between">
              <span>Scope:</span>
              <span className="text-slate-200 font-bold">
                {selectedBatchNum === "all" ? `${totalSettledCount} Settled Trades` : `${activeBatchData.count}/20 Trades in Batch`}
              </span>
            </div>
          </div>

          {/* Card 4: Statutory Tax & Slippage Drag */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.08] backdrop-blur-xl space-y-1.5 transition-all">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-slate-400 uppercase tracking-wider">Avg Friction / Trade</span>
              <span className="text-[10px] font-mono text-amber-400/80 font-bold">STT 0.10%</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <strong className="text-xl font-mono font-black text-rose-400 tabular-nums">
                ₹{macroStats.avgFrictionPerTrade}
              </strong>
              <span className="text-xs font-mono text-slate-400">/ trade</span>
            </div>
            <div className="text-[10px] font-mono text-slate-400 pt-1 border-t border-white/5 flex items-center justify-between">
              <span>Total Drag:</span>
              <span className="text-rose-400/90 font-bold">
                -₹{macroStats.totalFriction.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Level 3: Refined Interactive Batch Track Segmented Bar */}
        <div className="p-2 rounded-2xl bg-black/40 border border-white/[0.08] flex items-center justify-between gap-3 flex-wrap relative z-10">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 flex-nowrap">
            {/* "All Batches" Pill */}
            <button
              type="button"
              onClick={() => handleSelectBatch("all")}
              className={clsx(
                "px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition flex items-center gap-2 cursor-pointer flex-shrink-0 active:scale-95",
                selectedBatchNum === "all"
                  ? "bg-purple-500/25 text-purple-200 border border-purple-400/40 shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              )}
            >
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              <span>All Batches ({totalSettledCount})</span>
            </button>

            <span className="w-px h-5 bg-white/10 mx-1 flex-shrink-0" />

            {/* Individual Batch Buttons */}
            {batchList.map((b) => {
              const isSelected = activeBatchNum === b.num && selectedBatchNum !== "all";
              return (
                <button
                  key={b.num}
                  type="button"
                  onClick={() => handleSelectBatch(b.num)}
                  className={clsx(
                    "px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition flex items-center gap-2 cursor-pointer flex-shrink-0 active:scale-95",
                    isSelected
                      ? "bg-cyan-500/25 text-cyan-200 border border-cyan-400/40 shadow-sm"
                      : b.isLatest
                      ? "text-cyan-300 hover:text-white hover:bg-cyan-500/10 border border-cyan-500/20"
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                  )}
                  title={`Inspect Batch #${b.num} (${b.count}/20 trades) · Win Rate: ${b.winRate}%, P&L: ₹${b.netPnl.toFixed(2)}`}
                >
                  {b.isLatest ? (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400" />
                    </span>
                  ) : b.isComplete ? (
                    <Lock className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <Sparkles className="w-3 h-3 text-cyan-400 flex-shrink-0" />
                  )}
                  <span>Batch #{b.num}</span>
                  <span className={clsx(
                    "text-[10px] px-1.5 py-0.2 rounded font-mono",
                    b.isComplete ? "bg-emerald-500/20 text-emerald-300" : "bg-cyan-500/20 text-cyan-300"
                  )}>
                    {b.count}/20
                  </span>
                </button>
              );
            })}
          </div>

          <div className="hidden lg:flex items-center gap-2 text-xs font-mono text-slate-400 pr-2">
            <span className="text-[11px] text-slate-500">Active View:</span>
            <span className="text-cyan-300 font-bold text-[11px]">
              {selectedBatchNum === "all" ? `Macro Overview (${totalBatches} Batches)` : `Batch #${activeBatchData.num} Detail (${activeBatchData.count}/20)`}
            </span>
          </div>
        </div>

        {selectedBatchNum === "all" ? (
          /* Level 3 Elite: Macro Multi-Batch Corridor (All Batches Side-by-Side) */
          <div className="space-y-3 pt-1">
            {/* Layout Switcher Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-white/5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.8)] animate-pulse" />
                <span className="text-xs font-mono font-extrabold text-white">
                  Multi-Batch Comparison ({batchList.length} Batches)
                </span>
              </div>

              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                <span className="text-[10px] font-mono text-slate-400">Box Grid:</span>
                <div className="flex items-center p-0.5 rounded-xl bg-black/50 border border-white/10 text-[10.5px] font-mono shadow-inner">
                  <button
                    type="button"
                    onClick={() => handleSetMatrixLayout("10")}
                    className={clsx(
                      "px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer active:scale-95",
                      matrixLayout === "10"
                        ? "bg-cyan-500/25 text-cyan-300 border border-cyan-400/40 shadow-sm"
                        : "text-slate-400 hover:text-white"
                    )}
                    title="10 boxes in a row (2 rows of 10)"
                  >
                    <span>10 / Row</span>
                    <span className="text-[9px] opacity-75">(2 rows)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetMatrixLayout("5")}
                    className={clsx(
                      "px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer active:scale-95",
                      matrixLayout === "5"
                        ? "bg-cyan-500/25 text-cyan-300 border border-cyan-400/40 shadow-sm"
                        : "text-slate-400 hover:text-white"
                    )}
                    title="5 boxes in a row (4 rows of 5)"
                  >
                    <span>5 / Row</span>
                    <span className="text-[9px] opacity-75">(4 rows)</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[...batchList].reverse().map((b) => (
                <div
                  key={b.num}
                  onClick={() => handleSelectBatch(b.num)}
                  className={clsx(
                    "p-3.5 rounded-2xl border transition-all cursor-pointer group space-y-2.5 shadow-sm relative overflow-hidden",
                    b.isLatest
                      ? "bg-gradient-to-br from-cyan-950/40 via-slate-900/70 to-emerald-950/40 border-cyan-400/50 shadow-[0_0_20px_rgba(6,182,212,0.15)] ring-1 ring-cyan-400/30"
                      : "bg-white/[0.03] hover:bg-white/[0.07] border-white/10 hover:border-cyan-500/40"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-mono font-extrabold text-white group-hover:text-cyan-300 transition">
                        Batch #{b.num}
                      </span>
                      {b.isLatest ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-500/25 text-cyan-300 text-[9px] font-mono font-black tracking-wide border border-cyan-400/40 shadow-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                          ACTIVE LIVE BATCH ({b.count}/20)
                        </span>
                      ) : b.isComplete ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold">
                          <Lock className="w-2.5 h-2.5" />
                          20/20
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-mono font-bold">
                          <Sparkles className="w-2.5 h-2.5" />
                          {b.count}/20
                        </span>
                      )}
                    </div>
                    <strong className={clsx("text-xs font-mono font-bold", b.netPnl >= 0 ? "text-emerald-400" : "text-rose-400")}>
                      {b.netPnl >= 0 ? "+" : ""}₹{b.netPnl.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </strong>
                  </div>

                  {/* 20-Box Grid (10 or 5 boxes in a single row) */}
                  <div 
                    className={clsx(
                      "grid gap-1 transition-all duration-200",
                      matrixLayout === "5" ? "grid-cols-5" : "grid-cols-10"
                    )}
                    style={{
                      display: "grid",
                      gridTemplateColumns: matrixLayout === "5" ? "repeat(5, minmax(0, 1fr))" : "repeat(10, minmax(0, 1fr))",
                      gap: "3.5px"
                    }}
                  >
                    {Array.from({ length: 20 }, (_, sIdx) => {
                      const isDone = sIdx < b.count;
                      const tradeIndex = (b.count - 1) - sIdx;
                      const trade = tradeIndex >= 0 && tradeIndex < b.trades.length ? b.trades[tradeIndex] : null;
                      const outcome = trade ? getTradeOutcome(trade) : null;
                      const isWin = outcome?.isNetGain;
                      const isFriction = outcome?.type === "TRAILED_BE_DRAG" || outcome?.type === "TRUE_BREAKEVEN";
                      const slotNum = sIdx + 1;
                      const netPnl = trade?.netPnl || 0;

                      return (
                        <div
                          key={sIdx}
                          title={trade ? `Trade #${slotNum}: ${trade.symbol} (${outcome?.label || "Settled"}, ₹${(trade.netPnl || 0).toFixed(2)})` : `Slot #${slotNum}: Pending`}
                          className={clsx(
                            "rounded-md border text-center font-mono transition-all duration-150 flex flex-col items-center justify-center select-none",
                            matrixLayout === "5" ? "h-9 sm:h-10 p-0.5" : "h-6 sm:h-7 p-0.5",
                            isDone
                              ? isWin
                                ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300 shadow-sm shadow-emerald-500/10 group-hover:border-emerald-400"
                                : isFriction
                                ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300 shadow-sm shadow-cyan-500/10 group-hover:border-cyan-400"
                                : "bg-rose-500/20 border-rose-500/40 text-rose-300 shadow-sm shadow-rose-500/10 group-hover:border-rose-400"
                              : "bg-white/[0.02] border-white/10 text-slate-600"
                          )}
                        >
                          <span className={clsx(
                            "font-bold leading-none",
                            matrixLayout === "5" ? "text-[10px]" : "text-[8.5px]",
                            isDone 
                              ? (isWin ? "text-emerald-300" : isFriction ? "text-cyan-300" : "text-rose-300") 
                              : "text-slate-600"
                          )}>
                            #{slotNum}
                          </span>
                          {matrixLayout === "5" && isDone && (
                            <span className={clsx(
                              "text-[8px] font-black tracking-tight mt-0.5 leading-none",
                              isWin ? "text-emerald-400" : isFriction ? "text-cyan-400" : "text-rose-400"
                            )}>
                              {netPnl >= 0 ? "+" : ""}₹{Math.abs(netPnl) >= 1000 ? (netPnl / 1000).toFixed(1) + "k" : netPnl.toFixed(0)}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-0.5 border-t border-white/5">
                    <span>Win Rate: <strong className="text-white font-bold">{b.winRate}%</strong> ({b.wins}W/{b.losses}L)</span>
                    <span className="text-cyan-400 group-hover:underline font-bold">Inspect ➔</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Standard 20-Step Visual Box Matrix (Click to Jump & Highlight) */
          <div className="space-y-3 pt-0.5">
            {/* Matrix Sub-Header with Layout Switcher (10 per row vs 5 per row) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1 border-b border-white/5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)] animate-pulse" />
                <span className="text-xs font-mono font-extrabold text-white">
                  Batch #{activeBatchData.num} 20-Trade Box Matrix
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-300">
                  {activeBatchData.count}/20 Completed · {20 - activeBatchData.count} Remaining
                </span>
              </div>

              {/* Layout Switcher: 10 in a row (2 rows) vs 5 in a row (4 rows) */}
              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                <span className="text-[10px] font-mono text-slate-400">Layout:</span>
                <div className="flex items-center p-0.5 rounded-xl bg-black/50 border border-white/10 text-[10.5px] font-mono shadow-inner">
                  <button
                    type="button"
                    onClick={() => handleSetMatrixLayout("10")}
                    className={clsx(
                      "px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer active:scale-95",
                      matrixLayout === "10"
                        ? "bg-cyan-500/25 text-cyan-300 border border-cyan-400/40 shadow-sm"
                        : "text-slate-400 hover:text-white"
                    )}
                    title="10 boxes in a single row (2 rows total)"
                  >
                    <span>10 / Row</span>
                    <span className="text-[9px] opacity-75">(2 rows)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetMatrixLayout("5")}
                    className={clsx(
                      "px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer active:scale-95",
                      matrixLayout === "5"
                        ? "bg-cyan-500/25 text-cyan-300 border border-cyan-400/40 shadow-sm"
                        : "text-slate-400 hover:text-white"
                    )}
                    title="5 boxes in a single row (4 rows total)"
                  >
                    <span>5 / Row</span>
                    <span className="text-[9px] opacity-75">(4 rows)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* The 20 Boxes Grid */}
            <div
              className={clsx(
                "grid gap-2 sm:gap-2.5 transition-all duration-300",
                matrixLayout === "5" ? "grid-cols-5" : "grid-cols-5 sm:grid-cols-10"
              )}
              style={{
                display: "grid",
                gridTemplateColumns: matrixLayout === "5" 
                  ? "repeat(5, minmax(0, 1fr))" 
                  : undefined
              }}
            >
              {Array.from({ length: 20 }, (_, idx) => {
                const isDone = idx < activeBatchData.count;
                const isNext = idx === activeBatchData.count;
                const isLatest = idx === activeBatchData.count - 1 && isDone;
                const tradeIndex = (activeBatchData.count - 1) - idx;
                const trade = tradeIndex >= 0 && tradeIndex < activeBatchData.trades.length ? activeBatchData.trades[tradeIndex] : null;
                const outcome = trade ? getTradeOutcome(trade) : null;
                const isWin = outcome?.isNetGain;
                const isFriction = outcome?.type === "TRAILED_BE_DRAG" || outcome?.type === "TRUE_BREAKEVEN";
                const slotNum = idx + 1;
                const slotLabel = `#${slotNum < 10 ? "0" + slotNum : slotNum}`;
                const netPnl = trade?.netPnl || 0;

                if (isDone && trade) {
                  return (
                    <div
                      key={idx}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleSlotClick(trade)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleSlotClick(trade);
                        }
                      }}
                      title={`Batch #${activeBatchData.num} · Trade #${slotNum}: ${trade.symbol || "Option Scalp"} (${outcome?.label || "Settled"})\nNet P&L: ${netPnl >= 0 ? "+" : ""}₹${netPnl.toFixed(2)}\nClick to jump to trade details.`}
                      className={clsx(
                        "group relative p-2 sm:p-2.5 rounded-xl border text-left font-mono transition-all duration-200 cursor-pointer flex flex-col justify-between select-none active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 shadow-sm",
                        matrixLayout === "5" ? "min-h-[74px] sm:min-h-[82px]" : "min-h-[64px] sm:min-h-[70px]",
                        isWin
                          ? "bg-gradient-to-b from-emerald-500/15 via-[#06241a]/70 to-[#02130e]/90 border-emerald-500/35 hover:border-emerald-400 hover:shadow-[0_0_18px_rgba(16,185,129,0.25)] hover:-translate-y-0.5"
                          : isFriction
                          ? "bg-gradient-to-b from-cyan-500/15 via-[#081e2e]/70 to-[#030e17]/90 border-cyan-500/35 hover:border-cyan-400 hover:shadow-[0_0_18px_rgba(6,182,212,0.25)] hover:-translate-y-0.5"
                          : "bg-gradient-to-b from-rose-500/15 via-[#2b0c14]/70 to-[#150408]/90 border-rose-500/35 hover:border-rose-400 hover:shadow-[0_0_18px_rgba(244,63,94,0.25)] hover:-translate-y-0.5",
                        isLatest && "ring-1 ring-white/40"
                      )}
                    >
                      {/* Top: Slot Number & Status Indicator with Hover Delete */}
                      <div className="flex items-center justify-between w-full gap-1">
                        <span className={clsx(
                          "text-[10px] sm:text-[11px] font-black font-mono tracking-tight",
                          isWin ? "text-emerald-300" : isFriction ? "text-cyan-300" : "text-rose-300"
                        )}>
                          {slotLabel}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              soundEngine.playDeleteTone();
                              deleteJournalTradesWithUndo(trade);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition cursor-pointer"
                            title="Delete trade from batch (with 5s Undo)"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                          </button>
                          {isLatest && (
                            <span className="text-[7.5px] font-mono uppercase px-1 py-0.2 rounded bg-white/15 text-white font-extrabold hidden sm:inline">
                              NEW
                            </span>
                          )}
                          <span className={clsx(
                            "w-1.5 h-1.5 rounded-full",
                            isWin ? "bg-emerald-400 shadow-sm shadow-emerald-400" : isFriction ? "bg-cyan-400 shadow-sm shadow-cyan-400" : "bg-rose-400 shadow-sm shadow-rose-400"
                          )} />
                        </div>
                      </div>

                      {/* Middle: Net P&L Value */}
                      <div className="my-0.5">
                        <div className={clsx(
                          "font-mono font-black tracking-tight truncate leading-tight",
                          matrixLayout === "5" ? "text-xs sm:text-sm" : "text-[11px] sm:text-xs",
                          isWin ? "text-emerald-300" : isFriction ? "text-cyan-300" : "text-rose-300"
                        )}>
                          {netPnl >= 0 ? "+" : ""}₹{Math.abs(netPnl) >= 1000 ? (netPnl / 1000).toFixed(1) + "k" : netPnl.toFixed(0)}
                        </div>
                      </div>

                      {/* Bottom: Outcome Tag */}
                      <div className="flex items-center justify-between w-full text-[9px] font-mono pt-1 border-t border-white/[0.06]">
                        <span className={clsx(
                          "truncate font-bold uppercase",
                          isWin ? "text-emerald-400/90" : isFriction ? "text-cyan-400/90" : "text-rose-400/90"
                        )}>
                          {isWin ? "WIN 🎯" : isFriction ? "BE ⚖️" : "STOP 🛑"}
                        </span>
                        {matrixLayout === "5" && (
                          <span className="text-[8.5px] text-slate-400 truncate max-w-[60px] hidden sm:inline">
                            {trade.symbol?.split(" ")[0] || "NIFTY"}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                }

                if (isNext) {
                  return (
                    <div
                      key={idx}
                      className={clsx(
                        "relative p-2 sm:p-2.5 rounded-xl border border-dashed border-cyan-400/60 bg-gradient-to-b from-cyan-500/10 via-cyan-950/20 to-transparent flex flex-col justify-between font-mono select-none ring-1 ring-cyan-400/30 shadow-[0_0_16px_rgba(6,182,212,0.15)] animate-pulse",
                        matrixLayout === "5" ? "min-h-[74px] sm:min-h-[82px]" : "min-h-[64px] sm:min-h-[70px]"
                      )}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[10px] sm:text-[11px] font-black text-cyan-300">{slotLabel}</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                      </div>
                      <div className="my-0.5 text-center">
                        <span className="text-[10.5px] sm:text-xs font-black text-cyan-300 font-mono tracking-wider">
                          NEXT
                        </span>
                      </div>
                      <div className="flex items-center justify-between w-full text-[8.5px] text-cyan-400/80 font-bold border-t border-cyan-500/20 pt-1 uppercase">
                        <span>LIVE</span>
                        <span>⚡</span>
                      </div>
                    </div>
                  );
                }

                // Future Unfilled Slot
                return (
                  <div
                    key={idx}
                    className={clsx(
                      "relative p-2 sm:p-2.5 rounded-xl border border-white/[0.07] bg-white/[0.02] flex flex-col justify-between font-mono select-none opacity-45 hover:opacity-75 transition-opacity",
                      matrixLayout === "5" ? "min-h-[74px] sm:min-h-[82px]" : "min-h-[64px] sm:min-h-[70px]"
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[10px] sm:text-[11px] font-bold text-slate-500">{slotLabel}</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-white/10" />
                    </div>
                    <div className="my-0.5 text-center">
                      <span className="text-slate-600 font-bold text-xs">—</span>
                    </div>
                    <div className="flex items-center justify-between w-full text-[8.5px] text-slate-500 font-bold border-t border-white/[0.04] pt-1 uppercase">
                      <span>SLOT {slotNum}</span>
                      <span>🔒</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Matrix Footer Legend & Instruction */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1 flex-wrap gap-2">
              <div className="flex items-center gap-3 text-[10px] flex-wrap">
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="w-2 h-2 rounded-sm bg-emerald-400" />
                  Target / Win
                </span>
                <span className="flex items-center gap-1 text-rose-400">
                  <span className="w-2 h-2 rounded-sm bg-rose-500" />
                  Stop Cut
                </span>
                <span className="flex items-center gap-1 text-cyan-400">
                  <span className="w-2 h-2 rounded-sm bg-cyan-400" />
                  Breakeven / Drag
                </span>
                <span className="flex items-center gap-1 text-slate-500">
                  <span className="w-2 h-2 rounded-sm bg-white/10 border border-white/20" />
                  Pending
                </span>
              </div>
              <span className="text-[10px] text-slate-400">
                {activeBatchData.count === 20 ? `🎉 Batch #${activeBatchData.num} Complete (20/20)!` : "💡 Click any completed box to jump to trade details"}
              </span>
            </div>
          </div>
        )}

        {/* Premise Audit Invariant Banner */}
        <div className="pt-0.5">
          {assetFilter === "NIFTY" ? (
            <div className="flex items-center gap-2 text-[10.5px] font-mono text-emerald-300 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/25">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span>
                <strong>🔒 Pure NIFTY Edge Series:</strong> Invariant Parameters Locked (-4.5 pt SL / +8.5 pt T2) · Zero mid-sample adjustments for Batch #{activeBatchData.num}
              </span>
            </div>
          ) : assetFilter === "ALL" ? (
            <div className="flex items-center gap-2 text-[10.5px] font-mono text-cyan-300 bg-cyan-500/10 px-3 py-1.5 rounded-xl border border-cyan-500/25">
              <Layers className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
              <span>
                <strong>🌐 Multi-Asset Portfolio View:</strong> Aggregate ledger across all assets. Select <strong>NIFTY 20</strong> to audit your pure homogeneous edge series.
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-[10.5px] font-mono text-zinc-300 bg-white/[0.04] px-3 py-1.5 rounded-xl border border-white/10">
              <ShieldAlert className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
              <span>
                <strong>⚠️ Independent {assetLabel} Series:</strong> High-beta instrument with separate volatility characteristics. Isolated from NIFTY statistical baseline.
              </span>
            </div>
          )}
        </div>

        {/* 20/20 Milestone Celebration Banner */}
        {batchData.effectiveBatchCount === 20 && (
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-500/20 via-teal-500/15 to-cyan-500/20 border border-emerald-500/40 shadow-lg shadow-emerald-500/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <strong className="text-xs font-black text-white font-mono uppercase">
                  🎉 20-Trade Psychological Batch #{batchData.num} Completed!
                </strong>
                <span className={clsx("text-[10px] font-bold px-2 py-0.5 rounded-full border", batchData.batchNetPnl >= 0 ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" : "bg-rose-500/20 text-rose-300 border-rose-500/30")}>
                  {macroStats.isStatisticallySignificant ? "🟢 100-TRADE STATISTICAL EDGE CONFIRMED" : "🧠 PSYCHOLOGICAL COMPLIANCE VERIFIED"}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                You successfully executed an invariant 20-trade sample block with zero mid-sample deviations. Batch return: {batchData.batchNetPnl >= 0 ? "+" : ""}₹{batchData.batchNetPnl.toLocaleString("en-IN", { minimumFractionDigits: 2 })} ({batchData.batchWinRate}% win rate across {batchData.batchWins} wins and {batchData.batchLosses} stops). Complete all 5 batches ({macroStats.totalTrades}/100 trades) to unlock statistical edge verification and lot scaling.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                soundEngine.playTargetChime();
                alert(`Psychological Batch #${batchData.currentBatchNum} Completed!\nWin Rate: ${batchData.batchWinRate}%\nNet Realized P&L: ₹${batchData.batchNetPnl.toFixed(2)}\n\nProgress: ${macroStats.totalTrades}/100 trades towards Statistical Significance Gate.`);
              }}
              className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono font-black text-xs shadow-md transition active:scale-95 whitespace-nowrap cursor-pointer"
            >
              Review Batch #{batchData.currentBatchNum}
            </button>
          </div>
        )}

        {/* Mark Douglas Mental Alignment Drawer */}
        <AnimatePresence>
          {showPrinciplesDrawer && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="p-4 rounded-xl bg-black/50 border border-cyan-500/30 space-y-3 pt-3 text-xs overflow-hidden"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <strong className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3" />
                    <span>5 Fundamental Truths (Chapter 7)</span>
                  </strong>
                  <ol className="list-decimal list-inside space-y-1 text-slate-300 text-[11px] leading-relaxed">
                    <li>Anything can happen.</li>
                    <li>You don't need to know what happens next to make money.</li>
                    <li>Random distribution between wins and losses for any edge.</li>
                    <li>An edge is simply higher probability of one thing over another.</li>
                    <li>Every moment in the market is truly unique.</li>
                  </ol>
                </div>
                <div className="space-y-1.5">
                  <strong className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-3 h-3" />
                    <span>7 Principles of Consistency (Chapter 11)</span>
                  </strong>
                  <ol className="list-decimal list-inside space-y-1 text-slate-300 text-[11px] leading-relaxed">
                    <li>I objectively identify my edges.</li>
                    <li>I predefine the risk of every trade.</li>
                    <li>I completely accept risk or let go of the trade.</li>
                    <li>I act on my edges without reservation or hesitation.</li>
                    <li><strong className="text-emerald-300 font-bold">I pay myself as the market makes money available to me.</strong></li>
                    <li>I continually monitor my susceptibility for making errors.</li>
                    <li>I understand the necessity of these principles and never violate them.</li>
                  </ol>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Primary Asset Segment Bar & Secondary Action Toolbar */}
      <div className="space-y-3 pt-1">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 flex-wrap">
          {/* Requested Asset Filter Buttons: All, NIFTY 20, Bank, Sensex, Filter */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl text-xs flex-wrap flex-shrink-0">
            {[
              { id: "ALL", label: "All", count: allCount, icon: Layers },
              { id: "NIFTY", label: "NIFTY 20", count: niftyCount, icon: Zap },
              { id: "BANKNIFTY", label: "Bank", count: bankCount, icon: Activity },
              { id: "SENSEX", label: "Sensex", count: sensexCount, icon: TrendingUp },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = assetFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    soundEngine.playTabSwitchTone();
                    setAssetFilter(tab.id);
                  }}
                  className={clsx(
                    "relative px-3.5 py-1.5 rounded-xl font-bold transition-all text-xs flex items-center gap-2 whitespace-nowrap z-10 cursor-pointer select-none",
                    isActive ? "text-cyan-300" : "text-slate-400 hover:text-slate-200"
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeHistoryAssetPill"
                      transition={{ type: "spring", stiffness: 450, damping: 32 }}
                      className="absolute inset-0 rounded-xl bg-cyan-500/20 border border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.25)] -z-10"
                    />
                  )}
                  <Icon className={clsx("w-3.5 h-3.5", isActive ? "text-cyan-400" : "text-slate-400")} />
                  <span>{tab.label}</span>
                  <span className={clsx(
                    "px-1.5 py-0.2 rounded-full text-[10px] font-mono",
                    isActive ? "bg-cyan-500/25 text-cyan-300 font-black" : "bg-white/10 text-slate-400"
                  )}>
                    {tab.count}
                  </span>
                </button>
              );
            })}

            <div className="w-[1px] h-5 bg-white/10 mx-0.5" />

            {/* Filter Toggle Button */}
            <button
              type="button"
              onClick={() => {
                soundEngine.playTabSwitchTone();
                setIsFilterDrawerOpen(!isFilterDrawerOpen);
              }}
              className={clsx(
                "px-3 py-1.5 rounded-xl font-bold transition-all text-xs flex items-center gap-1.5 whitespace-nowrap cursor-pointer select-none",
                isFilterDrawerOpen || hasActiveFilters
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              )}
            >
              <Filter className="w-3.5 h-3.5 text-cyan-400" />
              <span>Filter</span>
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.8)]" />
              )}
              {isFilterDrawerOpen ? <ChevronUp className="w-3 h-3 ml-0.5" /> : <ChevronDown className="w-3 h-3 ml-0.5" />}
            </button>
          </div>

          {/* Order Lifecycle Status Switcher (Active + Settled) */}
          <div className="flex items-center gap-1 p-1 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl text-xs flex-wrap flex-shrink-0">
            <button
              type="button"
              onClick={() => {
                soundEngine.playTabSwitchTone();
                setOrderStatusFilter("all");
              }}
              className={clsx(
                "relative px-3 py-1.5 rounded-xl font-bold transition-all text-xs flex items-center gap-1.5 whitespace-nowrap cursor-pointer select-none",
                orderStatusFilter === "all"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                  : "text-slate-400 hover:text-white"
              )}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>All ({activeAlertsMatchingFilters.length + filteredAlerts.length})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playTabSwitchTone();
                setOrderStatusFilter("active");
              }}
              className={clsx(
                "relative px-3 py-1.5 rounded-xl font-bold transition-all text-xs flex items-center gap-1.5 whitespace-nowrap cursor-pointer select-none",
                orderStatusFilter === "active"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
                  : "text-slate-400 hover:text-white"
              )}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Live Active ({activeAlertsMatchingFilters.length})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playTabSwitchTone();
                setOrderStatusFilter("settled");
              }}
              className={clsx(
                "relative px-3 py-1.5 rounded-xl font-bold transition-all text-xs flex items-center gap-1.5 whitespace-nowrap cursor-pointer select-none",
                orderStatusFilter === "settled"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                  : "text-slate-400 hover:text-white"
              )}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Settled ({filteredAlerts.length})</span>
            </button>
          </div>

          {/* Quick Actions: Batch Toggle + CSV + Backup + Restore */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* 20-Batch Focus Toggle */}
            <button
              type="button"
              onClick={() => {
                handleSelectBatch(selectedBatchNum === "all" ? latestBatchNum : "all");
              }}
              title={selectedBatchNum !== "all" ? "Currently scoped to Batch. Click to view All Batches" : "Click to focus on the active 20-trade casino sample batch"}
              className={clsx(
                "px-3 py-1.5 rounded-xl border text-xs font-bold font-mono transition flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-sm",
                selectedBatchNum !== "all"
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.2)]" 
                  : "bg-white/[0.03] hover:bg-white/[0.07] text-slate-400 hover:text-slate-200 border-white/10"
              )}
            >
              <Sparkles className={clsx("w-3.5 h-3.5", selectedBatchNum !== "all" ? "text-emerald-400" : "text-slate-400")} />
              <span>{selectedBatchNum !== "all" ? `Batch #${activeBatchData.num} (${activeBatchData.count}/20)` : "All Batches"}</span>
            </button>

            {/* CSV Export Button */}
            <button
              type="button"
              onClick={exportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 border border-white/10 text-xs font-bold text-slate-300 hover:text-white transition-all shadow-sm flex-shrink-0 whitespace-nowrap cursor-pointer"
              title="Export CSV audit ledger for current range"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>CSV</span>
            </button>

            {/* JSON Backup Button */}
            <button
              type="button"
              onClick={exportJsonBackup}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 border border-white/10 text-xs font-bold text-slate-300 hover:text-white transition-all shadow-sm flex-shrink-0 whitespace-nowrap cursor-pointer"
              title="Download full JSON forensic database backup"
            >
              <FileJson className="w-3.5 h-3.5 text-emerald-400" />
              <span>JSON Backup</span>
            </button>

            {/* JSON Restore Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 border border-white/10 text-xs font-bold text-slate-300 hover:text-white transition-all shadow-sm flex-shrink-0 whitespace-nowrap cursor-pointer"
              title="Restore / Import JSON trade database"
            >
              <Upload className="w-3.5 h-3.5 text-cyan-400" />
              <span>Restore</span>
            </button>
            <input 
              ref={fileInputRef} 
              type="file" 
              accept=".json" 
              className="hidden" 
              onChange={handleImportJson} 
            />
          </div>
        </div>

        {/* Level 3 Elite: Active Filter Tag Strip (High Peripheral Visibility) */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 flex-wrap text-xs pt-1 px-1">
            <span className="text-[10px] text-slate-500 uppercase font-mono font-bold">Active Filters:</span>
            {dateRangeFilter !== "all" && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[11px] font-mono font-semibold">
                <span>📅 {rangeLabel}</span>
                <button
                  type="button"
                  onClick={() => setDateRangeFilter("all")}
                  className="hover:text-white cursor-pointer ml-0.5"
                  title="Remove Date Filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {paperLedgerFilter !== "all" && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] font-mono font-semibold">
                <span>
                  {paperLedgerFilter === "win" ? "🎯 Winners" : paperLedgerFilter === "friction" ? "🛡️ Trailed BE" : "🛑 Stops Cut"}
                </span>
                <button
                  type="button"
                  onClick={() => setPaperLedgerFilter("all")}
                  className="hover:text-white cursor-pointer ml-0.5"
                  title="Remove Outcome Filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {selectedBatchNum !== "all" && selectedBatchNum !== null && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-teal-500/10 border border-teal-500/30 text-teal-300 text-[11px] font-mono font-semibold">
                <span>
                  {`⚡ Batch #${activeBatchData.num} (${activeBatchData.count}/20)`}
                </span>
                <button
                  type="button"
                  onClick={() => handleSelectBatch("all")}
                  className="hover:text-white cursor-pointer ml-0.5"
                  title="View All Batches"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-[11px] text-cyan-400 hover:text-cyan-300 underline font-mono cursor-pointer ml-1"
            >
              Clear All
            </button>
          </div>
        )}

        {/* Expandable Filter Drawer (Date Range + Outcome Filters) */}
        <AnimatePresence>
          {isFilterDrawerOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -6 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="p-4 rounded-2xl bg-[#121424]/95 border border-white/10 backdrop-blur-2xl shadow-2xl space-y-3.5 overflow-hidden"
            >
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                {/* Casino Sample Batch Selector */}
                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider block">
                    Casino Sample Batch Filter
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-white/[0.03] border border-white/10 text-xs">
                    {batchList.map((b) => {
                      const isSelected = activeBatchNum === b.num && selectedBatchNum !== "all";
                      return (
                        <button
                          key={b.num}
                          type="button"
                          onClick={() => handleSelectBatch(b.num)}
                          className={clsx(
                            "px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 whitespace-nowrap text-xs cursor-pointer",
                            isSelected
                              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                              : "text-slate-400 hover:text-slate-200"
                          )}
                        >
                          {b.isComplete ? (
                            <Lock className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Sparkles className="w-3 h-3 text-cyan-400" />
                          )}
                          <span>Batch #{b.num}</span>
                          <span className="px-1.5 py-0.2 rounded-full bg-white/10 text-[10px] font-mono">
                            {b.count}/20
                          </span>
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => handleSelectBatch("all")}
                      className={clsx(
                        "px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 whitespace-nowrap text-xs cursor-pointer",
                        selectedBatchNum === "all"
                          ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm"
                          : "text-slate-400 hover:text-slate-200"
                      )}
                    >
                      <span>All Batches</span>
                      <span className="px-1.5 py-0.2 rounded-full bg-white/10 text-[10px] font-mono">
                        {totalSettledCount}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Timeframe Selector */}
                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider block">
                    Timeframe Filter
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-white/[0.03] border border-white/10 text-xs">
                    {[
                      { id: "all", label: "All Time" },
                      { id: "today", label: "Today" },
                      { id: "yesterday", label: "Yesterday" },
                      { id: "week", label: "This Week" },
                      { id: "month", label: "This Month" },
                      { id: "custom", label: "Custom", icon: CalendarIcon },
                    ].map((tab) => {
                      const Icon = tab.icon;
                      const isActive = dateRangeFilter === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => {
                            soundEngine.playTabSwitchTone();
                            setDateRangeFilter(tab.id);
                            if (tab.id === "custom") setCalendarOpen(true);
                          }}
                          className={clsx(
                            "px-3 py-1 rounded-lg font-bold transition-all text-xs flex items-center gap-1.5 whitespace-nowrap cursor-pointer",
                            isActive
                              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                              : "text-slate-400 hover:text-slate-200"
                          )}
                        >
                          {Icon && <Icon className="w-3 h-3 text-cyan-400" />}
                          <span>{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Outcome Classification Selector */}
                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider block">
                    Outcome Classification
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-white/[0.03] border border-white/10 text-xs">
                    {[
                      { id: "all", label: "All Setups", count: assetFilteredAlerts.length },
                      { id: "win", label: "🎯 Winners", count: assetFilteredAlerts.filter(t => getTradeOutcome(t).isNetGain).length },
                      { id: "friction", label: "🛡️ Trailed BE", count: assetFilteredAlerts.filter(t => {
                        const o = getTradeOutcome(t);
                        return o.type === "TRAILED_BE_DRAG" || o.type === "TRUE_BREAKEVEN";
                      }).length },
                      { id: "loss", label: "🛑 Stops Cut", count: assetFilteredAlerts.filter(t => getTradeOutcome(t).type === "STOP_CUT").length }
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => {
                          soundEngine.playTabSwitchTone();
                          setPaperLedgerFilter(tab.id);
                        }}
                        className={clsx(
                          "px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 whitespace-nowrap text-xs cursor-pointer",
                          paperLedgerFilter === tab.id
                            ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                            : "text-slate-400 hover:text-slate-200"
                        )}
                      >
                        <span>{tab.label}</span>
                        <span className="px-1.5 py-0.2 rounded-full bg-white/10 text-[10px] font-mono">
                          {tab.count}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reset Action & Clean Cache */}
                <div className="flex items-end pb-1 gap-2 flex-wrap">
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-sm"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset Filters</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playSuccessTone();
                      purgeStaleMockTrades();
                    }}
                    className="px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-sm"
                    title="Purges legacy client mock trades and hydrates strictly from authoritative SQLite database"
                  >
                    <Sparkles className="w-3 h-3 text-cyan-400" />
                    <span>Sync Clean DB Trades</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Level 3 Elite: Smart Pagination Callout on All Batches */}
      {selectedBatchNum === "all" && filteredAlerts.length > 20 && (
        <div className="flex items-center justify-between p-3 px-4 rounded-2xl bg-cyan-950/25 border border-cyan-500/25 backdrop-blur-xl text-xs font-mono shadow-sm">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400 flex-shrink-0" />
            <span className="text-slate-300">
              Displaying <strong className="text-white font-bold">{visibleAlerts.length}</strong> of <strong className="text-white font-bold">{filteredAlerts.length}</strong> trades across all {totalBatches} batches.
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              soundEngine.playTabSwitchTone();
              setShowAllRows(!showAllRows);
            }}
            className="px-3 py-1 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 font-bold text-xs transition cursor-pointer active:scale-95 shadow-sm"
          >
            {showAllRows ? "Show Top 20" : `View All ${filteredAlerts.length} Trades (+${filteredAlerts.length - 20})`}
          </button>
        </div>
      )}

      {/* 🌟 20-Trade Cockpit Sticky Undo Toast Banner */}
      <AnimatePresence>
        {undoTradeBackup && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            className="sticky top-2 z-40 my-2 mx-auto w-full max-w-2xl p-3 sm:p-3.5 rounded-2xl bg-[#121424]/95 backdrop-blur-2xl border border-rose-500/40 shadow-[0_12px_40px_rgba(244,63,94,0.25),0_0_24px_rgba(6,182,212,0.12)] flex items-center justify-between gap-3 text-xs"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 flex-shrink-0">
                <Trash2 className="w-4 h-4 animate-pulse" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-white">Trade Deleted from Cockpit</span>
                  <span className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-white/10 text-rose-300 font-extrabold truncate border border-rose-500/20">
                    {undoTradeBackup.symbol || "Option Trade"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Permanent DB purge in <strong className="text-amber-300 font-mono font-bold">{undoCountdown}s</strong>. One-click instant restore:
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playSuccessTone();
                  executeUndoTrade();
                }}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-400 hover:from-cyan-400 hover:to-sky-300 active:scale-95 text-black font-extrabold font-mono transition flex items-center gap-1.5 shadow-lg shadow-cyan-500/30 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Undo</span>
                <span className="px-1.5 py-0.5 rounded-md bg-black/30 text-black text-[10.5px] font-mono font-black tabular-nums border border-black/10">
                  {undoCountdown}s
                </span>
              </button>

              <button
                type="button"
                onClick={() => dismissUndoTrade()}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
                title="Dismiss & Commit Deletion Now"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 📋 Multi-Trade Selection Floating Action Dock */}
      <AnimatePresence>
        {selectedTradeIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center justify-between p-2.5 px-4 rounded-2xl bg-rose-950/40 border border-rose-500/30 backdrop-blur-xl text-xs font-mono shadow-lg my-1.5"
          >
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
              <span className="text-white font-bold">
                {selectedTradeIds.size} of {visibleAlerts.length} trades selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAllVisible}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-[11px] font-bold transition cursor-pointer"
              >
                {selectedTradeIds.size === visibleAlerts.length ? "Deselect All" : "Select All Visible"}
              </button>
              <button
                type="button"
                onClick={handleDeleteSelected}
                className="px-3 py-1 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-sm"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>Delete Selected ({selectedTradeIds.size})</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Luxury Financial Data Table with Pinned Sticky Left Column & CE/PE Spine */}
      <div className={clsx(
        "min-h-[220px] overflow-y-auto overflow-x-auto rounded-2xl border border-white/10 bg-black/20 backdrop-blur-md shadow-inner relative transition-all duration-500 ease-out",
        "max-h-[560px]"
      )}>
        <table className="w-full min-w-[1280px] text-left text-xs border-collapse">
          <thead className="sticky top-0 z-20 bg-[#0d0f14]/95 backdrop-blur-xl border-b border-white/10 shadow-sm">
            <tr className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              <th className="py-3.5 px-4 bg-[#0d0f14]/95 sticky left-0 z-30 border-r border-white/10 shadow-[4px_0_12px_rgba(0,0,0,0.4)] whitespace-nowrap min-w-[240px]">
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={visibleAlerts.length > 0 && selectedTradeIds.size === visibleAlerts.length}
                    onChange={handleSelectAllVisible}
                    className="w-3.5 h-3.5 rounded border-white/20 bg-white/5 text-cyan-500 focus:ring-cyan-400/50 cursor-pointer accent-cyan-500 shrink-0"
                    title="Select all visible trades for batch operations"
                  />
                  <span>Contract / Strike</span>
                </div>
              </th>
              <th className="py-3.5 px-3 bg-[#0d0f14]/90 whitespace-nowrap min-w-[130px]">Entry Time</th>
              <th className="py-3.5 px-3 bg-[#0d0f14]/90 whitespace-nowrap min-w-[130px]">End Time (Exit)</th>
              <th className="py-3.5 px-3 text-right bg-[#0d0f14]/90 whitespace-nowrap min-w-[95px]">Entry (₹)</th>
              <th className="py-3.5 px-3 text-right bg-[#0d0f14]/90 whitespace-nowrap min-w-[95px]">Exit (₹)</th>
              <th className="py-3.5 px-3 text-right bg-[#0d0f14]/90 whitespace-nowrap min-w-[95px]">Target (₹)</th>
              <th className="py-3.5 px-3 text-right bg-[#0d0f14]/90 whitespace-nowrap min-w-[95px]">Stop Loss (₹)</th>
              <th className="py-3.5 px-3 text-center bg-[#0d0f14]/90 whitespace-nowrap min-w-[160px]">Close Reason</th>
              <th className="py-3.5 px-4 text-right bg-[#0d0f14]/90 whitespace-nowrap min-w-[175px]">Realized P&amp;L (Net / Real / Tax)</th>
              <th className="py-3.5 px-3 text-center bg-[#0d0f14]/90 whitespace-nowrap min-w-[195px]">Actions (Timeline / Delete)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 font-mono">
            {displayAlerts.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-12 text-center text-slate-400 font-sans text-xs">
                  <div className="max-w-md mx-auto space-y-3 p-6 rounded-2xl bg-white/[0.02] border border-white/5">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto text-cyan-400">
                      <Filter className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-bold text-white text-sm">No Practice Trades Match Active Filters</p>
                      <p className="text-slate-400 text-xs leading-relaxed">
                        Currently filtered by: <strong className="text-cyan-300">{assetLabel}</strong> · Date: <strong className="text-cyan-300">{rangeLabel}</strong>
                        {selectedBatchNum !== "all" && <span> · Batch: <strong className="text-cyan-300">#{selectedBatchNum}</strong></span>}
                      </p>
                    </div>
                    {(assetFilter !== "ALL" || dateRangeFilter !== "all" || selectedBatchNum !== "all" || orderStatusFilter !== "all") && (
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playTabSwitchTone();
                          setAssetFilter("ALL");
                          setDateRangeFilter("all");
                          setOrderStatusFilter("all");
                          setCustomStart("");
                          setCustomEnd("");
                          setSelectedBatchNum("all");
                        }}
                        className="px-4 py-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-bold transition flex items-center gap-2 mx-auto cursor-pointer shadow-sm active:scale-95"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reset All Filters to View All Trades ({displayAlerts.length})</span>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              displayAlerts.map((trade) => {
                const isOpenTrade = trade.status === "OPEN" || openAlerts.some((o) => o.id === trade.id);
                if (isOpenTrade) {
                  const currentLtp = getLiveLtp(trade, ticks);
                  const liveMetrics = calculateLiveMetrics(trade, currentLtp);
                  const sym = String(trade.symbol || "");
                  const isCE = trade.optionType === "CALL" || sym.includes("CE");
                  const formattedEntryTime = formatLocalDateTime(trade.entryDatetime);
                  const liveGain = liveMetrics.netPnl >= 0;

                  return (
                    <tr
                      key={`active-${trade.id}`}
                      id={`trade-row-${trade.id}`}
                      className="hover:bg-white/[0.04] transition-all duration-300 group/row relative border-l-2 border-l-emerald-400 bg-emerald-500/[0.04]"
                    >
                      {/* Sticky Pinned Left Column (Contract / Strike) */}
                      <td className="py-3.5 px-4 sticky left-0 z-10 border-r border-white/10 shadow-[4px_0_12px_rgba(0,0,0,0.3)] transition-colors whitespace-nowrap min-w-[240px] bg-[#07131e] group-hover/row:bg-[#0b1d2e]">
                        <div className="flex items-center gap-2.5 whitespace-nowrap">
                          <span className="w-3.5 h-3.5 flex items-center justify-center">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                          </span>
                          <span className={clsx(
                            "px-2 py-0.5 rounded-lg text-[10px] font-black uppercase font-mono border shadow-sm shrink-0",
                            isCE
                              ? "bg-cyan-500/20 text-cyan-100 border-cyan-400/40 shadow-[0_0_8px_rgba(6,182,212,0.15)]"
                              : "bg-rose-500/20 text-rose-100 border-rose-400/40 shadow-[0_0_8px_rgba(244,63,94,0.15)]"
                          )}>
                            {isCE ? "CE" : "PE"}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <strong className="text-white font-bold text-xs group-hover/row:text-cyan-300 transition-colors block whitespace-nowrap">
                                {trade.symbol}
                              </strong>
                              <span className="px-1.5 py-0.2 rounded-full text-[8.5px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                                LIVE
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-sans block whitespace-nowrap">
                              {trade.strategyTag || "Practice Scalp"} · {trade.quantity || 1} Lot
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Entry Time */}
                      <td className="py-3.5 px-3 text-slate-400 text-[11px] whitespace-nowrap font-mono min-w-[130px]">
                        <span>{formattedEntryTime}</span>
                      </td>

                      {/* End Time (Exit) */}
                      <td className="py-3.5 px-3 whitespace-nowrap font-mono min-w-[130px]">
                        <span className="text-emerald-400 font-bold text-[11px] flex items-center gap-1.5 whitespace-nowrap">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span>Live In-Flight</span>
                        </span>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1 font-sans mt-0.5 whitespace-nowrap">
                          <Clock className="w-2.5 h-2.5 text-cyan-400 shrink-0" />
                          <span>{calculateTradeDuration(trade.entryDatetime, new Date().toISOString())}</span>
                        </span>
                      </td>

                      {/* Entry (₹) */}
                      <td className="py-3.5 px-3 text-right text-slate-300 whitespace-nowrap min-w-[95px]">
                        <span className="font-mono tabular-nums text-slate-300">₹{Number(trade.entryPrice || 0).toFixed(2)}</span>
                      </td>

                      {/* Exit / LTP (₹) */}
                      <td className="py-3.5 px-3 text-right whitespace-nowrap min-w-[95px]">
                        <div className="flex items-center justify-end gap-1">
                          <span className={clsx("font-mono tabular-nums font-bold", liveGain ? "text-emerald-400" : "text-rose-400")}>
                            ₹{currentLtp.toFixed(2)}
                          </span>
                          <span className="text-[8.5px] font-mono px-1 py-0.2 rounded bg-white/10 text-cyan-300 font-bold">LTP</span>
                        </div>
                      </td>

                      {/* Target (₹) */}
                      <td className="py-3.5 px-3 text-right text-emerald-400 font-semibold whitespace-nowrap min-w-[95px]">
                        <span className="font-mono tabular-nums text-emerald-400 font-semibold">₹{Number(trade.targetPrice || 0).toFixed(2)}</span>
                      </td>

                      {/* Stop Loss (₹) */}
                      <td className="py-3.5 px-3 text-right text-rose-400 font-semibold whitespace-nowrap min-w-[95px]">
                        <span className="font-mono tabular-nums text-rose-400 font-semibold">₹{Number(trade.stopLoss || 0).toFixed(2)}</span>
                      </td>

                      {/* Close Reason / Status */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap min-w-[160px]">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-sans font-bold border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 shadow-sm whitespace-nowrap shrink-0">
                          <Activity className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Active Tracking</span>
                        </span>
                      </td>

                      {/* Live Unrealized MTM P&L */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap min-w-[175px]">
                        <div className="flex items-baseline justify-end gap-1.5 whitespace-nowrap">
                          <span className={clsx("text-sm font-black font-mono tabular-nums tracking-tight", liveGain ? "text-emerald-400" : "text-rose-400")}>
                            {liveMetrics.netPnl >= 0 ? "+" : ""}₹{liveMetrics.netPnl.toFixed(2)}
                          </span>
                          <span className="text-[9px] font-mono font-bold px-1 rounded bg-white/10 text-cyan-300 shrink-0">
                            MTM
                          </span>
                        </div>
                        <div className="flex items-center justify-end gap-1.5 text-[10px] font-mono whitespace-nowrap mt-0.5">
                          <span className="text-slate-400">Gross: {liveMetrics.grossPnl >= 0 ? "+" : ""}₹{liveMetrics.grossPnl.toFixed(2)}</span>
                          <span className="text-slate-600">·</span>
                          <span className="text-cyan-300/80">Friction: ~₹55.20</span>
                        </div>
                      </td>

                      {/* Actions: Inline Instant Square Off */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap min-w-[195px]">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              soundEngine.playTradeExitTone();
                              squareOffTrade(trade.id, currentLtp);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-sm"
                            title="Square off this active practice trade immediately at current LTP"
                          >
                            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                            <span>Square Off @ LTP</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                const outcome = getTradeOutcome(trade);
                const isGain = outcome.isNetGain;
                const sym = String(trade.symbol || "");
                const isCE = trade.optionType === "CALL" || sym.includes("CE");
                const formattedEntryTime = formatLocalDateTime(trade.entryDatetime);
                const formattedExitTime = formatLocalDateTime(trade.exitDatetime || trade.entryDatetime);
                const duration = calculateTradeDuration(trade.entryDatetime, trade.exitDatetime, trade.duration);
                const netReturnPct = outcome.netReturnPct;
                const isHighlighted = highlightedTradeId === trade.id;

                return (
                  <React.Fragment key={trade.id}>
                    <tr 
                      id={`trade-row-${trade.id}`}
                      className={clsx(
                        "hover:bg-white/[0.04] transition-all duration-300 group/row relative border-l-2",
                        isCE ? "border-l-cyan-400" : "border-l-rose-500",
                        isHighlighted ? "bg-cyan-500/20 ring-1 ring-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]" : "",
                        activeTimelineTrade?.id === trade.id ? "bg-white/[0.06]" : ""
                      )}
                    >
                      {/* Sticky Pinned Left Column (Contract / Strike) */}
                      <td className={clsx(
                        "py-3.5 px-4 sticky left-0 z-10 border-r border-white/10 shadow-[4px_0_12px_rgba(0,0,0,0.3)] transition-colors whitespace-nowrap min-w-[240px]",
                        isHighlighted ? "bg-[#0a1e36]" : "bg-[#070e1b] group-hover/row:bg-[#0c1930]"
                      )}>
                        <div className="flex items-center gap-2.5 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedTradeIds.has(trade.id)}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleToggleSelectTrade(trade.id);
                            }}
                            className="w-3.5 h-3.5 rounded border-white/20 bg-white/5 text-cyan-500 focus:ring-cyan-400/50 cursor-pointer accent-cyan-500 shrink-0"
                          />
                          <span className={clsx(
                            "px-2 py-0.5 rounded-lg text-[10px] font-black uppercase font-mono border shadow-sm shrink-0",
                            isCE 
                              ? "bg-cyan-500/20 text-cyan-100 border-cyan-400/40 shadow-[0_0_8px_rgba(6,182,212,0.15)]" 
                              : "bg-rose-500/20 text-rose-100 border-rose-400/40 shadow-[0_0_8px_rgba(244,63,94,0.15)]"
                          )}>
                            {isCE ? "CE" : "PE"}
                          </span>
                          <div className="min-w-0">
                            <strong className="text-white font-bold text-xs group-hover/row:text-cyan-300 transition-colors block whitespace-nowrap">
                              {trade.symbol}
                            </strong>
                            <span className="text-[10px] text-slate-400 font-sans block whitespace-nowrap">
                              {trade.strategyTag || "Practice Scalp"}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-3 text-slate-400 text-[11px] whitespace-nowrap font-mono min-w-[130px]">
                        <span>{formattedEntryTime}</span>
                      </td>

                      <td className="py-3.5 px-3 whitespace-nowrap font-mono min-w-[130px]">
                        <span className="text-cyan-300 font-bold text-[11px] block whitespace-nowrap">{formattedExitTime}</span>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1 font-sans mt-0.5 whitespace-nowrap">
                          <Clock className="w-2.5 h-2.5 text-cyan-400 shrink-0" />
                          <span>{duration}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-right text-slate-300 whitespace-nowrap min-w-[95px]">
                        <span className="font-mono tabular-nums text-slate-300">₹{Number(trade.entryPrice || 0).toFixed(2)}</span>
                      </td>

                      <td className="py-3.5 px-3 text-right text-white font-bold whitespace-nowrap min-w-[95px]">
                        <span className="font-mono tabular-nums text-white font-bold">₹{Number(trade.exitPrice || 0).toFixed(2)}</span>
                      </td>

                      <td className="py-3.5 px-3 text-right text-emerald-400 font-semibold whitespace-nowrap min-w-[95px]">
                        <span className="font-mono tabular-nums text-emerald-400 font-semibold">₹{Number(trade.targetPrice || 0).toFixed(2)}</span>
                      </td>

                      <td className="py-3.5 px-3 text-right text-rose-400 font-semibold whitespace-nowrap min-w-[95px]">
                        <span className="font-mono tabular-nums text-rose-400 font-semibold">₹{Number(trade.stopLoss || 0).toFixed(2)}</span>
                      </td>

                      <td className="py-3.5 px-3 text-center whitespace-nowrap min-w-[160px]">
                        <span 
                          className={clsx(
                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-sans font-bold border shadow-sm transition-all whitespace-nowrap shrink-0",
                            outcome.badgeClass
                          )}
                          title={outcome.description}
                        >
                          {outcome.type === "TARGET_HIT" ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Target Hit</span>
                            </>
                          ) : outcome.type === "PROFIT_EXIT" ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{outcome.label}</span>
                            </>
                          ) : outcome.type === "TRUE_BREAKEVEN" ? (
                            <>
                              <ShieldCheck className="w-3.5 h-3.5 text-cyan-300" />
                              <span>True Breakeven</span>
                            </>
                          ) : outcome.type === "TRAILED_BE_DRAG" ? (
                            <>
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Trailed BE (Friction)</span>
                            </>
                          ) : (
                            <>
                              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                              <span>Stop Cut</span>
                            </>
                          )}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap min-w-[175px]">
                        <div 
                          className="flex items-baseline justify-end gap-1.5 whitespace-nowrap"
                          title={`Real Gross Market Gain: ${outcome.grossPnl >= 0 ? "+" : ""}₹${outcome.grossPnl.toFixed(2)} (${outcome.grossPts >= 0 ? "+" : ""}${outcome.grossPts.toFixed(2)} pts) · Friction Taxes: -₹${Number(trade.charges ?? outcome.charges ?? 55.20).toFixed(2)} · Net Realized: ${trade.netPnl >= 0 ? "+" : ""}₹${Number(trade.netPnl || 0).toFixed(2)}`}
                        >
                          <span 
                            className={clsx(
                              "text-sm font-black font-mono tabular-nums tracking-tight",
                              isGain ? "text-emerald-400" : outcome.type === "TRAILED_BE_DRAG" ? "text-slate-300" : "text-rose-400"
                            )}
                          >
                            {trade.netPnl >= 0 ? "+" : ""}₹{Number(trade.netPnl || 0).toFixed(2)}
                          </span>
                          <span 
                            className={clsx(
                              "text-[10px] font-mono font-bold shrink-0",
                              isGain ? "text-emerald-400/80" : outcome.type === "TRAILED_BE_DRAG" ? "text-slate-400" : "text-rose-400/80"
                            )}
                          >
                            ({netReturnPct > 0 ? "+" : ""}{netReturnPct.toFixed(2)}%)
                          </span>
                        </div>
                        <div className="flex items-center justify-end gap-1.5 text-[10px] font-mono whitespace-nowrap mt-0.5">
                          <span 
                            className="text-slate-300 font-semibold" 
                            title="Real Gross Market Profit before brokerage & statutory charges"
                          >
                            Real: {outcome.grossPnl >= 0 ? "+" : ""}₹{outcome.grossPnl.toFixed(2)}
                          </span>
                          <span className="text-slate-600">·</span>
                          <span 
                            className="text-cyan-300/80 font-medium" 
                            title="Upstox flat ₹40 round-trip brokerage + STT + GST & exchange turnover charges"
                          >
                            Charges: ₹{Number(trade.charges ?? outcome.charges ?? 55.20).toFixed(2)}
                          </span>
                        </div>
                      </td>

                      {/* 10th Column: Interactive Timeline & Delete Action Buttons */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap min-w-[195px]">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              soundEngine.playTabSwitchTone();
                              setActiveTimelineTrade(trade);
                            }}
                            className={clsx(
                              "px-2.5 py-1.5 rounded-xl text-[11px] font-bold font-mono transition-all cursor-pointer inline-flex items-center gap-1.5 border active:scale-95 group/tl-btn",
                              activeTimelineTrade?.id === trade.id
                                ? "bg-white text-zinc-950 font-extrabold border-white shadow-[0_0_20px_rgba(255,255,255,0.35)] ring-1 ring-white/50"
                                : "bg-white/[0.04] hover:bg-white/10 text-zinc-300 hover:text-white border-white/10 hover:border-white/25 shadow-sm"
                            )}
                            title="Inspect full price journey flight path, MFE/MAE excursion, & psychology post-mortem"
                          >
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                            </span>
                            <Activity className={clsx(
                              "w-3.5 h-3.5 transition-transform group-hover/tl-btn:scale-110",
                              activeTimelineTrade?.id === trade.id ? "text-black" : "text-emerald-400"
                            )} />
                            <span>Timeline</span>
                            <ChevronRight className="w-3 h-3 text-zinc-400 group-hover/tl-btn:text-white group-hover/tl-btn:translate-x-0.5 transition-transform" />
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              soundEngine.playDeleteTone();
                              deleteJournalTradesWithUndo(trade);
                            }}
                            className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold font-mono transition-all cursor-pointer inline-flex items-center gap-1.5 border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-100 hover:border-rose-500/40 active:scale-95 shadow-sm group/del-btn flex-shrink-0"
                            title="Delete trade permanently from database (with 5s Undo)"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-400 group-hover/del-btn:text-rose-200 transition-transform group-hover/del-btn:scale-110" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Viewport Pagination Throttle (Prevents DOM Bloat) */}
      {filteredAlerts.length > 20 && (
        <div className="flex items-center justify-between pt-1 text-xs font-mono text-slate-400">
          <span>
            Showing <strong className="text-white">{visibleAlerts.length}</strong> of <strong className="text-white">{filteredAlerts.length}</strong> trades
          </span>
          <button
            type="button"
            onClick={() => setShowAllRows(!showAllRows)}
            className="px-3 py-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-zinc-200 font-bold transition cursor-pointer active:scale-95"
          >
            {showAllRows ? "Show Top 20 Rows" : `View All ${filteredAlerts.length} Rows`}
          </button>
        </div>
      )}

                    {/* Standalone Trade Market Journey Timeline Modal (React Portal Stacking Isolation) */}
      
      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {activeTimelineTrade && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-2xl p-2 sm:p-4 md:p-6 flex items-center justify-center overflow-y-auto"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  soundEngine.playTabSwitchTone();
                  setActiveTimelineTrade(null);
                }
              }}
            >
              <motion.div
                initial={{ scale: 0.95, y: 20, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.95, y: 20, opacity: 0 }}
                transition={{ type: "spring", damping: 30, stiffness: 350 }}
                className="w-full max-w-6xl max-h-[94vh] flex flex-col rounded-[32px] bg-[#060813]/95 border border-white/[0.14] shadow-[0_40px_120px_-20px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.20),inset_0_0_0_1px_rgba(255,255,255,0.05)] backdrop-blur-3xl overflow-hidden relative"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Apple Studio Ambient Top Spotlight */}
                <div className="absolute inset-x-0 top-0 h-48 bg-[radial-gradient(ellipse_70%_100%_at_50%_-20%,rgba(56,189,248,0.12),transparent_70%)] pointer-events-none" />
                <div className="overflow-y-auto flex-1 custom-dark-scrollbar p-4 sm:p-6 relative z-10">
                  <TradeMarketJourneyTimeline
                    trade={activeTimelineTrade}
                    onClose={() => setActiveTimelineTrade(null)}
                    isModalView={true}
                    initialFlightScope="scalp"
                    carouselNav={{
                      currentIndex: activeTradeIndex,
                      totalCount: activeTradeList.length,
                      hasPrev: activeTradeIndex > 0,
                      hasNext: activeTradeIndex < activeTradeList.length - 1,
                      onPrev: handlePrevTimelineTrade,
                      onNext: handleNextTimelineTrade,
                      batchLabel: selectedBatchNum ? `Batch #${selectedBatchNum}` : `All Settled`
                    }}
                  />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Luxury Custom Date Range Picker Modal */}
      <LuxuryDateRangePicker
        isOpen={isCalendarOpen}
        onClose={() => setCalendarOpen(false)}
        startDate={customStart}
        endDate={customEnd}
        onApplyRange={handleApplyCustomRange}
      />
    </div>
  );
});
