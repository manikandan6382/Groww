import React from 'react';
import { formatTimelineLabel } from './flightTimeUtils';

export function SvgCrosshairScrubber({
  currentActivePoint,
  padding,
  graphWidth,
  bottomBaseY,
  chartH,
  isMobile,
  isMultiDay,
  allPoints = []
}) {
  return (
    <g className="crosshair-scrubber-group">
      {currentActivePoint && (
        <g className="pointer-events-none select-none">
          {/* Vertical Time Projection Line */}
          <line
            x1={currentActivePoint.x}
            y1={padding.top}
            x2={currentActivePoint.x}
            y2={bottomBaseY}
            stroke="rgba(255,255,255,0.45)"
            strokeDasharray="3 3"
            strokeWidth="1.2"
            strokeOpacity="0.65"
          />
          {/* Horizontal Price Projection Line */}
          <line
            x1={padding.left}
            y1={currentActivePoint.y}
            x2={padding.left + graphWidth}
            y2={currentActivePoint.y}
            stroke="rgba(255,255,255,0.45)"
            strokeDasharray="3 3"
            strokeWidth="1.2"
            strokeOpacity="0.65"
          />

          {/* Target Reticle Vertex Aura */}
          <circle cx={currentActivePoint.x} cy={currentActivePoint.y} r="10" fill="#f59e0b" fillOpacity="0.18" className="animate-ping" />
          <circle cx={currentActivePoint.x} cy={currentActivePoint.y} r="5.5" fill="#f59e0b" stroke="#ffffff" strokeWidth="2" />

          {/* Dynamic Price Level Badge on Right Axis Gutter */}
          {!isMobile && (
            <g transform={`translate(${padding.left + graphWidth + 6}, ${currentActivePoint.y - 10})`}>
              <rect width="68" height="20" rx="5" fill="#1c160c" stroke="rgba(255,255,255,0.45)" strokeWidth="1" />
              <text x="6" y="14" fill="#ffffff" fontSize="10" fontFamily="monospace" fontWeight="bold" className="tabular-nums">
                ₹{Number(currentActivePoint.close ?? currentActivePoint.price).toFixed(1)}
              </text>
            </g>
          )}

          {/* Dynamic Time Badge on Bottom X-Axis */}
          {(() => {
            const badgeText = formatTimelineLabel(currentActivePoint.time || currentActivePoint.timestamp, isMultiDay);
            const badgeW = isMultiDay ? 94 : 54;
            return (
              <g transform={`translate(${Math.max(padding.left, Math.min(padding.left + graphWidth - badgeW, currentActivePoint.x - badgeW / 2))}, ${chartH - 22})`}>
                <rect width={badgeW} height="18" rx="4" fill="#1c160c" stroke="rgba(255,255,255,0.45)" strokeWidth="0.9" />
                <text x={badgeW / 2} y="13" textAnchor="middle" fill="#ffffff" fontSize="9" fontFamily="monospace" fontWeight="bold" className="tabular-nums">
                  {badgeText}
                </text>
              </g>
            );
          })()}
        </g>
      )}

      {/* X-Axis Timeline Timestamps */}
      {allPoints.length > 0 && (
        <g className="text-slate-400 text-[9.5px] font-mono tabular-nums" fill="#94a3b8">
          <text x={padding.left} y={chartH - 8} textAnchor="start">
            {formatTimelineLabel(allPoints[0].time || allPoints[0].timestamp, isMultiDay)}
          </text>
          {allPoints[Math.floor(allPoints.length / 2)] && (
            <text x={allPoints[Math.floor(allPoints.length / 2)].x} y={chartH - 8} textAnchor="middle">
              {formatTimelineLabel(allPoints[Math.floor(allPoints.length / 2)].time || allPoints[Math.floor(allPoints.length / 2)].timestamp, isMultiDay)}
            </text>
          )}
          <text x={padding.left + graphWidth} y={chartH - 8} textAnchor="end">
            {formatTimelineLabel(allPoints[allPoints.length - 1].time || allPoints[allPoints.length - 1].timestamp, isMultiDay)}
          </text>
        </g>
      )}
    </g>
  );
}
