import React from 'react';
import { formatTimelineLabel } from './flightTimeUtils';
import { triggerScrubHaptic } from './timelineCache';

export function TimelineScrubberBar({
  allPoints = [],
  isMultiDay,
  replayIndex,
  scrubIndex,
  setIsPlaying,
  setReplayIndex,
  setScrubIndex
}) {
  if (allPoints.length <= 1) return null;

  return (
    <div className="px-2 py-0.5 flex items-center gap-3 font-mono text-[10.5px] text-slate-400 border-t border-white/5 mt-1">
      <span className="tabular-nums shrink-0">
        {allPoints[0] ? formatTimelineLabel(allPoints[0].time || allPoints[0].timestamp, isMultiDay) : "09:15"}
      </span>
      <div className="relative flex-1 h-8 flex items-center">
        <input
          type="range"
          min={0}
          max={Math.max(1, allPoints.length - 1)}
          value={replayIndex !== null ? replayIndex : scrubIndex !== null ? scrubIndex : allPoints.length - 1}
          onChange={(e) => {
            const val = Number(e.target.value);
            setIsPlaying(false);
            setReplayIndex(val);
            setScrubIndex(val);
            triggerScrubHaptic();
          }}
          className="w-full h-8 py-3 bg-transparent cursor-ew-resize accent-emerald-400 hover:accent-emerald-300 transition-all touch-none"
        />
      </div>
      <span className="tabular-nums shrink-0">
        {allPoints[allPoints.length - 1] ? formatTimelineLabel(allPoints[allPoints.length - 1].time || allPoints[allPoints.length - 1].timestamp, isMultiDay) : "15:30"}
      </span>
    </div>
  );
}
