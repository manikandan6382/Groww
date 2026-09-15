import React, { useMemo } from "react";
import { useTradingStore } from "../../../stores/useTradingStore";
import { getLocalDateKey } from "../../../utils/dateUtils";
import { useTradeLoggerState } from "./useTradeLoggerState";
import { LoggerHeader } from "./LoggerHeader";
import { TiltCircuitBreaker } from "./TiltCircuitBreaker";
import { SettledTradeBridge } from "./SettledTradeBridge";
import { StrikePresetsStrip } from "./StrikePresetsStrip";
import { StoryPresetsStrip } from "./StoryPresetsStrip";
import { LoggerGridInputs } from "./LoggerGridInputs";
import { LoggerSummaryFooter } from "./LoggerSummaryFooter";

export function TradeLoggerForm({ onLogged }) {
  const { journalTrades, logJournalTrade, closedAlerts, openRosettaWithTopic } = useTradingStore();

  const logger = useTradeLoggerState({ logJournalTrade, onLogged });

  const recentSettledTrades = useMemo(() => {
    const list = (closedAlerts && closedAlerts.length > 0) ? closedAlerts : (journalTrades || []);
    return list.slice(0, 4);
  }, [closedAlerts, journalTrades]);

  const recentTrades = (journalTrades || []).slice(0, 2);
  const consecutiveLosses = recentTrades.length >= 2 && recentTrades.every((t) => Number(t.netPnl || 0) <= 0);

  const _todayStr = getLocalDateKey();
  const todayTradesCount = (journalTrades || []).filter(
    (t) => t.entryDatetime?.split("T")[0] === _todayStr
  ).length;

  return (
    <form onSubmit={logger.handleSubmit} className="apple-ceramic-card p-6 space-y-4">
      <LoggerHeader todayTradesCount={todayTradesCount} />

      <TiltCircuitBreaker
        consecutiveLosses={consecutiveLosses}
        overrideTiltBreaker={logger.overrideTiltBreaker}
        setOverrideTiltBreaker={logger.setOverrideTiltBreaker}
      />

      <SettledTradeBridge recentSettledTrades={recentSettledTrades} onImport={logger.importSettledTrade} />

      <StrikePresetsStrip onApplyStrike={logger.applyStrikePreset} />

      <StoryPresetsStrip onApplyStory={logger.applyPreset} />

      <LoggerGridInputs
        symbol={logger.symbol}
        setSymbol={logger.setSymbol}
        side={logger.side}
        setSide={logger.setSide}
        quantity={logger.quantity}
        setQuantity={logger.setQuantity}
        entryPrice={logger.entryPrice}
        setEntryPrice={logger.setEntryPrice}
        exitPrice={logger.exitPrice}
        setExitPrice={logger.setExitPrice}
        stopLoss={logger.stopLoss}
        setStopLoss={logger.setStopLoss}
        targetPrice={logger.targetPrice}
        setTargetPrice={logger.setTargetPrice}
        setupTag={logger.setupTag}
        setSetupTag={logger.setSetupTag}
        notes={logger.notes}
        setNotes={logger.setNotes}
        onOpenTopic={(topic) => openRosettaWithTopic?.(topic)}
      />

      <LoggerSummaryFooter
        isHighFrictionDrag={logger.drag.isHighFrictionDrag}
        targetPts={logger.drag.targetPts}
        frictionPts={logger.drag.frictionPts}
        pts={logger.friction.pts}
        isProfit={logger.friction.isProfit}
        grossPnl={logger.friction.grossPnl}
        totalFriction={logger.friction.totalFriction}
        netTakeHomePnl={logger.friction.netTakeHomePnl}
        submitting={logger.submitting}
      />
    </form>
  );
}

export default TradeLoggerForm;
