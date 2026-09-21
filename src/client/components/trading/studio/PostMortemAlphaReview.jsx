import React from "react";
import { motion } from "framer-motion";
import { Sparkles, Calendar as CalendarIcon } from "lucide-react";
import clsx from "clsx";
import { BestAlertCard } from "./BestAlertCard";
import { WorstAlertCard } from "./WorstAlertCard";

const TIMEFRAME_TABS = [
  { id: "all", label: "All Time" },
  { id: "today", label: "Today" },
  { id: "week", label: "This Week" },
  { id: "month", label: "This Month" },
  { id: "custom", label: "Custom", icon: CalendarIcon },
];

export const PostMortemAlphaReview = React.memo(function PostMortemAlphaReview({
  postMortemRange,
  setPostMortemRange,
  pmCustomStart,
  pmCustomEnd,
  setPmCalendarOpen,
  bestAlert,
  worstAlert,
  onPromoteToJournal,
  promotedTradeIds,
  promoteSuccessToast,
  soundEngine,
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-slate-900/60 backdrop-blur-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-5 space-y-4 w-full transition-all duration-300 hover:border-cyan-500/30 group">
      <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none -mr-10 -mt-10" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-rose-500/5 rounded-full blur-3xl pointer-events-none -ml-10 -mb-10" />

      {/* Promotion Toast Notification */}
      {promoteSuccessToast && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-400/50 text-emerald-200 text-xs font-mono font-bold flex items-center justify-between shadow-lg shadow-emerald-500/20"
        >
          <span>✨ {promoteSuccessToast}</span>
          <span className="text-[10px] text-emerald-300 font-sans">Synced with 4-Act Journal</span>
        </motion.div>
      )}

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

          <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
            <div className="flex items-center gap-1 p-1 bg-black/40 border border-white/10 rounded-2xl shadow-sm">
              {TIMEFRAME_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = postMortemRange === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      soundEngine?.playTabSwitchTone?.();
                      setPostMortemRange(tab.id);
                      if (tab.id === "custom") setPmCalendarOpen(true);
                    }}
                    className={clsx(
                      "relative px-3 py-1 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap z-10",
                      isActive ? "text-violet-300" : "text-slate-400 hover:text-white"
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeStrategyTimeframePill"
                        transition={{ type: "spring", stiffness: 450, damping: 32 }}
                        className="absolute inset-0 rounded-xl bg-violet-500/20 border border-violet-500/35 shadow-[0_0_12px_rgba(139,92,246,0.25)] -z-10"
                      />
                    )}
                    {Icon && <Icon className="w-3 h-3 text-violet-400" />}
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {postMortemRange === "custom" && (
              <button
                type="button"
                onClick={() => {
                  soundEngine?.playTabSwitchTone?.();
                  setPmCalendarOpen(true);
                }}
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

      <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BestAlertCard
          bestAlert={bestAlert}
          onPromoteToJournal={onPromoteToJournal}
          promotedTradeIds={promotedTradeIds}
        />
        <WorstAlertCard
          worstAlert={worstAlert}
          onPromoteToJournal={onPromoteToJournal}
          promotedTradeIds={promotedTradeIds}
        />
      </div>
    </div>
  );
});
