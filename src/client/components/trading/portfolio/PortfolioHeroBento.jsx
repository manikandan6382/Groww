import React from "react";
import { LuxuryDateRangePicker } from "../../common/LuxuryDateRangePicker";
import { usePortfolioBentoData } from "./usePortfolioBentoData";
import { PortfolioValuationHeader } from "./PortfolioValuationHeader";
import { PortfolioTimeframeSwitcher } from "./PortfolioTimeframeSwitcher";
import { PortfolioNavSplineChart } from "./PortfolioNavSplineChart";
import { PortfolioTelemetryStrip } from "./PortfolioTelemetryStrip";

export function PortfolioHeroBento({
  holdings = [],
  margins = { available: 0, net: 0 },
  totalCurrentValue = 0,
  totalInvested = 0,
  totalPnl = 0,
  totalPnlPct = "0.00",
  dayPnl = 0,
  dayPnlPct = "0.00",
}) {
  const bento = usePortfolioBentoData({
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
        navPoints={bento.navPoints}
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
      />

      {/* Universal React Portal Calendar Modal */}
      <LuxuryDateRangePicker
        isOpen={bento.isCalendarOpen}
        onClose={() => bento.setCalendarOpen(false)}
        startDate={bento.customStart}
        endDate={bento.customEnd}
        onApplyRange={bento.handleApplyCustomRange}
      />
    </div>
  );
}

export default PortfolioHeroBento;
