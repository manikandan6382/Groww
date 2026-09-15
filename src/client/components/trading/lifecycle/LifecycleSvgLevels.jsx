import React from "react";

export function LifecycleSvgLevels({
  targetPrice,
  targetY,
  entryPrice,
  entryY,
  netZeroPrice,
  netZeroY,
  stopLoss,
  stopY,
  exitY,
  isTrailed,
  isMobile,
  padding,
  graphWidth
}) {
  return (
    <>
      {/* 🟢 1. TARGET PRICE LEVEL */}
      {targetPrice !== null && targetY !== null && (
        <g className="transition-all duration-300">
          <rect
            x={padding.left}
            y={Math.min(targetY, entryY)}
            width={graphWidth}
            height={Math.abs(targetY - entryY)}
            fill="rgba(16, 185, 129, 0.025)"
          />
          <line
            x1={padding.left}
            y1={targetY}
            x2={padding.left + graphWidth}
            y2={targetY}
            stroke="#10b981"
            strokeDasharray="4 4"
            strokeWidth="1.5"
            strokeOpacity="0.85"
          />
          {!isMobile ? (
            <g transform={`translate(${padding.left + graphWidth + 6}, ${targetY - 10})`}>
              <rect width="84" height="20" rx="6" fill="#064e3b" stroke="#10b981" strokeOpacity="0.5" />
              <text x="6" y="14" fill="#a7f3d0" fontSize="9.5" fontFamily="monospace" fontWeight="bold">
                TP ₹{targetPrice.toFixed(1)}
              </text>
            </g>
          ) : (
            <text x={padding.left + 4} y={targetY - 4} fill="#a7f3d0" fontSize="8.5" fontFamily="monospace" fontWeight="bold">
              TP ₹{targetPrice.toFixed(1)}
            </text>
          )}
        </g>
      )}

      {/* ⚖️ 2. FRICTION-ADJUSTED TRUE BREAKEVEN LINE */}
      {netZeroY > 0 && Math.abs(netZeroY - entryY) > 2 && (
        <g className="transition-all duration-300 opacity-80">
          <line
            x1={padding.left}
            y1={netZeroY}
            x2={padding.left + graphWidth}
            y2={netZeroY}
            stroke="#f59e0b"
            strokeDasharray="2 3"
            strokeWidth="1.2"
          />
          {!isMobile && (
            <g transform={`translate(${padding.left + graphWidth + 6}, ${netZeroY - 10})`}>
              <rect width="84" height="18" rx="5" fill="#451a03" stroke="#f59e0b" strokeOpacity="0.4" />
              <text x="6" y="12.5" fill="#fde68a" fontSize="8.5" fontFamily="monospace">
                BE ₹{netZeroPrice.toFixed(1)}
              </text>
            </g>
          )}
        </g>
      )}

      {/* 🔵 3. ENTRY PRICE BASELINE */}
      <g className="transition-all duration-300">
        <line
          x1={padding.left}
          y1={entryY}
          x2={padding.left + graphWidth}
          y2={entryY}
          stroke="#06b6d4"
          strokeWidth="1.5"
          strokeOpacity="0.8"
        />
        {!isMobile ? (
          <g transform={`translate(${padding.left + graphWidth + 6}, ${entryY - 10})`}>
            <rect width="84" height="20" rx="6" fill="#164e63" stroke="#06b6d4" strokeOpacity="0.5" />
            <text x="6" y="14" fill="#cffafe" fontSize="9.5" fontFamily="monospace" fontWeight="bold">
              EP ₹{entryPrice.toFixed(1)}
            </text>
          </g>
        ) : (
          <text x={padding.left + 4} y={entryY - 4} fill="#cffafe" fontSize="8.5" fontFamily="monospace" fontWeight="bold">
            EP ₹{entryPrice.toFixed(1)}
          </text>
        )}
      </g>

      {/* 🔴 4. STOP LOSS LEVEL */}
      {stopLoss !== null && stopY !== null && (
        <g className="transition-all duration-300">
          {isTrailed ? (
            <path
              d={`M ${padding.left} ${stopY} L ${padding.left + graphWidth * 0.5} ${stopY} L ${padding.left + graphWidth * 0.5} ${exitY} L ${padding.left + graphWidth} ${exitY}`}
              fill="none"
              stroke="#f43f5e"
              strokeDasharray="4 4"
              strokeWidth="1.6"
              strokeOpacity="0.9"
            />
          ) : (
            <line
              x1={padding.left}
              y1={stopY}
              x2={padding.left + graphWidth}
              y2={stopY}
              stroke="#f43f5e"
              strokeDasharray="4 4"
              strokeWidth="1.5"
              strokeOpacity="0.85"
            />
          )}

          {!isMobile ? (
            <g transform={`translate(${padding.left + graphWidth + 6}, ${stopY - 10})`}>
              <rect width="84" height="20" rx="6" fill="#881337" stroke="#f43f5e" strokeOpacity="0.5" />
              <text x="6" y="14" fill="#fecdd3" fontSize="9.5" fontFamily="monospace" fontWeight="bold">
                SL ₹{stopLoss.toFixed(1)}
              </text>
            </g>
          ) : (
            <text x={padding.left + 4} y={stopY + 12} fill="#fecdd3" fontSize="8.5" fontFamily="monospace" fontWeight="bold">
              SL ₹{stopLoss.toFixed(1)}
            </text>
          )}
        </g>
      )}
    </>
  );
}
