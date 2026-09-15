import React, { useMemo } from "react";
import { useTradingStore } from "../../../stores/useTradingStore";
import { filterActiveTrades, aggregateDailySessions } from "./sessionAggregationEngine";
import { aggregateStrategyMetrics } from "./strategyEdgeEngine";
import { DailySessionsDeck } from "./DailySessionsDeck";
import { StrategyLeaderboardDeck } from "./StrategyLeaderboardDeck";

export function JournalAnalyticsDeck() {
  const { 
    journalTrades, 
    journalRange, 
    journalCustomStart, 
    journalCustomEnd,
    selectedStrategyFilter,
    setSelectedStrategyFilter 
  } = useTradingStore();

  const activeTrades = useMemo(
    () => filterActiveTrades(journalTrades, journalRange, journalCustomStart, journalCustomEnd),
    [journalTrades, journalRange, journalCustomStart, journalCustomEnd]
  );

  const dailySessions = useMemo(
    () => aggregateDailySessions(activeTrades),
    [activeTrades]
  );

  const dynamicStrategies = useMemo(
    () => aggregateStrategyMetrics(activeTrades),
    [activeTrades]
  );

  const rangeLabel = journalRange === "today" 
    ? "Today" 
    : journalRange === "week" 
    ? "This Week" 
    : journalRange === "month" 
    ? "This Month" 
    : journalRange === "custom" 
    ? `${journalCustomStart} to ${journalCustomEnd}` 
    : "All Time";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <DailySessionsDeck
        dailySessions={dailySessions}
        rangeLabel={rangeLabel}
        journalRange={journalRange}
      />

      <StrategyLeaderboardDeck
        dynamicStrategies={dynamicStrategies}
        selectedStrategyFilter={selectedStrategyFilter}
        onSelectStrategy={setSelectedStrategyFilter}
      />
    </div>
  );
}

export default JournalAnalyticsDeck;
