import React, { useState, useMemo } from "react";
import clsx from "clsx";
import { Sparkles, Eye, TrendingUp, AlertTriangle, ArrowUpRight, Zap } from "lucide-react";
import { calculateCounterfactualEquity } from "./crucibleCalculations";

export function CounterfactualEquityMirror({ trades = [] }) {
  const [showOverlay, setShowOverlay] = useState(true);
  const [hoveredPoint, setHoveredPoint] = useState(null);

  const {
    curve,
    totalActualNet,
    totalDisciplinedNet,
    totalCapitalLeakage,
    leakagePercent,
    maxLeakageSingleTrade,
    leakedTradesCount
  } = useMemo(() => calculateCounterfactualEquity(trades), [trades]);

  // SVG Dimensioning and Coordinate Mapping
  const { pathActual, pathDisciplined, pathLeakageArea, pointsActual, pointsDisciplined, yZero, minVal, maxVal } = useMemo(() => {
    if (curve.length <= 1) {
      return { pathActual: "", pathDisciplined: "", pathLeakageArea: "", pointsActual: [], pointsDisciplined: [], yZero: 100, minVal: 0, maxVal: 100 };
    }

    const allValues = curve.flatMap((p) => [p.actualPnl, p.disciplinedPnl]);
    const rawMin = Math.min(0, ...allValues);
    const rawMax = Math.max(100, ...allValues);
    const padding = Math.max(100, (rawMax - rawMin) * 0.1);
    const yMin = rawMin - padding;
    const yMax = rawMax + padding;
    const ySpan = yMax - yMin || 1;

    const width = 760;
    const height = 180;
    const padX = 24;
    const padY = 20;
    const chartW = width - padX * 2;
    const chartH = height - padY * 2;

    const getX = (i) => padX + (i / (curve.length - 1)) * chartW;
    const getY = (val) => padY + chartH - ((val - yMin) / ySpan) * chartH;

    const actualPts = curve.map((p, i) => ({ x: getX(i), y: getY(p.actualPnl), ...p }));
    const disciplinedPts = curve.map((p, i) => ({ x: getX(i), y: getY(p.disciplinedPnl), ...p }));

    // Generate smooth SVG paths
    const genPath = (pts) => {
      if (pts.length === 0) return "";
      let d = `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
      for (let i = 1; i < pts.length; i++) {
        const prev = pts[i - 1];
        const curr = pts[i];
        const cpX = (prev.x + curr.x) / 2;
        d += ` C ${cpX.toFixed(1)},${prev.y.toFixed(1)} ${cpX.toFixed(1)},${curr.y.toFixed(1)} ${curr.x.toFixed(1)},${curr.y.toFixed(1)}`;
      }
      return d;
    };

    const actualD = genPath(actualPts);
    const disciplinedD = genPath(disciplinedPts);

    // Leakage area between actual and disciplined
    let areaD = "";
    if (disciplinedPts.length > 0 && actualPts.length > 0) {
      areaD = `M ${disciplinedPts[0].x.toFixed(1)},${disciplinedPts[0].y.toFixed(1)}`;
      for (let i = 1; i < disciplinedPts.length; i++) {
        areaD += ` L ${disciplinedPts[i].x.toFixed(1)},${disciplinedPts[i].y.toFixed(1)}`;
      }
      for (let i = actualPts.length - 1; i >= 0; i--) {
        areaD += ` L ${actualPts[i].x.toFixed(1)},${actualPts[i].y.toFixed(1)}`;
      }
      areaD += " Z";
    }

    const calculatedZero = getY(0);

    return {
      pathActual: actualD,
      pathDisciplined: disciplinedD,
      pathLeakageArea: areaD,
      pointsActual: actualPts,
      pointsDisciplined: disciplinedPts,
      yZero: calculatedZero,
      minVal: rawMin,
      maxVal: rawMax
    };
  }, [curve]);

  const isProfitable = totalActualNet >= 0;

  return (
    <div className="p-5 sm:p-6 rounded-3xl bg-[#0d111a]/85 backdrop-blur-2xl border border-white/[0.08] shadow-[0_24px_60px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.08)] space-y-4 hover:border-white/[0.14] transition-all duration-300 relative overflow-hidden">
      {/* Ambient Spotlight */}
      <div className="absolute -top-16 -right-16 w-56 h-56 bg-purple-500/[0.05] rounded-full blur-[80px] pointer-events-none" />

      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-purple-400 bg-purple-500/10 px-2.5 py-0.5 rounded-full border border-purple-500/25 whitespace-nowrap shadow-sm shadow-purple-500/10 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-purple-400" />
              THE TRUTH MIRROR
            </span>
            <span className="text-xs font-extrabold text-white">Counterfactual Zero-Leakage Equity</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Compares actual realized equity against your hypothetical equity if emotional leaks were 100% eliminated.
          </p>
        </div>

        {/* Toggle Mode */}
        <button
          type="button"
          onClick={() => setShowOverlay(!showOverlay)}
          className={clsx(
            "flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border transition cursor-pointer active:scale-95 shadow-sm whitespace-nowrap",
            showOverlay
              ? "bg-purple-500/20 text-purple-300 border-purple-500/40 hover:bg-purple-500/30"
              : "bg-white/[0.03] text-slate-400 border-white/10 hover:bg-white/[0.06] hover:text-white"
          )}
        >
          <Eye className="w-3.5 h-3.5 text-purple-400" />
          <span>{showOverlay ? "Discipline Mirror Active" : "Show Discipline Mirror"}</span>
        </button>
      </div>

      {/* Rupee Delta Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Actual Realized Take-Home</span>
          <div className="flex items-baseline gap-1.5 font-mono">
            <span className={clsx("text-lg font-black", isProfitable ? "text-emerald-400" : "text-rose-400")}>
              {isProfitable ? "+" : ""}₹{totalActualNet.toLocaleString("en-IN")}
            </span>
            <span className="text-[10px] text-slate-500 font-sans">({trades.length} trades)</span>
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-purple-500/[0.04] border border-purple-500/20 space-y-1">
          <span className="text-[10px] uppercase font-bold text-purple-300 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-purple-400" />
            <span>Pure Discipline Potential</span>
          </span>
          <div className="flex items-baseline gap-1.5 font-mono">
            <span className="text-lg font-black text-purple-300">
              +{totalDisciplinedNet >= 0 ? "+" : ""}₹{totalDisciplinedNet.toLocaleString("en-IN")}
            </span>
            <span className="text-[10px] text-purple-400 font-sans font-bold">
              (+{leakagePercent}% Alpha)
            </span>
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-amber-500/[0.04] border border-amber-500/20 space-y-1">
          <span className="text-[10px] uppercase font-bold text-amber-300 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            <span>Preventable Leakage Drag</span>
          </span>
          <div className="flex items-baseline gap-1.5 font-mono">
            <span className="text-lg font-black text-amber-300">
              -₹{totalCapitalLeakage.toLocaleString("en-IN")}
            </span>
            <span className="text-[10px] text-slate-400 font-sans">
              ({leakedTradesCount} flawed fills)
            </span>
          </div>
        </div>
      </div>

      {/* SVG Dual Curve Visualization */}
      <div className="relative w-full bg-[#080b11] rounded-2xl p-3 border border-white/[0.05] overflow-hidden">
        {/* Interactive Hover Telemetry Pill */}
        {hoveredPoint && (
          <div className="absolute top-3 right-4 z-10 p-2 rounded-xl bg-black/90 backdrop-blur-md border border-purple-500/30 text-[11px] font-mono shadow-xl space-y-0.5">
            <div className="text-slate-400 font-sans flex items-center justify-between gap-3">
              <span className="font-bold text-white">{hoveredPoint.symbol} ({hoveredPoint.date})</span>
              <span className="text-[10px] text-slate-400">Trade {hoveredPoint.label}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-emerald-400">Actual: ₹{hoveredPoint.actualPnl}</span>
              {showOverlay && <span className="text-purple-300">Disciplined: ₹{hoveredPoint.disciplinedPnl}</span>}
            </div>
            {showOverlay && hoveredPoint.tradeLeakage > 0 && (
              <div className="text-amber-300 text-[10px]">
                Leaked on trade: -₹{hoveredPoint.tradeLeakage}
              </div>
            )}
          </div>
        )}

        <svg viewBox="0 0 760 180" className="w-full h-44 overflow-visible">
          <defs>
            {/* Leakage Area Gradient */}
            <linearGradient id="leakageAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a855f7" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#a855f7" stopOpacity="0.03" />
            </linearGradient>

            {/* Actual Curve Gradient */}
            <linearGradient id="actualLineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>

          {/* Breakeven Zero Reference Line */}
          <line
            x1="24"
            y1={yZero}
            x2="736"
            y2={yZero}
            stroke="rgba(255,255,255,0.12)"
            strokeDasharray="3 3"
            strokeWidth="1"
          />
          <text x="30" y={Math.max(14, yZero - 4)} fill="rgba(255,255,255,0.3)" fontSize="9" fontFamily="monospace">
            ₹0 BREAKEVEN
          </text>

          {/* Shaded Leakage Zone */}
          {showOverlay && pathLeakageArea && (
            <path d={pathLeakageArea} fill="url(#leakageAreaGrad)" />
          )}

          {/* Disciplined Counterfactual Line (Glowing Purple Dashed) */}
          {showOverlay && pathDisciplined && (
            <path
              d={pathDisciplined}
              fill="none"
              stroke="#c084fc"
              strokeWidth="2.2"
              strokeDasharray="4 3"
              className="transition-all duration-300 filter drop-shadow-[0_0_6px_rgba(192,132,252,0.4)]"
            />
          )}

          {/* Actual Realized Line (Solid Cyan/Emerald Gradient) */}
          {pathActual && (
            <path
              d={pathActual}
              fill="none"
              stroke="url(#actualLineGrad)"
              strokeWidth="2.5"
              className="transition-all duration-300 filter drop-shadow-[0_0_8px_rgba(6,182,212,0.3)]"
            />
          )}

          {/* Interactive Data Points */}
          {pointsActual.map((pt, idx) => (
            <g
              key={idx}
              className="cursor-pointer group"
              onMouseEnter={() => setHoveredPoint(pt)}
              onMouseLeave={() => setHoveredPoint(null)}
            >
              {/* Invisible Hitbox */}
              <circle cx={pt.x} cy={pt.y} r="8" fill="transparent" />

              {/* Actual Point Dot */}
              <circle
                cx={pt.x}
                cy={pt.y}
                r="3"
                fill="#06b6d4"
                className="group-hover:r-5 group-hover:fill-white transition-all"
              />

              {/* Disciplined Point Dot */}
              {showOverlay && pointsDisciplined[idx] && (
                <circle
                  cx={pointsDisciplined[idx].x}
                  cy={pointsDisciplined[idx].y}
                  r="2.5"
                  fill="#c084fc"
                  className="group-hover:r-4 group-hover:fill-purple-200 transition-all"
                />
              )}
            </g>
          ))}
        </svg>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/[0.04] text-[10px] text-slate-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-1 rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400" />
              <strong className="text-slate-300 font-medium">Solid Line</strong>: Actual Realized Equity
            </span>
            {showOverlay && (
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-1 rounded-full bg-purple-400 border-dashed border-b" />
                <strong className="text-purple-300 font-medium">Dashed Purple</strong>: Counterfactual Pure Discipline
              </span>
            )}
          </div>
          <span className="font-mono text-slate-500">
            Max Single Leak: ₹{maxLeakageSingleTrade}
          </span>
        </div>
      </div>
    </div>
  );
}
