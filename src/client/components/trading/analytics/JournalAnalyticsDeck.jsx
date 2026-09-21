import React, { useMemo } from "react";
import { useTradingStore } from "../../../stores/useTradingStore";
import { filterActiveTrades } from "./sessionAggregationEngine";
import { aggregateStrategyMetrics } from "./strategyEdgeEngine";
import { StrategyLeaderboardDeck } from "./StrategyLeaderboardDeck";
import { PlaybookRiskDistributionCard } from "./PlaybookRiskDistributionCard";

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

  const dynamicStrategies = useMemo(
    () => aggregateStrategyMetrics(activeTrades),
    [activeTrades]
  );

  return (
    <div id="journal-playbook-deck" data-deck="journal-playbook" className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <StrategyLeaderboardDeck
        dynamicStrategies={dynamicStrategies}
        selectedStrategyFilter={selectedStrategyFilter}
        onSelectStrategy={setSelectedStrategyFilter}
      />

      <PlaybookRiskDistributionCard
        dynamicStrategies={dynamicStrategies}
        selectedStrategyFilter={selectedStrategyFilter}
        onSelectStrategy={setSelectedStrategyFilter}
      />
    </div>
  );
}

export default JournalAnalyticsDeck;
