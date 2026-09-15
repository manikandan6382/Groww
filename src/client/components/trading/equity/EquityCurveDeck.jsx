import React from "react";
import { useEquityCurveData } from "./useEquityCurveData";
import { useReelKeyboardNav } from "./useReelKeyboardNav";
import { EquityDeckHeader } from "./EquityDeckHeader";
import { EquityQuickGuide } from "./EquityQuickGuide";
import { EquityGrowthTab } from "./EquityGrowthTab";
import { EquityDrawdownValleyTab } from "./EquityDrawdownValleyTab";
import { EquityMonteCarloTab } from "./EquityMonteCarloTab";

export function EquityCurveDeck() {
  const data = useEquityCurveData();
  const { handleReelKeyDown } = useReelKeyboardNav(data);

  const handleSvgMouseMove = (e) => {
    if (!data.svgRef.current || data.equityPoints.length === 0) return;
    const rect = data.svgRef.current.getBoundingClientRect();
    const clientX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const svgX = (clientX / rect.width) * data.WIDTH;
    const rawIndex = (svgX / data.WIDTH) * (data.equityPoints.length - 1);
    const closestIndex = Math.max(0, Math.min(data.equityPoints.length - 1, Math.round(rawIndex)));

    if (closestIndex !== data.scrubIndex) {
      data.playScrubAudio();
      data.setScrubIndex(closestIndex);
    }
  };

  return (
    <div className="relative rounded-3xl bg-[#0d0f14] border border-white/[0.08] shadow-[0_24px_60px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.12)] p-4 sm:p-6 space-y-5 overflow-hidden">
      {/* Apple Ambient Studio Spotlight */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-96 h-64 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-32 right-10 w-80 h-60 bg-emerald-500/10 rounded-full blur-[90px] pointer-events-none" />

      <EquityDeckHeader
        accountingMode={data.accountingMode}
        setAccountingMode={data.setAccountingMode}
        activeTab={data.activeTab}
        setActiveTab={data.setActiveTab}
      />

      <EquityQuickGuide
        showGuide={data.showGuide}
        setShowGuide={data.setShowGuide}
      />

      {data.activeTab === "growth" ? (
        <EquityGrowthTab
          {...data}
          handleSvgMouseMove={handleSvgMouseMove}
          handleReelKeyDown={handleReelKeyDown}
        />
      ) : data.activeTab === "drawdown" ? (
        <EquityDrawdownValleyTab
          width={data.WIDTH}
          height={data.HEIGHT}
          padding={data.PADDING}
          maxDDPct={data.maxDDPct}
          drawdownArea={data.drawdownArea}
          drawdownPath={data.drawdownPath}
          equityPoints={data.equityPoints}
          getX={data.getX}
          getDDY={data.getDDY}
        />
      ) : (
        <EquityMonteCarloTab
          monteCarlo={data.monteCarlo}
          activeTradesCount={data.activeTrades.length}
        />
      )}
    </div>
  );
}

export default EquityCurveDeck;
