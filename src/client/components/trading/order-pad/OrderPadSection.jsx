import React from "react";
import clsx from "clsx";
import { ChevronDown } from "lucide-react";
import { useOrderPadFullLogic } from "./hooks/useOrderPadFullLogic";
import { OrderPadHeader } from "./components/OrderPadHeader";
import { CockpitDeck } from "./components/CockpitDeck";
import { DuplicateStackingGuard } from "./components/DuplicateStackingGuard";
import { IndexTickerGrid } from "./components/IndexTickerGrid";
import { ModeAndSentimentSwitches } from "./components/ModeAndSentimentSwitches";
import { ContractSizingInputs } from "./components/ContractSizingInputs";
import { TargetCalibrationProtect } from "./components/TargetCalibrationProtect";
import { ApplePayoffCanvas } from "../ApplePayoffCanvas";
import { OrderDeployActionBar } from "./components/OrderDeployActionBar";

export const OrderPadSection = React.memo(function OrderPadSection() {
  const logic = useOrderPadFullLogic();
  const [isPayoffOpen, setIsPayoffOpen] = React.useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    logic.handleExecute();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      if (e.ctrlKey || e.metaKey) {
        // Deliberate power-user shortcut: Ctrl+Enter / Cmd+Enter
        e.preventDefault();
        logic.handleExecute();
      } else if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT") {
        // Prevent accidental submission when typing in input boxes
        e.preventDefault();
      }
    }
  };

  React.useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        logic.handleExecute();
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [logic.handleExecute]);

  const isValidSL = Number(logic.entryPrice) > 0 && Number(logic.stopLoss) > 0 && Number(logic.stopLoss) < Number(logic.entryPrice);
  const isValidTarget = Number(logic.entryPrice) > 0 && Number(logic.targetPrice) > Number(logic.entryPrice);

  return (
    <div className="relative overflow-hidden p-6 sm:p-7 rounded-3xl bg-app-card/75 backdrop-blur-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.4)] space-y-6 transition-all duration-300">
      {/* Soft Ambient Radial Lighting Accent */}
      <div className={clsx("absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20 transition-all duration-500", logic.copilotState.ambientGlow)} />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-500/[0.03] rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

      {/* Header Bar & Live Ticks Telemetry */}
      <OrderPadHeader
        copilotRegime={logic.copilotRegime}
        onSetCopilotRegime={logic.setCopilotRegime}
      />

      {/* Dynamic Institutional Order Cockpit & 1-Click Auto Deploy Deck */}
      <CockpitDeck
        logic={logic}
        isValidSL={isValidSL}
        isValidTarget={isValidTarget}
      />

      <DuplicateStackingGuard
        warning={logic.duplicateWarning}
        onDismiss={() => {}}
      />

      <IndexTickerGrid
        dynamicAssets={logic.dynamicAssets}
        underlying={logic.underlying}
        onSelectAsset={logic.handleSelectAsset}
      />

      <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="space-y-4">
        <ModeAndSentimentSwitches
          feedMode={logic.feedMode}
          setFeedMode={logic.setFeedMode}
          strategyMode={logic.strategyMode}
          setStrategyMode={logic.setStrategyMode}
          simulateSlippage={logic.simulateSlippage}
          setSimulateSlippage={logic.setSimulateSlippage}
          optionType={logic.optionType}
          setOptionType={logic.setOptionType}
        />

        <ContractSizingInputs
          optionType={logic.optionType}
          setOptionType={logic.setOptionType}
          handleQuickFlipOptionType={logic.handleQuickFlipOptionType}
          underlying={logic.underlying}
          strikePrice={logic.strikePrice}
          setStrikePrice={logic.setStrikePrice}
          entryPrice={logic.entryPrice}
          setEntryPrice={logic.setEntryPrice}
          liveMarkPrice={logic.liveMarkPrice}
          isLiveStreaming={logic.isLiveStreaming}
          onSyncToLive={logic.handleSyncToLive}
          lots={logic.lots}
          setLots={logic.setLots}
          lotSize={logic.lotSize}
          currentAsset={logic.currentAsset}
          dynamicAssets={logic.dynamicAssets}
          handleSelectAsset={logic.handleSelectAsset}
          handleManualInputFocus={logic.handleManualInputFocus}
          strategyMode={logic.strategyMode}
          hedgeStrike={logic.hedgeStrike}
          setHedgeStrike={logic.setHedgeStrike}
          hedgePrice={logic.hedgePrice}
          setHedgePrice={logic.setHedgePrice}
          isIndexDropdownOpen={logic.isIndexDropdownOpen}
          setIsIndexDropdownOpen={logic.setIsIndexDropdownOpen}
          setStopLoss={logic.setStopLoss}
          setTargetPrice={logic.setTargetPrice}
        />

        <TargetCalibrationProtect
          entryPrice={logic.entryPrice}
          stopLoss={logic.stopLoss}
          setStopLoss={logic.setStopLoss}
          targetPrice={logic.targetPrice}
          setTargetPrice={logic.setTargetPrice}
          handleManualInputFocus={logic.handleManualInputFocus}
          totalQty={logic.totalQty}
          underlying={logic.underlying}
        />

        {/* Collapsible Deep Option Intelligence & Payoff Lab */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden transition-all duration-300">
          <button
            type="button"
            onClick={() => setIsPayoffOpen((prev) => !prev)}
            className="w-full flex items-center justify-between px-4 py-3 text-xs font-semibold text-slate-300 hover:bg-white/[0.04] transition-colors select-none group"
          >
            <div className="flex items-center gap-2">
              <span className="text-base group-hover:scale-110 transition-transform">📐</span>
              <span className="font-bold tracking-wide uppercase font-mono text-[11px] text-cyan-300">
                Deep Option Intelligence &amp; Payoff Lab
              </span>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-mono">
                Interactive P&amp;L Simulation
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-400 text-[11px]">
              <span>{isPayoffOpen ? "Hide Simulation" : "Inspect P&L Curves"}</span>
              <ChevronDown className={clsx("w-4 h-4 transition-transform duration-300 text-slate-400 group-hover:text-cyan-400", isPayoffOpen && "rotate-180 text-cyan-400")} />
            </div>
          </button>
          {isPayoffOpen && (
            <div id="option-outcome-simulator" className="p-4 pt-2 border-t border-white/5 scroll-mt-24">
              <ApplePayoffCanvas
                optionType={logic.optionType}
                direction="BUY"
                spotPrice={logic.currentAsset.spot}
                strikePrice={logic.strikePrice}
                netEntryPrice={logic.entryPrice}
                stopLoss={logic.stopLoss}
                targetPrice={logic.targetPrice}
                quantity={logic.lots}
                lotSize={logic.lotSize}
                strategyMode={logic.strategyMode}
                hedgeStrike={logic.hedgeStrike}
                hedgePrice={logic.hedgePrice}
                onSetTarget={(val) => logic.setTargetPrice(val)}
                onSetStopLoss={(val) => logic.setStopLoss(val)}
              />
            </div>
          )}
        </div>

        <OrderDeployActionBar
          capitalOutlay={logic.capitalOutlay}
          riskAmount={logic.riskAmount}
          rewardAmount={logic.rewardAmount}
          rrRatio={logic.rrRatio}
          isDailyCapReached={logic.isDailyCapReached}
          isValidSL={isValidSL}
          isValidTarget={isValidTarget}
          isDeploying={logic.isDeploying}
          isVaultRunning={logic.vault.isVaultRunning}
          vaultFormattedTime={logic.vault.vaultFormattedTime}
          copilotState={logic.copilotState}
          entryPrice={logic.entryPrice}
          frictionMetrics={logic.frictionMetrics}
          canonicalPlan={logic.canonicalPlan}
          testingMode={logic.testingMode}
          onDeploy={() => logic.handleExecute()}
        />
      </form>
    </div>
  );
});
