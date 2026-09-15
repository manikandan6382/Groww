import React from "react";

export function LifecycleScrubberOverlay({
  activePoint,
  padding,
  height,
  containerWidth
}) {
  if (!activePoint) return null;

  return (
    <g>
      <line
        x1={activePoint.x}
        y1={padding.top}
        x2={activePoint.x}
        y2={height - padding.bottom}
        stroke="#38bdf8"
        strokeDasharray="2 2"
        strokeWidth="1.2"
      />
      <circle
        cx={activePoint.x}
        cy={activePoint.y}
        r="5"
        fill="#38bdf8"
        stroke="#ffffff"
        strokeWidth="2"
        className="shadow-lg"
      />

      <g transform={`translate(${Math.max(10, Math.min(activePoint.x - 30, containerWidth - 70))}, ${activePoint.y > 60 ? activePoint.y - 24 : activePoint.y + 12})`}>
        <rect width="60" height="16" rx="4" fill="#030712" fillOpacity="0.9" stroke="#38bdf8" strokeWidth="1" />
        <text x="30" y="11.5" textAnchor="middle" fill="#38bdf8" fontSize="8.5" fontFamily="monospace" fontWeight="bold">
          ₹{activePoint.close.toFixed(1)}
        </text>
      </g>
    </g>
  );
}
