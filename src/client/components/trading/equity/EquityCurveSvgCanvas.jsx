import React from "react";
import { EquitySvgDefs } from "./EquitySvgDefs";
import { EquityCrosshairReticle } from "./EquityCrosshairReticle";

export function EquityCurveSvgCanvas({
  width,
  height,
  svgRef,
  isProfitable,
  baselineY,
  hwmPath,
  smoothEquityArea,
  smoothEquityPath,
  activePoint,
  activePointIndex,
  equityPoints,
  getX,
  getY,
  handleSvgMouseMove,
  setScrubIndex
}) {
  return (
    <div className="relative w-full overflow-hidden mt-2">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-64 sm:h-80 select-none touch-pan-y cursor-crosshair overflow-visible block"
        preserveAspectRatio="none"
        onMouseMove={handleSvgMouseMove}
        onMouseLeave={() => setScrubIndex(null)}
      >
        <EquitySvgDefs isProfitable={isProfitable} />

        {/* Subtle Background Micro-Grid */}
        <rect x="0" y="0" width={width} height={height} fill="url(#spatialMicroGrid)" />

        {/* ₹1.00L BASE HORIZON Line & Label */}
        <line
          x1="0"
          y1={baselineY}
          x2={width}
          y2={baselineY}
          stroke={isProfitable ? "rgba(16, 185, 129, 0.25)" : "rgba(244, 63, 94, 0.25)"}
          strokeWidth="1.2"
          strokeDasharray="4 6"
        />
        <text
          x={width - 16}
          y={baselineY - 7}
          textAnchor="end"
          fill="rgba(255, 255, 255, 0.35)"
          fontSize="10"
          fontFamily="sans-serif"
          fontWeight="bold"
          letterSpacing="0.5"
        >
          ₹1.00L BASE HORIZON
        </text>

        {/* High Water Mark (Peak Ceiling Beam) */}
        <path d={hwmPath} fill="none" stroke="url(#hwmBeamGrad)" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.75" />

        {/* Volumetric Liquid Area Gradient Fill */}
        <path d={smoothEquityArea} fill="url(#appleAreaGrad)" />

        {/* Neon Spline Glow Aura (Bloom) */}
        <path
          d={smoothEquityPath}
          fill="none"
          stroke="url(#appleSplineGrad)"
          strokeWidth="7"
          opacity="0.38"
          filter="url(#neonBloom)"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Luminous Spline Core */}
        <path
          d={smoothEquityPath}
          fill="none"
          stroke="url(#appleSplineGrad)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <EquityCrosshairReticle
          activePoint={activePoint}
          activePointIndex={activePointIndex}
          equityPoints={equityPoints}
          isProfitable={isProfitable}
          width={width}
          height={height}
          getX={getX}
          getY={getY}
        />

        {/* 0-Trade Baseline Watermark */}
        {equityPoints.length <= 1 && (
          <text
            x={width / 2}
            y={height / 2 - 4}
            textAnchor="middle"
            fill="rgba(255,255,255,0.2)"
            fontSize="11"
            fontFamily="sans-serif"
            fontWeight="bold"
            letterSpacing="1"
          >
            READY FOR INITIAL EXECUTION · ₹1,00,000 BASELINE
          </text>
        )}
      </svg>
    </div>
  );
}
