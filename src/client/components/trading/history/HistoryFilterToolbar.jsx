import React, { useRef, useEffect } from "react";
import { RotateCcw, Download, Upload, FileJson, Calendar as CalendarIcon, Search, X, AlertTriangle, Target, Shield, Bookmark, Clock } from "lucide-react";
import clsx from "clsx";
import { soundEngine } from "../../../utils/soundEngine";

export const HistoryFilterToolbar = ({
  assetFilter = "ALL",
  setAssetFilter,
  allCount = 0,
  niftyCount = 0,
  bankCount = 0,
  sensexCount = 0,
  dateRangeFilter = "all",
  setDateRangeFilter,
  paperLedgerFilter = "all",
  setPaperLedgerFilter,
  diagnosticFilter = "all",
  setDiagnosticFilter,
  searchQuery = "",
  setSearchQuery,
  breachedCount = 0,
  runnerCount = 0,
  beCount = 0,
  journalCount = 0,
  middayCount = 0,
  onOpenCalendar,
  onResetFilters,
  onExportCsv,
  onExportJson,
  onImportJson
}) => {
  const fileInputRef = useRef(null);
  const searchInputRef = useRef(null);

  // Keyboard shortcut: Press '/' to focus search input
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="flex flex-col space-y-3 p-4 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-xl">
      {/* Row 1: Asset Tabs + Search Bar + Export Tools */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Asset Segments */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/40 border border-white/10 text-xs font-mono">
          {[
            { id: "ALL", label: "ALL", count: allCount },
            { id: "NIFTY", label: "NIFTY", count: niftyCount },
            { id: "BANKNIFTY", label: "BANKNIFTY", count: bankCount },
            { id: "SENSEX", label: "SENSEX", count: sensexCount }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                soundEngine.playTabSwitchTone();
                setAssetFilter(tab.id);
              }}
              className={clsx(
                "px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                assetFilter === tab.id
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm"
                  : "text-slate-400 hover:text-white"
              )}
              type="button"
            >
              <span>{tab.label}</span>
              <span className="text-[10px] opacity-70">({tab.count})</span>
            </button>
          ))}
        </div>

        {/* Real-time Search Input Bar */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search strike, order #, tag... (/)"
            className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400/60 transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Export & Restore Tools */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-bold text-slate-300 hover:text-white transition shadow-sm cursor-pointer"
            title="Export hardened CSV audit ledger (24 columns)"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>CSV</span>
          </button>

          <button
            type="button"
            onClick={onExportJson}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-bold text-slate-300 hover:text-white transition shadow-sm cursor-pointer"
            title="Download JSON forensic backup"
          >
            <FileJson className="w-3.5 h-3.5 text-emerald-400" />
            <span>Backup</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-bold text-slate-300 hover:text-white transition shadow-sm cursor-pointer"
            title="Restore JSON trade backup"
          >
            <Upload className="w-3.5 h-3.5 text-cyan-400" />
            <span>Restore</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={onImportJson}
          />

          {onResetFilters && (
            <button
              onClick={onResetFilters}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs transition cursor-pointer"
              title="Reset all filters and search"
              type="button"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Row 2: Diagnostic Quick Chips + Timeframe + Outcome Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs font-mono">
        {/* Diagnostic Execution Filter Chips */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-black/40 border border-white/10 overflow-x-auto">
          {[
            { id: "all", label: "All Executions", count: null },
            { id: "breach", label: "Breached >₹300", count: breachedCount, icon: AlertTriangle, activeClass: "bg-rose-500/20 text-rose-300 border-rose-500/40" },
            { id: "runner", label: "1:2+ Runners", count: runnerCount, icon: Target, activeClass: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" },
            { id: "be", label: "BE Scratched", count: beCount, icon: Shield, activeClass: "bg-amber-500/20 text-amber-300 border-amber-500/40" },
            { id: "midday", label: "Midday Chop", count: middayCount, icon: Clock, activeClass: "bg-orange-500/20 text-orange-300 border-orange-500/40" },
            { id: "journaled", label: "In Journal", count: journalCount, icon: Bookmark, activeClass: "bg-purple-500/20 text-purple-300 border-purple-500/40" }
          ].map((chip) => {
            const Icon = chip.icon;
            const isActive = diagnosticFilter === chip.id;
            return (
              <button
                key={`diag-${chip.id}`}
                type="button"
                onClick={() => {
                  soundEngine.playTabSwitchTone();
                  setDiagnosticFilter?.(chip.id);
                }}
                className={clsx(
                  "px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap",
                  isActive
                    ? chip.activeClass || "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                {Icon && <Icon className="w-3 h-3" />}
                <span>{chip.label}</span>
                {chip.count != null && chip.count > 0 && (
                  <span className="text-[10px] opacity-75">({chip.count})</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Timeframe Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-black/30 border border-white/5 overflow-x-auto">
          {[
            { id: "all", label: "All Time" },
            { id: "today", label: "Today" },
            { id: "yesterday", label: "Yesterday" },
            { id: "week", label: "This Week" },
            { id: "month", label: "This Month" },
            { id: "custom", label: "Custom", icon: CalendarIcon }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = dateRangeFilter === tab.id;
            return (
              <button
                key={`timeframe-${tab.id}`}
                type="button"
                onClick={() => {
                  soundEngine.playTabSwitchTone();
                  setDateRangeFilter(tab.id);
                  if (tab.id === "custom") onOpenCalendar?.();
                }}
                className={clsx(
                  "px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap",
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

        {/* Outcome Classification Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-black/30 border border-white/5">
          {[
            { id: "all", label: "All" },
            { id: "win", label: "Wins" },
            { id: "loss", label: "Losses" },
            { id: "friction", label: "BE Drag" }
          ].map((tab) => (
            <button
              key={`outcome-${tab.id}`}
              type="button"
              onClick={() => {
                soundEngine.playTabSwitchTone();
                setPaperLedgerFilter(tab.id);
              }}
              className={clsx(
                "px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer",
                paperLedgerFilter === tab.id
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
