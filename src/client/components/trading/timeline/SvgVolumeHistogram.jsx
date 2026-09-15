import React from 'react';

export function SvgVolumeHistogram({
  allPoints = [],
  graphWidth,
  maxVolume,
  volHeightLimit = 38,
  bottomBaseY,
  replayIndex,
  currentActivePoint
}) {
  return (
    <g className="volume-histogram-layer">
      {allPoints.map((pt, i) => {
        const barW = Math.max(2, Math.min(8, (graphWidth / allPoints.length) * 0.65));
        const volRatio = Math.min(1, Math.max(0.1, Number(pt.volume || 1000) / maxVolume));
        const barH = volRatio * volHeightLimit;
        const barY = bottomBaseY - barH;
        const isRevealed = replayIndex === null || i <= replayIndex;
        return (
          <rect
            key={`vol-${i}`}
            x={pt.x - barW / 2}
            y={barY}
            width={barW}
            height={barH}
            rx={1.5}
            fill={pt.isBullish ? '#10b981' : '#f43f5e'}
            fillOpacity={!isRevealed ? '0.05' : currentActivePoint && currentActivePoint.index === i ? '0.80' : '0.22'}
            className="transition-all duration-150"
          />
        );
      })}
    </g>
  );
}
