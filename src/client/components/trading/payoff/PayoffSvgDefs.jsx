import React from "react";

export const PayoffSvgDefs = React.memo(function PayoffSvgDefs() {
  return (
    <defs>
      <linearGradient id="profitEmeraldGlow" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#10b981" stopOpacity="0.40" />
        <stop offset="70%" stopColor="#10b981" stopOpacity="0.10" />
        <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
      </linearGradient>

      <linearGradient id="lossRoseGlow" x1="0%" y1="100%" x2="0%" y2="0%">
        <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.35" />
        <stop offset="70%" stopColor="#f43f5e" stopOpacity="0.08" />
        <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
      </linearGradient>

      <filter id="neonPayoffGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  );
});
