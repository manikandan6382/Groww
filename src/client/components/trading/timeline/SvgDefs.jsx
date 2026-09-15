import React from 'react';

export function SvgDefs({
  profitAreaGradId,
  lossAreaGradId,
  pathStrokeGradId,
  glowFilterId,
  clipAboveId,
  clipBelowId,
  containerWidth,
  entryY,
  chartH,
  peakPts,
  exitPrice,
  entryPrice
}) {
  return (
    <defs>
      <linearGradient id={profitAreaGradId} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#10b981" stopOpacity="0.30" />
        <stop offset="60%" stopColor="#10b981" stopOpacity="0.08" />
        <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
      </linearGradient>

      <linearGradient id={lossAreaGradId} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.0" />
        <stop offset="40%" stopColor="#f43f5e" stopOpacity="0.10" />
        <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.32" />
      </linearGradient>

      <linearGradient id={pathStrokeGradId} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="30%" stopColor={peakPts > 0.5 ? "#10b981" : "#cbd5e1"} />
        <stop offset="75%" stopColor={exitPrice >= entryPrice ? "#34d399" : "#fb7185"} />
        <stop offset="100%" stopColor={exitPrice >= entryPrice ? "#10b981" : "#f43f5e"} />
      </linearGradient>

      <filter id={glowFilterId} x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
        <feMerge>
          <feMergeNode in="coloredBlur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      <clipPath id={clipAboveId}>
        <rect x="0" y="0" width={containerWidth} height={Math.max(0, entryY)} />
      </clipPath>
      <clipPath id={clipBelowId}>
        <rect x="0" y={Math.max(0, entryY)} width={containerWidth} height={Math.max(0, chartH - entryY)} />
      </clipPath>
    </defs>
  );
}
