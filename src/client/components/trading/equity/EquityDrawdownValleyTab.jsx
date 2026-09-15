import React from "react";

export function EquityDrawdownValleyTab({
  width,
  height,
  padding,
  maxDDPct,
  drawdownArea,
  drawdownPath,
  equityPoints,
  getX,
  getDDY
}) {
  return (
    <div className="space-y-4">
      <div className="relative rounded-3xl bg-[#0d0f14]/95 border border-white/[0.07] p-4 sm:p-6 overflow-hidden backdrop-blur-3xl shadow-[0_24px_60px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.08)]">
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
            <span className="px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/25">
              0% = All-Time High Peak
            </span>
            <span className="px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/25">
              Max Dip: -{maxDDPct.toFixed(1)}%
            </span>
          </div>
        </div>

        <div className="relative w-full overflow-hidden rounded-2xl bg-[#050608]/90 border border-white/[0.06] p-1 sm:p-2">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-64 sm:h-72 select-none overflow-visible">
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
            <text x={width - 16} y={padding.top + 14} textAnchor="end" fill="#06b6d4" fontSize="10" fontFamily="sans-serif" fontWeight="bold">
              0.0% · ATH PEAK
            </text>

            {/* Max Drawdown Level */}
            <line x1="0" y1={height - 24} x2={width} y2={height - 24} stroke="rgba(244,63,94,0.35)" strokeDasharray="3 3" />
            <text x={width - 16} y={height - 28} textAnchor="end" fill="#f43f5e" fontSize="10" fontFamily="sans-serif" fontWeight="bold">
              -{maxDDPct.toFixed(1)}% · MAX VALLEY
            </text>

            {/* Drawdown Area Fill & Path */}
            <path d={drawdownArea} fill="url(#ddValleyGrad)" />
            <path d={drawdownPath} fill="none" stroke="#f43f5e" strokeWidth="6" opacity="0.3" filter="url(#roseBloom)" strokeLinecap="round" />
            <path d={drawdownPath} fill="none" stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round" />

            {/* Drawdown Points */}
            {equityPoints.map((p, i) => {
              const x = getX(i);
              const y = getDDY(p.drawdownPct);
              return (
                <circle
                  key={p.id || i}
                  cx={x}
                  cy={y}
                  r="4"
                  fill={p.drawdown > 0 ? "#f43f5e" : "#06b6d4"}
                  stroke="#070d1a"
                  strokeWidth="2"
                />
              );
            })}
          </svg>
        </div>

        <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-xs text-slate-300 mt-3 flex items-start gap-2.5">
          <span className="text-rose-400 text-base">🛡️</span>
          <div>
            <strong className="text-white block mb-0.5 font-mono text-[11px]">Why Valley Depth Matters for Institutional Sizing:</strong>
            <p className="text-[11px] leading-relaxed text-slate-400">
              Drawdown measures how far your account dips below its highest historical peak before recovering. A shallow valley (&lt; 3%) is definitive mathematical proof that you maintain strict stop-loss discipline and never revenge trade.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
