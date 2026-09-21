import React from "react";
import { LuxuryDateRangePicker } from "../../common/LuxuryDateRangePicker";
import { usePortfolioBentoData } from "./usePortfolioBentoData";
import { PortfolioValuationHeader } from "./PortfolioValuationHeader";
import { PortfolioTimeframeSwitcher } from "./PortfolioTimeframeSwitcher";
import { PortfolioNavSplineChart } from "./PortfolioNavSplineChart";
import { PortfolioTelemetryStrip } from "./PortfolioTelemetryStrip";
import { StatementUploadModal } from "./StatementUploadModal";

export function PortfolioHeroBento({
  holdings = [],
  margins = { available: 0, net: 0 },
  totalCurrentValue = 0,
  totalInvested = 0,
  totalPnl = 0,
  totalPnlPct = "0.00",
  dayPnl = 0,
  dayPnlPct = "0.00",
  isExpired = false,
  isKiteOffline = false,
}) {
  const bento = usePortfolioBentoData({
    holdings,
    margins,
    totalCurrentValue,
    totalInvested,
    totalPnl,
    totalPnlPct,
    dayPnl,
    dayPnlPct,
  });

  return (
    <div className="p-6 sm:p-8 rounded-[32px] bg-[var(--card)] backdrop-blur-3xl border border-[var(--line)] shadow-[0_24px_60px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.12)] relative overflow-hidden flex flex-col justify-between space-y-6 hover:border-white/[0.18] transition-colors">
      {/* 🌌 Apple Spatial Ambient Spotlights */}
      <div className="absolute top-0 right-1/4 w-[480px] h-[280px] bg-cyan-500/[0.07] rounded-full blur-[100px] pointer-events-none -mt-24" />
      <div className="absolute bottom-0 left-10 w-[400px] h-[240px] bg-emerald-500/[0.06] rounded-full blur-[90px] pointer-events-none -mb-20" />

      {/* 🏛️ 1. Top Executive Branding & Valuation */}
      <PortfolioValuationHeader
        totalNetWorth={bento.totalNetWorth}
        usdNetWorth={bento.usdNetWorth}
        timeframeMetrics={bento.timeframeMetrics}
        hoverIndex={bento.hoverIndex}
        activeTf={bento.activeTf}
        navPoints={bento.navPoints}
        investedPoints={bento.investedPoints}
        benchmarkPoints={bento.benchmarkPoints}
        showBenchmark={bento.showBenchmark}
        navDates={bento.navDates}
        depository={bento.depository}
        onToggleDepository={bento.setDepository}
        hasCustomLedger={bento.hasCustomLedger}
        customLedgerCount={bento.customLedgerCount}
        onOpenStatementModal={() => bento.setStatementModalOpen(true)}
        isExpired={isExpired}
        isKiteOffline={isKiteOffline}
        currency={bento.currency}
        onToggleCurrency={bento.toggleCurrency}
        currencySymbol={bento.currencySymbol}
        fxRate={bento.fxRate}
      />

      {/* 🌟 2. Apple Glass Segmented Timeframe Switcher */}
      <PortfolioTimeframeSwitcher
        activeTf={bento.activeTf}
        onSelectTimeframe={bento.handleSelectTimeframe}
      />

      {/* 📈 3. Compounding Area NAV Spline Curve */}
      <PortfolioNavSplineChart
        svgWidth={bento.svgWidth}
        svgHeight={bento.svgHeight}
        paddingY={bento.paddingY}
        splinePath={bento.splinePath}
        splineAreaPath={bento.splineAreaPath}
        alphaAreaPath={bento.alphaAreaPath}
        investedPath={bento.investedPath}
        benchmarkPath={bento.benchmarkPath}
        showBenchmark={bento.showBenchmark}
        onToggleBenchmark={bento.toggleBenchmark}
        highWaterMark={bento.highWaterMark}
        athY={bento.athY}
        currencySymbol={bento.currencySymbol}
        fxRate={bento.fxRate}
        priceLevels={bento.priceLevels}
        dateMilestones={bento.dateMilestones}
        navPoints={bento.navPoints}
        investedPoints={bento.investedPoints}
        benchmarkPoints={bento.benchmarkPoints}
        navDates={bento.navDates}
        activeTf={bento.activeTf}
        isAllView={bento.isAllView}
        getX={bento.getX}
        getY={bento.getY}
        hoverIndex={bento.hoverIndex}
        setHoverIndex={bento.setHoverIndex}
        onScrub={bento.playScrubAudio}
      />

      {/* 💎 4. 4-Cell Telemetry Strip */}
      <PortfolioTelemetryStrip
        safeInvestedVal={bento.safeInvestedVal}
        investedShare={bento.investedShare}
        safeAvailableMargin={bento.safeAvailableMargin}
        marginShare={bento.marginShare}
        totalPnl={totalPnl}
        totalPnlPct={totalPnlPct}
        cagr={bento.timeframeMetrics?.cagr}
        cagrLabel={bento.timeframeMetrics?.cagrLabel}
        xirr={bento.xirrMetrics?.formatted}
        institutionalRisk={bento.institutionalRisk}
        currencySymbol={bento.currencySymbol}
        fxRate={bento.fxRate}
      />

      {/* Universal React Portal Calendar Modal */}
      <LuxuryDateRangePicker
        isOpen={bento.isCalendarOpen}
        onClose={() => bento.setCalendarOpen(false)}
        startDate={bento.customStart}
        endDate={bento.customEnd}
        onApplyRange={bento.handleApplyCustomRange}
      />

      {/* Tradebook & Statement Importer Modal */}
      <StatementUploadModal
        isOpen={bento.isStatementModalOpen}
        onClose={() => bento.setStatementModalOpen(false)}
        hasCustomLedger={bento.hasCustomLedger}
        customLedgerCount={bento.customLedgerCount}
        onStatementLoaded={bento.reloadPortfolioHistory}
        onStatementReset={bento.reloadPortfolioHistory}
      />
    </div>
  );
}

export default PortfolioHeroBento;
