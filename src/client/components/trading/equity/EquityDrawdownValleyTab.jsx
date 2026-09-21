import React, { useState } from "react";
import { Waves, ShieldAlert, Timer, Scale, CheckCircle2, AlertCircle } from "lucide-react";
import clsx from "clsx";

export function EquityDrawdownValleyTab({
  width,
  height,
  padding,
  maxDDPct = 0,
  drawdownArea,
  drawdownPath,
  equityPoints = [],
  getX,
  getDDY,
  maxDrawdown = 0,
  ulcerIndex = "0.00",
  recoveryFactor = "1.00",
  topDrawdowns = [],
  maxUnderwaterTrades = 0,
  peakCapital = 100000,
  playScrubAudio,
  scrubIndex,
  setScrubIndex
}) {
  const [localHover, setLocalHover] = useState(null);
  const activeIdx = scrubIndex !== undefined && scrubIndex !== null ? scrubIndex : localHover;
  const updateActiveIndex = (idx) => {
    if (setScrubIndex) setScrubIndex(idx);
    else setLocalHover(idx);
  };

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const svgX = (clientX / rect.width) * width;
    const rawIndex = (svgX / width) * (equityPoints.length - 1);
    const closest = Math.max(0, Math.min(equityPoints.length - 1, Math.round(rawIndex)));

    if (closest !== activeIdx) {
      playScrubAudio?.();
      updateActiveIndex(closest);
    }
  };

  const handleTouchMove = (e) => {
    if (!e.touches || !e.touches[0]) return;
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = Math.max(0, Math.min(rect.width, touch.clientX - rect.left));
    const svgX = (clientX / rect.width) * width;
    const rawIndex = (svgX / width) * (equityPoints.length - 1);
    const closest = Math.max(0, Math.min(equityPoints.length - 1, Math.round(rawIndex)));

    if (closest !== activeIdx) {
      playScrubAudio?.();
      updateActiveIndex(closest);
    }
  };

  const hoveredPoint = activeIdx !== null ? equityPoints[activeIdx] : null;

  return (
    <div className="space-y-4">
      {/* 4 Quantitative Downside Telemetry Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-[#0d111a]/85 border border-rose-500/20 backdrop-blur-2xl">
          <div className="flex items-center justify-between mb-1 text-[11px] font-medium text-slate-400">
            <span>Max Pullback</span>
            <Waves className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-lg font-bold text-rose-400 font-mono">
            -₹{maxDrawdown.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            -{maxDDPct.toFixed(1)}% Max Deepest Dip
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#0d111a]/85 border border-purple-500/20 backdrop-blur-2xl">
          <div className="flex items-center justify-between mb-1 text-[11px] font-medium text-slate-400">
            <span>Ulcer Index</span>
            <Scale className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-lg font-bold text-purple-300 font-mono">
            {ulcerIndex}
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            Downside Volatility Rating
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#0d111a]/85 border border-cyan-500/20 backdrop-blur-2xl">
          <div className="flex items-center justify-between mb-1 text-[11px] font-medium text-slate-400">
            <span>Max Underwater</span>
            <Timer className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-lg font-bold text-cyan-300 font-mono">
            {maxUnderwaterTrades} Trades
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            Longest Pullback Recovery
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#0d111a]/85 border border-emerald-500/20 backdrop-blur-2xl">
          <div className="flex items-center justify-between mb-1 text-[11px] font-medium text-slate-400">
            <span>Recovery Factor</span>
            <ShieldAlert className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-lg font-bold text-emerald-300 font-mono">
            {recoveryFactor}
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            Net Gain vs Max Drawdown
          </span>
        </div>
      </div>

      {/* Main Underwater Valley Chart Chassis */}
      <div className="relative rounded-3xl bg-[#0d111a]/95 border border-white/[0.07] p-4 sm:p-6 overflow-hidden backdrop-blur-3xl shadow-[0_24px_60px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.08)]">
        {/* Ambient Rose/Blood Glow */}
        <div className="absolute -top-24 right-1/3 w-96 h-64 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono mb-3.5 relative z-10">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.9)] animate-pulse" />
            <div>
              <span className="font-black text-white text-xs sm:text-sm tracking-wider uppercase">UNDERWATER DRAWDOWN VALLEY</span>
              <span className="block text-[10.5px] text-slate-400 font-normal">Capital Preservation &amp; Pullback from All-Time Peak</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[10px]">
            {hoveredPoint ? (
              <span className="px-3 py-1 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 font-bold">
                {hoveredPoint.label}: -₹{hoveredPoint.drawdown.toLocaleString("en-IN")} (-{hoveredPoint.drawdownPct}%)
              </span>
            ) : (
              <>
                <span className="px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/25">
                  0% = All-Time High Peak
                </span>
                <span className="px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/25">
                  Max Dip: -{maxDDPct.toFixed(1)}%
                </span>
              </>
            )}
          </div>
        </div>

        <div className="relative w-full overflow-hidden rounded-2xl bg-[#050608]/90 border border-white/[0.06] p-1 sm:p-2">
          <svg 
            viewBox={`0 0 ${width} ${height}`} 
            className="w-full h-64 sm:h-72 select-none touch-none cursor-crosshair overflow-visible"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => updateActiveIndex(null)}
            onTouchStart={handleTouchMove}
            onTouchMove={handleTouchMove}
            onTouchEnd={() => updateActiveIndex(null)}
            onTouchCancel={() => updateActiveIndex(null)}
          >
            <defs>
              <linearGradient id="ddValleyGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.05" />
                <stop offset="60%" stopColor="#e11d48" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#881337" stopOpacity="0.45" />
              </linearGradient>

              <filter id="roseBloom" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Spatial Grid Background */}
            <rect
              x="0"
              y={padding.top}
              width={width}
              height={height - padding.top}
              fill="url(#spatialMicroGrid)"
            />

            {/* 0% Peak Reference Line */}
            <line x1="0" y1={padding.top} x2={width} y2={padding.top} stroke="#06b6d4" strokeWidth="1.5" />
            <text x={width - 24} y={padding.top + 14} textAnchor="end" fill="#06b6d4" fontSize="10" fontFamily="sans-serif" fontWeight="bold">
              0.0% · ATH PEAK CEILING
            </text>

            {/* Max Drawdown Level */}
            <line x1="0" y1={height - 24} x2={width} y2={height - 24} stroke="rgba(244,63,94,0.35)" strokeDasharray="3 3" />
            <text x={width - 24} y={height - 28} textAnchor="end" fill="#f43f5e" fontSize="10" fontFamily="sans-serif" fontWeight="bold">
              -{maxDDPct.toFixed(1)}% · MAX VALLEY FLOOR
            </text>

            {/* Drawdown Area Fill & Path */}
            <path d={drawdownArea} fill="url(#ddValleyGrad)" />
            <path d={drawdownPath} fill="none" stroke="#f43f5e" strokeWidth="6" opacity="0.3" filter="url(#roseBloom)" strokeLinecap="round" />
            <path d={drawdownPath} fill="none" stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round" />


            {/* Drawdown Points */}
            {equityPoints.map((p, i) => {
              const x = getX(i);
              const y = getDDY(p.drawdownPct);
              const isHovered = activeIdx === i;
              return (
                <g key={p.id || i}>
                  <circle
                    cx={x}
                    cy={y}
                    r={isHovered ? "6" : (p.isBreach ? "5" : "3.5")}
                    fill={p.isBreach ? "#fb7185" : (p.drawdown > 0 ? "#f43f5e" : "#06b6d4")}
                    stroke={isHovered ? "#ffffff" : "#070d1a"}
                    strokeWidth={isHovered ? "2.5" : "1.5"}
                  />
                  {p.isBreach && (
                    <circle
                      cx={x}
                      cy={y}
                      r="8"
                      fill="none"
                      stroke="#fb7185"
                      strokeWidth="1.5"
                      opacity="0.6"
                      className="animate-ping"
                    />
                  )}
                </g>
              );
            })}

            {/* Interactive Vertical Scrub Guideline */}
            {activeIdx !== null && (
              <line
                x1={getX(activeIdx)}
                y1={padding.top}
                x2={getX(activeIdx)}
                y2={height}
                stroke="rgba(255, 255, 255, 0.4)"
                strokeDasharray="2 2"
              />
            )}

          </svg>
        </div>

        {/* Top Drawdown Episodes Recovery Waterfall */}
        {topDrawdowns.length > 0 && (
          <div className="mt-5 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-bold text-slate-300 uppercase tracking-wider">
                Top Historical Drawdown Episodes
              </span>
              <span className="text-[10px] text-slate-500">
                Peak to Trough Recovery Tracking
              </span>
            </div>

            <div className="rounded-2xl border border-white/[0.06] overflow-hidden bg-white/[0.01]">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-white/[0.02] text-slate-400 text-[10.5px]">
                    <th className="py-2.5 px-3">Episode</th>
                    <th className="py-2.5 px-3">Peak ATH</th>
                    <th className="py-2.5 px-3">Trough Floor</th>
                    <th className="py-2.5 px-3">Max Pullback</th>
                    <th className="py-2.5 px-3">Duration</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {topDrawdowns.map((ep, idx) => (
                    <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-2.5 px-3 font-bold text-slate-300">
                        Episode #{idx + 1}
                      </td>
                      <td className="py-2.5 px-3 text-cyan-300">
                        ₹{ep.peakCapital.toLocaleString("en-IN", { minimumFractionDigits: 0 })}
                      </td>
                      <td className="py-2.5 px-3 text-rose-300">
                        ₹{ep.troughCapital.toLocaleString("en-IN", { minimumFractionDigits: 0 })}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-rose-400">
                        -₹{ep.maxDrawdown.toLocaleString("en-IN", { minimumFractionDigits: 0 })} (-{ep.maxDrawdownPct.toFixed(1)}%)
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">
                        {ep.durationTrades} Trades
                      </td>
                      <td className="py-2.5 px-3">
                        {ep.recoveredIndex ? (
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold">
                            <CheckCircle2 className="w-3 h-3" />
                            Recovered (Trade #{ep.recoveredIndex})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold">
                            <AlertCircle className="w-3 h-3" />
                            Active Underwater
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-xs text-slate-300 mt-4 flex items-start gap-2.5">
          <span className="text-rose-400 text-base">🛡️</span>
          <div>
            <strong className="text-white block mb-0.5 font-mono text-[11px]">Why Valley Depth Matters for Institutional Sizing:</strong>
            <p className="text-[11px] leading-relaxed text-slate-400">
              Drawdown measures how far your account dips below its highest historical peak before recovering. A shallow valley (&lt; 3%) and fast recovery (&lt; 5 trades) mathematically validate that your ₹250 stop-loss peg is rigorously protecting your vault capital from tail risk.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EquityDrawdownValleyTab;

