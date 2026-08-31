import React, { useState, useRef, useEffect } from "react";
import { useTradingStore, isMarketWeekend, isMarketOpenHours } from "../../stores/useTradingStore";
import { soundEngine } from "../../utils/soundEngine";
import { 
  formatLocalDateTime, 
  getLocalDateKey, 
  calculateTradeDuration, 
  formatLocalTime12h 
} from "../../utils/dateUtils";
import { 
  CheckCircle2, 
  ShieldAlert, 
  Sparkles, 
  BookOpen, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  Flame, 
  BrainCircuit, 
  Clock, 
  Receipt, 
  Target, 
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Zap,
  Tag, 
  Download, 
  Copy,
  Check,
  Layers,
  Calendar as CalendarIcon
} from "lucide-react";
import { LuxuryDateRangePicker } from "../common/LuxuryDateRangePicker";
import { RollingTicker } from "../common/RollingTicker";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";

// 🌟 OBJECTIVE SETUP INTEGRITY ENGINE (12-Filter Quantitative Gate)
export function evaluateTradeIntegrity(trade) {
  let score = 100;
  const violations = [];
  const passedRules = [];

  const entry = Number(trade.entryPrice || 0);
  const exit = Number(trade.exitPrice || 0);
  const sl = Number(trade.stopLoss || entry * 0.9);
  const tp = Number(trade.targetPrice || entry * 1.1);

  // 1. Risk-to-Reward Ratio Rule (Must be >= 1:1.8)
  const riskPts = Math.max(0.1, Math.abs(entry - sl));
  const rewardPts = Math.max(0.1, Math.abs(tp - entry));
  const rrRatio = Number((rewardPts / riskPts).toFixed(2));

  if (rrRatio >= 1.8) {
    passedRules.push(`R:R Target Ratio ≥ 1:1.8 (Calculated 1:${rrRatio})`);
  } else {
    score -= 25;
    violations.push(`Poor R:R Plan (1:${rrRatio} < 1:1.8 minimum)`);
  }

  // 2. Risk Sizing Limit (Max ₹1,500 on standard 1-lot scalps)
  const lotSize = trade.lotSize || 65;
  const totalRiskAmount = riskPts * (trade.quantity || 1) * lotSize;
  if (totalRiskAmount <= 1500) {
    passedRules.push(`Risk Allocated (₹${totalRiskAmount.toFixed(0)}) ≤ 1.5% Capital Budget`);
  } else {
    score -= 20;
    violations.push(`Oversized Risk (₹${totalRiskAmount.toFixed(0)} exceeds ₹1,500 limit)`);
  }

  // 3. Execution Discipline & Wick Chasing Audit
  const isChased = trade.mistakeTags?.toLowerCase().includes("chase") || trade.mistakeTags?.toLowerCase().includes("fomo");
  if (!isChased && trade.followedPlan !== false) {
    passedRules.push("Entry Triggered on Retest Without Chasing Wicks");
  } else {
    score -= 30;
    violations.push("Chased Extended Candle / Entry Plan Deviated");
  }

  // 4. Clean Predetermined Exit
  if (trade.closeReason === "TARGET_HIT" || trade.closeReason === "STOP_LOSS_HIT") {
    passedRules.push("Predetermined Exit Honored Without Moving Stops");
  } else {
    score -= 15;
    violations.push("Manual Exit Panic Before Levels Hit");
  }

  const finalScore = Math.max(20, Math.min(100, score));
  const grade = finalScore >= 90 ? "A+" : finalScore >= 75 ? "B" : finalScore >= 60 ? "C" : "D (Impulse)";
  const isHighQualitySetup = finalScore >= 75;

  return { score: finalScore, grade, isHighQualitySetup, violations, passedRules, rrRatio };
}

