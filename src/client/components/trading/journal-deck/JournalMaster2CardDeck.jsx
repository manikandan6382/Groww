import React from "react";
import { useJournalDeckMetrics } from "./useJournalDeckMetrics";
import { TakeHomeProfitCard } from "./TakeHomeProfitCard";
import { TargetDisciplineCard } from "./TargetDisciplineCard";

export function JournalMaster2CardDeck() {
  const {
    filteredTrades,
    totalNetPnl,
    winTrades,
    lossTrades,
    winRate,
    grossWins,
    grossLosses,
    profitFactor,
    avgNet,
    wilsonFloor,
    winAngle,
    netYieldPct,
    ruleDisciplinePct,
    displayStreak,
    maxLoss,
    rangeLabel
  } = useJournalDeckMetrics();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <TakeHomeProfitCard
        rangeLabel={rangeLabel}
        netYieldPct={netYieldPct}
        totalNetPnl={totalNetPnl}
        profitFactor={profitFactor}
        grossWins={grossWins}
        grossLosses={grossLosses}
        tradeCount={filteredTrades.length}
        avgNet={avgNet}
      />

      <TargetDisciplineCard
        filteredTradesLength={filteredTrades.length}
        winAngle={winAngle}
        winRate={winRate}
        winTradesLength={winTrades.length}
        lossTradesLength={lossTrades.length}
        wilsonFloor={wilsonFloor}
        ruleDisciplinePct={ruleDisciplinePct}
        displayStreak={displayStreak}
        maxLoss={maxLoss}
      />
    </div>
  );
}

export default JournalMaster2CardDeck;
