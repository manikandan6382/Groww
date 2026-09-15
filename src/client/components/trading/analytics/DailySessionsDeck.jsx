import React from "react";
import { Calendar } from "lucide-react";
import { isMarketWeekend } from "../../../stores/useTradingStore";
import { DailySessionCard } from "./DailySessionCard";

export function DailySessionsDeck({ dailySessions, rangeLabel, journalRange }) {
  const isWeekend = journalRange === "today" && isMarketWeekend();

  return (
    <div className="p-5 rounded-2xl bg-app-card/70 backdrop-blur-xl border border-white/5 shadow-xl space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Calendar className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Daily Session Calendar Cards</h3>
            <span className="text-[11px] text-slate-400">
              Session P&amp;L breakdown for <strong className="text-cyan-300">{rangeLabel}</strong>
            </span>
          </div>
        </div>

        <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
          {dailySessions.length} Active {dailySessions.length === 1 ? "Session" : "Sessions"}
        </span>
      </div>

      {dailySessions.length > 0 ? (
        <div className="max-h-[440px] overflow-y-auto pr-1 space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            {dailySessions.map((session) => (
              <DailySessionCard key={session.fullDate} session={session} />
            ))}
          </div>
        </div>
      ) : (
        <div className="p-6 rounded-2xl bg-white/[0.01] border border-white/5 text-center space-y-2">
          <span className="text-2xl block">{isWeekend ? "🏖️" : "📅"}</span>
          <p className="text-xs text-slate-300 font-bold">
            {isWeekend
              ? "Weekend — Indian Markets are Closed Today"
              : journalRange === "today"
              ? "No trading session logged for today yet."
              : "No trading sessions recorded in this date range."}
          </p>
          <span className="text-[10px] text-slate-500 block">
            {isWeekend
              ? "Switch timeframe to \"This Week\" or \"All Time\" to view historical sessions."
              : "Record a trade with the 1-Click Strike Bar or adjust the date filter to view sessions."}
          </span>
        </div>
      )}
    </div>
  );
}
