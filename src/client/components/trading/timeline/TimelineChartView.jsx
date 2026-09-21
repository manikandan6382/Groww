import React from 'react';
import { TimelineSyntheticBar } from './TimelineSyntheticBar';
import { TimelineMetricsCards } from './TimelineMetricsCards';
import { TimelineSvgCanvasFrame } from './TimelineSvgCanvasFrame';
import { TimelineScrubberBar } from './TimelineScrubberBar';
import { TimelineCounterfactualCallout } from './TimelineCounterfactualCallout';
import { TimelineExpiryDisciplineDeck } from './TimelineExpiryDisciplineDeck';
import { TimelinePostMortemDeck } from './TimelinePostMortemDeck';

export function TimelineChartView({
  coords,
  diagnostics,
  scrubber,
  playback,
  activeReplayIndex,
  renderedPoints,
  trade,
  entryPrice,
  exitPrice,
  charges,
  frictionPerUnit,
  netZeroPrice,
  flightScope,
  scenarioVariant,
  setScenarioVariant,
  chartMode,
  isLoading
}) {
  return (
    <>
      <TimelineSyntheticBar
        isVerifiedTicks={coords.isVerifiedTicks}
        entryPrice={entryPrice}
        scenarioVariant={scenarioVariant}
        setScenarioVariant={setScenarioVariant}
      />
      <TimelineMetricsCards
        scrubTelemetry={diagnostics.scrubTelemetry}
        peakPrice={diagnostics.peakPrice}
        peakPts={diagnostics.peakPts}
        peakRupees={diagnostics.peakRupees}
        mfeTargetEfficiencyPct={diagnostics.mfeTargetEfficiencyPct}
        troughPrice={diagnostics.troughPrice}
        drawdownPts={diagnostics.drawdownPts}
        drawdownRupees={diagnostics.drawdownRupees}
        maeRiskConsumedPct={diagnostics.maeRiskConsumedPct}
        netZeroPrice={netZeroPrice}
        frictionPerUnit={frictionPerUnit}
        charges={charges}
        trade={trade}
        entryTime={trade?.entryDatetime || trade?.timestamp}
        exitTime={trade?.exitDatetime || trade?.closedAt}
        closeReason={String(trade?.closeReason || '')}
      />
      <TimelineSvgCanvasFrame
        coords={coords}
        diagnostics={diagnostics}
        scrubber={scrubber}
        activeReplayIndex={activeReplayIndex}
        renderedPoints={renderedPoints}
        trade={trade}
        entryPrice={entryPrice}
        exitPrice={exitPrice}
        netZeroPrice={netZeroPrice}
        flightScope={flightScope}
        chartMode={chartMode}
        isLoading={isLoading}
      />
      <TimelineScrubberBar
        allPoints={coords.allPoints}
        isMultiDay={diagnostics.isMultiDay}
        replayIndex={activeReplayIndex}
        scrubIndex={scrubber.scrubIndex}
        setIsPlaying={playback.handleTogglePlay}
        setReplayIndex={playback.setReplayIndex}
        setScrubIndex={scrubber.setScrubIndex}
      />
      <TimelineCounterfactualCallout
        scrubTelemetry={diagnostics.scrubTelemetry}
        currentActivePoint={scrubber.currentActivePoint}
        exitPoint={coords.exitPoint}
        isDrawdownBreached={diagnostics.isDrawdownBreached}
        firstBreachPt={diagnostics.firstBreachPt}
        effectiveStopLoss={diagnostics.effectiveStopLoss}
        isPinned={scrubber.isPinned}
        onClear={scrubber.clearScrub}
      />
      <TimelineExpiryDisciplineDeck
        flightScope={flightScope}
        trade={trade}
        symbol={trade?.symbol || trade?.tradingsymbol || 'INDEX'}
        entryPrice={entryPrice}
        entryTime={trade?.entryDatetime || trade?.timestamp}
        exitPrice={exitPrice}
        exitTime={trade?.exitDatetime || trade?.closedAt}
        closeReason={String(trade?.closeReason || '')}
        executionDiscipline={diagnostics.executionDiscipline}
      />
      <TimelinePostMortemDeck
        isPeakGiveback={diagnostics.isPeakGiveback}
        isTargetHit={diagnostics.isTargetHit}
        mindsetEmotion={trade?.mindsetEmotion}
        peakPrice={diagnostics.peakPrice}
        peakPts={diagnostics.peakPts}
        drawdownPts={diagnostics.drawdownPts}
        peakRupees={diagnostics.peakRupees}
        mfeTargetEfficiencyPct={diagnostics.mfeTargetEfficiencyPct}
        troughPrice={diagnostics.troughPrice}
        drawdownRupees={diagnostics.drawdownRupees}
        maeRiskConsumedPct={diagnostics.maeRiskConsumedPct}
      />
    </>
  );
}
