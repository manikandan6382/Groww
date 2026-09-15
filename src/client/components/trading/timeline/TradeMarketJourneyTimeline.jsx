import React, { useState, useMemo } from 'react';
import clsx from 'clsx';
import { normalizeTrade } from '../../../utils/tradeNormalizer';
import { useTimelineData } from './useTimelineData';
import { useTimelineCoordinates } from './useTimelineCoordinates';
import { useTimelineScrubber } from './useTimelineScrubber';
import { useTimelinePlayback } from './useTimelinePlayback';
import { useTimelineDiagnostics } from './useTimelineDiagnostics';
import { TimelineHeroHeader } from './TimelineHeroHeader';
import { TimelineControlToolbar } from './TimelineControlToolbar';
import { TimelineChartView } from './TimelineChartView';
import { TimelineJournalView } from './TimelineJournalView';

export function TradeMarketJourneyTimeline({
  trade: rawTrade,
  onClose,
  isModalView = false,
  carouselNav = null,
  initialFlightScope = 'scalp',
  onSwitchFlightScope = null
}) {
  const trade = useMemo(() => normalizeTrade(rawTrade), [rawTrade]);
  const [scenarioVariant, setScenarioVariant] = useState('rollercoaster');
  const [chartMode, setChartMode] = useState('spline');
  const [flightScope, setFlightScope] = useState(initialFlightScope || 'scalp');
  const [activeTab, setActiveTab] = useState('chart');

  const { containerRef, containerWidth, candleData, isLoading } = useTimelineData(trade, scenarioVariant, flightScope);
  const coords = useTimelineCoordinates({ candleData, containerWidth, trade, flightScope, replayIndex: null });

  const scrubber = useTimelineScrubber({
    renderedPoints: coords.renderedPoints,
    containerRef,
    peakPoint: coords.peakPoint,
    troughPoint: coords.troughPoint,
    exitPoint: coords.exitPoint,
    replayIndex: null
  });

  const playback = useTimelinePlayback({
    allPoints: coords.allPoints,
    peakPoint: coords.peakPoint,
    troughPoint: coords.troughPoint,
    exitPoint: coords.exitPoint,
    onClose,
    carouselNav,
    onSwitchFlightScope,
    setFlightScope,
    setScrubIndex: scrubber.setScrubIndex
  });

  const activeReplayIndex = playback.replayIndex;
  const renderedPoints = useMemo(() => {
    if (activeReplayIndex === null || activeReplayIndex >= coords.allPoints.length - 1) return coords.allPoints;
    return coords.allPoints.slice(0, Math.max(2, activeReplayIndex + 1));
  }, [coords.allPoints, activeReplayIndex]);

  const diagnostics = useTimelineDiagnostics({
    trade,
    allPoints: coords.allPoints,
    peakPoint: coords.peakPoint,
    flightScope,
    currentActivePoint: scrubber.currentActivePoint
  });

  const entryPrice = Math.max(0.1, Number(trade?.entryPrice || 100));
  const exitPrice = Math.max(0.1, Number(trade?.exitPrice || entryPrice));
  const totalQty = Number(trade?.quantity || trade?.qty || 1);
  const charges = Number(trade?.charges || trade?.tax || 0);
  const frictionPerUnit = totalQty > 0 ? charges / totalQty : 0.85;
  const netZeroPrice = trade?.direction === 'SHORT' ? entryPrice - frictionPerUnit : entryPrice + frictionPerUnit;

  return (
    <div
      ref={containerRef}
      className={clsx(
        "relative select-none animate-in fade-in duration-300",
        isModalView ? "p-1.5 sm:p-2.5 bg-transparent" : "rounded-3xl bg-[#090b12]/95 backdrop-blur-3xl border border-white/10 p-4 sm:p-6 shadow-2xl overflow-hidden"
      )}
    >
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-slate-400/[0.02] rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-500/[0.03] rounded-full blur-3xl pointer-events-none" />

      <TimelineHeroHeader
        trade={trade}
        symbol={trade?.symbol || trade?.tradingsymbol || 'INDEX'}
        entryPrice={entryPrice}
        exitPrice={exitPrice}
        isTargetHit={diagnostics.isTargetHit}
        isStopHit={diagnostics.isStopHit}
        closeReason={String(trade?.closeReason || '')}
        totalQty={totalQty}
        charges={charges}
        isVerifiedTicks={coords.isVerifiedTicks}
        carouselNav={carouselNav}
        onClose={onClose}
      />

      <TimelineControlToolbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        flightScope={flightScope}
        setFlightScope={setFlightScope}
        onSwitchFlightScope={onSwitchFlightScope}
        chartMode={chartMode}
        setChartMode={setChartMode}
        isMobile={coords.isMobile}
        allPoints={coords.allPoints}
        playback={playback}
      />

      {activeTab === 'chart' ? (
        <TimelineChartView
          coords={coords}
          diagnostics={diagnostics}
          scrubber={scrubber}
          playback={playback}
          activeReplayIndex={activeReplayIndex}
          renderedPoints={renderedPoints}
          trade={trade}
          entryPrice={entryPrice}
          exitPrice={exitPrice}
          charges={charges}
          frictionPerUnit={frictionPerUnit}
          netZeroPrice={netZeroPrice}
          flightScope={flightScope}
          scenarioVariant={scenarioVariant}
          setScenarioVariant={setScenarioVariant}
          chartMode={chartMode}
          isLoading={isLoading}
        />
      ) : (
        <TimelineJournalView
          trade={trade}
          diagnostics={diagnostics}
          entryPrice={entryPrice}
          exitPrice={exitPrice}
          netZeroPrice={netZeroPrice}
          frictionPerUnit={frictionPerUnit}
          charges={charges}
        />
      )}
    </div>
  );
}
