import React from "react";
import { formatTimeShort } from "../../../utils/tradeNormalizer";
import { LifecycleScrubberOverlay } from "./LifecycleScrubberOverlay";

export function LifecycleSvgCurves({
  areaPath,
  profitAreaGradId,
  showBenchmark,
  underlyingPath,
  underlyingPoints,
  underlying,
  splinePath,
  pathStrokeGradId,
  points,
  entryPrice,
  exitPrice,
  peakPoint,
  activePoint,
  containerWidth,
  height,
  padding,
  graphWidth
}) {
  const isGain = exitPrice >= entryPrice;

  return (
    <>
      {/* Volumetric Floating Profit Area */}
      <path d={areaPath} fill={`url(#${profitAreaGradId})`} />

      {/* 📉 5. OPTIONAL UNDERLYING NIFTY BENCHMARK HAIRLINE */}
      {showBenchmark && underlyingPath && (
        <g className="transition-all duration-300 opacity-60">
          <path
            d={underlyingPath}
            fill="none"
            stroke="#f59e0b"
            strokeDasharray="3 3"
            strokeWidth="1.5"
          />
          {underlyingPoints[0] && (
            <text x={underlyingPoints[0].x} y={underlyingPoints[0].y - 6} fill="#fde68a" fontSize="8" fontFamily="monospace">
              {underlying.name} Trajectory
            </text>
          )}
        </g>
      )}

      {/* 🌊 Market Price Path */}
      <path
        d={splinePath}
        fill="none"
        stroke={`url(#${pathStrokeGradId})`}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 📍 Entry Pin Anchor */}
      {points[0] && (
        <g transform={`translate(${points[0].x}, ${points[0].y})`}>
          <circle r="8" fill="#06b6d4" fillOpacity="0.2" className="animate-ping" />
          <circle r="4" fill="#06b6d4" stroke="#ffffff" strokeWidth="1.5" />
          <text x="-4" y="-12" fill="#06b6d4" fontSize="9" fontFamily="monospace" fontWeight="bold">
            ENTRY
          </text>
        </g>
      )}

      {/* 📍 Exit Pin Anchor */}
      {points[points.length - 1] && (
        <g transform={`translate(${points[points.length - 1].x}, ${points[points.length - 1].y})`}>
          <circle 
            r="8" 
            fill={isGain ? "#10b981" : "#f43f5e"} 
            fillOpacity="0.2" 
            className="animate-ping" 
          />
          <circle 
            r="4.5" 
            fill={isGain ? "#10b981" : "#f43f5e"} 
            stroke="#ffffff" 
            strokeWidth="1.5" 
          />
          <text 
            x="-14" 
            y="18" 
            fill={isGain ? "#34d399" : "#fb7185"} 
            fontSize="9" 
            fontFamily="monospace" 
            fontWeight="bold"
          >
            EXIT
          </text>
        </g>
      )}

      {/* 🌟 Peak Excursion Marker (MFE) */}
      {peakPoint && peakPoint.close > entryPrice + 0.5 && (
        <g transform={`translate(${peakPoint.x}, ${peakPoint.y})`}>
          <circle r="2.5" fill="#34d399" />
          <text x="-12" y="-8" fill="#a7f3d0" fontSize="8" fontFamily="monospace">
            High: ₹{peakPoint.close.toFixed(1)}
          </text>
        </g>
      )}

      {/* ⚡ Laser Scrubber Reticle */}
      <LifecycleScrubberOverlay
        activePoint={activePoint}
        padding={padding}
        height={height}
        containerWidth={containerWidth}
      />

      {/* X-Axis Timeline Labels (IST) */}
      {points.length > 0 && (
        <g className="text-slate-400 text-[9px] font-mono" fill="#94a3b8">
          <text x={padding.left} y={height - 8} textAnchor="start">
            {formatTimeShort(points[0].time || points[0].timestamp)}
          </text>
          {points[Math.floor(points.length / 2)] && (
            <text x={points[Math.floor(points.length / 2)].x} y={height - 8} textAnchor="middle">
              {formatTimeShort(points[Math.floor(points.length / 2)].time || points[Math.floor(points.length / 2)].timestamp)}
            </text>
          )}
          <text x={padding.left + graphWidth} y={height - 8} textAnchor="end">
            {formatTimeShort(points[points.length - 1].time || points[points.length - 1].timestamp)}
          </text>
        </g>
      )}
    </>
  );
}
