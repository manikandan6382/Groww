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
    (t) => getLocalDateKey(t.entryDatetime || t.exitDatetime) === _todayStr
  ).length;

  return (
    <form id="trade-logger-form" data-deck="trade-logger" onSubmit={logger.handleSubmit} className="p-6 rounded-3xl bg-[#0d111a]/85 backdrop-blur-2xl border border-white/[0.08] shadow-[0_24px_60px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.08)] space-y-4 hover:border-white/[0.14] transition-all duration-300 relative overflow-hidden">
      {/* Subtle Ambient Glow */}
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-cyan-500/[0.04] rounded-full blur-[80px] pointer-events-none" />

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
        plannedRiskCash={logger.plannedRiskCash}
        isRiskBreached={logger.isRiskBreached}
        plannedTargetCash={logger.plannedTargetCash}
        plannedRR={logger.plannedRR}
        autoPegRisk={logger.autoPegRisk}
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

