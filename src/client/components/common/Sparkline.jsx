import React, { useState, useRef } from "react";

export function Sparkline({ 
  points = [], 
  isGain = true, 
  width = 54, 
  height = 20, 
  className = "",
  prefix = "₹",
  suffix = "",
  interactive = true 
}) {
  const [hoverIndex, setHoverIndex] = useState(null);
  const svgRef = useRef(null);

  if (!points || points.length < 2) {
    // Generate gentle realistic trend points
    points = isGain ? [10, 12, 11, 15, 14, 18, 19] : [19, 16, 17, 14, 15, 12, 10];
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  const strokeColor = isGain ? "#34d399" : "#fb7185";
  const fillColor = isGain ? "rgba(52, 211, 153, 0.15)" : "rgba(251, 113, 133, 0.15)";

  const stepX = (width - 4) / (points.length - 1);
  const pointCoords = points.map((val, idx) => {
    const x = 2 + idx * stepX;
    const y = height - 2 - ((val - min) / range) * (height - 6);
    return { x, y, val };
  });

  const pathD = `M ${pointCoords.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" L ")}`;
  const areaD = `${pathD} L ${(width - 2).toFixed(1)},${height} L 2,${height} Z`;

  const handlePointerMove = (e) => {
    if (!interactive || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const ratio = x / rect.width;
    const idx = Math.min(points.length - 1, Math.max(0, Math.round(ratio * (points.length - 1))));
    setHoverIndex(idx);
  };

  const handlePointerLeave = () => {
    setHoverIndex(null);
  };

  const activePoint = hoverIndex !== null ? pointCoords[hoverIndex] : null;

  return (
    <div 
      className={`relative inline-block ${className}`}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <svg 
        ref={svgRef} 
        width={width} 
        height={height} 
        viewBox={`0 0 ${width} ${height}`} 
        fill="none"
        className="overflow-visible"
      >
        <path d={areaD} fill={fillColor} />
        <path d={pathD} stroke={strokeColor} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        
        {/* Magnetic Hover Dot */}
        {activePoint && (
          <g>
            <circle
              cx={activePoint.x}
              cy={activePoint.y}
              r="3.5"
              fill={strokeColor}
              className="animate-ping opacity-75"
            />
            <circle
              cx={activePoint.x}
              cy={activePoint.y}
              r="3"
              fill="#ffffff"
              stroke={strokeColor}
              strokeWidth="1.5"
            />
          </g>
        )}
      </svg>

      {/* Floating Micro Tooltip */}
      {activePoint && interactive && (
        <div 
          className="absolute -top-7 pointer-events-none -translate-x-1/2 px-1.5 py-0.5 rounded bg-black/90 border border-white/20 text-[9px] font-mono font-bold text-white shadow-lg whitespace-nowrap z-30"
          style={{ left: `${(activePoint.x / width) * 100}%` }}
        >
          {prefix}{typeof activePoint.val === "number" ? activePoint.val.toFixed(1) : activePoint.val}{suffix}
        </div>
      )}
    </div>
  );
}
