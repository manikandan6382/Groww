import React from "react";
import clsx from "clsx";
import { CockpitCommandBar } from "./CockpitCommandBar";
import { QuotaVaultAlertBar } from "./QuotaVaultAlertBar";
import { PreFlightTelemetryGrid } from "./PreFlightTelemetryGrid";
import { PassarelliGreeksDeck } from "./PassarelliGreeksDeck";
import { QuantitativeRadarDrawer } from "./QuantitativeRadarDrawer";

export function CockpitDeck({ logic, isValidSL, isValidTarget }) {
  const copilotState = logic.copilotState || {};
  return (
    <div className={clsx("relative p-5 rounded-2xl border transition-all duration-500 shadow-xl backdrop-blur-2xl space-y-4 overflow-hidden", copilotState.bannerBg || "bg-app-card/80 border-white/10")}>
      <div className={clsx("absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16 opacity-40 transition-all duration-700", copilotState.ambientGlow || "bg-cyan-500/10")} />

      <CockpitCommandBar
        copilotState={copilotState}
        optionType={logic.optionType}
        underlying={logic.underlying}
        strikePrice={logic.strikePrice}
        isLiveStreaming={logic.isLiveStreaming}
        activeQuotaMode={logic.activeQuotaMode}
        todayTradesCount={logic.todayTradesCount}
        dailyQuotaLimit={logic.dailyQuotaLimit}
        onToggleTestingMode={logic.handleToggleTestingMode}
        isScanning={logic.isScanning}
        onManualScan={logic.handleManualScan}
        show12FilterDrawer={logic.show12FilterDrawer}
        onToggle12FilterDrawer={() => logic.setShow12FilterDrawer(!logic.show12FilterDrawer)}
        isDailyCapReached={logic.isDailyCapReached}
        isValidSL={isValidSL}
        isValidTarget={isValidTarget}
        isVaultRunning={logic.vault.isVaultRunning}
        vaultFormattedTime={logic.vault.vaultFormattedTime}
        on1ClickAutoDeploy={() => logic.handleExecute()}
        isDeploying={logic.isDeploying}
        lots={logic.lots}
        totalQty={logic.totalQty}
        tiltSecondsRemaining={logic.tiltSecondsRemaining}
        strategyMode={logic.strategyMode}
        onToggleSpreadMode={() => logic.setStrategyMode(logic.strategyMode === "SPREAD" ? "OUTRIGHT" : "SPREAD")}
      />

      <QuotaVaultAlertBar
        activeQuotaMode={logic.activeQuotaMode}
        todayTradesCount={logic.todayTradesCount}
        dailyQuotaLimit={logic.dailyQuotaLimit}
        vaultFormattedTime={logic.vault.vaultFormattedTime}
        vaultMsRemaining={0}
        onToggleTestingMode={logic.handleToggleTestingMode}
        onSetDailyQuotaBypass={logic.handleToggleTestingMode}
        onRequestCoolingVaultUnlock={logic.vault.requestCoolingVaultUnlock}
        onCancelCoolingVault={logic.vault.cancelCoolingVault}
        onClaimCoolingVaultUnlock={logic.vault.claimCoolingVaultUnlock}
      />

      <PreFlightTelemetryGrid
        entryPrice={logic.entryPrice}
        stopLoss={logic.stopLoss}
        targetPrice={logic.targetPrice}
        lots={logic.lots}
        totalQty={logic.totalQty}
        isLiveStreaming={logic.isLiveStreaming}
        onSetIsLiveStreaming={logic.setIsLiveStreaming}
        liveContractTick={logic.liveContractTick}
        liveMarkPrice={logic.liveMarkPrice}
        isValidSL={isValidSL}
        isValidTarget={isValidTarget}
        rrRatio={logic.rrRatio}
        frictionMetrics={logic.frictionMetrics}
      />

      <PassarelliGreeksDeck
        activeGreeks={logic.activeGreeks}
        activeDelta={logic.activeDelta}
        ivRegime={logic.ivRegime}
        isSpreadMode={logic.strategyMode === "SPREAD"}
        setStrategyMode={logic.setStrategyMode}
        totalQty={logic.totalQty}
      />

      <QuantitativeRadarDrawer
        isOpen={logic.show12FilterDrawer}
        underlying={logic.underlying}
        strikePrice={logic.strikePrice}
        optionType={logic.optionType}
        activeDelta={logic.activeDelta}
        activeGreeks={logic.activeGreeks}
        entryPrice={logic.entryPrice}
        stopLoss={logic.stopLoss}
        targetPrice={logic.targetPrice}
        rrRatio={logic.rrRatio}
        frictionMetrics={logic.frictionMetrics}
        rewardAmount={logic.rewardAmount}
        riskAmount={logic.riskAmount}
        netEntryPrice={logic.netEntryPrice}
        totalQty={logic.totalQty}
        copilotState={logic.copilotState}
        currentAsset={logic.currentAsset}
        testingMode={logic.testingMode}
        dailyQuotaBypass={logic.dailyQuotaBypass}
        todayTradesCount={logic.todayTradesCount}
        dailyQuotaLimit={logic.dailyQuotaLimit}
        todayRealizedLoss={logic.todayRealizedLoss}
        isDailyLossBreached={logic.isDailyLossBreached}
        tiltSecondsRemaining={logic.tiltSecondsRemaining}
      />
    </div>
  );
}
