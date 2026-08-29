import React from "react";

export function Sparkline({ points = [], isGain = true, width = 54, height = 20, className }) {
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
  const coords = points.map((val, idx) => {
    const x = 2 + idx * stepX;
    const y = height - 2 - ((val - min) / range) * (height - 6);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const pathD = `M ${coords.join(" L ")}`;
  const areaD = `${pathD} L ${width - 2},${height} L 2,${height} Z`;

  return (
    <svg width={width} height={height} className={className} viewBox={`0 0 ${width} ${height}`} fill="none">
      <path d={areaD} fill={fillColor} />
      <path d={pathD} stroke={strokeColor} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