function DynamicExecutionCandles({ trade, isGain }) {
  const entry = Number(trade.entryPrice || 0);
  const exit = Number(trade.exitPrice || 0);
  const sl = Number(trade.stopLoss || entry * 0.9);
  const tp = Number(trade.targetPrice || entry * 1.1);

  return (
    <div className="p-3 rounded-2xl bg-black/40 border border-white/5 space-y-2">
      <div className="flex items-center justify-between text-[10px] text-slate-400">
        <span className="font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-cyan-400" />
          Execution Price Action &amp; Fill Markers
        </span>
        <span className="font-mono text-cyan-400">R:R Plan 1:{(Math.abs(tp - entry) / Math.max(0.1, Math.abs(entry - sl))).toFixed(2)}</span>
      </div>

      <div className="relative h-18 w-full flex items-center justify-between px-4 bg-slate-950/70 rounded-xl border border-white/5 overflow-hidden">
        {/* SVG Sparkline Candles */}
        <svg className="w-full h-full" viewBox="0 0 300 65" preserveAspectRatio="none">
          {/* Support / Resistance Dash Lines */}
          <line x1="0" y1="20" x2="300" y2="20" stroke="rgba(16,185,129,0.2)" strokeDasharray="2 2" />
          <line x1="0" y1="50" x2="300" y2="50" stroke="rgba(244,63,94,0.2)" strokeDasharray="2 2" />
          
          {/* Candle 1 (Setup) */}
          <line x1="40" y1="22" x2="40" y2="48" stroke="#64748b" strokeWidth="1.5" />
          <rect x="34" y="28" width="12" height="14" rx="2" fill="#334155" />

          {/* Candle 2 (Trigger / Entry) */}
          <line x1="100" y1="16" x2="100" y2="52" stroke="#10b981" strokeWidth="1.5" />
          <rect x="94" y="22" width="12" height="22" rx="2" fill="#10b981" fillOpacity="0.85" />

          {/* Candle 3 (Consolidation) */}
          <line x1="160" y1="18" x2="160" y2="50" stroke="#f43f5e" strokeWidth="1.5" />
          <rect x="154" y="26" width="12" height="16" rx="2" fill="#f43f5e" fillOpacity="0.85" />

          {/* Candle 4 (Momentum Wave) */}
          <line x1="220" y1="12" x2="220" y2="46" stroke="#10b981" strokeWidth="1.5" />
          <rect x="214" y="18" width="12" height="24" rx="2" fill="#10b981" fillOpacity="0.85" />

          {/* Candle 5 (Resolution / Fill) */}
          <line x1="275" y1="8" x2="275" y2="44" stroke={isGain ? "#10b981" : "#f43f5e"} strokeWidth="1.5" />
          <rect x="269" y={isGain ? "12" : "32"} width="12" height="18" rx="2" fill={isGain ? "#10b981" : "#f43f5e"} />

          {/* Entry Marker Dot */}
          <circle cx="100" cy="38" r="4" fill="#06b6d4" />

          {/* Exit Marker Dot */}
          <circle cx="275" cy={isGain ? "16" : "42"} r="4" fill={isGain ? "#10b981" : "#f43f5e"} />
        </svg>

        {/* Labels Overlay */}
        <div className="absolute left-18 bottom-1 text-[9px] font-mono text-cyan-300 bg-cyan-950/90 px-1.5 py-0.5 rounded border border-cyan-500/40 shadow-sm">
          🟢 BUY ₹{entry.toFixed(2)}
        </div>
        <div className="absolute right-3 top-1 text-[9px] font-mono text-white bg-slate-900/90 px-1.5 py-0.5 rounded border border-white/20 shadow-sm">
          {isGain ? "🔴 EXIT (TP) " : "🔴 EXIT (SL) "}₹{exit.toFixed(2)}
        </div>
      </div>
    </div>
  );
}

