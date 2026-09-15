import React from "react";
import { BookOpen, Zap, Calendar as CalendarIcon } from "lucide-react";
import { isMarketWeekend } from "../../../stores/useTradingStore";

export function JournalStoryEmptyStates({
  journalRange,
  rangeLabel,
  setJournalRange,
  setJournalFilter,
  setSearchQuery,
  selectedStrategyFilter,
  clearSelectedStrategyFilter
}) {
  return (
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
  );
}
