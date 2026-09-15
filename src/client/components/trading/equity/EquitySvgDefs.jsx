import React from "react";

export function EquitySvgDefs({ isProfitable }) {
  return (
    <defs>
      {/* Dynamic Volumetric Area Gradient */}
      <linearGradient id="appleAreaGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={isProfitable ? "#10b981" : "#f43f5e"} stopOpacity="0.40" />
        <stop offset="50%" stopColor={isProfitable ? "#06b6d4" : "#e11d48"} stopOpacity="0.12" />
        <stop offset="100%" stopColor="#060709" stopOpacity="0.0" />
      </linearGradient>

      {/* Dynamic Neon Spline Gradient */}
      <linearGradient id="appleSplineGrad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor={isProfitable ? "#06b6d4" : "#fb7185"} />
        <stop offset="50%" stopColor={isProfitable ? "#10b981" : "#f43f5e"} />
        <stop offset="100%" stopColor={isProfitable ? "#34d399" : "#e11d48"} />
      </linearGradient>

      {/* High Water Mark Stepped Beam */}
      <linearGradient id="hwmBeamGrad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.5" />
        <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.85" />
      </linearGradient>

      {/* Bloom Glow Filter */}
      <filter id="neonBloom" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="3.5" result="blur1" />
        <feGaussianBlur stdDeviation="7" result="blur2" />
        <feMerge>
          <feMergeNode in="blur2" />
          <feMergeNode in="blur1" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      {/* Subtle Background Pattern */}
      <pattern id="spatialMicroGrid" width="40" height="40" patternUnits="userSpaceOnUse">
        <line x1="0" y1="40" x2="40" y2="40" stroke="rgba(255,255,255,0.02)" strokeWidth="0.8" />
        <line x1="40" y1="0" x2="40" y2="40" stroke="rgba(255,255,255,0.02)" strokeWidth="0.8" />
      </pattern>
    </defs>
  );
}
