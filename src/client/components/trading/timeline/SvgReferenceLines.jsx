import React from 'react';
import { SvgGridAndRiskZones } from './SvgGridAndRiskZones';

export function SvgReferenceLines({
  padding,
  graphWidth,
  graphHeight,
  activeWatermarkPnl,
  flightScope,
  stopLoss,
  stopY,
  entryY,
  oneRY,
  targetPrice,
  targetY,
  netZeroPrice,
  netZeroY,
  entryPrice,
  isMobile
}) {
  return (
    <g className="reference-lines-group">
      <SvgGridAndRiskZones
        padding={padding}
        graphWidth={graphWidth}
        graphHeight={graphHeight}
        activeWatermarkPnl={activeWatermarkPnl}
        flightScope={flightScope}
        stopLoss={stopLoss}
        stopY={stopY}
        entryY={entryY}
        oneRY={oneRY}
        isMobile={isMobile}
      />

      {/* 🟢 1. TARGET PRICE LEVEL */}
      {flightScope === 'scalp' && targetPrice !== null && targetY !== null && (
        <g className="transition-all duration-300">
          <line x1={padding.left} y1={targetY} x2={padding.left + graphWidth} y2={targetY} stroke="#10b981" strokeDasharray="4 4" strokeWidth="1.6" strokeOpacity="0.85" />
          {!isMobile ? (
            <g transform={`translate(${padding.left + graphWidth + 8}, ${targetY - 11})`}>
              <rect width="96" height="22" rx="7" fill="#064e3b" stroke="#10b981" strokeOpacity="0.7" />
              <text x="7" y="15" fill="#a7f3d0" fontSize="10" fontFamily="monospace" fontWeight="bold" className="tabular-nums">🎯 TP ₹{targetPrice.toFixed(1)}</text>
            </g>
          ) : (
            <text x={padding.left + 4} y={targetY - 4} fill="#a7f3d0" fontSize="9" fontFamily="monospace" fontWeight="bold">TP ₹{targetPrice.toFixed(1)}</text>
          )}
        </g>
      )}

      {/* ⚖️ 2. FRICTION-ADJUSTED TRUE BREAKEVEN LINE */}
      {flightScope === 'scalp' && netZeroY > 0 && Math.abs(netZeroY - entryY) > 2 && (
        <g className="transition-all duration-300 opacity-80">
          <line x1={padding.left} y1={netZeroY} x2={padding.left + graphWidth} y2={netZeroY} stroke="rgba(255,255,255,0.45)" strokeDasharray="2 3" strokeWidth="1.2" />
          {!isMobile && (
            <g transform={`translate(${padding.left + graphWidth + 8}, ${netZeroY - 9})`}>
              <rect width="96" height="19" rx="5" fill="#451a03" stroke="rgba(255,255,255,0.45)" strokeOpacity="0.5" />
              <text x="6" y="13.5" fill="#cbd5e1" fontSize="9" fontFamily="monospace" className="tabular-nums">BE ₹{netZeroPrice.toFixed(1)}</text>
            </g>
          )}
        </g>
      )}

      {/* 🔵 3. ENTRY PRICE LEVEL BASELINE */}
      <g className="transition-all duration-300">
        <line x1={padding.left} y1={entryY} x2={padding.left + graphWidth} y2={entryY} stroke="rgba(255,255,255,0.45)" strokeWidth="1.6" strokeOpacity="0.85" />
        {!isMobile ? (
          <g transform={`translate(${padding.left + graphWidth + 8}, ${entryY - 11})`}>
            <rect width="96" height="22" rx="7" fill="#261b0a" stroke="rgba(255,255,255,0.45)" strokeOpacity="0.7" />
            <text x="7" y="15" fill="#ffffff" fontSize="10" fontFamily="monospace" fontWeight="bold" className="tabular-nums">⚡ EP ₹{entryPrice.toFixed(1)}</text>
          </g>
        ) : (
          <text x={padding.left + 4} y={entryY - 4} fill="#ffffff" fontSize="9" fontFamily="monospace" fontWeight="bold">EP ₹{entryPrice.toFixed(1)}</text>
        )}
      </g>

      {/* 🔴 4. STOP LOSS LEVEL */}
      {flightScope === 'scalp' && stopLoss !== null && stopY !== null && (
        <g className="transition-all duration-300">
          <line x1={padding.left} y1={stopY} x2={padding.left + graphWidth} y2={stopY} stroke="#f43f5e" strokeDasharray="4 4" strokeWidth="1.6" strokeOpacity="0.85" />
          {!isMobile ? (
            <g transform={`translate(${padding.left + graphWidth + 8}, ${stopY - 11})`}>
              <rect width="96" height="22" rx="7" fill="#881337" stroke="#f43f5e" strokeOpacity="0.7" />
              <text x="7" y="15" fill="#fecdd3" fontSize="10" fontFamily="monospace" fontWeight="bold" className="tabular-nums">🛑 SL ₹{stopLoss.toFixed(1)}</text>
            </g>
          ) : (
            <text x={padding.left + 4} y={stopY + 13} fill="#fecdd3" fontSize="9" fontFamily="monospace" fontWeight="bold">SL ₹{stopLoss.toFixed(1)}</text>
          )}
        </g>
      )}
    </g>
  );
}
