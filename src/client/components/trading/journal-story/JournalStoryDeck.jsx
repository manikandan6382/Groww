import React from "react";
import { LuxuryDateRangePicker } from "../../common/LuxuryDateRangePicker";
import { evaluateTradeIntegrity } from "./tradeIntegrityEngine";
import { useJournalStoryData } from "./useJournalStoryData";
import { JournalStoryHeader } from "./JournalStoryHeader";
import { JournalStoryToolbar } from "./JournalStoryToolbar";
import { JournalStoryFilterChips } from "./JournalStoryFilterChips";
import { JournalStoryEmptyStates } from "./JournalStoryEmptyStates";
import { TradeStoryCard } from "./TradeStoryCard";

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
    rangeLabel,
    totalNet,
    winCount,
    lossCount
  } = useJournalStoryData();

  return (
    <div className="p-6 sm:p-7 rounded-3xl bg-app-card/75 backdrop-blur-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.4)] space-y-6 relative overflow-hidden">
      {/* Soft Ambient Radial Lighting Accent */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/[0.03] rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/[0.02] rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

      {/* Master Header & Story Telemetry */}
      <JournalStoryHeader
        filteredCount={filteredTrades.length}
        dateFilteredCount={dateFilteredTrades.length}
        rangeLabel={rangeLabel}
        totalNet={totalNet}
        winCount={winCount}
        lossCount={lossCount}
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
          filteredCount={filteredTrades.length}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />

        <JournalStoryFilterChips
          journalFilter={journalFilter}
          setJournalFilter={setJournalFilter}
          dateFilteredTrades={dateFilteredTrades}
          filteredTrades={filteredTrades}
          expandedTradeIds={expandedTradeIds}
          toggleExpandAll={toggleExpandAll}
          selectedStrategyFilter={selectedStrategyFilter}
          clearSelectedStrategyFilter={clearSelectedStrategyFilter}
        />
      </div>

      {/* Contextual Market & Filter Empty States or Trade Stories */}
      {filteredTrades.length === 0 ? (
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
        <div className="space-y-4 max-h-[720px] overflow-y-auto pr-2">
          {filteredTrades.map((trade) => (
            <TradeStoryCard
              key={trade.id}
              trade={trade}
              isExpanded={expandedTradeIds.has(trade.id)}
              toggleExpand={toggleExpand}
              copiedTradeId={copiedTradeId}
              copyTradeMarkdown={copyTradeMarkdown}
              handleDeleteWithUndo={handleDeleteWithUndo}
            />
          ))}
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
    </div>
  );
}
