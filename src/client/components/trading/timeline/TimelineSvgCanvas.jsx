import React, { useId } from 'react';
import { SvgDefs } from './SvgDefs';
import { SvgReferenceLines } from './SvgReferenceLines';
import { SvgVolumeHistogram } from './SvgVolumeHistogram';
import { SvgSplineAndCandles } from './SvgSplineAndCandles';
import { SvgMilestoneMarkers } from './SvgMilestoneMarkers';
import { SvgCrosshairScrubber } from './SvgCrosshairScrubber';

export function TimelineSvgCanvas({
  coords,
  diagnostics,
  scrubber,
  activeReplayIndex,
  renderedPoints,
  trade,
  entryPrice,
  exitPrice,
  netZeroPrice,
  flightScope,
  chartMode
}) {
  const reactId = useId();
  const cleanId = reactId.replace(/:/g, '_');
  const profitAreaGradId = `profitAreaGrad_${cleanId}`;
  const lossAreaGradId = `lossAreaGrad_${cleanId}`;
  const pathStrokeGradId = `pathStrokeGrad_${cleanId}`;
  const glowFilterId = `glowFilter_${cleanId}`;
  const clipAboveId = `${cleanId}_clipAbove`;
  const clipBelowId = `${cleanId}_clipBelow`;

  const { containerWidth, height: chartH, padding, graphWidth, graphHeight, allPoints, maxVolume, stopY, entryY, oneRY, targetY, netZeroY } = coords;
  const bottomBaseY = chartH - padding.bottom;
  const activeWatermarkPnl = diagnostics.scrubTelemetry ? diagnostics.scrubTelemetry.rupeesDelta : Number(trade?.netPnl || 0);

  return (
    <svg
      width={containerWidth}
      height={chartH}
      className="overflow-visible block w-full select-none"
      onMouseMove={scrubber.handleMouseMove}
      onClick={scrubber.handleClickCanvas}
      onTouchStart={scrubber.handleTouch}
      onTouchMove={scrubber.handleTouch}
    >
      <SvgDefs
        profitAreaGradId={profitAreaGradId}
        lossAreaGradId={lossAreaGradId}
        pathStrokeGradId={pathStrokeGradId}
        glowFilterId={glowFilterId}
        clipAboveId={clipAboveId}
        clipBelowId={clipBelowId}
        containerWidth={containerWidth}
        entryY={entryY}
        chartH={chartH}
        peakPts={diagnostics.peakPts}
        exitPrice={exitPrice}
        entryPrice={entryPrice}
      />

      <SvgReferenceLines
        padding={padding}
        graphWidth={graphWidth}
        graphHeight={graphHeight}
        activeWatermarkPnl={activeWatermarkPnl}
        flightScope={flightScope}
        stopLoss={trade?.stopLoss ? Number(trade.stopLoss) : null}
        stopY={stopY}
        entryY={entryY}
        oneRY={oneRY}
        targetPrice={trade?.targetPrice ? Number(trade.targetPrice) : null}
        targetY={targetY}
        netZeroPrice={netZeroPrice}
        netZeroY={netZeroY}
        entryPrice={entryPrice}
        isMobile={coords.isMobile}
        entryPoint={coords.entryPoint}
        exitPoint={coords.exitPoint}
      />

      <SvgVolumeHistogram
        allPoints={allPoints}
        graphWidth={graphWidth}
        maxVolume={maxVolume}
        bottomBaseY={bottomBaseY}
        replayIndex={activeReplayIndex}
        currentActivePoint={scrubber.currentActivePoint}
      />

      <SvgSplineAndCandles
        flightScope={flightScope}
        exitPoint={coords.exitPoint}
        padding={padding}
        graphWidth={graphWidth}
        graphHeight={graphHeight}
        bottomBaseY={bottomBaseY}
        exitPrice={exitPrice}
        isMobile={coords.isMobile}
        allPoints={allPoints}
        renderedPoints={renderedPoints}
        terminalIntrinsic={Number(trade?.terminalIntrinsic || 0)}
        chartMode={chartMode}
        isShort={trade?.direction === 'SHORT'}
        areaPath={coords.areaPath}
        splinePath={coords.splinePath}
        profitAreaGradId={profitAreaGradId}
        lossAreaGradId={lossAreaGradId}
        pathStrokeGradId={pathStrokeGradId}
        glowFilterId={glowFilterId}
        clipAboveId={clipAboveId}
        clipBelowId={clipBelowId}
      />

      <SvgMilestoneMarkers
        renderedPoints={renderedPoints}
        entryPrice={entryPrice}
        entryPoint={coords.entryPoint}
        exitPoint={coords.exitPoint}
        peakPoint={coords.peakPoint}
        peakPrice={diagnostics.peakPrice}
        troughPoint={coords.troughPoint}
        troughPrice={diagnostics.troughPrice}
        flightScope={flightScope}
        firstBreachPt={diagnostics.firstBreachPt}
        exitPrice={exitPrice}
        isTargetHit={diagnostics.isTargetHit}
        isStopHit={diagnostics.isStopHit}
        padding={padding}
        graphWidth={graphWidth}
        chartH={chartH}
      />

      <SvgCrosshairScrubber
        currentActivePoint={scrubber.currentActivePoint}
        padding={padding}
        graphWidth={graphWidth}
        bottomBaseY={bottomBaseY}
        chartH={chartH}
        isMobile={coords.isMobile}
        isMultiDay={diagnostics.isMultiDay}
        allPoints={allPoints}
      />
    </svg>
  );
}
