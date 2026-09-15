import React from "react";
import { useLiveAlertCardState } from "./useLiveAlertCardState";
import { LiveCardHeader } from "./LiveCardHeader";
import { LiveCardHeroMetrics } from "./LiveCardHeroMetrics";
import { DedicatedTVTapeBox } from "./DedicatedTVTapeBox";
import { LiveCardSlTpDock } from "./LiveCardSlTpDock";
import { LiveCardActionFooter } from "./LiveCardActionFooter";
import { LiveCardInfoModal } from "./LiveCardInfoModal";
import { getContextualSteppers } from "./liveCardHelpers";

export function LiveAlertCard({ trade, alert, onClose }) {
  const item = trade || alert || {};
  const state = useLiveAlertCardState({ item, onClose });
  const steppers = getContextualSteppers(state.entry);

  const handleSquareOff = () => {
    state.setIsClosing(true);
    state.isExecutingRef.current = true;
    setTimeout(() => {
      state.squareOffTrade(state.id, state.currentLtp, "MANUAL_SQUARE_OFF");
      if (onClose) onClose(state.id);
    }, 150);
  };

  const handlePayMyself = () => {
    state.setIsScaling(true);
    state.payMyself(state.id, state.currentLtp);
    setTimeout(() => state.setIsScaling(false), 500);
  };

  const handleSaveTarget = () => {
    const val = Number(state.customTargetVal);
    if (val > 0) {
      state.updateTargetPrice(state.id, val, state.currentLtp);
      state.setEditingTarget(false);
    }
  };

  const handleSaveSl = () => {
    const val = Number(state.customSlVal);
    if (val > 0) {
      state.updateStopLossPrice(state.id, val, state.currentLtp);
      state.setEditingSl(false);
    }
  };

  const isProtected = state.hasAutoLockedBE || (state.isShort ? state.stopLoss <= state.entry : state.stopLoss >= state.entry) || Boolean(item.isTrueBeLocked);

  return (
    <div className="rounded-2xl border border-white/10 bg-[#070d18]/90 backdrop-blur-xl shadow-2xl overflow-hidden relative flex flex-col transition-all duration-200 hover:border-white/20">
      <LiveCardHeader
        symbol={state.symbol}
        isShort={state.isShort}
        quantity={state.quantity}
        lotSize={state.lotSize}
        strategyTag={item.strategyTag || item.strategyTags || "Practice Scalp"}
        latencyMs={state.latencyMs}
        isFeedStalled={state.isFeedStalled}
        soundMuted={state.soundMuted}
        setSoundMuted={state.setSoundMuted}
        setShowInfoSheet={state.setShowInfoSheet}
        onSquareOff={handleSquareOff}
        isClosing={state.isClosing}
        isProtected={isProtected}
        isLiveBroker={Boolean(item.isLiveBroker || item.broker === "ZERODHA")}
      />

      <LiveCardHeroMetrics
        entry={state.entry}
        currentLtp={state.currentLtp}
        tickDirection={state.tickDirection}
        tickHistory={state.tickHistory}
        isGain={state.isGain}
        pts={state.pts}
        grossRupees={state.grossRupees}
        netRupees={state.netRupees}
        roiPct={state.roiPct}
        copilotNarrative={null}
        estimatedCharges={state.estimatedCharges}
        stopLoss={state.stopLoss}
        target={state.target}
        quantity={state.totalQty || state.quantity}
      />

      <DedicatedTVTapeBox
        history={state.tickHistory}
        isGain={state.isGain}
        ltp={state.currentLtp}
        entry={state.entry}
      />

      <LiveCardSlTpDock
        id={state.id}
        entry={state.entry}
        target={state.target}
        stopLoss={state.stopLoss}
        currentLtp={state.currentLtp}
        pts={state.pts}
        isGain={state.isGain}
        isShort={state.isShort}
        isProtected={isProtected}
        hasAutoLockedBE={state.hasAutoLockedBE}
        totalQty={state.totalQty}
        autoTrailBE={state.autoTrailBE}
        setAutoTrailBE={state.setAutoTrailBE}
        onAdjustSl={(d) => state.adjustStopLoss(state.id, d, state.currentLtp)}
        onAdjustTp={(d) => state.adjustTargetPrice(state.id, d, state.currentLtp)}
        onUpdateSl={(val) => state.updateStopLossPrice(state.id, val, state.currentLtp)}
        onUpdateTp={(val) => state.updateTargetPrice(state.id, val, state.currentLtp)}
        editingTarget={state.editingTarget}
        setEditingTarget={state.setEditingTarget}
        customTargetVal={state.customTargetVal}
        setCustomTargetVal={state.setCustomTargetVal}
        onSaveTarget={handleSaveTarget}
        editingSl={state.editingSl}
        setEditingSl={state.setEditingSl}
        customSlVal={state.customSlVal}
        setCustomSlVal={state.setCustomSlVal}
        onSaveSl={handleSaveSl}
      />

      <LiveCardActionFooter
        onPayMyself={handlePayMyself}
        onLockTrueBe={() => state.setBreakevenSL(state.id, state.currentLtp)}
        onLaunchSimulator={() => state.setSimulatorActiveTradeId(state.id)}
        onSquareOff={handleSquareOff}
        isScaling={state.isScaling}
        isClosing={state.isClosing}
        isProtected={isProtected}
        isGain={state.isGain}
        pts={state.pts}
        noiseBufferPts={1.8}
        quantity={state.quantity}
      />

      <LiveCardInfoModal
        isOpen={state.showInfoSheet}
        onClose={() => state.setShowInfoSheet(false)}
        symbol={state.symbol}
        entry={state.entry}
        currentLtp={state.currentLtp}
        quantity={state.quantity}
        lotSize={state.lotSize}
        strategyTag={item.strategyTag || item.strategyTags || "Practice Scalp"}
        estimatedCharges={state.estimatedCharges}
        id={state.id}
      />
    </div>
  );
}

export default LiveAlertCard;
