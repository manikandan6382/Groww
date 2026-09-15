import React from 'react';

export function SvgSplineAndCandles({
  flightScope,
  exitPoint,
  padding,
  graphWidth,
  graphHeight,
  bottomBaseY,
  exitPrice,
  isMobile,
  allPoints = [],
  renderedPoints = [],
  terminalIntrinsic = 0,
  chartMode,
  isShort,
  areaPath,
  splinePath,
  profitAreaGradId,
  lossAreaGradId,
  pathStrokeGradId,
  glowFilterId,
  clipAboveId,
  clipBelowId
}) {
  return (
    <g className="spline-candles-layer">
      {/* ⚡ Dual-Zone Visual Seam & Directional Badges (In Extended Expiry Views) */}
      {flightScope !== 'scalp' && exitPoint && (
        <g className="transition-all duration-300">
          <rect
            x={padding.left}
            y={padding.top}
            width={Math.max(0, exitPoint.x - padding.left)}
            height={graphHeight}
            fill="#0284c7"
            fillOpacity="0.035"
            className="pointer-events-none"
          />
          <text
            x={padding.left + 8}
            y={padding.top + 13}
            fill="#38bdf8"
            fillOpacity="0.8"
            fontSize={isMobile ? "8" : "9"}
            fontFamily="monospace"
            fontWeight="bold"
            className="pointer-events-none select-none tracking-wider"
          >
            ◀ EXECUTION ZONE (44% ZOOM)
          </text>
          <text
            x={exitPoint.x + 8}
            y={padding.top + 13}
            fill="#94a3b8"
            fillOpacity="0.75"
            fontSize={isMobile ? "8" : "9"}
            fontFamily="monospace"
            fontWeight="bold"
            className="pointer-events-none select-none tracking-wider"
          >
            POST-EXIT DRIFT ▶
          </text>
          <line
            x1={exitPoint.x}
            y1={padding.top}
            x2={exitPoint.x}
            y2={bottomBaseY}
            stroke="#38bdf8"
            strokeDasharray="4 4"
            strokeWidth="1.5"
            strokeOpacity="0.8"
          />
          <g transform={`translate(${Math.min(padding.left + graphWidth - 120, Math.max(padding.left + 5, exitPoint.x - 60))}, ${padding.top + 20})`}>
            <rect width="120" height="20" rx="6" fill="#082f49" stroke="#38bdf8" strokeOpacity="0.8" />
            <text x="60" y="14" textAnchor="middle" fill="#7dd3fc" fontSize="9.5" fontFamily="monospace" fontWeight="bold">
              ⚡ Exit @ ₹{exitPrice.toFixed(1)}
            </text>
          </g>
        </g>
      )}

      {/* 🏁 Terminal Expiry Settlement Value Marker */}
      {flightScope !== 'scalp' && allPoints.length > 0 && (
        <g className="transition-all duration-300">
          <g transform={`translate(${padding.left + graphWidth - 130}, ${bottomBaseY - 26})`}>
            <rect width="126" height="22" rx="6" fill={terminalIntrinsic > 0 ? "#064e3b" : "#4c0519"} stroke={terminalIntrinsic > 0 ? "#10b981" : "#f43f5e"} strokeOpacity="0.8" />
            <text x="63" y="15" textAnchor="middle" fill={terminalIntrinsic > 0 ? "#a7f3d0" : "#fecdd3"} fontSize="9.5" fontFamily="monospace" fontWeight="bold">
              🏁 {flightScope === 'day' || flightScope === 'expiry' ? '15:30' : flightScope === 'week' ? 'Wk Exp' : 'Mo Exp'}: ₹{Number(terminalIntrinsic || 0).toFixed(1)}
            </text>
          </g>
        </g>
      )}

      {/* DUAL VIEW ENGINE: 'spline' VS 'candles' */}
      {chartMode === 'spline' ? (
        <>
          {!isShort ? (
            <>
              <path d={areaPath} fill={`url(#${profitAreaGradId})`} clipPath={`url(#${clipAboveId})`} />
              <path d={areaPath} fill={`url(#${lossAreaGradId})`} clipPath={`url(#${clipBelowId})`} />
            </>
          ) : (
            <>
              <path d={areaPath} fill={`url(#${profitAreaGradId})`} clipPath={`url(#${clipBelowId})`} />
              <path d={areaPath} fill={`url(#${lossAreaGradId})`} clipPath={`url(#${clipAboveId})`} />
            </>
          )}
          <path
            d={splinePath}
            fill="none"
            stroke={`url(#${pathStrokeGradId})`}
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter={`url(#${glowFilterId})`}
          />
        </>
      ) : (
        <g className="candlesticks-layer" shapeRendering="crispEdges">
          {renderedPoints.map((pt, i) => {
            const candleW = Math.max(3, Math.min(10, (graphWidth / allPoints.length) * 0.60));
            const bodyTop = Math.min(pt.openY, pt.y);
            const bodyHeight = Math.max(2, Math.abs(pt.openY - pt.y));
            return (
              <g key={`candle-${i}`} className="transition-opacity duration-150">
                <line x1={pt.x} y1={pt.highY} x2={pt.x} y2={pt.lowY} stroke={pt.isBullish ? "#10b981" : "#f43f5e"} strokeWidth="1.2" strokeOpacity="0.8" />
                <rect
                  x={pt.x - candleW / 2}
                  y={bodyTop}
                  width={candleW}
                  height={bodyHeight}
                  rx={1}
                  fill={pt.isBullish ? "#10b981" : "#f43f5e"}
                  fillOpacity="0.85"
                  stroke={pt.isBullish ? "#34d399" : "#fb7185"}
                  strokeWidth="0.8"
                />
              </g>
            );
          })}
        </g>
      )}
    </g>
  );
}
