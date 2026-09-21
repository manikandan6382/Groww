import React from "react";
import { useJournalDeckMetrics } from "./useJournalDeckMetrics";
import { TakeHomeProfitCard } from "./TakeHomeProfitCard";
import { TargetDisciplineCard } from "./TargetDisciplineCard";

export function JournalMaster2CardDeck() {
  const {
    filteredTrades,
    tradeCount,
    totalNetPnl,
    winTrades,
    lossTrades,
    winRate,
    grossWins,
    grossLosses,
    profitFactor,
    profitFactorNum,
    isZeroLossWinning,
    payoffRatio,
    payoffRatioNum,
    avgNet,
    expectancy,
    returnOnRisk,
    wilsonFloor,
    winAngle,
    disciplineAngle,
    netYieldPct,
    totalFriction,
    frictionDragPct,
    ruleDisciplinePct,
    streakType,
    streakCount,
    maxLoss,
    maxLossBreached,
    breachedLossCount,
    riskInvariantViolated,
    sparklinePath,
    sparklineArea,
    topSetup,
    topSetupPnl,
    rangeLabel
  } = useJournalDeckMetrics();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <TakeHomeProfitCard
        rangeLabel={rangeLabel}
        netYieldPct={netYieldPct}
        totalNetPnl={totalNetPnl}
        profitFactor={profitFactor}
        profitFactorNum={profitFactorNum}
        isZeroLossWinning={isZeroLossWinning}
        grossWins={grossWins}
        grossLosses={grossLosses}
        tradeCount={tradeCount}
        totalFriction={totalFriction}
        frictionDragPct={frictionDragPct}
        avgNet={avgNet}
        expectancy={expectancy}
        returnOnRisk={returnOnRisk}
        payoffRatio={payoffRatio}
        payoffRatioNum={payoffRatioNum}
        sparklinePath={sparklinePath}
        sparklineArea={sparklineArea}
      />

      <TargetDisciplineCard
        filteredTradesLength={tradeCount}
        winAngle={winAngle}
        disciplineAngle={disciplineAngle}
        winRate={winRate}
        winTradesLength={winTrades.length}
        lossTradesLength={lossTrades.length}
        wilsonFloor={wilsonFloor}
        ruleDisciplinePct={ruleDisciplinePct}
        streakType={streakType}
        streakCount={streakCount}
        maxLoss={maxLoss}
        maxLossBreached={maxLossBreached}
        breachedLossCount={breachedLossCount}
        riskInvariantViolated={riskInvariantViolated}
        topSetup={topSetup}
        topSetupPnl={topSetupPnl}
      />
    </div>
  );
}

export default JournalMaster2CardDeck;

