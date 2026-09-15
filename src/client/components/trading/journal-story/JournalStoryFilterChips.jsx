import React from "react";
import clsx from "clsx";
import { Layers, Tag } from "lucide-react";
import { soundEngine } from "../../../utils/soundEngine";

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

  const filterTabs = [
    { id: "ALL", label: "All Stories", count: allCount },
    { id: "WIN", label: "🟢 Targets Hit", count: winCount },
    { id: "LOSS", label: "🛑 Protected Stops", count: lossCount },
  ];

  return (
    <div className="space-y-3">
      {/* Tier 2: Outcome Filter Chips & Global Expand/Collapse Toggle */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl text-xs flex-wrap">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                soundEngine.playTabSwitchTone();
                setJournalFilter(tab.id);
              }}
              className={clsx(
                "px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap text-xs flex items-center gap-2",
                journalFilter === tab.id
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              <span>{tab.label}</span>
              <span className="px-1.5 py-0.2 rounded-full bg-white/10 text-[10px] font-mono">
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Global Expand / Collapse All Stories Toggle */}
        {filteredTrades.length > 0 && (
          <button
            type="button"
            onClick={() => {
              soundEngine.playTabSwitchTone();
              toggleExpandAll(filteredTrades.map((t) => t.id));
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-bold transition shadow-sm"
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
            className="px-2.5 py-1 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-bold text-xs transition flex items-center gap-1 shadow-sm whitespace-nowrap"
          >
            <span>Clear Filter ✕</span>
          </button>
        </div>
      )}
    </div>
  );
}
