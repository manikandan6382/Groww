import React, { useState, useMemo } from "react";
import clsx from "clsx";
import { Calendar } from "lucide-react";
import { LuxuryDateRangePicker } from "../../common/LuxuryDateRangePicker";
import { RollingTicker } from "../../common/RollingTicker";
import { evaluateTradeIntegrity } from "./tradeIntegrityEngine";
import { analyzeBehavioralBiases } from "./behavioralBiasEngine";
import { useJournalStoryData } from "./useJournalStoryData";
import { JournalStoryHeader } from "./JournalStoryHeader";
import { JournalStoryToolbar } from "./JournalStoryToolbar";
import { JournalStoryFilterChips } from "./JournalStoryFilterChips";
import { JournalStoryEmptyStates } from "./JournalStoryEmptyStates";
import { CapitalLeakageBar } from "./CapitalLeakageBar";
import { TradeShareModal } from "./TradeShareModal";
import { TradeStoryCard } from "./TradeStoryCard";
import { safeDate } from "../../../utils/dateUtils";

export { evaluateTradeIntegrity };

export function JournalStoryDeck() {
  const {
    journalRange,
    setJournalRange,
    journalCustomStart,
    journalCustomEnd,
    setJournalCustomRange,
    journalFilter,
    setJournalFilter,
    selectedStrategyFilter,
    clearSelectedStrategyFilter,
    expandedTradeIds,
    searchQuery,
    setSearchQuery,
    calendarOpen,
    setCalendarOpen,
    copiedTradeId,
    toggleExpand,
    toggleExpandAll,
    copyTradeMarkdown,
    handleDeleteWithUndo,
    exportTaxCsv,
    dateFilteredTrades,
    filteredTrades,
    displayTrades,
    loadMore,
    hasMore,
    rangeLabel,
    totalNet,
    winCount,
    lossCount,
    selectedTradeId,
    inspectInEquityCurve
  } = useJournalStoryData();

  // Deck state: feed vs session-grouped, share modal, and active bias filter
  const [deckMode, setDeckMode] = useState("feed");
  const [sharingTrade, setSharingTrade] = useState(null);
  const [activeBiasFilter, setActiveBiasFilter] = useState(null);

  // Algorithmic Behavioral Bias & Execution Leakage Telemetry
  const biasAnalysis = useMemo(() => {
    return analyzeBehavioralBiases(dateFilteredTrades);
  }, [dateFilteredTrades]);

  // Isolate trades when a bias chip is clicked in CapitalLeakageBar
  const effectiveFilteredTrades = useMemo(() => {
    if (!activeBiasFilter) return filteredTrades;
    return filteredTrades.filter((t) => {
      const diag = biasAnalysis.diagnosesMap[t.id];
      return diag?.biases?.some((b) => b.id === activeBiasFilter);
    });
  }, [filteredTrades, activeBiasFilter, biasAnalysis]);

  // Progressive batch display slice
  const finalDisplayTrades = useMemo(() => {
    if (activeBiasFilter) {
      return effectiveFilteredTrades.slice(0, displayTrades.length);
    }
    return displayTrades;
  }, [activeBiasFilter, effectiveFilteredTrades, displayTrades]);

  // Group ALL filtered trades into calendar trading sessions first for accurate daily metrics
  const allSessionGroups = useMemo(() => {
    if (deckMode !== "sessions") return [];
    const groups = {};
    for (const trade of effectiveFilteredTrades) {
      const dt = trade.entryDatetime || trade.datetime || trade.createdAt;
      const d = safeDate(dt);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (!groups[dateKey]) {
        groups[dateKey] = {
          dateKey,
          displayDate: d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }),
          trades: [],
          netPnl: 0,
          wins: 0,
          losses: 0
        };
      }
      groups[dateKey].trades.push(trade);
      const pnl = Number(trade.netPnl ?? 0);
      groups[dateKey].netPnl += pnl;
      if (pnl >= 0) groups[dateKey].wins++;
      else groups[dateKey].losses++;
    }
    return Object.values(groups).sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  }, [deckMode, effectiveFilteredTrades]);

  // Session-level progressive pagination (show 5 days by default)
  const [displayedSessionsCount, setDisplayedSessionsCount] = useState(5);
  const displayedSessionGroups = useMemo(() => {
    return allSessionGroups.slice(0, displayedSessionsCount);
  }, [allSessionGroups, displayedSessionsCount]);
  const hasMoreSessions = allSessionGroups.length > displayedSessionsCount;
  const loadMoreSessions = () => setDisplayedSessionsCount((prev) => prev + 5);

  return (
    <div 
      id="journal-story-deck" 
      data-deck="journal-story" 
      className="relative rounded-3xl bg-[#0d111a]/85 border border-white/[0.08] shadow-[0_24px_60px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.12)] p-5 sm:p-7 space-y-6 overflow-hidden backdrop-blur-2xl"
    >
      {/* Apple Studio Ambient Radial Lighting Accents */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-96 h-64 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-32 right-10 w-80 h-60 bg-emerald-500/10 rounded-full blur-[90px] pointer-events-none" />

      {/* Master Header & Story Telemetry */}
      <JournalStoryHeader
        filteredCount={effectiveFilteredTrades.length}
        dateFilteredCount={dateFilteredTrades.length}
        rangeLabel={rangeLabel}
        totalNet={totalNet}
        winCount={winCount}
        lossCount={lossCount}
        deckMode={deckMode}
        setDeckMode={setDeckMode}
      />

      {/* 2-Tier Toolbar: Timeframe Selector + Outcome Filters + Search */}
      <div className="space-y-3.5 pt-1">
        <JournalStoryToolbar
          journalRange={journalRange}
          setJournalRange={setJournalRange}
          setCalendarOpen={setCalendarOpen}
          journalCustomStart={journalCustomStart}
          journalCustomEnd={journalCustomEnd}
          exportTaxCsv={exportTaxCsv}
          filteredCount={effectiveFilteredTrades.length}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />

        <JournalStoryFilterChips
          journalFilter={journalFilter}
          setJournalFilter={setJournalFilter}
          dateFilteredTrades={dateFilteredTrades}
          filteredTrades={effectiveFilteredTrades}
          expandedTradeIds={expandedTradeIds}
          toggleExpandAll={toggleExpandAll}
          selectedStrategyFilter={selectedStrategyFilter}
          clearSelectedStrategyFilter={clearSelectedStrategyFilter}
        />
      </div>

      {/* Algorithmic Behavioral Capital Leakage Ribbon */}
      <CapitalLeakageBar
        analysis={biasAnalysis}
        activeBiasFilter={activeBiasFilter}
        setActiveBiasFilter={setActiveBiasFilter}
      />

      {/* Active Compound Filter Tray & Conflict Auto-Reset Bar */}
      {(journalFilter !== "ALL" || activeBiasFilter || selectedStrategyFilter) && (
        <div className="p-2.5 rounded-2xl bg-cyan-500/5 border border-cyan-500/20 flex items-center justify-between gap-2 text-xs flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider font-mono">Active Filters:</span>
            {journalFilter !== "ALL" && (
              <span className="px-2 py-0.5 rounded-lg bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-[10px] font-mono font-bold flex items-center gap-1">
                Outcome: {journalFilter}
                <button type="button" onClick={() => setJournalFilter("ALL")} className="hover:text-white cursor-pointer ml-0.5" title="Remove outcome filter">✕</button>
              </span>
            )}
            {activeBiasFilter && (
              <span className="px-2 py-0.5 rounded-lg bg-rose-500/15 text-rose-300 border border-rose-500/30 text-[10px] font-mono font-bold flex items-center gap-1">
                Bias: {activeBiasFilter}
                <button type="button" onClick={() => setActiveBiasFilter(null)} className="hover:text-white cursor-pointer ml-0.5" title="Remove bias filter">✕</button>
              </span>
            )}
            {selectedStrategyFilter && (
              <span className="px-2 py-0.5 rounded-lg bg-purple-500/15 text-purple-300 border border-purple-500/30 text-[10px] font-mono font-bold flex items-center gap-1">
                Strategy: {selectedStrategyFilter}
                <button type="button" onClick={clearSelectedStrategyFilter} className="hover:text-white cursor-pointer ml-0.5" title="Remove strategy filter">✕</button>
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setJournalFilter("ALL");
              setActiveBiasFilter(null);
              clearSelectedStrategyFilter?.();
            }}
            className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer"
          >
            Clear All
          </button>
        </div>
      )}

      {/* Contextual Market & Filter Empty States or Trade Stories */}
      {effectiveFilteredTrades.length === 0 ? (
        <JournalStoryEmptyStates
          journalRange={journalRange}
          rangeLabel={rangeLabel}
          setJournalRange={setJournalRange}
          setJournalFilter={setJournalFilter}
          setSearchQuery={setSearchQuery}
          selectedStrategyFilter={selectedStrategyFilter}
          clearSelectedStrategyFilter={clearSelectedStrategyFilter}
        />
      ) : (
        <div className="space-y-4 max-h-[780px] overflow-y-auto pr-2 custom-scrollbar">
          {deckMode === "sessions" && displayedSessionGroups ? (
            <div className="space-y-6">
              {displayedSessionGroups.map((group) => (
                <div key={group.dateKey} className="space-y-3">
                  {/* Session Milestone Header Ribbon */}
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#090d16]/90 border border-white/[0.08] backdrop-blur-xl shadow-md">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold text-xs sm:text-sm text-white block font-sans">
                          {group.displayDate}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {group.trades.length} Execution{group.trades.length > 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-[9px] text-slate-400 block font-semibold">Session Net</span>
                        <div className={clsx("font-mono text-xs sm:text-sm font-black flex items-center justify-end", group.netPnl >= 0 ? "text-emerald-400" : "text-rose-400")}>
                          <RollingTicker 
                            value={group.netPnl} 
                            prefix="₹" 
                            showSign={true} 
                            decimalPlaces={2} 
                            className={group.netPnl >= 0 ? "text-emerald-400" : "text-rose-400"} 
                          />
                        </div>
                      </div>
                      <div className="px-2 py-1 rounded-lg bg-white/[0.04] border border-white/10 text-[10px] font-mono font-bold text-cyan-300">
                        {group.wins}W · {group.losses}L
                      </div>
                    </div>
                  </div>

                  {/* Trade cards in this session */}
                  <div className="space-y-3.5 pl-1 sm:pl-3 border-l-2 border-cyan-500/20">
                    {group.trades.map((trade) => (
                      <TradeStoryCard
                        key={trade.id}
                        trade={trade}
                        isExpanded={expandedTradeIds.has(trade.id)}
                        isSelected={selectedTradeId === trade.id}
                        toggleExpand={toggleExpand}
                        copiedTradeId={copiedTradeId}
                        copyTradeMarkdown={copyTradeMarkdown}
                        handleDeleteWithUndo={handleDeleteWithUndo}
                        inspectInEquityCurve={inspectInEquityCurve}
                        onShareTrade={(t) => setSharingTrade(t)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {finalDisplayTrades.map((trade) => (
                <TradeStoryCard
                  key={trade.id}
                  trade={trade}
                  isExpanded={expandedTradeIds.has(trade.id)}
                  isSelected={selectedTradeId === trade.id}
                  toggleExpand={toggleExpand}
                  copiedTradeId={copiedTradeId}
                  copyTradeMarkdown={copyTradeMarkdown}
                  handleDeleteWithUndo={handleDeleteWithUndo}
                  inspectInEquityCurve={inspectInEquityCurve}
                  onShareTrade={(t) => setSharingTrade(t)}
                />
              ))}
            </div>
          )}

          {/* Progressive Disclosure: Load More Sessions or Load More Stories */}
          {deckMode === "sessions" ? (
            hasMoreSessions && (
              <div className="pt-3 pb-1 text-center">
                <button
                  type="button"
                  onClick={loadMoreSessions}
                  className="px-6 py-2.5 rounded-2xl bg-white/[0.04] hover:bg-cyan-500/15 border border-white/10 hover:border-cyan-500/30 text-xs font-bold text-cyan-300 transition-all shadow-sm cursor-pointer"
                >
                  Showing {displayedSessionGroups.length} of {allSessionGroups.length} Trading Sessions — Load More (+5 Days)
                </button>
              </div>
            )
          ) : (
            hasMore && !activeBiasFilter && (
              <div className="pt-2 pb-1 text-center">
                <button
                  type="button"
                  onClick={loadMore}
                  className="px-6 py-2.5 rounded-2xl bg-white/[0.04] hover:bg-cyan-500/15 border border-white/10 hover:border-cyan-500/30 text-xs font-bold text-cyan-300 transition-all shadow-sm cursor-pointer"
                >
                  Showing {finalDisplayTrades.length} of {effectiveFilteredTrades.length} Stories — Load More (+25)
                </button>
              </div>
            )
          )}
        </div>
      )}

      {/* Luxury Spatial Calendar Picker Modal */}
      <LuxuryDateRangePicker
        isOpen={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        startDate={journalCustomStart}
        endDate={journalCustomEnd}
        onApplyRange={(start, end) => {
          setJournalCustomRange(start, end);
        }}
      />

      {/* 1-Click Shareable Apple Luxury Autopsy Card Generator */}
      <TradeShareModal
        isOpen={Boolean(sharingTrade)}
        onClose={() => setSharingTrade(null)}
        trade={sharingTrade}
      />
    </div>
  );
}
