import React, { useState } from "react";
import clsx from "clsx";
import { Crosshair, Target, ShieldCheck, HelpCircle, AlertTriangle, Gauge } from "lucide-react";

export function MaeMfeEfficiencyCard({ maeMfeData }) {
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const { 
    points = [], 
    optimalStopPts = 3.85, 
    sniperCount = 0, 
    trapCount = 0, 
    sniperRate = 0, 
    avgWinMae = "1.40",
    vixNum = 13.20,
    vixFloorPts = 3.85,
    estimatedFrictionPts = 0.90,
    frictionPercentOfStop = 23,
    isMicrostructureChoke = false
  } = maeMfeData || {};

  // SVG Dimension Constants
  const width = 500;
  const height = 240;
  const padding = 36;
  const maxMae = 6.0;  // X-axis limit (points)
  const maxMfe = 12.0; // Y-axis limit (points)

  const scaleX = (val) => padding + (Math.min(maxMae, Math.max(0, val)) / maxMae) * (width - padding * 2);
  const scaleY = (val) => height - padding - (Math.min(maxMfe, Math.max(0, val)) / maxMfe) * (height - padding * 2);

  // Quadrant dividing threshold lines (MAE = 2.5 pts, MFE = 5.0 pts)
  const midX = scaleX(2.5);
  const midY = scaleY(5.0);

  return (
    <div className="p-5 sm:p-6 rounded-3xl bg-[#0d111a]/85 backdrop-blur-2xl border border-white/[0.08] shadow-[0_24px_60px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.08)] space-y-4 relative overflow-hidden transition-all duration-300 hover:border-white/[0.14]">
      {/* Ambient Radial Spotlight */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-cyan-500/[0.05] rounded-full blur-[80px] pointer-events-none" />

      {/* Card Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/[0.07]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-400 shadow-sm shadow-cyan-500/10">
            <Crosshair className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white tracking-tight flex items-center gap-2">
              <span>MAE vs MFE Execution Quality</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-semibold">
                Stop Precision
              </span>
            </h3>
            <p className="text-xs text-slate-400 leading-none pt-0.5">
              Maximum Adverse vs Favorable Excursion: derives your mathematical stop-loss sweet spot.
            </p>
          </div>
        </div>

        {/* Optimal Stop Distance & Data Provenance Badges */}
        <div className="flex items-center gap-2 text-[10px] font-mono flex-wrap">
          <span className="text-[9px] font-mono px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08] text-slate-400" title="Excursion values derived from execution envelope (entry, exit, stop loss, and target trajectory).">
            Envelope-Derived
          </span>
          <span className={clsx(
            "flex items-center gap-1.5 px-3 py-1 rounded-full font-bold transition-colors",
            isMicrostructureChoke
              ? "bg-amber-500/15 border border-amber-500/30 text-amber-300"
              : "bg-cyan-500/15 border border-cyan-500/30 text-cyan-300"
          )}>
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Optimal Stop: {optimalStopPts} pts {isMicrostructureChoke ? `(Choke < ${vixFloorPts} pt VIX Floor)` : `(95% Winner Runway)`}</span>
          </span>
        </div>
      </div>

      {/* Microstructure Choke Warning or Friction Drag Meter */}
      {isMicrostructureChoke ? (
        <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5 animate-pulse" />
          <div className="text-xs space-y-1">
            <div className="font-bold text-amber-300 flex items-center gap-2 flex-wrap">
              <span>⚠️ Microstructure Choke Risk: Stop ({optimalStopPts} pts) &lt; VIX Noise Floor ({vixFloorPts} pts)</span>
              <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-amber-500/20 text-amber-200 border border-amber-500/30">
                Friction: {frictionPercentOfStop}% of stop
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              At India VIX {vixNum.toFixed(2)}, normal random market noise requires at least <strong className="text-white">{vixFloorPts} pts</strong> room.
              Roundtrip spread + slippage (~{estimatedFrictionPts} pt) absorbs <strong className="text-amber-400">{frictionPercentOfStop}%</strong> of your {optimalStopPts} pt envelope.
              To maintain your ₹250 risk cap without premature whipsaw, scale to a lower delta strike (0.35–0.40) rather than choking the ATM entry.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-2.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between gap-3 text-[11px] font-mono">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5 text-cyan-400" />
            <span>Friction Drag: ~{estimatedFrictionPts} pt spread+slip absorbs {frictionPercentOfStop}% of {optimalStopPts} pt stop</span>
          </span>
          <span className="text-emerald-400 font-bold">
            VIX Floor ({vixFloorPts} pts) Cleared
          </span>
        </div>
      )}

      {/* 4-Quadrant Scatter Visualization */}
      <div className="relative rounded-2xl bg-black/40 border border-white/[0.06] p-2 overflow-hidden">
        {/* Subtle Quadrant Background Labels */}
        <div className="absolute top-3 left-12 text-[9px] font-mono font-bold text-emerald-400/40 uppercase tracking-widest pointer-events-none">
          🎯 Sniper Zone (Low MAE, High MFE)
        </div>
        <div className="absolute top-3 right-4 text-[9px] font-mono font-bold text-amber-400/40 uppercase tracking-widest pointer-events-none">
          ⚠️ Sweaty Wins (High MAE, High MFE)
        </div>
        <div className="absolute bottom-10 left-12 text-[9px] font-mono font-bold text-slate-400/40 uppercase tracking-widest pointer-events-none">
          ⏳ Premature Bail (Low MFE)
        </div>
        <div className="absolute bottom-10 right-4 text-[9px] font-mono font-bold text-rose-400/40 uppercase tracking-widest pointer-events-none">
          🛑 Lethal Traps (Immediate Drawdown)
        </div>

        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-56 select-none overflow-visible">
          {/* Grid lines & Threshold Dividers */}
          <line x1={midX} y1={padding} x2={midX} y2={height - padding} stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
          <line x1={padding} y1={midY} x2={width - padding} y2={midY} stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />

          {/* Axes */}
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="rgba(255,255,255,0.15)" />
          <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="rgba(255,255,255,0.15)" />

          {/* Axis Ticks */}
          <text x={padding} y={height - padding + 14} fill="#64748b" fontSize="8" fontFamily="monospace" textAnchor="middle">0</text>
          <text x={midX} y={height - padding + 14} fill="#64748b" fontSize="8" fontFamily="monospace" textAnchor="middle">2.5 pts</text>
          <text x={width - padding} y={height - padding + 14} fill="#64748b" fontSize="8" fontFamily="monospace" textAnchor="middle">6.0 pts</text>
          <text x={width / 2} y={height - 6} fill="#94a3b8" fontSize="9" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
            Adverse Excursion (MAE Drawdown against Entry) →
          </text>

          <text x={padding - 6} y={height - padding} fill="#64748b" fontSize="8" fontFamily="monospace" textAnchor="end">0</text>
          <text x={padding - 6} y={midY} fill="#64748b" fontSize="8" fontFamily="monospace" textAnchor="end">5.0 pts</text>
          <text x={padding - 6} y={padding + 8} fill="#64748b" fontSize="8" fontFamily="monospace" textAnchor="end">12.0</text>
          <text x={10} y={height / 2} fill="#94a3b8" fontSize="9" fontFamily="monospace" fontWeight="bold" transform={`rotate(-90 10 ${height/2})`} textAnchor="middle">
            ← Favorable Run (MFE)
          </text>

          {/* Trade Scatter Circles */}
          {points.map((p) => {
            const cx = scaleX(p.mae);
            const cy = scaleY(p.mfe);
            const isHovered = hoveredPoint?.id === p.id;

            return (
              <g key={p.id} onMouseEnter={() => setHoveredPoint(p)} onMouseLeave={() => setHoveredPoint(null)}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={isHovered ? 6 : 4}
                  className={clsx(
                    "cursor-pointer transition-all duration-150",
                    p.isWin
                      ? "fill-emerald-400 stroke-emerald-200"
                      : "fill-rose-400 stroke-rose-200",
                    isHovered ? "stroke-2 filter drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]" : "stroke-1 opacity-80"
                  )}
                />
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredPoint && (
          <div className="absolute top-4 right-4 p-2.5 rounded-xl bg-[#090d14]/95 border border-cyan-500/40 text-[10px] font-mono space-y-1 shadow-lg pointer-events-none animate-fadeIn">
            <div className="font-bold text-white flex items-center justify-between gap-3">
              <span>{hoveredPoint.symbol || "Trade Scalp"}</span>
              <span className={hoveredPoint.isWin ? "text-emerald-400 font-black" : "text-rose-400 font-black"}>
                {hoveredPoint.netPnl >= 0 ? `+₹${Math.round(hoveredPoint.netPnl)}` : `-₹${Math.abs(Math.round(hoveredPoint.netPnl))}`}
              </span>
            </div>
            <div className="text-slate-400 flex items-center gap-2">
              <span>MAE (Drawdown): <strong className="text-rose-400">{hoveredPoint.mae} pts</strong></span>
              <span>·</span>
              <span>MFE (Peak): <strong className="text-emerald-400">+{hoveredPoint.mfe} pts</strong></span>
            </div>
          </div>
        )}
      </div>

      {/* Footer Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-center font-mono">
        <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
          <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Sniper Entries</div>
          <div className="text-sm font-black text-emerald-400 pt-0.5">{sniperCount} ({Math.round(sniperRate)}%)</div>
          <div className="text-[8px] text-slate-500">Low MAE, Instant Alpha</div>
        </div>

        <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
          <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Avg Winner Drawdown</div>
          <div className="text-sm font-black text-cyan-300 pt-0.5">{avgWinMae} pts</div>
          <div className="text-[8px] text-slate-500">Normal pullback before win</div>
        </div>

        <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
          <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Lethal Trap Fails</div>
          <div className="text-sm font-black text-rose-400 pt-0.5">{trapCount}</div>
          <div className="text-[8px] text-slate-500">Immediate adverse stop-out</div>
        </div>

        <div className={clsx(
          "p-2.5 rounded-xl border transition-colors",
          isMicrostructureChoke
            ? "bg-amber-500/[0.06] border-amber-500/30"
            : "bg-white/[0.02] border-white/[0.05]"
        )}>
          <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Recommended Stop</div>
          <div className={clsx(
            "text-sm font-black pt-0.5",
            isMicrostructureChoke ? "text-amber-300" : "text-cyan-300"
          )}>
            {optimalStopPts} pts
          </div>
          <div className="text-[8px] text-slate-500">
            {isMicrostructureChoke ? `Floor: ${vixFloorPts} pts (Choke)` : `VIX Floor: ${vixFloorPts} pts`}
          </div>
        </div>
      </div>
    </div>
  );
}

export default MaeMfeEfficiencyCard;
