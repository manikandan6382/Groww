import React from "react";
import { EquityHeroTelemetry } from "./EquityHeroTelemetry";
import { EquityCurveSvgCanvas } from "./EquityCurveSvgCanvas";
import { EquityActivePointInspector } from "./EquityActivePointInspector";
import { EquityTradeReel } from "./EquityTradeReel";

export function EquityGrowthTab(props) {
  return (
    <div className="space-y-4">
      <div className="relative rounded-3xl bg-[#0d0f14]/95 border border-white/[0.07] overflow-hidden backdrop-blur-3xl shadow-[0_32px_80px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.08)] group select-none">
        <EquityHeroTelemetry
          isProfitable={props.isProfitable}
          accountingMode={props.accountingMode}
          activeTradesCount={props.activeTrades.length}
          displayCapital={props.displayCapital}
          displayPnl={props.displayPnl}
          displayPct={props.displayPct}
          activePoint={props.activePoint}
          peakCapital={props.peakCapital}
          maxDrawdown={props.maxDrawdown}
          retentionPct={props.retentionPct}
          winRate={props.winRate}
          totalCharges={props.totalCharges}
        />

        <EquityCurveSvgCanvas
          width={props.WIDTH}
          height={props.HEIGHT}
          svgRef={props.svgRef}
          isProfitable={props.isProfitable}
          baselineY={props.baselineY}
          hwmPath={props.hwmPath}
          smoothEquityArea={props.smoothEquityArea}
          smoothEquityPath={props.smoothEquityPath}
          activePoint={props.activePoint}
          activePointIndex={props.activePointIndex}
          equityPoints={props.equityPoints}
          getX={props.getX}
          getY={props.getY}
          handleSvgMouseMove={props.handleSvgMouseMove}
          setScrubIndex={props.setScrubIndex}
        />
      </div>

      <EquityActivePointInspector
        activePoint={props.activePoint}
        isTradeOnCurrentPage={props.isTradeOnCurrentPage}
        onReset={() => {
          props.playScrubAudio();
          props.setSelectedId(null);
          props.setScrubIndex(null);
        }}
        baseCapital={props.BASE_CAPITAL}
      />

      <EquityTradeReel
        equityPoints={props.equityPoints}
        displayReelPoints={props.displayReelPoints}
        totalReelMatches={props.totalReelMatches}
        totalPages={props.totalPages}
        currentPage={props.currentPage}
        reelFilter={props.reelFilter}
        setReelFilter={props.setReelFilter}
        reelSort={props.reelSort}
        setReelSort={props.setReelSort}
        setReelPage={props.setReelPage}
        activePoint={props.activePoint}
        selectedId={props.selectedId}
        setSelectedId={props.setSelectedId}
        setScrubIndex={props.setScrubIndex}
        playScrubAudio={props.playScrubAudio}
        maxWin={props.maxWin}
        recoveryFactor={props.recoveryFactor}
        handleReelKeyDown={props.handleReelKeyDown}
        baseCapital={props.BASE_CAPITAL}
      />
    </div>
  );
}