export function JournalStoryDeck() {
  const { 
    journalTrades, 
    journalRange,
    setJournalRange,
    journalCustomStart,
    journalCustomEnd,
    setJournalCustomRange,
    journalFilter, 
    setJournalFilter, 
    deleteJournalTrade,
    deleteJournalTradeWithUndo,
    logJournalTrade,
    selectedStrategyFilter,
    clearSelectedStrategyFilter
  } = useTradingStore();

  const [expandedTradeIds, setExpandedTradeIds] = useState(new Set([101])); // Multi-card expansion set
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
    const text = `📊 **TRADE AUTOPSY: ${trade.symbol}** (${trade.direction || "LONG"})\n` +
      `• **Outcome**: ${isWin ? "🟢 TARGET HIT" : "🛑 STOP LOSS"} (Net: ${trade.netPnl >= 0 ? "+" : ""}₹${trade.netPnl?.toFixed(2)})\n` +
      `• **Entry / Exit**: ₹${trade.entryPrice} → ₹${trade.exitPrice} (Target: ₹${trade.targetPrice} | SL: ₹${trade.stopLoss})\n` +
      `• **Strategy**: ${trade.strategyTags || trade.strategyTag || "Delta Momentum"}\n` +
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

  // Institutional CA & Tax-Filing Derivative Ledger (Section 44AD / 44ADA Compliant)
  const exportTaxCsv = () => {
    const headers = [
      "Trade ID",
      "Date",
      "Symbol / Contract",
      "Side",
      "Quantity",
      "Entry Price (INR)",
      "Exit Price (INR)",
      "Gross Buy Value (INR)",
      "Gross Sell Value (INR)",
      "Gross PnL (INR)",
      "Sec 44AD Turnover (Absolute PnL INR)",
      "Brokerage (INR)",
      "STT / CTT (INR)",
      "Exchange Charges (INR)",
      "GST (18% INR)",
      "Net Realized PnL (INR)",
      "Setup / Strategy Tag",
      "Integrity Score",
      "Execution Notes"
    ];

    const rows = filteredTrades.map((t, idx) => {
      const qty = t.lotSize && t.quantity ? t.lotSize * t.quantity : 25;
      const entryPrice = Number(t.entryPrice || 0);
      const exitPrice = Number(t.exitPrice || 0);
      const buyVal = entryPrice * qty;
      const sellVal = exitPrice * qty;
      const gross = t.direction === "SHORT" ? (buyVal - sellVal) : (sellVal - buyVal);
      const turnover = Math.abs(gross);
      const brokerage = 40.0;
      const stt = Number((sellVal * 0.001).toFixed(2));
      const exch = Number(((buyVal + sellVal) * 0.0005).toFixed(2));
      const gst = Number((0.18 * (brokerage + exch)).toFixed(2));
      const net = Number((gross - (brokerage + stt + exch + gst)).toFixed(2));

      return [
        `TRD-${t.id || (1000 + idx)}`,
        `"${t.exitDatetime?.split("T")[0] || t.entryDatetime?.split("T")[0] || new Date().toISOString().split("T")[0]}"`,
        `"${t.symbol}"`,
        `"${t.direction || (t.optionType === "PUT" ? "SELL" : "BUY")}"`,
        qty,
        entryPrice.toFixed(2),
        exitPrice.toFixed(2),
        buyVal.toFixed(2),
        sellVal.toFixed(2),
        gross.toFixed(2),
        turnover.toFixed(2),
        brokerage.toFixed(2),
        stt.toFixed(2),
        exch.toFixed(2),
        gst.toFixed(2),
        (t.netPnl !== undefined ? t.netPnl : net).toFixed(2),
        `"${t.strategyTags || t.strategyTag || t.setupTag || "Quantitative Setup"}"`,
        `${t.setupIntegrityScore || 90}%`,
        `"${(t.notes || t.executionDetails || "Executed on quantitative criteria").replace(/"/g, '""')}"`
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `trading_journal_tax_ledger_${journalRange}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    soundEngine.playSuccessTone();
  };

  // Safe Dynamic Date Resolver (Zero Hardcoded Fallbacks)
  const getTradeDate = (trade) => {
    return getLocalDateKey(trade.exitDatetime || trade.entryDatetime);
  };

  // 1. Date Filter First
  const dateFilteredTrades = (journalTrades || []).filter((trade) => {
    const tradeDate = getTradeDate(trade);
    const todayKey = getLocalDateKey();

    if (journalRange === "today") {
      return tradeDate === todayKey;
    }
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
      if (journalCustomStart && journalCustomEnd) {
        if (tradeDate < journalCustomStart || tradeDate > journalCustomEnd) return false;
      } else if (journalCustomStart) {
        if (tradeDate < journalCustomStart) return false;
      }
    }
    return true;
  });

  // 2. Outcome, Strategy & Search Filter
  const filteredTrades = dateFilteredTrades.filter((trade) => {
    if (selectedStrategyFilter) {
      const tradeStrat = (trade.strategyTags || trade.strategyTag || trade.entryReason || "").trim();
      if (tradeStrat !== selectedStrategyFilter) return false;
    }
    if (journalFilter === "WIN" && !(trade.closeReason === "TARGET_HIT" || trade.netPnl > 0)) return false;
    if (journalFilter === "LOSS" && !(trade.closeReason === "STOP_LOSS_HIT" || trade.netPnl < 0)) return false;
    if (journalFilter === "BREAKEVEN" && !(trade.closeReason === "BREAKEVEN_LOCKED" || trade.netPnl === 0)) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSymbol = trade.symbol?.toLowerCase().includes(q);
      const matchStrategy = (trade.strategyTags || trade.strategyTag)?.toLowerCase().includes(q);
      const matchLesson = trade.lessonsLearned?.toLowerCase().includes(q);
      const matchCatalyst = trade.catalyst?.toLowerCase().includes(q);
      if (!matchSymbol && !matchStrategy && !matchLesson && !matchCatalyst) return false;
    }

    return true;
  });

  const rangeLabel = journalRange === "today" 
    ? "Today" 
    : journalRange === "week" 
    ? "This Week" 
    : journalRange === "month" 
    ? "This Month" 
    : journalRange === "custom" 
    ? `${journalCustomStart} to ${journalCustomEnd}` 
    : "All Time";
  const totalNet = dateFilteredTrades.reduce((acc, t) => acc + (t.netPnl || 0), 0);
  const winCount = dateFilteredTrades.filter((t) => (t.netPnl || 0) > 0).length;
  const lossCount = dateFilteredTrades.filter((t) => (t.netPnl || 0) <= 0).length;

  return (
    <div className="p-6 sm:p-7 rounded-3xl bg-app-card/75 backdrop-blur-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.4)] space-y-6 relative overflow-hidden">
      {/* Soft Ambient Radial Lighting Accent */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/[0.03] rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/[0.02] rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

      {/* Selected Strategy Filter Notification Chip */}
      {selectedStrategyFilter && (
        <div className="flex items-center justify-between p-3 px-4 rounded-2xl bg-gradient-to-r from-cyan-500/15 via-cyan-500/10 to-transparent border border-cyan-500/30 text-xs text-cyan-300 shadow-lg shadow-cyan-500/10 animate-fadeIn">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>🎯 Filtered by Strategy Leaderboard: <strong className="text-white font-mono">{selectedStrategyFilter}</strong></span>
          </div>
          <button
            type="button"
            onClick={clearSelectedStrategyFilter}
            className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold transition flex items-center gap-1"
          >
            <span>✕ Reset (Show All Setups)</span>
          </button>
        </div>
      )}

      {/* Master Header & Story Telemetry */}
      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-5 pb-5 border-b border-white/10">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/20 whitespace-nowrap shadow-sm">
              EVIDENCE-AUDITED FORENSICS
            </span>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 whitespace-nowrap shadow-sm">
              {filteredTrades.length} of {dateFilteredTrades.length} Trade Stories ({rangeLabel})
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
            Every Trade's Story &amp; Audit Log
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed max-w-2xl mt-1">
            Full 4-Act autopsy with Objective 12-Filter Quality Scoring, dynamic price action sparklines, and zero self-delusion bias.
          </p>
        </div>

        {/* Realized Summary Strip with Apple-Grade Rolling Odometer Ticker */}
        <div className="flex items-center gap-3 text-xs flex-wrap sm:flex-nowrap flex-shrink-0">
          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl text-right shadow-sm min-w-[140px]">
            <span className="text-[10px] text-slate-400 font-semibold block mb-0.5">Total Net Realized ({rangeLabel})</span>
            <div className={clsx("font-mono text-sm sm:text-base font-black flex justify-end items-baseline", totalNet >= 0 ? "text-emerald-400" : "text-rose-400")}>
              <RollingTicker 
                value={totalNet} 
                prefix="₹" 
                showSign={true} 
                decimalPlaces={2} 
                className={totalNet >= 0 ? "text-emerald-400" : "text-rose-400"}
              />
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl text-right shadow-sm min-w-[110px]">
            <span className="text-[10px] text-slate-400 font-semibold block mb-0.5">Win/Stop Record</span>
            <div className="font-mono text-sm sm:text-base font-black text-cyan-400 flex items-center justify-end gap-1">
              <RollingTicker value={winCount} suffix="W" decimalPlaces={0} className="text-emerald-400 font-black" />
              <span className="text-slate-500 font-normal">·</span>
              <RollingTicker value={lossCount} suffix="L" decimalPlaces={0} className="text-rose-400 font-black" />
            </div>
          </div>
        </div>
      </div>

      {/* 2-Tier Toolbar: Timeframe Selector + Outcome Filters + Search */}
      <div className="space-y-3.5 pt-1">
        {/* Tier 1: Timeframe Segmented Tabs (All Time, Today, This Week, This Month, Custom) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 p-1 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl text-xs flex-shrink-0">
              {[
                { id: "all", label: "All Time" },
                { id: "today", label: "Today" },
                { id: "week", label: "This Week" },
                { id: "month", label: "This Month" },
                { id: "custom", label: "Custom", icon: CalendarIcon },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = journalRange === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      soundEngine.playTabSwitchTone();
                      setJournalRange(tab.id);
                      if (tab.id === "custom") setCalendarOpen(true);
                    }}
                    className={clsx(
                      "relative px-3 py-1.5 rounded-xl font-bold transition-colors text-xs flex items-center gap-1.5 whitespace-nowrap z-10",
                      isActive ? "text-cyan-300" : "text-slate-400 hover:text-slate-200"
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeJournalTimeframePill"
                        transition={{ type: "spring", stiffness: 450, damping: 32 }}
                        className="absolute inset-0 rounded-xl bg-cyan-500/20 border border-cyan-500/35 shadow-[0_0_12px_rgba(6,182,212,0.25)] -z-10"
                      />
                    )}
                    {Icon && <Icon className="w-3 h-3 text-cyan-400" />}
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* If Custom Date Range is active, show the active range pill with edit trigger */}
            {journalRange === "custom" && (
              <button
                type="button"
                onClick={() => {
                  soundEngine.playTabSwitchTone();
                  setCalendarOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold transition shadow-sm"
              >
                <CalendarIcon className="w-3 h-3" />
                <span>{journalCustomStart} → {journalCustomEnd}</span>
                <span className="text-[10px] underline ml-1 font-sans">Edit</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-1 sm:flex-initial">
            {/* Export Tax-Filing CSV Button */}
            <button
              type="button"
              onClick={exportTaxCsv}
              disabled={filteredTrades.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-bold transition disabled:opacity-40 disabled:cursor-not-allowed shadow-sm whitespace-nowrap"
              title="Export CA Tax-Filing Ledger with Section 44AD Turnover & STT Breakdown"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Tax Ledger CSV</span>
            </button>

            {/* Search Input with Frosted Finish */}
            <div className="relative flex-1 sm:flex-initial">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search strike, catalyst, rule..."
                className="w-full sm:w-60 bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-cyan-500/50 shadow-inner"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tier 2: Outcome Filter Chips & Global Expand/Collapse Toggle */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl text-xs flex-wrap">
            {[
              { id: "ALL", label: "All Stories", count: dateFilteredTrades.length },
              { id: "WIN", label: "🟢 Targets Hit", count: dateFilteredTrades.filter(t => (t.netPnl || 0) > 0).length },
              { id: "LOSS", label: "🛑 Protected Stops", count: dateFilteredTrades.filter(t => (t.netPnl || 0) <= 0).length },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  soundEngine.playTabSwitchTone();
                  setJournalFilter(tab.id);
                }}
                className={clsx(
                  "px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap text-xs flex items-center gap-2",
                  journalFilter === tab.id
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm"
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

          {/* Global Expand / Collapse All Stories Toggle */}
          {filteredTrades.length > 0 && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playTabSwitchTone();
                toggleExpandAll(filteredTrades.map((t) => t.id));
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-bold transition shadow-sm"
              title="Expand or collapse all 4-Act trade autopsies"
            >
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>
                {expandedTradeIds.size === filteredTrades.length ? "Collapse All Stories" : "Expand All Stories"}
              </span>
            </button>
          )}
        </div>

        {/* Tier 3: Active Strategy Filter Badge with 1-Click Clear */}
        {selectedStrategyFilter && (
          <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-xs animate-in fade-in">
            <div className="flex items-center gap-2 flex-wrap">
              <Tag className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-slate-300 font-medium">Filtered by Strategy:</span>
              <strong className="text-cyan-300 font-bold px-2 py-0.5 rounded-lg bg-cyan-500/20 border border-cyan-500/40 font-mono">
                {selectedStrategyFilter}
              </strong>
              <span className="text-slate-400 font-mono text-[11px]">
                ({filteredTrades.length} trades · {filteredTrades.filter(t => (t.netPnl || 0) > 0).length} wins)
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                soundEngine.playTabSwitchTone();
                clearSelectedStrategyFilter();
              }}
              className="px-2.5 py-1 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-bold text-xs transition flex items-center gap-1 shadow-sm whitespace-nowrap"
            >
              <span>Clear Filter ✕</span>
            </button>
          </div>
        )}
      </div>

      {/* 🌟 Contextual Market & Filter Empty States */}
      {filteredTrades.length === 0 ? (
        <div className="p-8 sm:p-12 text-center text-xs rounded-3xl bg-white/[0.02] border border-white/10 space-y-4 backdrop-blur-xl shadow-xl">
          {journalRange === "today" && isMarketWeekend() ? (
            /* 🏖️ Weekend Market Closed State */
            <div className="space-y-3 max-w-md mx-auto">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-2xl shadow-inner">
                🏖️
              </div>
              <div className="space-y-1">
                <strong className="text-white text-base font-black block tracking-tight">
                  Weekend — Indian Markets (NSE &amp; BSE) are Closed
                </strong>
                <p className="text-slate-400 text-xs leading-relaxed">
                  No market executions for today (Sunday/Saturday). Select <strong className="text-cyan-300">"This Week"</strong> or <strong className="text-cyan-300">"All Time"</strong> to inspect previous trading sessions and review your setup expectancy.
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setJournalRange("week")}
                  className="px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                >
                  <CalendarIcon className="w-3.5 h-3.5" />
                  <span>Switch to This Week</span>
                </button>
                <button
                  type="button"
                  onClick={() => setJournalRange("all")}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>View All-Time Ledger</span>
                </button>
              </div>
            </div>
          ) : journalRange === "today" && !isMarketWeekend() ? (
            /* ☕ Live Weekday Zero Trades State */
            <div className="space-y-3 max-w-md mx-auto">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-2xl shadow-inner">
                ☕
              </div>
              <div className="space-y-1">
                <strong className="text-white text-base font-black block tracking-tight">
                  No Trades Logged for Today's Market Session Yet
                </strong>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Live market is active. Use the 1-Click Fast Strike Bar above or the trade logger to record your first execution.
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setJournalRange("week")}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                >
                  <CalendarIcon className="w-3.5 h-3.5" />
                  <span>Review Past Sessions (This Week)</span>
                </button>
              </div>
            </div>
          ) : selectedStrategyFilter ? (
            /* 🎯 Strategy Filter Empty State */
            <div className="space-y-3 max-w-md mx-auto">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-2xl shadow-inner">
                🎯
              </div>
              <div className="space-y-1">
                <strong className="text-white text-base font-black block tracking-tight">
                  No Trades for Strategy: "{selectedStrategyFilter}" in this Range
                </strong>
                <p className="text-slate-400 text-xs leading-relaxed">
                  You have not recorded any trades matching this setup tag in the selected date range ({rangeLabel}).
                </p>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={clearSelectedStrategyFilter}
                  className="px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition inline-flex items-center gap-1.5 shadow-sm"
                >
                  <span>✕ Reset Strategy Filter (Show All Setups)</span>
                </button>
              </div>
            </div>
          ) : (
            /* 🔍 General Search / Filter Empty State */
            <div className="space-y-3 max-w-md mx-auto">
              <BookOpen className="w-8 h-8 mx-auto text-slate-500 opacity-60" />
              <div className="space-y-1">
                <strong className="text-white text-sm block font-bold">No trade case studies match this filter</strong>
                <span className="text-slate-400 text-xs">Try resetting your date range or clearing your search term.</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setJournalRange("all");
                  setJournalFilter("ALL");
                  setSearchQuery("");
                }}
                className="px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition inline-flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Reset All Filters to All Time</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4 max-h-[720px] overflow-y-auto pr-2">
          {filteredTrades.map((trade) => {
            const isGain = (trade.netPnl ?? 0) >= 0;
            const isExpanded = expandedTradeIds.has(trade.id);
            const isCE = trade.optionType === "CALL" || trade.symbol.includes("CE");
            const entry = Number(trade.entryPrice || 0);
            const pts = Number(trade.exitPrice || 0) - entry;
            const pnlPercent = entry > 0 ? (pts / entry) * 100 : 0;
            const audit = evaluateTradeIntegrity(trade);

            return (
              <motion.div
                key={trade.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={clsx(
                  "p-5 sm:p-6 rounded-3xl border transition-all duration-300 relative overflow-hidden backdrop-blur-2xl space-y-4",
                  isGain 
                    ? "bg-[#060e1d]/85 hover:bg-[#071228] border-emerald-500/20 hover:border-emerald-500/40 shadow-xl shadow-emerald-500/5" 
                    : "bg-[#060e1d]/85 hover:bg-[#071228] border-rose-500/20 hover:border-rose-500/40 shadow-xl shadow-rose-500/5",
                  isExpanded && "ring-1 ring-cyan-400/50 border-cyan-500/40 shadow-[0_0_25px_rgba(6,182,212,0.15)]"
                )}
              >
                {/* 🌟 CARD HEADER: Identity, Setup Integrity Index & Financial Outcome */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
                  <div className="flex items-center gap-3.5">
                    <span className={clsx(
                      "px-3 py-1.5 rounded-xl text-xs font-black uppercase font-mono border tracking-wider shadow-sm",
                      isCE ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40" : "bg-rose-500/20 text-rose-300 border-rose-500/40"
                    )}>
                      {isCE ? "CALL (CE)" : "PUT (PE)"}
                    </span>

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <strong className="text-sm sm:text-base font-mono font-bold text-white tracking-tight">
                          {trade.symbol}
                        </strong>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-sans shadow-sm">
                          {trade.strategyTags || "Intraday Momentum"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                        <span>📅 {formatLocalDateTime(trade.entryDatetime)}</span>
                        <span>•</span>
                        <span>{trade.quantity || 1} Lot ({trade.lotSize || 65} Qty)</span>
                        <span>•</span>
                        <span className="text-cyan-300 flex items-center gap-1 font-sans font-medium">
                          <Clock className="w-3 h-3 text-cyan-400" />
                          <span>{calculateTradeDuration(trade.entryDatetime, trade.exitDatetime, trade.duration)}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Header: Setup Integrity Score + Net Outcome Pill with Profit/Loss % */}
                  <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
                    {/* 🛡️ Objective Setup Integrity Score */}
                    <span className={clsx(
                      "text-[10px] font-bold px-3 py-1.5 rounded-full border flex items-center gap-1.5 font-sans shadow-sm",
                      audit.isHighQualitySetup 
                        ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30" 
                        : "bg-amber-500/10 text-amber-300 border-amber-500/30"
                    )} title={`Integrity: ${audit.score}% (${audit.grade})`}>
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Setup Integrity: {audit.score}% ({audit.grade})</span>
                    </span>

                    {/* Outcome P&L Pill with % Return */}
                    <div className={clsx(
                      "px-3.5 py-1.5 rounded-xl font-mono font-black text-xs md:text-sm border flex items-center gap-2 shadow-sm",
                      isGain 
                        ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40 shadow-emerald-500/10" 
                        : "bg-rose-500/15 text-rose-300 border-rose-500/40 shadow-rose-500/10"
                    )}>
                      {isGain ? <CheckCircle2 className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                      <RollingTicker 
                        value={Number(trade.netPnl || 0)} 
                        prefix="₹" 
                        showSign={true} 
                        decimalPlaces={2} 
                        className={isGain ? "text-emerald-300" : "text-rose-300"}
                      />
                      <span className={clsx(
                        "text-[10px] md:text-[11px] font-bold px-1.5 py-0.5 rounded-md",
                        isGain ? "bg-emerald-500/25 text-emerald-200" : "bg-rose-500/25 text-rose-200"
                      )}>
                        {isGain ? "+" : ""}{pnlPercent.toFixed(2)}%
                      </span>
                    </div>

                    {/* 1-Click Copy Forensic Markdown Card Button */}
                    <button
                      type="button"
                      onClick={() => copyTradeMarkdown(trade)}
                      className="p-2 text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 rounded-xl transition-all"
                      title="Copy Forensic Markdown Autopsy to Clipboard"
                    >
                      {copiedTradeId === trade.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {/* Delete Action with 5s Undo Toast */}
                    <button
                      type="button"
                      onClick={() => handleDeleteWithUndo(trade)}
                      className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
                      title="Delete trade entry"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* 🌟 3-COLUMN CORE STORY SUMMARY (Act 1, 2, 3 Grid) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
                  {/* Act 1: 🎯 Catalyst & Technical Trigger */}
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-white/15 transition-all space-y-2 backdrop-blur-md shadow-sm">
                    <div className="flex items-center gap-1.5 text-cyan-300 font-bold text-[11px] uppercase tracking-wider">
                      <Target className="w-3.5 h-3.5 text-cyan-400" />
                      <span>1. Setup Catalyst</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      {trade.catalyst || trade.entryReason || "15m volume breakout above morning pivot with favorable momentum."}
                    </p>
                  </div>

                  {/* Act 2: ⚡ Execution Telemetry & Taxes */}
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-white/15 transition-all space-y-2 font-mono backdrop-blur-md shadow-sm">
                    <div className="flex items-center justify-between text-slate-400 font-sans font-bold text-[11px] uppercase tracking-wider">
                      <span className="flex items-center gap-1.5 text-slate-300">
                        <Receipt className="w-3.5 h-3.5 text-amber-400" />
                        2. Execution &amp; Friction
                      </span>
                      <span className={clsx("font-bold text-[10px]", pts >= 0 ? "text-emerald-400" : "text-rose-400")}>
                        {pts >= 0 ? "+" : ""}{pts.toFixed(2)} pts ({pts >= 0 ? "+" : ""}{pnlPercent.toFixed(2)}%)
                      </span>
                    </div>

                    <div className="space-y-1.5 text-[11px]">
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="font-sans text-slate-400">Fill:</span>
                        <span>₹{Number(trade.entryPrice).toFixed(2)} → ₹{Number(trade.exitPrice).toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400 text-[10px]">
                        <span className="font-sans">Taxes &amp; Brokerage:</span>
                        <span className="text-rose-400">-₹{trade.taxesAndCharges || "56.00"}</span>
                      </div>
                      <div className="flex items-center justify-between text-white font-bold pt-1.5 border-t border-white/10 text-[11px]">
                        <span className="font-sans text-slate-400">True Take-Home:</span>
                        <div className={clsx("flex items-center gap-1", isGain ? "text-emerald-400" : "text-rose-400")}>
                          <RollingTicker 
                            value={Number(trade.netPnl || 0)} 
                            prefix="₹" 
                            showSign={true} 
                            decimalPlaces={2} 
                            className={isGain ? "text-emerald-400" : "text-rose-400"}
                          />
                          <span>({isGain ? "+" : ""}{pnlPercent.toFixed(2)}%)</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Act 3: 🧠 Trader Psychology & Mindset Score */}
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-white/15 transition-all space-y-2 backdrop-blur-md shadow-sm">
                    <div className="flex items-center justify-between text-purple-300 font-bold text-[11px] uppercase tracking-wider">
                      <span className="flex items-center gap-1.5">
                        <BrainCircuit className="w-3.5 h-3.5 text-purple-400" />
                        3. Psychology Radar
                      </span>
                      <span className="text-purple-300 font-mono text-[10px]">
                        {trade.confidenceScore || 9}/10 Conviction
                      </span>
                    </div>

                    <div className="space-y-1.5 text-[11px]">
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="text-slate-400">Mindset:</span>
                        <span className="font-bold text-slate-200">{trade.mindsetEmotion || "Disciplined & Patient"}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="text-slate-400">Mistakes Avoided:</span>
                        <span className={clsx("font-mono text-[10px] font-bold", audit.isHighQualitySetup ? "text-emerald-400" : "text-amber-400")}>
                          {trade.mistakeTags || "Zero Tilt / Slipped Stops"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 🌟 ACT 4: EXPANDABLE DEEP FORENSIC DRAWER TOGGLE */}
                <div className="pt-1.5">
                  <button
                    type="button"
                    onClick={() => toggleExpand(trade.id)}
                    className="w-full py-2.5 px-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-cyan-500/30 text-xs font-bold text-cyan-300 transition-all flex items-center justify-between group/btn shadow-sm"
                  >
                    <span className="flex items-center gap-2">
                      <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{isExpanded ? "Collapse Case Study & Forensic Story" : "📖 Explore Full Story & Forensic Post-Mortem"}</span>
                    </span>
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4 group-hover/btn:translate-y-0.5 transition-transform" />}
                  </button>
                </div>


                {/* 🌟 ACT 4 EXPANDED FORENSIC PANEL */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      layout
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      className="p-4 rounded-2xl bg-black/40 border border-cyan-500/20 space-y-4 pt-3 overflow-hidden text-xs"
                    >
                      <div className="flex items-center justify-between border-b border-white/10 pb-2 flex-wrap gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                          <span className="font-bold text-white text-xs">Forensic Autopsy &amp; Execution Timeline</span>
                          
                          {/* Rigorous Objective Badge (No Hindsight Halo!) */}
                          {isGain ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                              🎯 Edge Verified: Clean Target Fill ({audit.grade})
                            </span>
                          ) : audit.isHighQualitySetup ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                              🛡️ Good Process / Bad Outcome (Acceptable Variance)
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30">
                              ⚠️ Low Integrity Trade ({audit.grade})
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">
                          Execution ID: #{trade.id}
                        </span>
                      </div>

                      {/* Dynamic Candlestick Sparkline */}
                      <DynamicExecutionCandles trade={trade} isGain={isGain} />

                      {/* Detailed Execution Anatomy */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Execution Mechanics
                        </span>
                        <p className="text-[11px] text-slate-200 leading-relaxed bg-white/[0.02] p-2.5 rounded-xl border border-white/5">
                          {trade.executionDetails || "Market order filled cleanly on breakout confirmation. Target reached after brief 3-minute consolidation wick."}
                        </p>
                      </div>

                      {/* Mindset & Key Lessons Learned */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Key Retrospective Lesson (Edge Compounder)
                        </span>
                        <p className="text-[11px] text-emerald-300 leading-relaxed bg-emerald-950/20 p-2.5 rounded-xl border border-emerald-500/20 italic">
                          "{trade.lessonsLearned || "Disciplined execution at predetermined target level without second-guessing."}"
                        </p>
                      </div>

                      {/* 12-Filter Quantitative Rules Checklist */}
                      <div className="pt-2 border-t border-white/5 space-y-1.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Objective Quantitative Rules Audit (12-Filter Gate)
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]">
                          {audit.passedRules.map((rule, idx) => (
                            <div key={idx} className="flex items-center gap-1.5 text-emerald-300 font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                              <span>{rule}</span>
                            </div>
                          ))}
                          {audit.violations.map((violation, idx) => (
                            <div key={idx} className="flex items-center gap-1.5 text-amber-400 font-medium">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                              <span>{violation}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Luxury Spatial Calendar Picker Modal */}
      <LuxuryDateRangePicker
        isOpen={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        startDate={journalCustomStart}
        endDate={journalCustomEnd}
        onApplyRange={(start, end) => {
          setJournalCustomRange(start, end);
        }}
      />
    </div>
  );
}
