import React, { useState, useMemo, useCallback } from "react";
import { Trash2, RotateCcw, X, Filter } from "lucide-react";
import { SettledTradeTableRow } from "./SettledTradeTableRow";
import { SettledTradeForensicDrawer } from "./SettledTradeForensicDrawer";
import { calculateTradeRMultiple } from "./historyCalculations";
import { soundEngine } from "../../../utils/soundEngine";

export const SettledTradesTable = ({
  trades = [],
  selectedTradeIds = new Set(),
  onToggleSelectTrade,
  onSelectAllVisible,
  onClearSelection,
  onDeleteSelected,
  undoTradeBackup,
  undoCountdown,
  onExecuteUndo,
  onDismissUndo,
  onOpenTimeline,
  onDeleteTrade,
  highlightedTradeId,
  activeTimelineTradeId,
  onResetFilters,
  journalIds = new Set(),
  onPromoteToJournal,
  onUpdateTrade
}) => {
  const isAllSelected = trades.length > 0 && selectedTradeIds.size === trades.length;

  const [sortField, setSortField] = useState("exitDatetime");
  const [sortOrder, setSortOrder] = useState("desc"); // 'asc' | 'desc'
  const [expandedTradeId, setExpandedTradeId] = useState(null);

  const handleToggleExpand = useCallback((tradeId) => {
    setExpandedTradeId((prev) => (prev === tradeId ? null : tradeId));
  }, []);

  const handleSort = (field) => {
    soundEngine.playTabSwitchTone();
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const renderSortIndicator = (field) => {
    if (sortField !== field) return <span className="opacity-30 text-[9px] ml-1">↕</span>;
    return <span className="text-cyan-400 text-[10px] ml-1 font-bold">{sortOrder === "asc" ? "▲" : "▼"}</span>;
  };

  const sortedTrades = useMemo(() => {
    if (!sortField) return trades;
    return [...trades].sort((a, b) => {
      let valA = 0;
      let valB = 0;

      if (sortField === "netPnl") {
        valA = Number(a.netPnl || 0);
        valB = Number(b.netPnl || 0);
      } else if (sortField === "rMultiple") {
        valA = calculateTradeRMultiple(a).rMultiple;
        valB = calculateTradeRMultiple(b).rMultiple;
      } else if (sortField === "symbol") {
        const sA = String(a.symbol || "");
        const sB = String(b.symbol || "");
        return sortOrder === "asc" ? sA.localeCompare(sB) : sB.localeCompare(sA);
      } else if (sortField === "entryPrice") {
        valA = Number(a.entryPrice || 0);
        valB = Number(b.entryPrice || 0);
      } else if (sortField === "exitPrice") {
        valA = Number(a.exitPrice || 0);
        valB = Number(b.exitPrice || 0);
      } else {
        valA = new Date(a.exitDatetime || a.entryDatetime || 0).getTime();
        valB = new Date(b.exitDatetime || b.entryDatetime || 0).getTime();
      }

      return sortOrder === "asc" ? valA - valB : valB - valA;
    });
  }, [trades, sortField, sortOrder]);

  return (
    <div className="flex flex-col space-y-3">
      {/* Multi-Select Action Bar */}
      {selectedTradeIds.size > 0 && (
        <div className="p-3 px-4 rounded-xl bg-rose-950/40 border border-rose-500/40 flex items-center justify-between text-xs font-mono text-rose-200">
          <div className="flex items-center gap-2">
            <span className="font-bold">{selectedTradeIds.size} trades selected</span>
            <button
              onClick={onClearSelection}
              className="text-white/40 hover:text-white underline text-[11px] cursor-pointer"
              type="button"
            >
              Deselect All
            </button>
          </div>
          <button
            onClick={onDeleteSelected}
            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            type="button"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Selected</span>
          </button>
        </div>
      )}

      {/* Undo Banner */}
      {undoTradeBackup && (
        <div className="p-3 px-4 rounded-xl bg-cyan-950/40 border border-cyan-500/40 flex items-center justify-between text-xs font-mono text-cyan-200 animate-in fade-in">
          <span>Deleted {undoTradeBackup.count || 1} trades. Auto-commit in {undoCountdown}s</span>
          <div className="flex items-center gap-2">
            <button
              onClick={onExecuteUndo}
              className="px-2.5 py-1 rounded bg-cyan-500 text-black font-bold flex items-center gap-1 cursor-pointer"
              type="button"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Undo</span>
            </button>
            <button onClick={onDismissUndo} className="p-1 text-white/50 hover:text-white cursor-pointer" type="button">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 🏛️ Luxury Financial Data Table with Pinned Sticky Header & Interactive Sorting */}
      <div className="min-h-[220px] max-h-[580px] overflow-y-auto overflow-x-auto rounded-2xl border border-white/10 bg-black/20 backdrop-blur-md shadow-inner relative">
        <table className="w-full min-w-[1380px] text-left text-xs border-collapse">
          <thead className="sticky top-0 z-20 bg-[#0d0f14]/95 backdrop-blur-xl border-b border-white/10 shadow-sm select-none">
            <tr className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              <th className="py-3.5 px-4 bg-[#0d0f14]/95 sticky left-0 z-30 border-r border-white/10 shadow-[4px_0_12px_rgba(0,0,0,0.4)] whitespace-nowrap min-w-[240px]">
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={onSelectAllVisible}
                    className="w-3.5 h-3.5 rounded border-white/20 bg-white/5 text-cyan-500 focus:ring-cyan-400/50 cursor-pointer accent-cyan-500 shrink-0"
                    title="Select all visible trades"
                  />
                  <span
                    onClick={() => handleSort("symbol")}
                    className="cursor-pointer hover:text-cyan-300 transition inline-flex items-center"
                  >
                    Contract / Strike {renderSortIndicator("symbol")}
                  </span>
                </div>
              </th>
              <th className="py-3.5 px-3 bg-[#0d0f14]/90 whitespace-nowrap min-w-[130px]">
                Entry Time
              </th>
              <th
                onClick={() => handleSort("exitDatetime")}
                className="py-3.5 px-3 bg-[#0d0f14]/90 whitespace-nowrap min-w-[130px] cursor-pointer hover:text-cyan-300 transition"
              >
                <span className="inline-flex items-center">
                  End Time (Exit) {renderSortIndicator("exitDatetime")}
                </span>
              </th>
              <th
                onClick={() => handleSort("entryPrice")}
                className="py-3.5 px-3 text-right bg-[#0d0f14]/90 whitespace-nowrap min-w-[95px] cursor-pointer hover:text-cyan-300 transition"
              >
                <span className="inline-flex items-center justify-end">
                  Entry (₹) {renderSortIndicator("entryPrice")}
                </span>
              </th>
              <th
                onClick={() => handleSort("exitPrice")}
                className="py-3.5 px-3 text-right bg-[#0d0f14]/90 whitespace-nowrap min-w-[95px] cursor-pointer hover:text-cyan-300 transition"
              >
                <span className="inline-flex items-center justify-end">
                  Exit (₹) {renderSortIndicator("exitPrice")}
                </span>
              </th>
              <th className="py-3.5 px-3 text-right bg-[#0d0f14]/90 whitespace-nowrap min-w-[95px]">
                Target (₹)
              </th>
              <th className="py-3.5 px-3 text-right bg-[#0d0f14]/90 whitespace-nowrap min-w-[95px]">
                Stop Loss (₹)
              </th>
              <th className="py-3.5 px-3 text-center bg-[#0d0f14]/90 whitespace-nowrap min-w-[150px]">
                Close Reason
              </th>
              <th
                onClick={() => handleSort("rMultiple")}
                className="py-3.5 px-3 text-center bg-[#0d0f14]/90 whitespace-nowrap min-w-[130px] cursor-pointer hover:text-cyan-300 transition"
                title="Sort by Realized R-Multiple (Expectancy Edge)"
              >
                <span className="inline-flex items-center justify-center">
                  R-Multiple {renderSortIndicator("rMultiple")}
                </span>
              </th>
              <th
                onClick={() => handleSort("netPnl")}
                className="py-3.5 px-4 text-right bg-[#0d0f14]/90 whitespace-nowrap min-w-[175px] cursor-pointer hover:text-cyan-300 transition"
                title="Sort by Realized Net Profit & Loss"
              >
                <span className="inline-flex items-center justify-end">
                  Realized P&amp;L {renderSortIndicator("netPnl")}
                </span>
              </th>
              <th className="py-3.5 px-3 text-center bg-[#0d0f14]/90 whitespace-nowrap min-w-[180px]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 font-mono">
            {sortedTrades.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-12 text-center text-slate-400 font-sans text-xs">
                  <div className="max-w-md mx-auto space-y-3 p-6 rounded-2xl bg-white/[0.02] border border-white/5">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto text-cyan-400">
                      <Filter className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-bold text-white text-sm">No Practice Trades Match Active Filters</p>
                      <p className="text-slate-400 text-xs">Try selecting another asset, clearing search, or reset filters.</p>
                    </div>
                    {onResetFilters && (
                      <button
                        type="button"
                        onClick={onResetFilters}
                        className="px-4 py-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-bold transition mx-auto cursor-pointer"
                      >
                        Reset All Filters &amp; Search
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              sortedTrades.map((trade) => {
                const isExpanded = expandedTradeId === trade.id;
                return (
                  <React.Fragment key={trade.id}>
                    <SettledTradeTableRow
                      trade={trade}
                      isSelected={selectedTradeIds.has(trade.id)}
                      onToggleSelect={onToggleSelectTrade}
                      onOpenTimeline={onOpenTimeline}
                      onDeleteTrade={onDeleteTrade}
                      isHighlighted={highlightedTradeId === trade.id}
                      isTimelineActive={activeTimelineTradeId === trade.id}
                      isExpanded={isExpanded}
                      onToggleExpand={handleToggleExpand}
                      isJournaled={journalIds.has(trade.id)}
                      onPromoteToJournal={onPromoteToJournal}
                    />
                    {isExpanded && (
                      <tr className="bg-transparent border-none">
                        <td colSpan={11} className="p-0">
                          <SettledTradeForensicDrawer
                            trade={trade}
                            isJournaled={journalIds.has(trade.id)}
                            onPromoteToJournal={onPromoteToJournal}
                            onOpenTimeline={onOpenTimeline}
                            onUpdateTrade={onUpdateTrade}
                          />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
