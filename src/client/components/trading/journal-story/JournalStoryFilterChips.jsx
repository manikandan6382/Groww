import React from "react";
import clsx from "clsx";
import { motion } from "framer-motion";
import { Layers, Tag } from "lucide-react";
import { soundEngine } from "../../../utils/soundEngine";
import { isTradeInMiddayChop } from "./filterJournalTrades";

export function JournalStoryFilterChips({
  journalFilter,
  setJournalFilter,
  dateFilteredTrades,
  filteredTrades,
  expandedTradeIds,
  toggleExpandAll,
  selectedStrategyFilter,
  clearSelectedStrategyFilter
}) {
  const allCount = dateFilteredTrades.length;
  const winCount = dateFilteredTrades.filter((t) => (t.netPnl || 0) > 0).length;
  const lossCount = dateFilteredTrades.filter((t) => (t.netPnl || 0) <= 0).length;
  const runnerCount = dateFilteredTrades.filter((t) => (t.netPnl || 0) >= 400 || (t.rMultiple && Number(t.rMultiple) >= 2.0)).length;
  const breachCount = dateFilteredTrades.filter((t) => Number(t.netPnl || 0) < -300 || t.isRuleBreached === true).length;
  const beCount = dateFilteredTrades.filter((t) => Math.abs(Number(t.netPnl || 0)) <= 65 || t.closeReason === "BREAKEVEN_LOCKED").length;
  const chopCount = dateFilteredTrades.filter(isTradeInMiddayChop).length;
  const tiltCount = dateFilteredTrades.filter((t) => {
    const m = Array.isArray(t.mistakeTags) ? t.mistakeTags.join(" ").toLowerCase() : String(t.mistakeTags || "").toLowerCase();
    return t.followedPlan === false || (m && m !== "none" && !m.includes("plan followed") && !m.includes("disciplined"));
  }).length;

  const filterTabs = [
    { id: "ALL", label: "All Stories", count: allCount },
    { id: "WIN", label: "🟢 Targets Hit", count: winCount },
    { id: "LOSS", label: "🛑 Protected Stops", count: lossCount },
    { id: "RUNNERS", label: "🎯 1:2+ Runners", count: runnerCount },
    { id: "BREACH", label: "⚠️ Breached >₹300", count: breachCount, alert: breachCount > 0 },
    { id: "BREAKEVEN", label: "🛡️ BE Scratched", count: beCount },
    { id: "CHOP", label: "⏳ Midday Chop", count: chopCount },
    { id: "TILT", label: "🧠 Tilt / Mistakes", count: tiltCount },
  ];

  return (
    <div className="space-y-3">
      {/* Tier 2: Outcome Filter Chips & Global Expand/Collapse Toggle */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl text-xs flex-wrap">
          {filterTabs.map((tab) => {
            const isActive = journalFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  soundEngine.playTabSwitchTone();
                  setJournalFilter(tab.id);
                }}
                className={clsx(
                  "relative px-2.5 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap text-xs flex items-center gap-1.5 cursor-pointer z-10",
                  isActive
                    ? tab.alert 
                      ? "text-rose-200"
                      : "text-cyan-300"
                    : tab.alert
                      ? "text-rose-300/80 hover:text-rose-200 hover:bg-rose-500/10"
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/5",
                  tab.alert && tab.count > 0 && !isActive && "animate-pulse"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeJournalFilterChipPill"
                    transition={{ type: "spring", stiffness: 450, damping: 32 }}
                    className={clsx(
                      "absolute inset-0 rounded-xl -z-10 shadow-sm border",
                      tab.alert 
                        ? "bg-rose-500/25 border-rose-500/40 shadow-[0_0_12px_rgba(244,63,94,0.25)]" 
                        : "bg-cyan-500/20 border-cyan-500/35 shadow-[0_0_12px_rgba(6,182,212,0.25)]"
                    )}
                  />
                )}
                <span>{tab.label}</span>
                <span className={clsx(
                  "px-1.5 py-0.2 rounded-full text-[10px] font-mono",
                  isActive 
                    ? "bg-black/40 font-bold" 
                    : tab.alert 
                      ? "bg-rose-500/20 text-rose-300 font-bold" 
                      : "bg-white/10"
                )}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Global Expand / Collapse All Stories Toggle */}
        {filteredTrades.length > 0 && (
          <button
            type="button"
            onClick={() => {
              soundEngine.playTabSwitchTone();
              toggleExpandAll(filteredTrades.map((t) => t.id));
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-bold transition shadow-sm cursor-pointer whitespace-nowrap"
            title="Expand or collapse all 4-Act trade autopsies"
          >
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>
              {expandedTradeIds.size === filteredTrades.length ? "Collapse All Stories" : "Expand All Stories"}
            </span>
          </button>
        )}
      </div>

      {/* Tier 3: Active Strategy Filter Badge with 1-Click Clear */}
      {selectedStrategyFilter && (
        <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-xs animate-in fade-in">
          <div className="flex items-center gap-2 flex-wrap">
            <Tag className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-300 font-medium">Filtered by Strategy:</span>
            <strong className="text-cyan-300 font-bold px-2 py-0.5 rounded-lg bg-cyan-500/20 border border-cyan-500/40 font-mono">
              {selectedStrategyFilter}
            </strong>
            <span className="text-slate-400 font-mono text-[11px]">
              ({filteredTrades.length} trades · {filteredTrades.filter(t => (t.netPnl || 0) > 0).length} wins)
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              soundEngine.playTabSwitchTone();
              clearSelectedStrategyFilter();
            }}
            className="px-2.5 py-1 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-bold text-xs transition flex items-center gap-1 shadow-sm whitespace-nowrap cursor-pointer"
          >
            <span>Clear Filter ✕</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default JournalStoryFilterChips;
