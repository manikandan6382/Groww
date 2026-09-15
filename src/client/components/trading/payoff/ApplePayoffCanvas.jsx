import React from "react";
import { AlertCircle } from "lucide-react";
import { useApplePayoffSimulator } from "./useApplePayoffSimulator";
import { PayoffMultiTradeDock } from "./PayoffMultiTradeDock";
import { PayoffActiveTradeTelemetry } from "./PayoffActiveTradeTelemetry";
import { PayoffHeader } from "./PayoffHeader";
import { PayoffOutcomeCards } from "./PayoffOutcomeCards";
import { PayoffInteractiveSimulatorCapsule } from "./PayoffInteractiveSimulatorCapsule";
import { PayoffSvgCanvas } from "./PayoffSvgCanvas";
import { PayoffQuickPresetsBar } from "./PayoffQuickPresetsBar";

export const ApplePayoffCanvas = React.memo(function ApplePayoffCanvas(props) {
  const sim = useApplePayoffSimulator(props);
  const hasLocalChanges = sim.localTarget != null || sim.localSL != null;

  return (
    <div className="p-4 sm:p-6 rounded-3xl bg-[var(--card)] border border-[var(--line)] backdrop-blur-3xl shadow-[0_20px_50px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.12)] space-y-4 relative overflow-hidden group">
      <div className="absolute -top-16 right-1/4 w-72 h-72 bg-slate-400/[0.02] rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 left-1/4 w-72 h-72 bg-emerald-500/[0.03] rounded-full blur-3xl pointer-events-none" />

      {sim.closedTradeNotice && (
        <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-zinc-300 text-xs font-mono flex items-center justify-between gap-2 animate-pulse">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-zinc-400 shrink-0" />
            <span>{sim.closedTradeNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => sim.setClosedTradeNotice(null)}
            className="text-zinc-400 hover:text-white text-xs cursor-pointer font-bold px-1.5"
          >
            ✕
          </button>
        </div>
      )}

      <PayoffMultiTradeDock
        openAlerts={sim.openAlerts}
        simulatorActiveTradeId={sim.simulatorActiveTradeId}
        onSelectTrade={(id) => {
          sim.setSimulatorActiveTradeId(id);
        }}
        ticks={sim.ticks}
      />

      <PayoffActiveTradeTelemetry
        isTradeActive={sim.isTradeActive}
        tradeSymbol={sim.tradeSymbol}
        entry={sim.entry}
        liveLtp={sim.liveLtp}
        isBankNifty={sim.isBankNifty}
        liveSpot={sim.liveSpot}
        currentActivePnl={sim.currentActivePnl}
        isLiveStreaming={sim.isLiveStreaming}
        isZeroDte={sim.isZeroDte}
        hasLocalChanges={hasLocalChanges}
        syncStatus={sim.syncStatus}
        onSync={sim.handleSyncToActiveTrade}
      />

      <PayoffHeader
        isDirect={sim.isDirect}
        optionType={sim.effectiveOptionType}
        isCall={sim.isCall}
        isSLInverted={sim.isSLInverted}
        entry={sim.entry}
        viewMode={sim.viewMode}
        setViewMode={sim.setViewMode}
        capitalOutlay={sim.capitalOutlay}
        popPercent={sim.popPercent}
      />

      <PayoffOutcomeCards
        sl={sim.sl}
        riskAmount={sim.riskAmount}
        riskPct={sim.riskPct}
        breakevenSpot={sim.breakevenSpot}
        distToBE={sim.distToBE}
        tp={sim.tp}
        rewardAmount={sim.rewardAmount}
        rewardPct={sim.rewardPct}
        currentRR={sim.currentRR}
      />

      <PayoffInteractiveSimulatorCapsule
        isBankNifty={sim.isBankNifty}
        holdDuration={sim.holdDuration}
        setHoldDuration={sim.setHoldDuration}
        simulatedOutcome={sim.simulatedOutcome}
        isZeroDte={sim.isZeroDte}
        isTradeActive={sim.isTradeActive}
        hasLocalChanges={hasLocalChanges}
        syncStatus={sim.syncStatus}
        onSync={sim.handleSyncToActiveTrade}
        onAdoptTarget={sim.handleAdoptTarget}
        onAdoptSL={sim.handleAdoptSL}
        domain={sim.domain}
        effectiveSpot={sim.effectiveSpot}
        spotRatio={sim.spotRatio}
        scrubRatio={sim.scrubRatio}
        onScrubChange={sim.handleScrubChange}
      />

      <PayoffSvgCanvas
        viewMode={sim.viewMode}
        domain={sim.domain}
        calculatePayoffAtExpiry={sim.calculatePayoffAtExpiry}
        breakevenSpot={sim.breakevenSpot}
        isCall={sim.isCall}
        effectiveSpot={sim.effectiveSpot}
        spotRatio={sim.spotRatio}
        scrubRatio={sim.scrubRatio}
        onScrubChange={sim.handleScrubChange}
        sl={sim.sl}
        tp={sim.tp}
        entry={sim.entry}
        approxDelta={sim.approxDelta}
        simulatedOutcome={sim.simulatedOutcome}
        riskAmount={sim.riskAmount}
      />

      <PayoffQuickPresetsBar
        riskPts={sim.riskPts}
        totalShares={sim.totalShares}
        onApplyPreset={sim.handleApplyRRPreset}
        isTradeActive={sim.isTradeActive}
        hasLocalChanges={hasLocalChanges}
        syncStatus={sim.syncStatus}
        onSync={sim.handleSyncToActiveTrade}
        riskAmount={sim.riskAmount}
        rewardAmount={sim.rewardAmount}
        currentRR={sim.currentRR}
      />
    </div>
  );
});

export default ApplePayoffCanvas;
