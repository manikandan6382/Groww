import React from "react";
import { soundEngine } from "../../utils/soundEngine";
import { Calendar as CalendarIcon } from "lucide-react";
import clsx from "clsx";

const TIMEFRAME_TABS = [
  { id: "all", label: "All Time" },
  { id: "today", label: "Today" },
  { id: "week", label: "This Week" },
  { id: "month", label: "This Month" },
  { id: "custom", label: "Custom", icon: CalendarIcon },
];

export function JournalTimeframeTabs({
  journalRange,
  setJournalRange,
  journalCustomStart,
  journalCustomEnd,
  onOpenCalendar
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.02] border border-white/5 text-xs flex-shrink-0">
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
                  if (tab.id === "custom") onOpenCalendar();
                }}
                className={clsx(
                  "px-2.5 py-1 rounded-lg font-bold transition text-xs flex items-center gap-1.5 whitespace-nowrap cursor-pointer",
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

        {journalRange === "custom" && (
          <button
            type="button"
            onClick={onOpenCalendar}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold transition whitespace-nowrap shadow-sm cursor-pointer"
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
  );
}
