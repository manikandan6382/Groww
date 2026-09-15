import React from "react";

export function LifecycleSvgDefs({
  profitAreaGradId,
  lossAreaGradId,
  pathStrokeGradId,
  exitPrice,
  entryPrice
}) {
  const isGain = exitPrice >= entryPrice;

  return (
    <defs>
      <linearGradient id={profitAreaGradId} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
        <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
      </linearGradient>

      <linearGradient id={lossAreaGradId} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.0" />
        <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.25" />
      </linearGradient>

      <linearGradient id={pathStrokeGradId} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#06b6d4" />
        <stop offset="60%" stopColor={isGain ? "#10b981" : "#f43f5e"} />
        <stop offset="100%" stopColor={isGain ? "#34d399" : "#fb7185"} />
      </linearGradient>
    </defs>
  );
}
