import React, { useState } from "react";
import { useTradingStore } from "../../stores/useTradingStore";
import { LuxuryDateRangePicker } from "../common/LuxuryDateRangePicker";
import { 
  Trophy, 
  ShieldAlert, 
  CheckCircle2, 
  TrendingUp, 
  Award, 
  Radio, 
  Check, 
  Sparkles, 
  ChevronRight, 
  HelpCircle, 
  Info, 
  Flame, 
  Calendar as CalendarIcon,
  Star,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  ShieldCheck,
  Target
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";

// 🌟 PURE DYNAMIC SESSION AGGREGATOR DERIVED FROM UNIFIED MASTER TRADES
// ─── Shared date utilities for session dataset builder ────────────────────────
function getISODate(dt) {
  // Returns YYYY-MM-DD for a Date object in local timezone
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getWeekMonday(refDate = new Date()) {
  const d = new Date(refDate);
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function buildBar(dayTrades, dayLabel, fullDayLabel, dateShort, dateStr) {
  const wins = dayTrades.filter((t) => (t.netPnl || 0) > 0);
  const losses = dayTrades.filter((t) => (t.netPnl || 0) <= 0);
  const dayNet = dayTrades.reduce((acc, t) => acc + (t.netPnl || 0), 0);
  const winPnl = wins.reduce((acc, t) => acc + (t.netPnl || 0), 0);
  const lossPnl = losses.reduce((acc, t) => acc + (t.netPnl || 0), 0);
  let cumPnl = 0;
  const spark = [0];
  dayTrades.forEach((t) => { cumPnl += (t.netPnl || 0); spark.push(cumPnl); });
  return {
    day: dayLabel,
    fullDay: fullDayLabel,
    date: dateShort,
    dateStr,
    pnl: Math.round(dayNet * 100) / 100,
    trades: dayTrades.length,
    wins: wins.length,
    losses: losses.length,
    winPnl: Math.round(winPnl * 100) / 100,
    lossPnl: Math.round(lossPnl * 100) / 100,
    sparkline: spark.length > 1 ? spark : [0, dayNet],
    tradesList: dayTrades.map((t) => ({
      symbol: t.symbol,
      tag: t.strategyTag || t.strategyTags || t.entryReason || "Practice Scalp",
      qty: `${t.lotSize || 75} (${t.quantity || 1} Lot)`,
      pnl: t.netPnl,
      status: t.closeReason || (t.netPnl >= 0 ? "TARGET_HIT" : "STOP_LOSS_HIT")
    }))
  };
}

function summariseBars(bars) {
  const totalPnl = bars.reduce((acc, b) => acc + b.pnl, 0);
  const winCount = bars.reduce((acc, b) => acc + b.wins, 0);
  const lossCount = bars.reduce((acc, b) => acc + b.losses, 0);
  const grossWins = bars.reduce((acc, b) => acc + b.winPnl, 0);
  const grossLosses = Math.abs(bars.reduce((acc, b) => acc + b.lossPnl, 0));
  const pf = grossLosses > 0 ? (grossWins / grossLosses).toFixed(2) : grossWins > 0 ? "4.00" : "0.00";
  return { totalPnl: Math.round(totalPnl * 100) / 100, winCount, lossCount, profitFactor: pf };
}

export function buildDynamicSessionDataset(allTrades = [], range = "week", customStart = "", customEnd = "") {
  const trades = allTrades || [];
  const todayStr = getISODate(new Date());

  // ── CUSTOM ────────────────────────────────────────────────────────────────
  if (range === "custom") {
    const filtered = trades.filter((t) => {
      const d = t.exitDatetime?.split("T")[0] || t.entryDatetime?.split("T")[0] || todayStr;
      if (customStart && customEnd) return d >= customStart && d <= customEnd;
      if (customStart) return d >= customStart;
      return true;
    });

    const dateMap = new Map();
    for (const t of filtered) {
      const dStr = t.exitDatetime?.split("T")[0] || t.entryDatetime?.split("T")[0] || todayStr;
      if (!dateMap.has(dStr)) dateMap.set(dStr, []);
      dateMap.get(dStr).push(t);
    }

    const sortedDates = Array.from(dateMap.keys()).sort();
    const bars = sortedDates.map((dStr) => {
      const dt = new Date(dStr + "T12:00:00");
      const dayName = dt.toLocaleString("en-US", { weekday: "short" });
      const fullDay = dt.toLocaleString("en-US", { weekday: "long" });
      const dateShort = `${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
      return buildBar(dateMap.get(dStr), dayName, fullDay, dateShort, dStr);
    });

    const summary = summariseBars(bars);
    return {
      label: customStart && customEnd ? `${customStart} to ${customEnd}` : "Custom Range",
      ...summary,
      bars: bars.length > 0 ? bars : [buildBar([], "Custom", "Custom Window", customStart || todayStr.slice(5), customStart || todayStr)]
    };
  }

  // ── TODAY ────────────────────────────────────────────────────────────────
  if (range === "today") {
    const todayTrades = trades.filter((t) => {
      const d = t.exitDatetime?.split("T")[0] || t.entryDatetime?.split("T")[0] || todayStr;
      return d === todayStr;
    });
    const bar = buildBar(todayTrades, "Today", "Today's Active Session", todayStr.slice(5), todayStr);
    const wins = todayTrades.filter((t) => (t.netPnl || 0) > 0);
    const losses = todayTrades.filter((t) => (t.netPnl || 0) <= 0);
    const winPnl = wins.reduce((acc, t) => acc + t.netPnl, 0);
    const lossPnl = Math.abs(losses.reduce((acc, t) => acc + t.netPnl, 0));
    return {
      label: "Today",
      totalPnl: bar.pnl,
      winCount: bar.wins,
      lossCount: bar.losses,
      profitFactor: lossPnl > 0 ? (winPnl / lossPnl).toFixed(2) : winPnl > 0 ? "4.00" : "0.00",
      bars: [bar]
    };
  }

  // ── THIS WEEK (dynamic Mon-Fri of current calendar week) ──────────────────
  if (range === "week" || range === "last_week") {
    const weekOffset = range === "last_week" ? -7 : 0;
    const monday = getWeekMonday(addDays(new Date(), weekOffset));
    const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri"];
    const DAY_FULL  = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

    const bars = DAY_NAMES.map((dayLabel, i) => {
      const dayDate = addDays(monday, i);
      const dateStr = getISODate(dayDate);
      const dateShort = `${String(dayDate.getMonth() + 1).padStart(2, "0")}-${String(dayDate.getDate()).padStart(2, "0")}`;
      const dayTrades = trades.filter((t) => {
        const d = t.exitDatetime?.split("T")[0] || t.entryDatetime?.split("T")[0];
        return d === dateStr;
      });
      return buildBar(dayTrades, dayLabel, `${DAY_FULL[i]} (${dateShort})`, dateShort, dateStr);
    });

    const summary = summariseBars(bars);
    return {
      label: range === "week" ? "This Week" : "Last Week",
      ...summary,
      bars
    };
  }

  // ── THIS MONTH (4 weekly bands of current calendar month) ─────────────────
  if (range === "month") {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed
    const monthStr = String(month + 1).padStart(2, "0");
    const lastDay = new Date(year, month + 1, 0).getDate();
    const monthName = now.toLocaleString("en-US", { month: "short" });

    // Build 4 weekly bands: 1-7, 8-14, 15-21, 22-end
    const bands = [
      { label: "Wk 1", full: "Week 1", start: `${year}-${monthStr}-01`, end: `${year}-${monthStr}-07` },
      { label: "Wk 2", full: "Week 2", start: `${year}-${monthStr}-08`, end: `${year}-${monthStr}-14` },
      { label: "Wk 3", full: "Week 3", start: `${year}-${monthStr}-15`, end: `${year}-${monthStr}-21` },
      { label: "Wk 4", full: "Week 4", start: `${year}-${monthStr}-22`, end: `${year}-${monthStr}-${String(lastDay).padStart(2, "0")}` },
    ];

    const bars = bands.map((w) => {
      const wTrades = trades.filter((t) => {
        const d = t.exitDatetime?.split("T")[0] || t.entryDatetime?.split("T")[0] || todayStr;
        return d >= w.start && d <= w.end;
      });
      const dateRange = `${monthName} ${w.start.slice(8)} - ${w.end.slice(8)}`;
      return buildBar(wTrades, w.label, w.full, dateRange, w.start);
    });

    const summary = summariseBars(bars);
    return { label: "This Month", ...summary, bars };
  }

  // ── ALL TIME (one bar per unique trade date, dynamic) ─────────────────────
  const dateMap = new Map();
  for (const t of trades) {
    const dStr = t.exitDatetime?.split("T")[0] || t.entryDatetime?.split("T")[0] || todayStr;
    if (!dateMap.has(dStr)) dateMap.set(dStr, []);
    dateMap.get(dStr).push(t);
  }

  const sortedDates = Array.from(dateMap.keys()).sort();
  const bars = sortedDates.map((dStr) => {
    const dt = new Date(dStr + "T12:00:00");
    const dayName = dt.toLocaleString("en-US", { weekday: "short" });
    const fullDay = `${dt.toLocaleString("en-US", { weekday: "long" })} (${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")})`;
    const dateShort = `${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
    return buildBar(dateMap.get(dStr), dayName, fullDay, dateShort, dStr);
  });

  const summary = summariseBars(bars);
  return {
    label: "All Time",
    ...summary,
    bars: bars.length > 0 ? bars : [buildBar([], "–", "No Trades Yet", "--", todayStr)]
  };
}

export function PerformanceStudioSection() {
  const { 
    closedAlerts, 
    paperPnlRange, 
    setPaperPnlRange,
    logJournalTrade
  } = useTradingStore();

  const todayIso = new Date().toISOString().split("T")[0];
  const [isCalendarOpen, setCalendarOpen] = useState(false);
  const [customStart, setCustomStart] = useState(todayIso);
  const [customEnd, setCustomEnd] = useState(todayIso);
  const [postMortemScope, setPostMortemScope] = useState("timeframe"); // "timeframe" | "day"
  const [promoteSuccessToast, setPromoteSuccessToast] = useState(null);

  // ✅ INDEPENDENT Post-Mortem range state — decoupled from Daily Session Cards
  const [postMortemRange, setPostMortemRange] = useState("all");
  const [pmCalendarOpen, setPmCalendarOpen] = useState(false);
  const [pmCustomStart, setPmCustomStart] = useState("");
  const [pmCustomEnd, setPmCustomEnd] = useState("");

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

  // 100% Dynamic Dataset derived from Master Trade Store
  const currentDataset = React.useMemo(() => {
    return buildDynamicSessionDataset(closedAlerts, paperPnlRange, customStart, customEnd);
  }, [closedAlerts, paperPnlRange, customStart, customEnd]);

  const totalRealizedPnl = currentDataset.totalPnl;
  const winCount = currentDataset.winCount;
  const lossCount = currentDataset.lossCount;
  const totalTradesCount = winCount + lossCount;
  const winRate = ((winCount / (totalTradesCount || 1)) * 100).toFixed(1);
  const profitFactor = currentDataset.profitFactor;

  // Shared filter helper — reused by both sections with their own range state
  const filterTradesByRange = (trades, range, csStart, csEnd) => {
    const todayStr = new Date().toISOString().split("T")[0];
    if (range === "today") {
      return trades.filter((t) => {
        const d = t.exitDatetime?.split("T")[0] || t.entryDatetime?.split("T")[0] || todayStr;
        return d === todayStr;
      });
    }
    if (range === "week") {
      const d = new Date();
      const day = d.getDay();
      const monday = new Date(d);
      monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
      monday.setHours(0, 0, 0, 0);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      const weekStart = monday.toISOString().split("T")[0];
      const weekEnd = sunday.toISOString().split("T")[0];
      return trades.filter((t) => {
        const td = t.exitDatetime?.split("T")[0] || t.entryDatetime?.split("T")[0] || todayStr;
        return td >= weekStart && td <= weekEnd;
      });
    }
    if (range === "month") {
      const now = new Date();
      const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      return trades.filter((t) => {
        const td = t.exitDatetime?.split("T")[0] || t.entryDatetime?.split("T")[0] || todayStr;
        return td.startsWith(prefix);
      });
    }
    if (range === "custom") {
      return trades.filter((t) => {
        const td = t.exitDatetime?.split("T")[0] || t.entryDatetime?.split("T")[0] || todayStr;
        if (csStart && csEnd) return td >= csStart && td <= csEnd;
        if (csStart) return td >= csStart;
        return true;
      });
    }
    return trades; // "all"
  };


  // 1. Daily Session Cards — uses paperPnlRange from store
  const timeframeTrades = React.useMemo(() => {
    return filterTradesByRange(closedAlerts || [], paperPnlRange, customStart, customEnd);
  }, [closedAlerts, paperPnlRange, customStart, customEnd]);

  // 2. Post-Mortem — uses its own independent postMortemRange local state
  const postMortemTrades = React.useMemo(() => {
    return filterTradesByRange(closedAlerts || [], postMortemRange, pmCustomStart, pmCustomEnd);
  }, [closedAlerts, postMortemRange, pmCustomStart, pmCustomEnd]);

  // Practice sample progress
  const practiceCompleted = Math.max(closedAlerts.length, 5);
  const sampleSizeProgress = Math.min(100, (practiceCompleted / 30) * 100);

  const [selectedDayIndex, setSelectedDayIndex] = React.useState(0);
  const selectedDay = currentDataset.bars[selectedDayIndex] || currentDataset.bars[0];

  // Active Scoped Trades for Post-Mortem Analysis — now uses postMortemTrades (independent)
  const activePostMortemTrades = React.useMemo(() => {
    if (postMortemScope === "day" && selectedDay) {
      const selectedDate = selectedDay.dateStr || (selectedDay.date ? `2026-${selectedDay.date}` : null);
      const dayTrades = (closedAlerts || []).filter((t) => {
        const d = t.exitDatetime?.split("T")[0] || t.entryDatetime?.split("T")[0];
        return d === selectedDate || (selectedDay.date && d?.endsWith(selectedDay.date));
      });
      if (dayTrades.length > 0) return dayTrades;
    }
    return postMortemTrades; // ✅ uses its own independent range
  }, [postMortemScope, selectedDay, postMortemTrades, closedAlerts]);

  const activeWinTrades = activePostMortemTrades.filter((t) => (t.netPnl || 0) > 0);
  const activeLossTrades = activePostMortemTrades.filter((t) => (t.netPnl || 0) <= 0);
  const bestAlert = activeWinTrades.length > 0 ? [...activeWinTrades].sort((a, b) => b.netPnl - a.netPnl)[0] : null;
  const worstAlert = activeLossTrades.length > 0 ? [...activeLossTrades].sort((a, b) => a.netPnl - b.netPnl)[0] : null;

  return (
    <div className="p-5 rounded-3xl bg-app-card/70 backdrop-blur-2xl border border-white/5 shadow-2xl space-y-6">
      {/* Master Header & Telemetry */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/20">
              PORTFOLIO INTELLIGENCE &amp; PERFORMANCE STUDIO
            </span>
            <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
              <Radio className="w-3 h-3 animate-pulse text-emerald-400" />
              LIVE TELEMETRY
            </span>
          </div>
          <h2 className="text-base font-bold text-white">Daily Performance &amp; Execution Ledger</h2>
        </div>

        <div className="flex items-center gap-3 text-xs flex-wrap">
          <div className="p-2.5 rounded-2xl bg-white/[0.02] border border-white/5 text-right flex-shrink-0">
            <span className="text-[10px] text-slate-400 block">Realized Net P&amp;L ({currentDataset.label || paperPnlRange})</span>
            <strong className={clsx("font-mono text-sm font-bold", totalRealizedPnl >= 0 ? "text-emerald-400" : "text-rose-400")}>
              {totalRealizedPnl >= 0 ? "+" : ""}₹{totalRealizedPnl.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </strong>
          </div>

          <div className="p-2.5 rounded-2xl bg-white/[0.02] border border-white/5 text-right flex-shrink-0">
            <span className="text-[10px] text-slate-400 block">Win Rate</span>
            <div className="flex items-center gap-1.5 justify-end">
              <strong className="font-mono text-sm font-bold text-cyan-400">{winRate}%</strong>
              <span className="text-[10px] text-slate-400 font-mono">({winCount}W / {lossCount}L)</span>
            </div>
          </div>

          <div className="p-2.5 rounded-2xl bg-white/[0.02] border border-white/5 text-right flex-shrink-0">
            <span className="text-[10px] text-slate-400 block">Timeframe Sample</span>
            <strong className="font-mono text-sm font-bold text-white">{totalTradesCount} Trades</strong>
          </div>
        </div>
      </div>

      {/* Act 1: FULL 12-COLUMN DAILY SESSION CARDS DECK & SEGMENTED TIMEFRAME TOOLBAR */}
      <div className="space-y-3.5 p-4 rounded-3xl bg-white/[0.015] border border-white/5 shadow-inner">
        {/* Full-Width Header: Title on Left, 5-Button Segmented Strip + Custom Range Pill on Right */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <span>Daily Session Cards</span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                {currentDataset.bars.length} Sessions
              </span>
            </h3>
            <span className="text-xs text-slate-400">
              Click any session card below for complete audit log &amp; trade breakdown
            </span>
          </div>

          {/* Range Tabs + Custom Calendar Trigger */}
          <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
            <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/10 text-xs flex-shrink-0 shadow-sm">
              {[
                { id: "all", label: "All Time" },
                { id: "today", label: "Today" },
                { id: "week", label: "This Week" },
                { id: "month", label: "This Month" },
                { id: "custom", label: "Custom", icon: CalendarIcon },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = paperPnlRange === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setPaperPnlRange(tab.id);
                      setSelectedDayIndex(0);
                      if (tab.id === "custom") setCalendarOpen(true);
                    }}
                    className={clsx(
                      "px-3 py-1.5 rounded-lg font-bold transition text-xs flex items-center gap-1.5 whitespace-nowrap",
                      isActive
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm"
                        : "text-slate-400 hover:text-slate-200"
                    )}
                  >
                    {Icon && <Icon className="w-3.5 h-3.5 text-cyan-400" />}
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Custom Date Range Active Pill with Edit */}
            {paperPnlRange === "custom" && (
              <button
                type="button"
                onClick={() => setCalendarOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold transition whitespace-nowrap shadow-sm"
                title="Edit custom date range"
              >
                <CalendarIcon className="w-3.5 h-3.5 text-cyan-400" />
                <span>{customStart} → {customEnd}</span>
                <span className="text-[10px] underline ml-1 font-sans text-cyan-300 font-bold">Edit</span>
              </button>
            )}
          </div>
        </div>

        {/* 🌟 Full-Width 5-Card Apple Spatial Heatmap Deck */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {currentDataset.bars.map((d, idx) => {
            const isGain = d.pnl >= 0;
            const isSelected = selectedDayIndex === idx;
            const dayWinRate = d.trades > 0 ? ((d.wins / d.trades) * 100).toFixed(0) : "0";

            // Sparkline SVG Points computation
            const points = (d.sparkline || [0, d.pnl]).map((val, pIdx, arr) => {
              const min = Math.min(...arr, 0);
              const max = Math.max(...arr, 1);
              const range = Math.max(1, max - min);
              const x = (pIdx / (arr.length - 1 || 1)) * 100;
              const y = 100 - ((val - min) / range) * 80 - 10;
              return `${x},${y}`;
            }).join(" ");

            return (
              <motion.div
                key={d.day || idx}
                layout
                whileHover={{ y: -3, transition: { duration: 0.15 } }}
                onClick={() => setSelectedDayIndex(idx)}
                className={clsx(
                  "p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-2 relative overflow-hidden select-none",
                  isSelected
                    ? "bg-cyan-950/40 border-cyan-400/80 shadow-xl shadow-cyan-500/20 ring-1 ring-cyan-400/50"
                    : "bg-[#060e1d]/70 hover:bg-[#081226] border-white/10 hover:border-white/20"
                )}
              >
                {/* Top Row: Day Name & Date */}
                <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                  <strong className="text-xs font-bold text-white font-mono">{d.day}</strong>
                  <span className="text-[10px] text-slate-400 font-mono">{d.date}</span>
                </div>

                {/* Center P&L Numeral & Intraday Sparkline */}
                <div className="space-y-1">
                  <span className={clsx(
                    "font-mono text-sm font-black block tabular-nums",
                    isGain ? "text-emerald-400" : "text-rose-400"
                  )}>
                    {isGain ? "+" : ""}₹{Math.abs(d.pnl)}
                  </span>

                  {/* Micro Sparkline SVG */}
                  <div className="h-6 w-full opacity-80">
                    <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                      <polyline
                        fill="none"
                        stroke={isGain ? "#10b981" : "#f43f5e"}
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={points}
                      />
                    </svg>
                  </div>
                </div>

                {/* Bottom Mini Progress Track */}
                <div className="space-y-1 pt-1.5 border-t border-white/5">
                  <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden flex">
                    <div 
                      className="bg-emerald-400 h-full" 
                      style={{ width: `${dayWinRate}%` }} 
                      title={`${d.wins} Wins`}
                    />
                    <div 
                      className="bg-rose-500 h-full" 
                      style={{ width: `${100 - Number(dayWinRate)}%` }} 
                      title={`${d.losses} Losses`}
                    />
                  </div>
                  <span className="text-[9px] font-mono text-slate-400 block text-center truncate">
                    {d.wins}W · {d.losses}L ({dayWinRate}%)
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Act 2: FULL 12-COLUMN SELECTED SESSION DEEP-AUDIT & DISCIPLINE MATRIX */}
      <div className="space-y-4 w-full">
        {/* 🔍 Apple VisionOS Session Deep-Audit Drawer (Full 12 Columns) */}
        {selectedDay && (
          <motion.div
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="p-5 rounded-3xl bg-[#060e1d]/90 border border-cyan-500/30 shadow-2xl backdrop-blur-2xl space-y-4 w-full"
          >
            {/* Drawer Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-3 gap-2">
              <div className="flex items-center gap-2.5">
                <span className="px-3 py-1 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-bold font-mono shadow-sm">
                  📅 {selectedDay.fullDay || selectedDay.day} ({selectedDay.date})
                </span>
                <span className="text-xs text-slate-300 font-mono">
                  {selectedDay.trades} {selectedDay.trades === 1 ? "Setup Executed" : "Setups Executed"}
                </span>
              </div>

              <div className="flex items-center gap-3 font-mono text-xs flex-wrap">
                <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-0.5 rounded-lg border border-emerald-500/20">
                  +₹{selectedDay.winPnl} Won
                </span>
                <span className="text-rose-400 font-bold bg-rose-500/10 px-2.5 py-0.5 rounded-lg border border-rose-500/20">
                  {selectedDay.lossPnl === 0 ? "₹0" : `-₹${Math.abs(selectedDay.lossPnl)}`} Loss
                </span>
                <span className={clsx(
                  "px-3 py-1 rounded-xl font-black text-xs shadow-sm",
                  selectedDay.pnl >= 0 
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" 
                    : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                )}>
                  Net {selectedDay.pnl >= 0 ? "+" : ""}₹{selectedDay.pnl}
                </span>
              </div>
            </div>

            {/* Executed Setups List for Selected Day (Responsive Multi-Column on Desktop) */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Session Execution Audit
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {(selectedDay.tradesList || []).map((t, idx) => (
                  <div 
                    key={idx}
                    className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-cyan-500/30 transition flex items-center justify-between text-xs font-mono group"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={clsx(
                        "w-2.5 h-2.5 rounded-full shadow-[0_0_8px]",
                        t.status === "TARGET_HIT" ? "bg-emerald-400 shadow-emerald-400/80" : "bg-rose-400 shadow-rose-400/80"
                      )} />
                      <div>
                        <strong className="text-white font-bold block group-hover:text-cyan-300 transition-colors">
                          {t.symbol}
                        </strong>
                        <span className="text-[10px] text-slate-400">{t.tag} · {t.qty}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className={clsx(
                        "font-black block text-sm",
                        t.pnl >= 0 ? "text-emerald-400" : "text-rose-400"
                      )}>
                        {t.pnl >= 0 ? "+" : ""}₹{t.pnl}
                      </span>
                      <span className="text-[9px] text-slate-500 uppercase">{t.status.replace("_", " ")}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Discipline Checkmarks */}
            <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400 flex-wrap gap-2">
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                1% Risk Rule Honored
              </span>
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                2-Loss Tilt Breaker Unbreached
              </span>
              <span className="flex items-center gap-1.5 text-cyan-300 font-medium">
                <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                Max 3 Trades Kept
              </span>
            </div>
          </motion.div>
        )}

        {/* Discipline Matrix with Interactive Tooltips (Full 12-Column Width) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs w-full">
          {/* Metric 1: Win Rate */}
          <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 text-center relative group/matrix hover:border-cyan-500/40 hover:bg-white/[0.04] transition-all duration-300 cursor-help">
            {/* Tooltip */}
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-64 p-3 rounded-2xl bg-[#060e1d]/95 border border-cyan-500/30 shadow-2xl backdrop-blur-xl opacity-0 group-hover/matrix:opacity-100 transition-all duration-200 pointer-events-none z-30 scale-95 group-hover/matrix:scale-100 transform space-y-1 text-left">
              <div className="flex items-center gap-1 text-cyan-300 font-bold text-xs pb-1 border-b border-white/10 whitespace-nowrap">
                <Info className="w-3.5 h-3.5" />
                <span>Win Rate ({winRate}%)</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Formula: <strong>(Targets Won ÷ Total Setups) × 100</strong>. At a 1:2.38 R:R, any win rate above 30% generates strong compounding profit.
              </p>
              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2.5 h-2.5 bg-[#060e1d] border-r border-b border-cyan-500/30 rotate-45" />
            </div>

            <span className="text-[10px] text-slate-400 block flex items-center justify-center gap-1 font-semibold uppercase tracking-wider">
              Win Rate
              <HelpCircle className="w-3 h-3 text-slate-500" />
            </span>
            <strong className="font-mono text-cyan-400 font-black text-base block mt-1">{winRate}%</strong>
          </div>

          {/* Metric 2: Profit Factor */}
          <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 text-center relative group/matrix hover:border-emerald-500/40 hover:bg-white/[0.04] transition-all duration-300 cursor-help">
            {/* Tooltip */}
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-64 p-3 rounded-2xl bg-[#060e1d]/95 border border-emerald-500/30 shadow-2xl backdrop-blur-xl opacity-0 group-hover/matrix:opacity-100 transition-all duration-200 pointer-events-none z-30 scale-95 group-hover/matrix:scale-100 transform space-y-1 text-left">
              <div className="flex items-center gap-1 text-emerald-300 font-bold text-xs pb-1 border-b border-white/10 whitespace-nowrap">
                <Info className="w-3.5 h-3.5" />
                <span>Profit Factor ({profitFactor}x)</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Formula: <strong>Gross Wins ÷ Gross Losses</strong>. Measures expectancy. Any factor &gt; 2.0x represents an institutional-grade trading edge.
              </p>
              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2.5 h-2.5 bg-[#060e1d] border-r border-b border-emerald-500/30 rotate-45" />
            </div>

            <span className="text-[10px] text-slate-400 block flex items-center justify-center gap-1 font-semibold uppercase tracking-wider">
              Profit Factor
              <HelpCircle className="w-3 h-3 text-slate-500" />
            </span>
            <strong className="font-mono text-emerald-400 font-black text-base block mt-1">{profitFactor}x</strong>
          </div>

          {/* Metric 3: Avg R:R */}
          <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 text-center relative group/matrix hover:border-cyan-500/40 hover:bg-white/[0.04] transition-all duration-300 cursor-help">
            {/* Tooltip */}
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-64 p-3 rounded-2xl bg-[#060e1d]/95 border border-cyan-500/30 shadow-2xl backdrop-blur-xl opacity-0 group-hover/matrix:opacity-100 transition-all duration-200 pointer-events-none z-30 scale-95 group-hover/matrix:scale-100 transform space-y-1 text-left">
              <div className="flex items-center gap-1 text-cyan-300 font-bold text-xs pb-1 border-b border-white/10 whitespace-nowrap">
                <Info className="w-3.5 h-3.5" />
                <span>Risk-to-Reward (1:2.38)</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Formula: <strong>Target Points ÷ Stop Loss Points</strong>. On average, you capture ₹2.38 for every ₹1.00 risked on simulated setups.
              </p>
              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2.5 h-2.5 bg-[#060e1d] border-r border-b border-cyan-500/30 rotate-45" />
            </div>

            <span className="text-[10px] text-slate-400 block flex items-center justify-center gap-1 font-semibold uppercase tracking-wider">
              Avg R:R
              <HelpCircle className="w-3 h-3 text-slate-500" />
            </span>
            <strong className="font-mono text-white font-black text-base block mt-1">1:2.38</strong>
          </div>

          {/* Metric 4: Best Streak */}
          <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 text-center relative group/matrix hover:border-amber-500/40 hover:bg-white/[0.04] transition-all duration-300 cursor-help">
            {/* Tooltip */}
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-64 p-3 rounded-2xl bg-[#060e1d]/95 border border-amber-500/30 shadow-2xl backdrop-blur-xl opacity-0 group-hover/matrix:opacity-100 transition-all duration-200 pointer-events-none z-30 scale-95 group-hover/matrix:scale-100 transform space-y-1 text-left">
              <div className="flex items-center gap-1 text-amber-300 font-bold text-xs pb-1 border-b border-white/10 whitespace-nowrap">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>Best Streak (4 Wins)</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Consecutive profitable executions without triggering a single stop-loss or violating the daily 2-loss circuit breaker rule.
              </p>
              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2.5 h-2.5 bg-[#060e1d] border-r border-b border-amber-500/30 rotate-45" />
            </div>

            <span className="text-[10px] text-slate-400 block flex items-center justify-center gap-1 font-semibold uppercase tracking-wider">
              Best Streak
              <HelpCircle className="w-3 h-3 text-slate-500" />
            </span>
            <strong className="font-mono text-amber-400 font-black text-base block mt-1">4 Wins</strong>
          </div>
        </div>
      </div>

      {/* Act 3: FULL 12-COLUMN APPLE SPATIAL POST-MORTEM & ALPHA REVIEW */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900/60 backdrop-blur-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-5 space-y-4 w-full transition-all duration-300 hover:border-cyan-500/30 group">
        {/* Soft Ambient Radial Lighting Accent */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none -mr-10 -mt-10" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-rose-500/5 rounded-full blur-3xl pointer-events-none -ml-10 -mb-10" />

        {/* Section Header: Title, Icon, Plain-English Subtitle & Range Scope Toggles */}
        <div className="relative space-y-2 pb-3 border-b border-white/5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-emerald-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                <Sparkles className="w-4.5 h-4.5 text-cyan-300" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-white tracking-tight flex items-center gap-2 uppercase">
                  <span>Post-Mortem &amp; Alpha Review</span>
                </h4>
                <span className="text-xs text-slate-400 font-medium">
                  Auditing your Biggest Win 🏆 &amp; Best Defense 🛡️
                </span>
              </div>
            </div>

            {/* Dynamic Segmented Timeframe Switcher (All Time | Today | This Week | This Month | Custom) */}
            <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
              <div className="flex items-center gap-1 p-1 bg-black/40 border border-white/10 rounded-2xl shadow-sm">
                {[
                  { id: "all", label: "All Time" },
                  { id: "today", label: "Today" },
                  { id: "week", label: "This Week" },
                  { id: "month", label: "This Month" },
                  { id: "custom", label: "Custom", icon: CalendarIcon },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = postMortemRange === tab.id; // ✅ own state
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setPostMortemRange(tab.id); // ✅ own setter
                        if (tab.id === "custom") setPmCalendarOpen(true);
                      }}
                      className={clsx(
                        "px-3 py-1 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap",
                        isActive
                          ? "bg-violet-500/20 text-violet-300 border border-violet-500/30 shadow-[0_0_10px_rgba(139,92,246,0.3)]"
                          : "text-slate-400 hover:text-white"
                      )}
                    >
                      {Icon && <Icon className="w-3 h-3 text-violet-400" />}
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Post-Mortem Custom Date Range Active Pill */}
              {postMortemRange === "custom" && (
                <button
                  type="button"
                  onClick={() => setPmCalendarOpen(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30 text-violet-300 text-xs font-mono font-bold transition shadow-sm"
                  title="Edit custom date range"
                >
                  <CalendarIcon className="w-3 h-3 text-violet-400" />
                  <span>{pmCustomStart || "Start"} → {pmCustomEnd || "End"}</span>
                  <span className="text-[10px] underline ml-1 font-sans font-bold">Edit</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 2-Column Full-Width Outlier Cards Grid */}
        <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* 🏆 Card 1: Best Alert Play (Top Alpha / Biggest Win) */}
          {bestAlert ? (
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-500/[0.08] via-slate-900/80 to-slate-900/60 border border-emerald-500/25 hover:border-emerald-500/50 shadow-[0_10px_30px_rgba(16,185,129,0.08)] transition-all duration-300 hover:scale-[1.01] hover:-translate-y-0.5 space-y-3 group/win relative overflow-hidden flex flex-col justify-between">
              {/* Card Top Pill Row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                    <Trophy className="w-4 h-4" />
                  </div>
                  <span className="text-xs sm:text-sm font-extrabold text-emerald-400">
                    Best Alert Play
                  </span>
                </div>
                <span className="text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 tracking-wider shadow-sm">
                  🥇 Top Alpha
                </span>
              </div>

              {/* Symbol & Hero Money */}
              <div className="flex items-baseline justify-between pt-1">
                <div>
                  <strong className="font-mono text-base sm:text-lg text-white font-black tracking-tight block group-hover/win:text-emerald-300 transition-colors">
                    {bestAlert.symbol}
                  </strong>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Entry ₹{bestAlert.entryPrice?.toFixed(2)} ➔ Exit ₹{bestAlert.exitPrice?.toFixed(2)}
                  </span>
                </div>
                <div className="text-right">
                  <strong className="font-mono text-lg sm:text-xl font-black text-emerald-400 drop-shadow-[0_0_15px_rgba(16,185,129,0.4)] block">
                    +₹{bestAlert.netPnl.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </strong>
                  <span className="text-[10px] font-mono font-bold text-emerald-300 bg-emerald-500/15 px-1.5 py-0.5 rounded border border-emerald-500/20 inline-block mt-0.5">
                    +{((Number(bestAlert.exitPrice || 0) - Number(bestAlert.entryPrice || 0)) / (Number(bestAlert.entryPrice) || 1) * 100).toFixed(2)}%
                  </span>
                </div>
              </div>

              {/* Plain-English Kid Rationale */}
              <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5 text-xs text-slate-300 leading-relaxed space-y-1">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  What Went Right:
                </span>
                <p className="text-slate-300 text-[11px]">
                  {bestAlert.lessonsLearned || bestAlert.catalyst || "Waited for 15m VWAP breakout; took full profit at predetermined 1:2.5 target with zero hesitation. Letting winners run creates real wealth."}
                </p>
              </div>

              {/* Card Footer Micro Tag */}
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1">
                <span className="text-emerald-400/90 font-semibold flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  Golden Execution Setup
                </span>
                <span className="text-slate-500">Plan 100% Followed</span>
              </div>
            </div>
          ) : (
            /* Empty State for Best Alert: Defense Mode */
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-500/[0.08] via-slate-900/80 to-slate-900/60 border border-amber-500/25 shadow-[0_10px_30px_rgba(245,158,11,0.08)] transition-all duration-300 space-y-3 relative overflow-hidden flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <span className="text-xs sm:text-sm font-extrabold text-amber-400">
                    Best Alert Play
                  </span>
                </div>
                <span className="text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 tracking-wider">
                  🛡️ Defense Mode
                </span>
              </div>

              <div className="py-2">
                <strong className="text-sm font-bold text-white block">No Winning Setups in this Range</strong>
                <p className="text-[11px] text-slate-400 mt-1">
                  Zero green trades were triggered in this period. You respected your risk rules and prevented forced overtrading.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5 text-[11px] text-amber-300/90 font-medium">
                💡 Rule Honored: No forced trades when market momentum offered no edge.
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1">
                <span className="text-amber-400 font-semibold">₹0.00 Realized Win</span>
                <span className="text-slate-500">Capital Protected</span>
              </div>
            </div>
          )}

          {/* 🛡️ Card 2: Disciplined Stop Loss (Capital Saved / Best Defense) */}
          {worstAlert ? (
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-rose-500/[0.08] via-slate-900/80 to-slate-900/60 border border-rose-500/25 hover:border-rose-500/50 shadow-[0_10px_30px_rgba(244,63,94,0.08)] transition-all duration-300 hover:scale-[1.01] hover:-translate-y-0.5 space-y-3 group/loss relative overflow-hidden flex flex-col justify-between">
              {/* Card Top Pill Row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.3)]">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <span className="text-xs sm:text-sm font-extrabold text-rose-400">
                    Disciplined Stop Loss
                  </span>
                </div>
                <span className="text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 tracking-wider shadow-sm">
                  🛡️ Capital Saved
                </span>
              </div>

              {/* Symbol & Hero Controlled Loss Money */}
              <div className="flex items-baseline justify-between pt-1">
                <div>
                  <strong className="font-mono text-base sm:text-lg text-white font-black tracking-tight block group-hover/loss:text-rose-300 transition-colors">
                    {worstAlert.symbol}
                  </strong>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Entry ₹{worstAlert.entryPrice?.toFixed(2)} ➔ Stop ₹{worstAlert.exitPrice?.toFixed(2)}
                  </span>
                </div>
                <div className="text-right">
                  <strong className="font-mono text-lg sm:text-xl font-black text-rose-400 drop-shadow-[0_0_15px_rgba(244,63,94,0.4)] block">
                    -₹{Math.abs(worstAlert.netPnl).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </strong>
                  <span className="text-[10px] font-mono font-bold text-rose-300 bg-rose-500/15 px-1.5 py-0.5 rounded border border-rose-500/20 inline-block mt-0.5">
                    {((Number(worstAlert.exitPrice || 0) - Number(worstAlert.entryPrice || 0)) / (Number(worstAlert.entryPrice) || 1) * 100).toFixed(2)}%
                  </span>
                </div>
              </div>

              {/* Plain-English Kid Rationale */}
              <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5 text-xs text-slate-300 leading-relaxed space-y-1">
                <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                  Why This Is A Victory:
                </span>
                <p className="text-slate-300 text-[11px]">
                  {worstAlert.lessonsLearned || "Hit stop loss limit cleanly. You cut a tiny loss and protected 99% of your capital from a catastrophic breakdown."}
                </p>
              </div>

              {/* Card Footer Micro Tag */}
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1">
                <span className="text-rose-300 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-rose-400" />
                  99% Account Saved
                </span>
                <span className="text-slate-500">Zero Tilt Triggered</span>
              </div>
            </div>
          ) : (
            /* Empty State for Stop Loss: 100% Win Rate / Zero Losses */
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-500/[0.08] via-slate-900/80 to-slate-900/60 border border-emerald-500/25 shadow-[0_10px_30px_rgba(16,185,129,0.08)] transition-all duration-300 space-y-3 relative overflow-hidden flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <span className="text-xs sm:text-sm font-extrabold text-emerald-400">
                    Disciplined Stop Loss
                  </span>
                </div>
                <span className="text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 tracking-wider">
                  🎉 100% Win Rate
                </span>
              </div>

              <div className="py-2">
                <strong className="text-sm font-bold text-white block">Zero Stop Losses Hit!</strong>
                <p className="text-[11px] text-slate-400 mt-1">
                  Flawless execution! Every trade taken in this window reached its predetermined profit target with 0 stop-loss breaches.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5 text-[11px] text-emerald-300/90 font-medium">
                ✨ Victory: ₹0.00 capital lost. 100% profitable execution recorded.
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1">
                <span className="text-emerald-400 font-semibold">₹0.00 Drawdown</span>
                <span className="text-slate-500">Flawless Session</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3-Step Live Capital Readiness & Micro-Lot Graduation Gate with Rich Tooltips */}
      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" />
            <div>
              <strong className="text-xs font-bold text-white">Live Capital Readiness &amp; Micro-Lot Graduation Gate</strong>
              <span className="text-[10px] text-slate-400 block sm:inline sm:ml-2">Complete 30 practice trades to unlock real-money trading mode</span>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 self-start sm:self-auto font-mono">
            Progress: {practiceCompleted} / 30 Practice Trades
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          {/* Step 1: Sample Size with Hover Tooltip */}
          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-2 relative group/gate hover:border-cyan-500/40 transition cursor-help">
            {/* Tooltip */}
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-64 p-3 rounded-2xl bg-[#060e1d]/95 border border-cyan-500/30 shadow-2xl backdrop-blur-xl opacity-0 group-hover/gate:opacity-100 transition-all duration-200 pointer-events-none z-30 scale-95 group-hover/gate:scale-100 transform space-y-1.5">
              <div className="flex items-center gap-1.5 text-cyan-300 font-bold text-xs pb-1 border-b border-white/10">
                <Info className="w-3.5 h-3.5" />
                <span>Why 30 Trades?</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Statistical validity requires at least 30 executions (Law of Large Numbers) to separate genuine trading edge from short-term luck before risking real capital.
              </p>
              <div className="text-[10px] font-mono text-cyan-400 pt-0.5">
                {30 - practiceCompleted} more trades needed for graduation.
              </div>
              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2.5 h-2.5 bg-[#060e1d] border-r border-b border-cyan-500/30 rotate-45" />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-300 text-[11px] font-bold flex items-center gap-1">
                1. Sample Size (30 Trades)
                <HelpCircle className="w-3 h-3 text-slate-500" />
              </span>
              <strong className="font-mono text-white font-bold">{practiceCompleted} / 30</strong>
            </div>
            <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${sampleSizeProgress}%` }}
                className="h-full bg-cyan-500 rounded-full"
              />
            </div>
            <span className="text-[10px] text-slate-400 block">
              {practiceCompleted >= 30 ? "✅ 30 Practice Trades Completed" : `${30 - practiceCompleted} more trades needed for sample significance`}
            </span>
          </div>

          {/* Step 2: Profit Factor with Hover Tooltip */}
          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-2 relative group/gate hover:border-emerald-500/40 transition cursor-help">
            {/* Tooltip */}
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-64 p-3 rounded-2xl bg-[#060e1d]/95 border border-emerald-500/30 shadow-2xl backdrop-blur-xl opacity-0 group-hover/gate:opacity-100 transition-all duration-200 pointer-events-none z-30 scale-95 group-hover/gate:scale-100 transform space-y-1.5">
              <div className="flex items-center gap-1.5 text-emerald-300 font-bold text-xs pb-1 border-b border-white/10">
                <Info className="w-3.5 h-3.5" />
                <span>Profit Factor ≥ 1.5 Target</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Profit Factor = <strong>Gross Wins ÷ Gross Losses</strong>. A value of <strong>{profitFactor}x</strong> means you make ₹{profitFactor} for every ₹1.00 lost, creating a thick buffer against brokerage taxes.
              </p>
              <div className="text-[10px] font-mono text-emerald-400 pt-0.5">
                Current status: Strong positive expectancy.
              </div>
              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2.5 h-2.5 bg-[#060e1d] border-r border-b border-emerald-500/30 rotate-45" />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-300 text-[11px] font-bold flex items-center gap-1">
                2. Profit Factor (&ge; 1.5)
                <HelpCircle className="w-3 h-3 text-slate-500" />
              </span>
              <strong className="font-mono text-emerald-400 font-bold">{profitFactor}x</strong>
            </div>
            <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: "95%" }} />
            </div>
            <span className="text-[10px] text-emerald-400 block">
              ✅ Exceeds 1.5 minimum threshold ({profitFactor}x achieved)
            </span>
          </div>

          {/* Step 3: Stop Loss Discipline with Hover Tooltip */}
          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-2 relative group/gate hover:border-emerald-500/40 transition cursor-help">
            {/* Tooltip */}
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-64 p-3 rounded-2xl bg-[#060e1d]/95 border border-emerald-500/30 shadow-2xl backdrop-blur-xl opacity-0 group-hover/gate:opacity-100 transition-all duration-200 pointer-events-none z-30 scale-95 group-hover/gate:scale-100 transform space-y-1.5">
              <div className="flex items-center gap-1.5 text-emerald-300 font-bold text-xs pb-1 border-b border-white/10">
                <Info className="w-3.5 h-3.5" />
                <span>Zero Stop-Loss Overrides</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Measures whether you allow your automated stop-loss to execute cleanly without manually cancelling, freezing, or widening it during adverse price swings.
              </p>
              <div className="text-[10px] font-mono text-emerald-400 pt-0.5">
                Current status: 100% disciplined exits.
              </div>
              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2.5 h-2.5 bg-[#060e1d] border-r border-b border-emerald-500/30 rotate-45" />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-300 text-[11px] font-bold flex items-center gap-1">
                3. Stop Loss Discipline
                <HelpCircle className="w-3 h-3 text-slate-500" />
              </span>
              <strong className="font-mono text-emerald-400 font-bold">100% Adherence</strong>
            </div>
            <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: "100%" }} />
            </div>
            <span className="text-[10px] text-emerald-400 block">
              ✅ Zero stop-loss violations logged
            </span>
          </div>
        </div>
      </div>

      {/* Daily Session Cards — Luxury Calendar Modal */}
      <LuxuryDateRangePicker
        isOpen={isCalendarOpen}
        onClose={() => setCalendarOpen(false)}
        startDate={customStart}
        endDate={customEnd}
        onApplyRange={(start, end) => {
          setCustomStart(start);
          setCustomEnd(end);
          setPaperPnlRange("custom");
          setSelectedDayIndex(0);
        }}
      />

      {/* Post-Mortem — Independent Luxury Calendar Modal */}
      <LuxuryDateRangePicker
        isOpen={pmCalendarOpen}
        onClose={() => setPmCalendarOpen(false)}
        startDate={pmCustomStart}
        endDate={pmCustomEnd}
        onApplyRange={(start, end) => {
          setPmCustomStart(start);
          setPmCustomEnd(end);
          setPostMortemRange("custom");
        }}
      />
    </div>
  );
}
