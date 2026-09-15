import React from "react";
import { soundEngine } from "../../../utils/soundEngine";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar as CalendarIcon } from "lucide-react";
import clsx from "clsx";
import { SessionBarCard } from "./SessionBarCard";

const TIMEFRAME_TABS = [
  { id: "all", label: "All Time" },
  { id: "today", label: "Today" },
  { id: "week", label: "This Week" },
  { id: "month", label: "This Month" },
  { id: "custom", label: "Custom", icon: CalendarIcon },
];

export function SessionCardsDeck({
  currentDataset,
  dailyGroups,
  paperPnlRange,
  setPaperPnlRange,
  selectedDayIndex,
  setSelectedDayIndex,
  customStart,
  customEnd,
  onOpenCalendar,
  setCalendarOpen
}) {
  const bars = currentDataset?.bars || (Array.isArray(dailyGroups) ? dailyGroups : []);
  const handleCalendar = onOpenCalendar || (() => setCalendarOpen?.(true));

  return (
    <div className="space-y-3.5 p-4 rounded-3xl bg-white/[0.015] border border-white/5 shadow-inner">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
            <span>Daily Session Cards</span>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
              {bars.length} Sessions
            </span>
          </h3>
          <span className="text-xs text-slate-400">
            Click any session card below for complete audit log &amp; trade breakdown
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/10 text-xs flex-shrink-0 shadow-sm">
            {TIMEFRAME_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = paperPnlRange === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    soundEngine.playTabSwitchTone();
                    setPaperPnlRange(tab.id);
                    setSelectedDayIndex(0);
                    if (tab.id === "custom") handleCalendar();
                  }}
                  className={clsx(
                    "relative px-3 py-1.5 rounded-lg font-bold transition-colors text-xs flex items-center gap-1.5 whitespace-nowrap z-10 cursor-pointer",
                    isActive ? "text-cyan-300" : "text-slate-400 hover:text-slate-200"
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeDailyTimeframePill"
                      transition={{ type: "spring", stiffness: 450, damping: 32 }}
                      className="absolute inset-0 rounded-lg bg-cyan-500/20 border border-cyan-500/35 shadow-[0_0_12px_rgba(6,182,212,0.25)] -z-10"
                    />
                  )}
                  {Icon && <Icon className="w-3.5 h-3.5 text-cyan-400" />}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {paperPnlRange === "custom" && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playTabSwitchTone();
                handleCalendar();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold transition whitespace-nowrap shadow-sm cursor-pointer"
              title="Edit custom date range"
            >
              <CalendarIcon className="w-3.5 h-3.5 text-cyan-400" />
              <span>{customStart} → {customEnd}</span>
              <span className="text-[10px] underline ml-1 font-sans text-cyan-300 font-bold">Edit</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <AnimatePresence mode="popLayout">
          {bars.map((d, idx) => {
            const uniqueKey = `${paperPnlRange}-${d.dateStr || d.date || d.day || idx}`;
            return (
              <SessionBarCard
                key={uniqueKey}
                barData={d}
                isSelected={selectedDayIndex === idx}
                onSelect={() => setSelectedDayIndex(idx)}
              />
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
