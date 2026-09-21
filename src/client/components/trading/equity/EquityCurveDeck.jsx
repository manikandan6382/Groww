import React from "react";
import { useEquityCurveData } from "./useEquityCurveData";
import { useReelKeyboardNav } from "./useReelKeyboardNav";
import { EquityDeckHeader } from "./EquityDeckHeader";
import { EquityQuickGuide } from "./EquityQuickGuide";
import { EquityGrowthTab } from "./EquityGrowthTab";
import { EquityDrawdownValleyTab } from "./EquityDrawdownValleyTab";
import { EquityMonteCarloTab } from "./EquityMonteCarloTab";
import { EquityBenchmarkTab } from "./EquityBenchmarkTab";

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

  const handleSvgTouchMove = (e) => {
    if (!data.svgRef.current || data.equityPoints.length === 0 || !e.touches || !e.touches[0]) return;
    const touch = e.touches[0];
    const rect = data.svgRef.current.getBoundingClientRect();
    const clientX = Math.max(0, Math.min(rect.width, touch.clientX - rect.left));
    const svgX = (clientX / rect.width) * data.WIDTH;
    const rawIndex = (svgX / data.WIDTH) * (data.equityPoints.length - 1);
    const closestIndex = Math.max(0, Math.min(data.equityPoints.length - 1, Math.round(rawIndex)));

    if (closestIndex !== data.scrubIndex) {
      data.playScrubAudio();
      data.setScrubIndex(closestIndex);
    }
  };

  return (
    <div 
      id="equity-curve-deck" 
      data-deck="equity-curve" 
      className="relative rounded-3xl bg-[#0d111a]/85 border border-white/[0.08] shadow-[0_24px_60px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.12)] p-4 sm:p-6 space-y-5 overflow-hidden backdrop-blur-2xl"
    >
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
          handleSvgTouchMove={handleSvgTouchMove}
          handleReelKeyDown={handleReelKeyDown}
        />
      ) : data.activeTab === "drawdown" ? (
        <EquityDrawdownValleyTab
          {...data}
          width={data.WIDTH}
          height={data.HEIGHT}
          padding={data.PADDING}
          scrubIndex={data.scrubIndex}
          setScrubIndex={data.setScrubIndex}
        />
      ) : data.activeTab === "monte-carlo" ? (
        <EquityMonteCarloTab
          monteCarlo={data.monteCarlo}
          activeTradesCount={data.activeTrades.length}
          mcHorizon={data.mcHorizon}
          setMcHorizon={data.setMcHorizon}
          isPendingMc={data.isPendingMc}
        />
      ) : (
        <EquityBenchmarkTab
          activeTrades={data.activeTrades}
          accountingMode={data.accountingMode}
          BASE_CAPITAL={data.BASE_CAPITAL}
          playScrubAudio={data.playScrubAudio}
          scrubIndex={data.scrubIndex}
          setScrubIndex={data.setScrubIndex}
        />
      )}
    </div>

  );
}

export default EquityCurveDeck;

