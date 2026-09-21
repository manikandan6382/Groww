import React, { useEffect, useRef } from "react";
import clsx from "clsx";
import { motion } from "framer-motion";
import { Calendar as CalendarIcon, Download } from "lucide-react";
import { soundEngine } from "../../../utils/soundEngine";

const TIMEFRAME_TABS = [
  { id: "all", label: "All Time" },
  { id: "today", label: "Today" },
  { id: "week", label: "This Week" },
  { id: "month", label: "This Month" },
  { id: "custom", label: "Custom", icon: CalendarIcon },
];

export function JournalStoryToolbar({
  journalRange,
  setJournalRange,
  setCalendarOpen,
  journalCustomStart,
  journalCustomEnd,
  exportTaxCsv,
  filteredCount,
  searchQuery,
  setSearchQuery
}) {
  const searchInputRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "/" && document.activeElement !== searchInputRef.current && !["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl text-xs flex-shrink-0">
          {TIMEFRAME_TABS.map((tab) => {
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
                  "relative px-3 py-1.5 rounded-xl font-bold transition-colors text-xs flex items-center gap-1.5 whitespace-nowrap z-10 cursor-pointer",
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold transition shadow-sm cursor-pointer"
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
          disabled={filteredCount === 0}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-bold transition disabled:opacity-40 disabled:cursor-not-allowed shadow-sm whitespace-nowrap cursor-pointer"
          title="Export CA Tax-Filing Ledger with Section 44AD Turnover & STT Breakdown"
        >
          <Download className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">Tax Ledger CSV</span>
        </button>

        {/* Search Input with Frosted Finish and '/' Keyboard Focus */}
        <div className="relative flex-1 sm:flex-initial">
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search strike, ID, catalyst..."
            className="w-full sm:w-64 bg-black/40 border border-white/10 rounded-xl pl-3.5 pr-8 py-2 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-cyan-500/50 shadow-inner"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs cursor-pointer"
            >
              ✕
            </button>
          ) : (
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-500 pointer-events-none px-1.5 py-0.5 rounded bg-white/5 border border-white/10">
              /
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default JournalStoryToolbar;
