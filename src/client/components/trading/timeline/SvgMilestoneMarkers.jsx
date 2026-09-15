import React from 'react';

export function SvgMilestoneMarkers({
  renderedPoints = [],
  entryPrice,
  peakPoint,
  peakPrice,
  troughPoint,
  troughPrice,
  flightScope,
  firstBreachPt,
  exitPrice,
  isTargetHit,
  isStopHit,
  padding,
  graphWidth,
  chartH
}) {
  return (
    <g className="milestone-markers-group">
      {/* Milestone 1: ⚡ ORDER ENTRY */}
      {renderedPoints[0] && (
        <g transform={`translate(${renderedPoints[0].x}, ${renderedPoints[0].y})`}>
          <circle r="9" fill="#ffffff" fillOpacity="0.25" className="animate-ping" />
          <circle r="5" fill="#ffffff" stroke="#0f172a" strokeWidth="1.8" />
          <g transform="translate(-40, -26)">
            <rect width="80" height="18" rx="5" fill="#18181b" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
            <text x="40" y="12.5" textAnchor="middle" fill="#ffffff" fontSize="9" fontFamily="monospace" fontWeight="bold">
              ⚡ Entry ₹{entryPrice.toFixed(1)}
            </text>
          </g>
        </g>
      )}

      {/* Milestone 2: 🟢 ALL-TIME TRADE HIGH (Peak Excursion) */}
      {peakPoint && (() => {
        const isNearEntry = Math.abs(peakPoint.x - (renderedPoints[0]?.x || 0)) < 55;
        const isNearTrough = troughPoint && Math.abs(peakPoint.x - troughPoint.x) < 75;
        let yOffset = peakPoint.y < padding.top + 26 ? 14 : -28;
        if (isNearTrough && yOffset > 0) yOffset = -28;
        const xOffset = peakPoint.x > graphWidth - 60 ? -80 : isNearEntry ? 10 : -45;

        return (
          <g transform={`translate(${peakPoint.x}, ${peakPoint.y})`}>
            <circle r="11" fill="#10b981" fillOpacity="0.28" className="animate-pulse" />
            <circle r="4.5" fill="#10b981" stroke="#ffffff" strokeWidth="1.8" />
            <g transform={`translate(${xOffset}, ${yOffset})`}>
              <rect width="90" height="20" rx="6" fill="#064e3b" stroke="#10b981" strokeWidth="1.2" />
              <text x="45" y="14" textAnchor="middle" fill="#a7f3d0" fontSize="9" fontFamily="monospace" fontWeight="bold" className="tabular-nums">
                ▲ High ₹{peakPrice.toFixed(1)}
              </text>
            </g>
          </g>
        );
      })()}

      {/* Milestone 3: 🔴 ALL-TIME TRADE LOW (Deepest Drawdown) */}
      {troughPoint && Math.abs(troughPoint.x - (peakPoint?.x || 0)) > 15 && (() => {
        const isNearPeak = peakPoint && Math.abs(troughPoint.x - peakPoint.x) < 75;
        const isNearExit = renderedPoints.length > 1 && Math.abs(troughPoint.x - renderedPoints[renderedPoints.length - 1].x) < 55;
        let yOffset = troughPoint.y > chartH - 40 ? -28 : 14;
        if (isNearPeak) yOffset = 14;
        const xOffset = troughPoint.x > graphWidth - 60 ? -80 : isNearExit ? -85 : -45;

        return (
          <g transform={`translate(${troughPoint.x}, ${troughPoint.y})`}>
            <circle r="11" fill="#f43f5e" fillOpacity="0.28" className="animate-pulse" />
            <circle r="4.5" fill="#f43f5e" stroke="#ffffff" strokeWidth="1.8" />
            <g transform={`translate(${xOffset}, ${yOffset})`}>
              <rect width="90" height="20" rx="6" fill="#881337" stroke="#f43f5e" strokeWidth="1.2" />
              <text x="45" y="14" textAnchor="middle" fill="#fecdd3" fontSize="9" fontFamily="monospace" fontWeight="bold" className="tabular-nums">
                ▼ Low ₹{troughPrice.toFixed(1)}
              </text>
            </g>
          </g>
        );
      })()}

      {/* Path-Dependency Stop Invalidation Marker */}
      {flightScope !== 'scalp' && firstBreachPt && (
        <g transform={`translate(${firstBreachPt.x}, ${firstBreachPt.y})`}>
          <circle r="10" fill="#f43f5e" fillOpacity="0.25" className="animate-ping" />
          <circle r="5" fill="#f43f5e" stroke="#ffffff" strokeWidth="1.5" />
          <g transform="translate(-60, -28)">
            <rect width="120" height="20" rx="5" fill="#881337" stroke="#f43f5e" strokeWidth="1" />
            <text x="60" y="14" textAnchor="middle" fill="#ffffff" fontSize="9" fontFamily="monospace" fontWeight="bold">
              🛑 Stop Invalidation
            </text>
          </g>
        </g>
      )}

      {/* Milestone 4: 🎯 / 🛑 REALIZED EXIT PIN */}
      {renderedPoints.length > 1 && (
        <g transform={`translate(${renderedPoints[renderedPoints.length - 1].x}, ${renderedPoints[renderedPoints.length - 1].y})`}>
          <circle
            r="10"
            fill={exitPrice >= entryPrice ? "#10b981" : "#f43f5e"}
            fillOpacity="0.35"
            className="animate-ping"
          />
          <circle
            r="5.5"
            fill={exitPrice >= entryPrice ? "#10b981" : "#f43f5e"}
            stroke="#ffffff"
            strokeWidth="1.8"
          />
          <g transform={`translate(${renderedPoints[renderedPoints.length - 1].x > graphWidth - 50 ? -85 : -45}, 14)`}>
            <rect
              width="90"
              height="20"
              rx="6"
              fill={exitPrice >= entryPrice ? "#064e3b" : "#881337"}
              stroke={exitPrice >= entryPrice ? "#10b981" : "#f43f5e"}
              strokeWidth="1.2"
            />
            <text
              x="45"
              y="14"
              textAnchor="middle"
              fill={exitPrice >= entryPrice ? "#a7f3d0" : "#fecdd3"}
              fontSize="9"
              fontFamily="monospace"
              fontWeight="bold"
            >
              {isTargetHit ? '🎯 Target Hit' : isStopHit ? '🛑 Stop Cut' : 'Exit'} ₹{exitPrice.toFixed(1)}
            </text>
          </g>
        </g>
      )}
    </g>
  );
}
