import React, { useState } from "react";
import { useTradingStore } from "../stores/useTradingStore";
import { soundEngine } from "../utils/soundEngine";
import { JournalMaster2CardDeck } from "../components/trading/JournalMaster2CardDeck";
import { EquityCurveDeck } from "../components/trading/EquityCurveDeck";
import { JournalAnalyticsDeck } from "../components/trading/JournalAnalyticsDeck";
import { TradeLoggerForm } from "../components/trading/TradeLoggerForm";
import { JournalStoryDeck } from "../components/trading/JournalStoryDeck";
import { CustomTradeModal } from "../components/trading/CustomTradeModal";
import { LuxuryDateRangePicker } from "../components/common/LuxuryDateRangePicker";
import { BookOpen, Download, Plus, Sparkles, ShieldCheck, Radio, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import clsx from "clsx";

export function JournalView() {
  const { 
    journalTrades, 
    journalRange, 
    journalCustomStart,
    journalCustomEnd,
    setJournalRange,
    setJournalCustomRange,
    setSafetyGuardModalOpen,
    setCustomTradeModalOpen
  } = useTradingStore();

  const [isFormVisible, setFormVisible] = useState(true);
  const [isCalendarOpen, setCalendarOpen] = useState(false);

  const exportTaxCsv = () => {
    const escapeCsv = (val) => `"${String(val ?? "").replace(/"/g, '""')}"`;
    const headers = [
      "Trade ID",
      "Date",
      "Symbol / Contract",
      "Side",
      "Quantity",
      "Entry Price (INR)",
      "Exit Price (INR)",
      "Gross PnL (INR)",
      "Taxes & Charges (INR)",
      "Net Realized PnL (INR)",
      "Setup / Strategy Tag",
      "Catalyst",
      "Lessons Learned"
    ];
    const rows = journalTrades.map((t, idx) => [
      escapeCsv(t.id || `TRD-${1000 + idx}`),
      escapeCsv(t.exitDatetime?.split("T")[0] || t.entryDatetime?.split("T")[0] || new Date().toISOString().split("T")[0]),
      escapeCsv(t.symbol),
      escapeCsv(t.direction || "LONG"),
      t.quantity || 1,
      Number(t.entryPrice || 0).toFixed(2),
      Number(t.exitPrice || 0).toFixed(2),
      Number(t.grossPnl || t.netPnl || 0).toFixed(2),
      Number(t.taxesAndCharges || 56.0).toFixed(2),
      Number(t.netPnl || 0).toFixed(2),
      escapeCsv(t.strategyTags || t.strategyTag || "Quantitative Setup"),
      escapeCsv(t.catalyst || ""),
      escapeCsv(t.lessonsLearned || "")
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `portfoliox_tax_audit_report_${journalRange}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    soundEngine.playSuccessTone();
  };

  return (
    <div className="space-y-6">
      {/* Act 1: Apple Luxury Spatial Hero Banner */}
      <div className="p-5 rounded-2xl bg-app-card/70 backdrop-blur-xl border border-white/5 shadow-xl space-y-4">
        {/* Top Meta Bar: Status Pills & Interactive Safety Guard */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/20 whitespace-nowrap">
              JOURNAL &amp; PERFORMANCE
            </span>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1 whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              Live Market Ready
            </span>
            <span className="text-[10px] font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 whitespace-nowrap">
              ⚡ India VIX: 13.2 · Favorable Scalp
            </span>
          </div>

          {/* Clickable Safety Guard Pill (Opens Circuit Breaker Modal) */}
          <button
            type="button"
            onClick={() => setSafetyGuardModalOpen(true)}
            className="flex items-center gap-1.5 text-[10px] font-bold text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 px-2.5 py-1 rounded-full border border-cyan-500/30 transition shadow-sm group whitespace-nowrap"
            title="Click to view 2-Loss Daily Stop Circuit Breaker Policy"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>🛡️ Safety Guard: 0/2 Max Losses</span>
            <ChevronRight className="w-3 h-3 text-cyan-400 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* Title and Action Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">
              Trading Journal &amp; Results
            </h1>
            <p className="text-xs text-slate-400 max-w-2xl">
              Every trade explained in plain English — track your true take-home earnings, statistical edge, and risk discipline.
            </p>
          </div>

          {/* Action CTAs Dock */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap flex-shrink-0">
            {/* Custom Data / Sample Presets Modal CTA */}
            <button
              type="button"
              onClick={() => setCustomTradeModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 hover:text-purple-200 text-xs font-bold transition whitespace-nowrap shadow-sm"
              title="Add Custom Trade, Sample Template, or Bulk JSON (Press N)"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>+ Add Custom Data</span>
            </button>

            {/* Export CSV Button */}
            <button
              type="button"
              onClick={exportTaxCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-xs font-bold text-slate-300 hover:text-white transition whitespace-nowrap"
              title="Export CSV Tax Audit Report"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Export Tax CSV</span>
              <span className="sm:hidden">CSV</span>
            </button>

            {/* Log Trade CTA */}
            <button
              type="button"
              onClick={() => setFormVisible(!isFormVisible)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-400 hover:from-cyan-400 hover:to-sky-300 text-black font-extrabold text-xs shadow-lg shadow-cyan-500/20 transition whitespace-nowrap"
              title="Toggle Fast Trade Logger Form (Press 'N')"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>{isFormVisible ? "Hide Form" : "Log Trade"}</span>
              <kbd className="text-[9px] font-mono px-1 py-0.2 rounded bg-black/20 text-black font-bold">N</kbd>
            </button>
          </div>
        </div>

        {/* Tier 2: Timeframe Range Tabs + Responsive Custom Date Dock */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/5">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.02] border border-white/5 text-xs flex-shrink-0">
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
                      "px-2.5 py-1 rounded-lg font-bold transition text-xs flex items-center gap-1.5 whitespace-nowrap",
                      isActive
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm"
                        : "text-slate-400 hover:text-slate-200"
                    )}
                  >
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
                onClick={() => setCalendarOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold transition whitespace-nowrap shadow-sm"
                title="Click to edit custom date range"
              >
                <CalendarIcon className="w-3 h-3 text-cyan-400" />
                <span>{journalCustomStart} → {journalCustomEnd}</span>
                <span className="text-[10px] underline ml-1 font-sans text-cyan-300 font-normal">Edit Range</span>
              </button>
            )}
          </div>

          <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
            <span>Active Range:</span>
            <strong className="text-cyan-400">
              {journalRange === "today" 
                ? "Today" 
                : journalRange === "week" 
                ? "This Week" 
                : journalRange === "month" 
                ? "This Month" 
                : journalRange === "custom" 
                ? `${journalCustomStart} to ${journalCustomEnd}` 
                : "All Time"}
            </strong>
          </div>
        </div>
      </div>

      {/* Act 2: Master 2-Card Deck (Reactive to journalRange) */}
      <JournalMaster2CardDeck />

      {/* Act 3: Cumulative Account Equity Growth Curve & 1,000-Path Monte Carlo Deck */}
      <EquityCurveDeck />

      {/* Act 3.5: Middle Visual Analytics Deck (Reactive to journalRange) */}
      <JournalAnalyticsDeck />

      {/* Act 3.5: Full 12-Column Guided Trade Logger Form */}
      {isFormVisible && <TradeLoggerForm />}

      {/* Act 4: Story-Driven Trade History Log (Reactive to journalRange & filters) */}
      <JournalStoryDeck />

      {/* Act 5: Luxury Calendar Date Range Picker */}
      <LuxuryDateRangePicker
        isOpen={isCalendarOpen}
        onClose={() => setCalendarOpen(false)}
        startDate={journalCustomStart}
        endDate={journalCustomEnd}
        onApplyRange={(start, end) => setJournalCustomRange(start, end)}
      />
    </div>
  );
}


