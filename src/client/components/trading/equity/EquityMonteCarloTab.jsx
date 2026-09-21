import React, { useState } from "react";
import { RollingTicker } from "../../common/RollingTicker";
import { ShieldAlert, Sparkles, Waves, Lock, CheckCircle2, Sliders, TrendingUp } from "lucide-react";
import clsx from "clsx";

export function EquityMonteCarloTab({ 
  monteCarlo, 
  activeTradesCount = 0,
  mcHorizon = 50,
  setMcHorizon,
  isPendingMc = false 
}) {
  const isGated = monteCarlo?.isSampleGated || activeTradesCount < 15;
  const sampleProgressPct = Math.min(100, Math.round((activeTradesCount / 15) * 100));
  const [hoverStep, setHoverStep] = useState(null);

  if (isGated) {
    return (
      <div className="p-6 sm:p-7 rounded-3xl bg-[#0d111a]/90 backdrop-blur-2xl border border-white/[0.08] shadow-[0_24px_60px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.08)] space-y-6 text-center">
        <div className="max-w-md mx-auto space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 mx-auto shadow-lg shadow-amber-500/10">
            <Lock className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
              Monte Carlo Studio Locked (Sample Gate)
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Quantitative bootstrapping requires at least <strong className="text-cyan-400">15 verified trades</strong> to eliminate small-sample noise and prevent false confidence.
            </p>
          </div>

          {/* Sample Progress Bar */}
          <div className="space-y-1.5 pt-2">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-400">Sample Progress</span>
              <span className="text-cyan-300 font-bold">{activeTradesCount} / 15 Trades ({sampleProgressPct}%)</span>
            </div>
            <div className="w-full h-2 rounded-full bg-white/[0.05] border border-white/10 overflow-hidden p-0.5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-500"
                style={{ width: `${sampleProgressPct}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-500 block font-mono">
              Log {Math.max(0, 15 - activeTradesCount)} more trades to unlock 1,000 forward probability paths.
            </span>
          </div>
        </div>

        {/* Locked Preview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 opacity-50 pointer-events-none">
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-left space-y-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">15% Drawdown Risk</span>
            <strong className="text-xl font-mono text-slate-400">🔒 Locked</strong>
            <span className="text-[10px] text-slate-500 block">Requires 15 sample trades</span>
          </div>
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-left space-y-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">50-Trade Forecast</span>
            <strong className="text-xl font-mono text-slate-400">🔒 Locked</strong>
            <span className="text-[10px] text-slate-500 block">Median expected path</span>
          </div>
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-left space-y-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Worst Sim Valley</span>
            <strong className="text-xl font-mono text-slate-400">🔒 Locked</strong>
            <span className="text-[10px] text-slate-500 block">Maximum stress dip</span>
          </div>
        </div>
      </div>
    );
  }

  // Calculate SVG coordinates for the Cone of Uncertainty
  const cone = monteCarlo.conePaths || [];
  const horizon = monteCarlo.horizon || 50;
  const WIDTH = 1000;
  const HEIGHT = 260;
  const PAD = { top: 25, bottom: 30, left: 10, right: 10 };

  const allCapitals = [
    ...cone.map(c => c.p95),
    ...cone.map(c => c.p05),
    100000
  ];
  const minCap = Math.floor(Math.min(...allCapitals) / 1000) * 1000 - 1000;
  const maxCap = Math.ceil(Math.max(...allCapitals) / 1000) * 1000 + 1000;
  const capRange = Math.max(1000, maxCap - minCap);

  const getX = (step) => PAD.left + (step / horizon) * (WIDTH - PAD.left - PAD.right);
  const getY = (val) => PAD.top + (1 - (val - minCap) / capRange) * (HEIGHT - PAD.top - PAD.bottom);

  // Build SVG Paths
  const p95Points = cone.map(c => `${getX(c.step)},${getY(c.p95)}`);
  const p75Points = cone.map(c => `${getX(c.step)},${getY(c.p75)}`);
  const p50Points = cone.map(c => `${getX(c.step)},${getY(c.p50)}`);
  const p25Points = cone.map(c => `${getX(c.step)},${getY(c.p25)}`);
  const p05Points = cone.map(c => `${getX(c.step)},${getY(c.p05)}`);

  const p50Path = `M ${p50Points.join(" L ")}`;
  const p95Path = `M ${p95Points.join(" L ")}`;
  const p05Path = `M ${p05Points.join(" L ")}`;

  // Outer Fan Area (5th to 95th Percentile)
  const outerFanArea = `M ${p95Points.join(" L ")} L ${[...p05Points].reverse().join(" L ")} Z`;
  // Inner Core Area (25th to 75th Percentile)
  const innerCoreArea = `M ${p75Points.join(" L ")} L ${[...p25Points].reverse().join(" L ")} Z`;

  const baselineY = getY(100000);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const svgX = (clientX / rect.width) * WIDTH;
    const rawStep = ((svgX - PAD.left) / (WIDTH - PAD.left - PAD.right)) * horizon;
    const step = Math.max(0, Math.min(horizon, Math.round(rawStep)));
    setHoverStep(step);
  };

  const handleTouchMove = (e) => {
    if (!e.touches || !e.touches[0]) return;
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = Math.max(0, Math.min(rect.width, touch.clientX - rect.left));
    const svgX = (clientX / rect.width) * WIDTH;
    const rawStep = ((svgX - PAD.left) / (WIDTH - PAD.left - PAD.right)) * horizon;
    const step = Math.max(0, Math.min(horizon, Math.round(rawStep)));
    setHoverStep(step);
  };

  const activeConePoint = hoverStep !== null && cone[hoverStep] ? cone[hoverStep] : null;

  return (
    <div className="space-y-4">
      {/* 3 Metric Header Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Metric 1: 15% Drawdown Breach Risk */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#0d111a]/85 backdrop-blur-2xl border border-purple-500/25 space-y-1.5 shadow-lg shadow-purple-500/5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider font-mono">15% Drawdown Breach Risk</span>
            <ShieldAlert className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <strong
            className={clsx(
              "text-2xl sm:text-3xl font-black font-mono block tracking-tight",
              monteCarlo.ruinProbability <= 5 ? "text-emerald-400" : "text-amber-400"
            )}
          >
            {monteCarlo.ruinProbability}%
          </strong>
          <span className="text-xs text-slate-300 block">
            {monteCarlo.ruinProbability <= 5 ? "🛡️ Statistically Resilient Edge" : "⚠️ Controlled Drawdown Buffer"}
          </span>
        </div>

        {/* Metric 2: Median Horizon Forecast */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#0d111a]/85 backdrop-blur-2xl border border-cyan-500/25 space-y-1.5 shadow-lg shadow-cyan-500/5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-cyan-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
              <span>{horizon}-Trade Forecast (Median)</span>
              {isPendingMc && <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />}
            </span>
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-cyan-300 block tracking-tight">
            <RollingTicker value={monteCarlo.medianEndCapital} prefix="₹" decimalPlaces={0} />
          </div>
          <span className="text-xs text-slate-300 block">
            Expected: +{monteCarlo.expectedReturnPct}% (Median path after {horizon} trades)
          </span>
        </div>

        {/* Metric 3: Worst Sim Valley */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#0d111a]/85 backdrop-blur-2xl border border-rose-500/25 space-y-1.5 shadow-lg shadow-rose-500/5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-rose-300 uppercase tracking-wider font-mono">Worst Sim Valley (Max DD)</span>
            <Waves className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <strong className="text-2xl sm:text-3xl font-black font-mono text-rose-400 block tracking-tight">
            -₹{monteCarlo.worstDrawdown.toLocaleString("en-IN")}
          </strong>
          <span className="text-xs text-slate-300 block">Maximum stress dip across 1,000 simulated paths</span>
        </div>
      </div>

      {/* Interactive Cone of Uncertainty Visual Canvas */}
      <div className="relative rounded-3xl bg-[#0d111a]/95 border border-white/[0.07] p-4 sm:p-6 overflow-hidden backdrop-blur-3xl shadow-[0_24px_60px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.08)]">
        {/* Ambient Purple/Cyan Glow */}
        <div className="absolute -top-24 right-1/4 w-96 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono mb-3.5 relative z-10">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.9)] animate-pulse" />
            <div>
              <span className="font-black text-white text-xs sm:text-sm tracking-wider uppercase">CONE OF UNCERTAINTY (1,000 PATHS)</span>
              <span className="block text-[10.5px] text-slate-400 font-normal">Bootstrapped Forward Probability Envelope</span>
            </div>
          </div>

          {/* Horizon Selector */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-[10.5px]">
            <span className="text-slate-400 px-1.5 flex items-center gap-1">
              <Sliders className="w-3 h-3 text-purple-400" />
              <span>Horizon:</span>
            </span>
            {[25, 50, 100].map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => setMcHorizon?.(h)}
                className={clsx(
                  "px-2 py-0.5 rounded-lg font-bold transition-all cursor-pointer",
                  mcHorizon === h
                    ? "bg-purple-500/25 text-purple-200 border border-purple-400/40"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                {h} Trades
              </button>
            ))}
          </div>
        </div>

        {/* Visual Chart Canvas */}
        <div className="relative w-full overflow-hidden rounded-2xl bg-[#050608]/90 border border-white/[0.06] p-1 sm:p-2">
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="w-full h-64 sm:h-80 select-none touch-none cursor-crosshair overflow-visible"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHoverStep(null)}
            onTouchStart={handleTouchMove}
            onTouchMove={handleTouchMove}
            onTouchEnd={() => setHoverStep(null)}
            onTouchCancel={() => setHoverStep(null)}
          >
            <defs>
              <linearGradient id="mcOuterFanGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.12" />
                <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.12" />
              </linearGradient>

              <linearGradient id="mcInnerCoreGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#a855f7" stopOpacity="0.22" />
              </linearGradient>
            </defs>

            {/* Micro-grid */}
            <rect x="0" y="0" width={WIDTH} height={HEIGHT} fill="url(#spatialMicroGrid)" />

            {/* ₹1.00L Base Reference */}
            <line x1="0" y1={baselineY} x2={WIDTH} y2={baselineY} stroke="rgba(255, 255, 255, 0.2)" strokeDasharray="3 3" />
            <text x={WIDTH - 24} y={baselineY - 6} textAnchor="end" fill="rgba(255, 255, 255, 0.35)" fontSize="9.5" fontFamily="monospace">
              ₹1.00L BASE
            </text>


            {/* Spaghetti Paths (15 faint background simulations) */}
            {monteCarlo.spaghettiPaths?.map((path, idx) => {
              const d = path.map((val, step) => `${getX(step)},${getY(val)}`).join(" L ");
              return (
                <path
                  key={idx}
                  d={`M ${d}`}
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.05)"
                  strokeWidth="1"
                />
              );
            })}

            {/* Outer Fan Area (90% Confidence Interval: 5% to 95%) */}
            <path d={outerFanArea} fill="url(#mcOuterFanGrad)" />

            {/* Inner Core Area (50% Interquartile Range: 25% to 75%) */}
            <path d={innerCoreArea} fill="url(#mcInnerCoreGrad)" />

            {/* P95 Bull Path (Dashed Emerald) */}
            <path d={p95Path} fill="none" stroke="#10b981" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.8" />
            
            {/* P05 Bear Path (Dashed Rose) */}
            <path d={p05Path} fill="none" stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.8" />

            {/* P50 Median Expected Trajectory (Luminous Cyan Spline) */}
            <path d={p50Path} fill="none" stroke="#06b6d4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

            {/* Crosshair Scrub Guide */}
            {hoverStep !== null && (
              <line
                x1={getX(hoverStep)}
                y1={PAD.top}
                x2={getX(hoverStep)}
                y2={HEIGHT - PAD.bottom}
                stroke="rgba(255, 255, 255, 0.45)"
                strokeDasharray="2 2"
              />
            )}
          </svg>
        </div>

        {/* Interactive Scrub Telemetry Pill */}
        {activeConePoint && (
          <div className="mt-3 p-3 rounded-2xl bg-white/[0.02] border border-white/[0.08] flex items-center justify-between text-xs font-mono flex-wrap gap-2">
            <span className="font-bold text-white">
              Forward Step #{activeConePoint.step} of {horizon}:
            </span>
            <div className="flex items-center gap-3">
              <span className="text-emerald-400">
                Bull (95th): <strong>₹{activeConePoint.p95.toLocaleString("en-IN", { minimumFractionDigits: 0 })}</strong>
              </span>
              <span className="text-cyan-300">
                Median (50th): <strong>₹{activeConePoint.p50.toLocaleString("en-IN", { minimumFractionDigits: 0 })}</strong>
              </span>
              <span className="text-rose-400">
                Bear (5th): <strong>₹{activeConePoint.p05.toLocaleString("en-IN", { minimumFractionDigits: 0 })}</strong>
              </span>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="mt-3 flex items-center gap-4 text-[11px] font-mono text-slate-400 flex-wrap justify-between">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-emerald-400 inline-block border-t border-dashed" />
              <span>95th Percentile (Bull Ceiling)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-1 bg-cyan-400 inline-block rounded" />
              <span>50th Percentile (Median Path)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-rose-400 inline-block border-t border-dashed" />
              <span>5th Percentile (Stress Floor)</span>
            </span>
          </div>
          <span className="text-slate-500">1,000 Non-Parametric Resampled Iterations</span>
        </div>

        {/* Reality Banner */}
        <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-xs text-slate-300 mt-4 flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
          <div>
            <strong className="text-white block mb-0.5 font-mono text-[11px]">Why Cone Expansion Confirms Statistical Edge:</strong>
            <p className="text-[11px] leading-relaxed text-slate-400">
              The Cone of Uncertainty visualizes your account&apos;s probability envelope over the next {horizon} trades. Because the median spline tilts upwards and the 5th percentile floor remains bounded, mathematical expectancy confirms that variance will not blow up your capital under Manikandan&apos;s ₹250 stop-loss rule.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EquityMonteCarloTab;

