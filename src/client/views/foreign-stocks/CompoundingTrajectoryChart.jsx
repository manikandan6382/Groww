import React, { useState } from "react";
import clsx from "clsx";
import { TrendingUp, Layers, Check } from "lucide-react";
import { soundEngine } from "../../utils/soundEngine";

/**
 * 🍏 Master Compounding Trajectory Chart
 * Renders an SVG dynamic hockey-stick exponential growth curve vs. NIFTY 50 and Bank FD baselines
 * with interactive curve isolate/compare toggles and responsive clamped hover tooltips.
 */
export function CompoundingTrajectoryChart({
  trajectoryData = [],
  simYears = 3,
  stockSymbol = "NVDA",
  activeSimCagr = 15,
  activeFxAlpha = 3.5,
  isPullback = false
}) {
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [visibleCurves, setVisibleCurves] = useState({
    us: true,
    nifty: true,
    fd: true,
  });

  const toggleCurve = (key) => {
    setVisibleCurves((prev) => {
      const activeCount = Object.values(prev).filter(Boolean).length;
      // Guard: keep at least 1 curve visible
      if (prev[key] && activeCount === 1) return prev;
      soundEngine.playTabSwitchTone();
      return { ...prev, [key]: !prev[key] };
    });
  };

  if (!trajectoryData || trajectoryData.length < 2) return null;

  // Chart dimensions
  const width = 500;
  const height = 185;
  const padding = { top: 20, right: 30, bottom: 30, left: 55 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  // Find max value across active visible curves (with 1,000 floor to prevent division by zero)
  const maxVal = Math.max(
    1000,
    ...trajectoryData.map((d) => {
      const candidates = [1000];
      if (visibleCurves.us && Number.isFinite(d.usValue)) candidates.push(d.usValue);
      if (visibleCurves.nifty && Number.isFinite(d.niftyValue)) candidates.push(d.niftyValue);
      if (visibleCurves.fd && Number.isFinite(d.fdValue)) candidates.push(d.fdValue);
      if (Number.isFinite(d.invested)) candidates.push(d.invested);
      return Math.max(...candidates);
    })
  );

  // Coordinate mapping functions
  const getX = (index) => {
    return padding.left + (index / (trajectoryData.length - 1)) * plotWidth;
  };

  const getY = (val) => {
    const cleanVal = Number.isFinite(val) ? Math.max(0, val) : 0;
    return padding.top + plotHeight - (cleanVal / (maxVal || 1000)) * plotHeight;
  };

  // Generate SVG path commands with smooth cubic Bézier curves
  const generateBezierPath = (key) => {
    if (trajectoryData.length < 2) return "";
    let d = `M ${getX(0)} ${getY(trajectoryData[0][key])}`;
    for (let i = 0; i < trajectoryData.length - 1; i++) {
      const x0 = getX(i);
      const y0 = getY(trajectoryData[i][key]);
      const x1 = getX(i + 1);
      const y1 = getY(trajectoryData[i + 1][key]);
      const cpx1 = x0 + (x1 - x0) / 2;
      const cpy1 = y0;
      const cpx2 = x0 + (x1 - x0) / 2;
      const cpy2 = y1;
      d += ` C ${cpx1} ${cpy1}, ${cpx2} ${cpy2}, ${x1} ${y1}`;
    }
    return d;
  };

  const usPath = generateBezierPath("usValue");
  const fdPath = generateBezierPath("fdValue");
  const niftyPath = generateBezierPath("niftyValue");

  // Closed area path for US asset gradient
  const usAreaPath = `${usPath} L ${getX(trajectoryData.length - 1)} ${padding.top + plotHeight} L ${getX(0)} ${padding.top + plotHeight} Z`;

  // Format currency for axis and tooltip
  const formatInrShort = (num) => {
    if (!num || num <= 0) return "₹0";
    if (num >= 10000000) return `₹${(num / 10000000).toFixed(1)}Cr`;
    if (num >= 100000) return `₹${(num / 100000).toFixed(1)}L`;
    if (num >= 1000) return `₹${(num / 1000).toFixed(0)}K`;
    return `₹${num.toFixed(0)}`;
  };

  const activePoint = hoveredPoint || trajectoryData[trajectoryData.length - 1];

  return (
    <div className="p-4 rounded-2xl bg-[#090b10]/90 border border-white/10 backdrop-blur-xl space-y-3 relative overflow-hidden">
      {/* Glow highlight */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Chart Top Bar: Interactive Legend Chips & Milestone Readout */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-2 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          {/* US Titan Curve Toggle */}
          <button
            type="button"
            onClick={() => toggleCurve("us")}
            title="Toggle US Titan curve"
            className={clsx(
              "flex items-center gap-1.5 font-mono text-[11px] px-2 py-1 rounded-lg border transition cursor-pointer active:scale-95",
              visibleCurves.us
                ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-200 shadow-[0_0_12px_rgba(16,185,129,0.15)]"
                : "bg-white/[0.02] border-white/5 text-slate-500 opacity-60 hover:opacity-100"
            )}
          >
            <span className={clsx(
              "w-2 h-2 rounded-full transition-all",
              visibleCurves.us ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" : "bg-slate-600"
            )} />
            <strong className="font-bold">{stockSymbol} + FX</strong>
            {visibleCurves.us && <Check className="w-2.5 h-2.5 text-emerald-400" />}
          </button>

          {/* NIFTY 50 Curve Toggle */}
          <button
            type="button"
            onClick={() => toggleCurve("nifty")}
            title="Toggle NIFTY 50 curve"
            className={clsx(
              "flex items-center gap-1.5 font-mono text-[11px] px-2 py-1 rounded-lg border transition cursor-pointer active:scale-95",
              visibleCurves.nifty
                ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.15)]"
                : "bg-white/[0.02] border-white/5 text-slate-500 opacity-60 hover:opacity-100"
            )}
          >
            <span className={clsx(
              "w-2 h-2 rounded-full transition-all",
              visibleCurves.nifty ? "bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.8)]" : "bg-slate-600"
            )} />
            <span>NIFTY 50 (12.5%)</span>
            {visibleCurves.nifty && <Check className="w-2.5 h-2.5 text-cyan-400" />}
          </button>

          {/* Bank FD Curve Toggle */}
          <button
            type="button"
            onClick={() => toggleCurve("fd")}
            title="Toggle Bank FD curve"
            className={clsx(
              "flex items-center gap-1.5 font-mono text-[11px] px-2 py-1 rounded-lg border transition cursor-pointer active:scale-95",
              visibleCurves.fd
                ? "bg-white/10 border-white/20 text-slate-200 shadow-sm"
                : "bg-white/[0.02] border-white/5 text-slate-500 opacity-60 hover:opacity-100"
            )}
          >
            <span className={clsx(
              "w-2 h-2 rounded-full transition-all",
              visibleCurves.fd ? "bg-slate-400" : "bg-slate-600"
            )} />
            <span>Bank FD (6.5%)</span>
            {visibleCurves.fd && <Check className="w-2.5 h-2.5 text-slate-300" />}
          </button>
        </div>

        {/* Milestone Readout */}
        <div className="flex items-center gap-2 font-mono text-xs self-end sm:self-auto">
          <span className="text-[10px] text-slate-400 font-bold uppercase">
            {activePoint.year === 0 ? "Start" : `Yr ${activePoint.year}`}:
          </span>
          <span className="font-black text-emerald-300 tabular-nums">
            {formatInrShort(activePoint.usValue)}
          </span>
          {activePoint.year > 0 && activePoint.usValue > activePoint.fdValue && (
            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              +{formatInrShort(activePoint.usValue - activePoint.fdValue)} vs FD
            </span>
          )}
        </div>
      </div>

      {/* SVG Chart */}
      <div className="w-full relative">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible select-none"
        >
          <defs>
            <linearGradient id="usTrajectoryGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.32" />
              <stop offset="70%" stopColor="#06b6d4" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
            </linearGradient>
            <filter id="emeraldGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#34d399" floodOpacity="0.6" />
            </filter>
            <filter id="tooltipGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#000000" floodOpacity="0.75" />
            </filter>
          </defs>

          {/* Grid lines (horizontal) */}
          {[0.25, 0.5, 0.75, 1].map((pct) => {
            const y = padding.top + plotHeight - pct * plotHeight;
            const val = maxVal * pct;
            return (
              <g key={pct}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="rgba(255,255,255,0.06)"
                  strokeDasharray="3 3"
                />
                <text
                  x={padding.left - 8}
                  y={y + 3}
                  textAnchor="end"
                  className="text-[8px] font-mono fill-slate-500 font-semibold"
                >
                  {formatInrShort(val)}
                </text>
              </g>
            );
          })}

          {/* Y-axis baseline */}
          <line
            x1={padding.left}
            y1={padding.top + plotHeight}
            x2={width - padding.right}
            y2={padding.top + plotHeight}
            stroke="rgba(255,255,255,0.12)"
          />

          {/* Baseline Area for US Curve */}
          {visibleCurves.us && (
            <path d={usAreaPath} fill="url(#usTrajectoryGradient)" />
          )}

          {/* Bank FD Line (Muted Dashed) */}
          {visibleCurves.fd && (
            <path
              d={fdPath}
              fill="none"
              stroke="#94a3b8"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              opacity="0.6"
            />
          )}

          {/* NIFTY 50 Line */}
          {visibleCurves.nifty && (
            <path
              d={niftyPath}
              fill="none"
              stroke="#06b6d4"
              strokeWidth="1.75"
              opacity="0.75"
            />
          )}

          {/* US Asset + USD Alpha Hero Line */}
          {visibleCurves.us && (
            <path
              d={usPath}
              fill="none"
              stroke="#34d399"
              strokeWidth="2.5"
              filter="url(#emeraldGlow)"
            />
          )}

          {/* X-Axis Milestone Markers & Interactive Hit Targets */}
          {trajectoryData.map((pt, idx) => {
            const cx = getX(idx);
            const cy = getY(pt.usValue);
            const isHovered = hoveredPoint?.year === pt.year;

            return (
              <g key={pt.year}>
                {/* Milestone Tick text */}
                <text
                  x={cx}
                  y={padding.top + plotHeight + 16}
                  textAnchor="middle"
                  className={clsx(
                    "text-[9px] font-mono font-bold transition-colors",
                    isHovered ? "fill-emerald-300 font-black" : "fill-slate-500"
                  )}
                >
                  {pt.label}
                </text>

                {/* Vertical hover guide line */}
                {isHovered && (
                  <line
                    x1={cx}
                    y1={padding.top}
                    x2={cx}
                    y2={padding.top + plotHeight}
                    stroke="rgba(52,211,153,0.35)"
                    strokeDasharray="2 2"
                  />
                )}

                {/* Point circle on US curve */}
                {visibleCurves.us && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isHovered ? 5.5 : 3.5}
                    fill={isHovered ? "#10b981" : "#0d0f14"}
                    stroke="#34d399"
                    strokeWidth={isHovered ? 2.5 : 1.5}
                    className="transition-all duration-150 pointer-events-none"
                  />
                )}

                {/* Point circle on NIFTY curve */}
                {visibleCurves.nifty && (
                  <circle
                    cx={cx}
                    cy={getY(pt.niftyValue)}
                    r={isHovered ? 4 : 2.5}
                    fill={isHovered ? "#06b6d4" : "#0d0f14"}
                    stroke="#06b6d4"
                    strokeWidth={1.2}
                    className="transition-all duration-150 pointer-events-none opacity-80"
                  />
                )}

                {/* Broad transparent hit target for scrubbing */}
                <rect
                  x={cx - (plotWidth / trajectoryData.length) / 2}
                  y={padding.top}
                  width={plotWidth / trajectoryData.length}
                  height={plotHeight + padding.bottom}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredPoint(pt)}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
              </g>
            );
          })}

          {/* Floating Clamped Tooltip inside SVG */}
          {hoveredPoint && (
            (() => {
              const hoveredIdx = trajectoryData.findIndex((d) => d.year === hoveredPoint.year);
              const cx = getX(hoveredIdx >= 0 ? hoveredIdx : 0);
              const cy = getY(hoveredPoint.usValue);
              const tipW = 120;
              const tipH = 40;
              // Safe horizontal clamp to keep inside chart bounds on mobile
              const clampedX = Math.min(
                Math.max(cx - tipW / 2, padding.left + 5),
                width - padding.right - tipW - 5
              );
              const clampedY = Math.max(padding.top + 2, cy - tipH - 8);

              return (
                <g className="pointer-events-none transition-transform duration-100">
                  <rect
                    x={clampedX}
                    y={clampedY}
                    width={tipW}
                    height={tipH}
                    rx="8"
                    fill="#0b0e14"
                    stroke="rgba(52,211,153,0.6)"
                    strokeWidth="1"
                    filter="url(#tooltipGlow)"
                  />
                  <text
                    x={clampedX + tipW / 2}
                    y={clampedY + 15}
                    textAnchor="middle"
                    className="text-[9px] font-mono fill-slate-400 font-bold"
                  >
                    {hoveredPoint.year === 0 ? "Initial Seed" : `Year ${hoveredPoint.year} Corpus`}
                  </text>
                  <text
                    x={clampedX + tipW / 2}
                    y={clampedY + 31}
                    textAnchor="middle"
                    className="text-[12px] font-mono fill-emerald-300 font-black"
                  >
                    {formatInrShort(hoveredPoint.usValue)}
                  </text>
                </g>
              );
            })()
          )}
        </svg>
      </div>

      {/* Sub-label showing compounding formula */}
      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-white/[0.05]">
        <div className="flex items-center gap-1.5">
          <TrendingUp className="w-3 h-3 text-emerald-400" />
          <span>Compounder: ({activeSimCagr}% Stock + {activeFxAlpha}% FX Alpha)</span>
        </div>
        {isPullback && (
          <span className="text-amber-300 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
            DCA Dip Mode Active (-20% Yr 1)
          </span>
        )}
      </div>
    </div>
  );
}

export default CompoundingTrajectoryChart;
