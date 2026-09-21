import React from "react";
import clsx from "clsx";

export function PortfolioNavSplineChart({
  svgWidth = 680,
  svgHeight = 210,
  paddingY = 24,
  splinePath,
  splineAreaPath,
  alphaAreaPath,
  investedPath,
  benchmarkPath,
  showBenchmark = true,
  onToggleBenchmark,
  highWaterMark = null,
  athY = null,
  currencySymbol = "₹",
  fxRate = 1,
  priceLevels = [],
  dateMilestones = [],
  navPoints = [],
  investedPoints = [],
  navDates = [],
  activeTf = "all",
  isAllView = false,
  getX,
  getY,
  hoverIndex,
  setHoverIndex,
  onScrub,
}) {
  const handleMouseMove = (e) => {
    if (!navPoints || navPoints.length <= 1) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const idx = Math.round(relX * (navPoints.length - 1));
    if (idx >= 0 && idx < navPoints.length) {
      if (idx !== hoverIndex) onScrub?.();
      setHoverIndex(idx);
    }
  };

  const handleTouchMove = (e) => {
    if (!navPoints || navPoints.length <= 1) return;
    const touch = e.touches?.[0];
    if (!touch) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
    const idx = Math.round(relX * (navPoints.length - 1));
    if (idx >= 0 && idx < navPoints.length) {
      if (idx !== hoverIndex) {
        onScrub?.();
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate(4);
        }
      }
      setHoverIndex(idx);
    }
  };

  return (
    <div className="relative w-full h-56 sm:h-64 pt-2">
      {/* 🧭 Dynamic Financial Legend */}
      <div className="absolute top-1 left-3 flex items-center gap-3 text-[9px] font-mono text-slate-400 pointer-events-none z-10 bg-[#080b11]/85 px-3 py-1.5 rounded-full border border-white/10 backdrop-blur-md shadow-md">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-0.5 rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
          <span className="text-emerald-300 font-bold tracking-wider">PORTFOLIO NAV</span>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleBenchmark?.();
          }}
          className={clsx(
            "flex items-center gap-1.5 border-l border-white/10 pl-2.5 transition-all cursor-pointer pointer-events-auto",
            showBenchmark ? "text-amber-300 font-semibold" : "text-slate-500 opacity-60 line-through"
          )}
          title={showBenchmark ? "NIFTY 50 Benchmark Visible · Click to Hide" : "NIFTY 50 Benchmark Hidden · Click to Show Overlay"}
        >
          <span className={clsx("w-2.5 h-0 border-t border-dashed", showBenchmark ? "border-amber-400" : "border-slate-500")} />
          <span>NIFTY 50 TRI {showBenchmark ? "✓" : "○"}</span>
        </button>

        {highWaterMark?.peakVal > 0 && (
          <div className="flex items-center gap-1.5 border-l border-white/10 pl-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.8)]" />
            <span className="text-cyan-300 font-semibold">
              ATH {highWaterMark.isAtPeak ? "✦ Peak" : `${highWaterMark.currentDrawdownPct}%`}
            </span>
          </div>
        )}

        {investedPath && (
          <div className="flex items-center gap-1.5 border-l border-white/10 pl-2.5">
            <span className="w-2.5 h-0 border-t border-dashed border-slate-400" />
            <span className="text-slate-400 font-medium">Invested Base</span>
          </div>
        )}
      </div>

      <svg
        className="w-full h-full overflow-visible select-none touch-none"
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        preserveAspectRatio="none"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIndex(null)}
        onTouchStart={handleTouchMove}
        onTouchMove={handleTouchMove}
        onTouchEnd={() => setHoverIndex(null)}
        onTouchCancel={() => setHoverIndex(null)}
      >
        <defs>
          <linearGradient id="appleSpatialLuminescence" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.22" />
            <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#080b11" stopOpacity="0.0" />
          </linearGradient>
          <linearGradient id="alphaLuminescenceGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.04" />
          </linearGradient>
          <linearGradient id="appleNavStrokeGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="60%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
        </defs>

        {/* 📐 Y-Axis Horizontal Hairline Price Guidelines */}
        {priceLevels.map((lvl, i) => (
          <g key={i} className="pointer-events-none">
            <line
              x1="0"
              y1={lvl.y}
              x2={svgWidth}
              y2={lvl.y}
              stroke="rgba(255,255,255,0.06)"
              strokeDasharray="4 6"
              strokeWidth="1"
            />
            <text
              x={svgWidth - 6}
              y={lvl.y - 4}
              fill="rgba(255,255,255,0.35)"
              fontSize="9"
              textAnchor="end"
              fontFamily="monospace"
              fontWeight="bold"
            >
              {lvl.label}
            </text>
          </g>
        ))}

        {/* Area Gradient Fill */}
        <path d={splineAreaPath} fill="url(#appleSpatialLuminescence)" />

        {/* 🌟 Alpha Differential Ribbon (Illuminates excess return over NIFTY 50) */}
        {showBenchmark && alphaAreaPath && (
          <path
            d={alphaAreaPath}
            fill="url(#alphaLuminescenceGradient)"
            className="pointer-events-none transition-all duration-300"
          />
        )}

        {/* 💎 High-Water Mark (ATH Ceiling Hairline & Peak Beacon) */}
        {athY !== null && athY >= paddingY && athY <= svgHeight - 16 && (
          <g className="pointer-events-none select-none">
            <line
              x1="0"
              y1={athY}
              x2={svgWidth}
              y2={athY}
              stroke="#06b6d4"
              strokeWidth="1.2"
              strokeDasharray="3 4"
              strokeOpacity="0.45"
            />
            <rect
              x={svgWidth - 106}
              y={Math.max(paddingY - 14, athY - 12)}
              width="100"
              height="15"
              rx="4"
              fill="#080b11"
              stroke="rgba(6,182,212,0.4)"
              strokeWidth="0.8"
            />
            <text
              x={svgWidth - 56}
              y={Math.max(paddingY - 14, athY - 12) + 10}
              fill="#22d3ee"
              fontSize="8.5"
              textAnchor="middle"
              fontFamily="monospace"
              fontWeight="bold"
            >
              ✦ ATH {currencySymbol}{Math.round((highWaterMark?.peakVal || 0) / fxRate).toLocaleString("en-IN")}
            </text>
          </g>
        )}

        {/* NIFTY 50 Benchmark Curve (Visually grounded alpha comparison) */}
        {benchmarkPath && (
          <path
            d={benchmarkPath}
            fill="none"
            stroke="#f59e0b"
            strokeWidth="1.6"
            strokeDasharray="3 4"
            strokeOpacity="0.65"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Invested Capital Baseline */}
        {investedPath && (
          <path
            d={investedPath}
            fill="none"
            stroke="#64748b"
            strokeWidth="1.6"
            strokeDasharray="4 4"
            strokeOpacity="0.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Primary Radiant Portfolio Spline */}
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
            y2={svgHeight - 16}
            stroke="#10b981"
            strokeWidth="1.5"
            strokeDasharray="3 3"
            opacity="0.8"
          />
        )}

        {/* 📅 X-Axis Date Milestone Labels */}
        {dateMilestones.map((m, i) => (
          <text
            key={i}
            x={m.x}
            y={svgHeight - 4}
            fill="rgba(255,255,255,0.4)"
            fontSize="9"
            textAnchor="middle"
            fontFamily="monospace"
            className="pointer-events-none select-none"
          >
            {m.label}
          </text>
        ))}

        {/* Mouse Scrubbing overlay */}
        <rect
          x="0"
          y="0"
          width={svgWidth}
          height={svgHeight}
          fill="transparent"
          className="cursor-crosshair"
        />

        {/* Data Nodes along curve */}
        {navPoints.map((val, idx) => {
          const isHovered = hoverIndex === idx;
          const isDense = navPoints.length > 40;
          const isMilestone = !isDense || idx === 0 || idx === navPoints.length - 1 || (idx % Math.ceil(navPoints.length / 15) === 0);

          if (!isMilestone && !isHovered) return null;

          const x = getX(idx);
          const y = getY(val);

          return (
            <g key={idx} className="pointer-events-none select-none">
              <circle
                cx={x}
                cy={y}
                r={isHovered ? 6 : isDense ? 2 : 2.5}
                fill={isHovered ? "#34d399" : "#10b981"}
                stroke="#080b11"
                strokeWidth={isHovered ? 2.5 : 1}
                className="transition-all duration-150"
              />
              {isHovered && (
                <circle cx={x} cy={y} r={12} fill="#34d399" opacity={0.3} className="animate-ping" />
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
