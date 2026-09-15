import React from "react";

export function PortfolioNavSplineChart({
  svgWidth = 680,
  svgHeight = 175,
  paddingY = 24,
  splinePath,
  splineAreaPath,
  navPoints,
  getX,
  getY,
  hoverIndex,
  setHoverIndex,
  onScrub,
}) {
  return (
    <div className="relative w-full h-44 pt-2">
      <svg
        className="w-full h-full overflow-visible select-none touch-none"
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        preserveAspectRatio="none"
        onMouseLeave={() => setHoverIndex(null)}
      >
        <defs>
          <linearGradient id="appleSpatialNavGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00d5ff" stopOpacity="0.32" />
            <stop offset="60%" stopColor="#00f5c4" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#060709" stopOpacity="0.0" />
          </linearGradient>
          <linearGradient id="appleNavStrokeGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#168fff" />
            <stop offset="50%" stopColor="#00d5ff" />
            <stop offset="100%" stopColor="#00f5c4" />
          </linearGradient>
        </defs>

        {/* Area Gradient Fill */}
        <path d={splineAreaPath} fill="url(#appleSpatialNavGradient)" />

        {/* Glowing Smooth Spline Curve */}
        <path
          d={splinePath}
          fill="none"
          stroke="url(#appleNavStrokeGradient)"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Interactive Laser Crosshair on Hover */}
        {hoverIndex !== null && (
          <line
            x1={getX(hoverIndex)}
            y1={paddingY}
            x2={getX(hoverIndex)}
            y2={svgHeight}
            stroke="#38bdf8"
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />
        )}

        {/* Micro Data Nodes along curve */}
        {navPoints.map((val, idx) => {
          const x = getX(idx);
          const y = getY(val);
          const isHovered = hoverIndex === idx;

          return (
            <g
              key={idx}
              className="cursor-pointer"
              onMouseEnter={() => {
                onScrub?.();
                setHoverIndex(idx);
              }}
            >
              {/* Generous touch target */}
              <circle cx={x} cy={y} r="16" fill="transparent" />

              {/* Core Node */}
              <circle
                cx={x}
                cy={y}
                r={isHovered ? 6 : 2}
                fill={isHovered ? "#00f5c4" : "#00d5ff"}
                stroke="#060709"
                strokeWidth={isHovered ? 2.5 : 1}
                className="transition-all duration-150"
              />

              {/* Outer Glow Halo on Hover */}
              {isHovered && (
                <circle cx={x} cy={y} r={12} fill="#00f5c4" opacity={0.3} className="animate-ping" />
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
