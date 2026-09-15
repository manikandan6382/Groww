import React from 'react';

export function SvgGridAndRiskZones({
  padding,
  graphWidth,
  graphHeight,
  activeWatermarkPnl,
  flightScope,
  stopLoss,
  stopY,
  entryY,
  oneRY,
  isMobile
}) {
  return (
    <g className="grid-and-risk-zones">
      {/* 🏆 LIVE DYNAMIC P&L WATERMARK */}
      <text
        x={padding.left + graphWidth / 2}
        y={padding.top + graphHeight / 2 + 16}
        textAnchor="middle"
        fill={activeWatermarkPnl >= 0 ? "#10b981" : "#f43f5e"}
        fillOpacity="0.06"
        fontSize={isMobile ? "46" : "68"}
        fontFamily="monospace"
        fontWeight="900"
        className="pointer-events-none select-none tabular-nums tracking-tighter"
      >
        {activeWatermarkPnl >= 0 ? "+" : ""}₹{Math.abs(activeWatermarkPnl).toFixed(2)}
      </text>

      {/* 🛡️ R-MULTIPLE RISK ZONES SHADING */}
      {flightScope === 'scalp' && stopLoss !== null && stopY !== null && (
        <rect
          x={padding.left}
          y={Math.min(entryY, stopY)}
          width={graphWidth}
          height={Math.max(2, Math.abs(entryY - stopY))}
          fill="#f43f5e"
          fillOpacity="0.035"
          stroke="#f43f5e"
          strokeOpacity="0.12"
          strokeDasharray="2 4"
          className="pointer-events-none"
        />
      )}

      {flightScope === 'scalp' && oneRY !== null && (
        <rect
          x={padding.left}
          y={Math.min(entryY, oneRY)}
          width={graphWidth}
          height={Math.max(2, Math.abs(entryY - oneRY))}
          fill="#f59e0b"
          fillOpacity="0.035"
          stroke="rgba(255,255,255,0.45)"
          strokeOpacity="0.12"
          strokeDasharray="2 4"
          className="pointer-events-none"
        />
      )}

      {/* Faint Horizontal Scale Gridlines */}
      {[0.25, 0.5, 0.75].map((fraction, idx) => {
        const gridY = padding.top + fraction * graphHeight;
        return (
          <line
            key={idx}
            x1={padding.left}
            y1={gridY}
            x2={padding.left + graphWidth}
            y2={gridY}
            stroke="rgba(255,255,255,0.04)"
            strokeDasharray="4 6"
            strokeWidth="1"
          />
        );
      })}
    </g>
  );
}
