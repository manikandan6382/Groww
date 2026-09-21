import React from "react";
import { Calendar, FilterX } from "lucide-react";
import { isMarketWeekend } from "../../../stores/useTradingStore";
import { DailySessionCard } from "./DailySessionCard";

export function DailySessionsDeck({ 
  dailySessions = [], 
  rangeLabel, 
  journalRange,
  selectedDateFilter = null,
  onSelectDate
}) {
  const isWeekend = journalRange === "today" && isMarketWeekend();

  return (
    <div className="p-5 sm:p-6 rounded-3xl bg-[#0d111a]/85 backdrop-blur-2xl border border-white/[0.08] shadow-[0_24px_60px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.08)] space-y-4 hover:border-white/[0.14] transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shadow-sm shadow-cyan-500/10">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-white tracking-tight">Daily Session Calendar Cards</h3>
            <span className="text-[10px] text-slate-400">
              Session breakdown for <strong className="text-cyan-300 font-mono">{rangeLabel}</strong>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {selectedDateFilter && (
            <button
              type="button"
              onClick={() => onSelectDate && onSelectDate(null)}
              className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1 hover:bg-cyan-500/30 transition-colors cursor-pointer"
              title="Click to clear date filter"
            >
              <FilterX className="w-2.5 h-2.5" />
              <span>{selectedDateFilter}</span>
            </button>
          )}
          <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
            {dailySessions.length} {dailySessions.length === 1 ? "Session" : "Sessions"}
          </span>
        </div>
      </div>

      {dailySessions.length > 0 ? (
        <div className="max-h-[440px] overflow-y-auto pr-1 space-y-2.5 custom-scrollbar">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            {dailySessions.map((session) => (
              <DailySessionCard 
                key={session.fullDate} 
                session={session} 
                isSelected={selectedDateFilter === session.fullDate}
                onSelect={() => onSelectDate && onSelectDate(selectedDateFilter === session.fullDate ? null : session.fullDate)}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="p-8 rounded-2xl bg-white/[0.015] border border-white/[0.06] text-center space-y-2.5">
          <span className="text-3xl block">{isWeekend ? "🏖️" : "📅"}</span>
          <p className="text-xs text-slate-200 font-bold">
            {isWeekend
              ? "Weekend — Indian Markets are Closed Today"
              : journalRange === "today"
              ? "No trading session logged for today yet."
              : "No trading sessions recorded in this date range."}
          </p>
          <span className="text-[11px] text-slate-400 block max-w-sm mx-auto leading-relaxed">
            {isWeekend
              ? "Switch timeframe to \"This Week\" or \"All Time\" above to view historical sessions."
              : "Record a trade with the 1-Click Strike Bar or adjust the date range above to view sessions."}
          </span>
        </div>
      )}
    </div>
  );
}

export default DailySessionsDeck;

