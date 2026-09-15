import React from "react";

export function EquityCrosshairReticle({
  activePoint,
  activePointIndex,
  equityPoints,
  isProfitable,
  width,
  height,
  getX,
  getY
}) {
  return (
    <>
      {/* Active Hover Crosshair & Reticle */}
      {activePoint && activePointIndex !== null && (
        <g>
          <line
            x1={getX(activePointIndex)}
            y1="0"
            x2={getX(activePointIndex)}
            y2={height}
            stroke="rgba(255, 255, 255, 0.35)"
            strokeWidth="1.2"
            strokeDasharray="3 3"
          />
          <circle
            cx={getX(activePointIndex)}
            cy={getY(activePoint.capital)}
            r="12"
            fill={activePoint.isWin ? "rgba(16, 185, 129, 0.35)" : "rgba(244, 63, 94, 0.35)"}
            className="animate-pulse"
          />
          <circle
            cx={getX(activePointIndex)}
            cy={getY(activePoint.capital)}
            r="6"
            fill={activePoint.isWin ? "#10b981" : "#f43f5e"}
            stroke="#ffffff"
            strokeWidth="2.5"
          />
        </g>
      )}

      {/* Terminal Live Radar Beacon when not hovered */}
      {activePoint === null && equityPoints.length > 0 && (
        <g>
          <circle
            cx={width}
            cy={getY(equityPoints[equityPoints.length - 1].capital)}
            r="12"
            fill={isProfitable ? "rgba(16, 185, 129, 0.35)" : "rgba(244, 63, 94, 0.35)"}
            className="animate-ping"
          />
          <circle
            cx={width}
            cy={getY(equityPoints[equityPoints.length - 1].capital)}
            r="5"
            fill={isProfitable ? "#10b981" : "#f43f5e"}
            stroke="#ffffff"
            strokeWidth="2"
          />
        </g>
      )}
    </>
  );
}
