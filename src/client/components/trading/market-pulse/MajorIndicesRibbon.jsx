import React, { useId } from "react";
import clsx from "clsx";
import { ArrowUpRight, ArrowDownRight, Zap, ShieldAlert, Sparkles, Activity } from "lucide-react";
import { MAJOR_INDICES_KEYS, generateIndexSparkline } from "./marketPulseUtils";

function IndexSparkline({ data, isGain, width = 76, height = 28 }) {
  const gradId = useId();
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((val, idx) => {
    const x = (idx / (data.length - 1)) * width;
    const y = height - ((val - min) / range) * (height - 8) - 4;
    return { x, y };
  });

  const linePath = points.reduce((acc, pt, i, arr) => {
    if (i === 0) return `M ${pt.x},${pt.y}`;
    const prev = arr[i - 1];
    const cx = (prev.x + pt.x) / 2;
    return `${acc} C ${cx},${prev.y} ${cx},${pt.y} ${pt.x},${pt.y}`;
  }, "");

  const fillPath = `${linePath} L ${width},${height} L 0,${height} Z`;
  const color = isGain ? "#10b981" : "#f43f5e";

  return (
    <svg width={width} height={height} className="overflow-visible flex-shrink-0">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path d={fillPath} fill={`url(#${gradId})`} />
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MiniRangeMeter({ low, high, current, isGain }) {
  const l = Number(low) || 0;
  const h = Number(high) || 0;
  const c = Number(current) || 0;
  const range = h - l;
  const pct = range <= 0.0001
    ? 50
    : Math.min(Math.max(((c - l) / range) * 100, 4), 96);

  return (
    <div className="space-y-1 w-full pt-1">
      <div className="flex items-center justify-between text-[8px] font-mono text-slate-400 font-bold leading-none">
        <span>L: {l > 100 ? l.toLocaleString("en-IN") : l.toFixed(2)}</span>
        <span className="text-slate-300">H: {h > 100 ? h.toLocaleString("en-IN") : h.toFixed(2)}</span>
      </div>
      <div className="relative w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden border border-white/5">
        <div
          className={clsx(
            "absolute top-0 bottom-0 left-0 rounded-full transition-all duration-500",
            isGain ? "bg-emerald-500/40" : "bg-rose-500/40"
          )}
          style={{ width: `${pct}%` }}
        />
        <div
          className="absolute top-0 bottom-0 w-1.5 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.9)] -ml-0.5 transition-all duration-500"
          style={{ left: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function MajorIndicesRibbon({ indicesData = {}, onOpenScalp, vixRegime, instantScalpMode = false }) {
  return (
    <div className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar pb-2 sm:pb-0 sm:grid sm:grid-cols-2 lg:grid-cols-5 gap-3.5 -mx-1 px-1">
      {MAJOR_INDICES_KEYS.map((cfg) => {
        const quote = indicesData[cfg.key] || {
          ltp: cfg.fallbackLtp,
          change: cfg.fallbackChange,
          changePct: 0.35,
          open: cfg.fallbackLtp - 20,
          high: cfg.fallbackLtp + 40,
          low: cfg.fallbackLtp - 30,
          close: cfg.fallbackLtp - cfg.fallbackChange
        };

        const isGain = Number(quote.change) >= 0;
        const isVix = !!cfg.isVix;
        const sparkline = generateIndexSparkline(quote.ltp, quote.change, isVix);

        return (
          <div
            key={cfg.key}
            className="min-w-[260px] sm:min-w-0 snap-start flex-1 group relative rounded-2xl bg-white/[0.025] hover:bg-white/[0.045] border border-white/[0.08] hover:border-white/[0.16] p-4 transition-all duration-300 backdrop-blur-2xl shadow-[0_8px_24px_rgba(0,0,0,0.4)] flex flex-col justify-between"
          >
            {/* Ambient Radial Accent */}
            <div
              className={clsx(
                "absolute top-0 right-0 w-28 h-28 rounded-full blur-2xl pointer-events-none transition-opacity opacity-20 group-hover:opacity-40",
                isVix
                  ? "bg-amber-500"
                  : isGain
                    ? "bg-emerald-500"
                    : "bg-rose-500"
              )}
            />

            <div className="space-y-3 relative z-10">
              {/* Header Title & Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={clsx(
                      "w-2 h-2 rounded-full",
                      isVix
                        ? "bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]"
                        : isGain
                          ? "bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]"
                          : "bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.8)]",
                      "animate-pulse"
                    )}
                  />
                  <h4 className="text-xs font-black text-slate-100 font-mono tracking-wider">
                    {cfg.symbol}
                  </h4>
                </div>

                <span
                  className={clsx(
                    "text-[8px] font-mono font-bold px-2 py-0.5 rounded-full border",
                    isVix
                      ? "text-amber-300 bg-amber-500/10 border-amber-500/20"
                      : "text-slate-400 bg-white/[0.04] border-white/[0.08]"
                  )}
                >
                  {isVix ? "VOLATILITY" : `LOT: ${cfg.lotSize}`}
                </span>
              </div>

              {/* Price & Sparkline */}
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-lg font-black text-white font-mono tracking-tight tabular-nums">
                    {isVix
                      ? Number(quote.ltp || 13.5).toFixed(2)
                      : Number(quote.ltp || 25000).toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span
                      className={clsx(
                        "text-[9px] font-mono font-extrabold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 border shadow-sm",
                        isGain
                          ? "text-emerald-300 bg-emerald-500/15 border-emerald-500/30"
                          : "text-rose-300 bg-rose-500/15 border-rose-500/30"
                      )}
                    >
                      {isGain ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
                      {isGain ? "+" : ""}
                      {Number(quote.change || 0).toFixed(2)} ({isGain ? "+" : ""}
                      {quote.changePct}%)
                    </span>
                  </div>
                </div>

                {/* Smooth Area Sparkline */}
                <IndexSparkline data={sparkline} isGain={isGain} width={68} height={26} />
              </div>

              {/* Day Low / High Range Bar */}
              <MiniRangeMeter
                low={quote.low || quote.ltp - 30}
                high={quote.high || quote.ltp + 40}
                current={quote.ltp}
                isGain={isGain}
              />
            </div>

            {/* Bottom Action Footer */}
            <div className="mt-3.5 pt-2.5 border-t border-white/[0.06] relative z-10">
              {isVix ? (
                <div className="flex items-center justify-between gap-1 text-[9px] font-mono">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Activity className="w-3 h-3 text-amber-400" />
                    Regime:
                  </span>
                  <span
                    className={clsx(
                      "font-bold px-1.5 py-0.5 rounded border text-[8px] truncate max-w-[120px]",
                      vixRegime?.tone || "text-emerald-400 bg-emerald-500/15 border-emerald-500/30"
                    )}
                    title={vixRegime?.description}
                  >
                    {vixRegime?.label || "Optimal Scalp"}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenScalp(cfg.key, "CE")}
                    className="flex-1 py-1 px-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 active:scale-95 border border-emerald-500/25 hover:border-emerald-500/40 text-emerald-300 font-mono text-[9px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                    title={instantScalpMode ? `⚡ Direct Instant ${cfg.symbol} ATM Call Scalp (₹250 Max Risk)` : `Open ${cfg.symbol} ATM Call Scalp Modal (₹250 Risk Budget)`}
                  >
                    <Zap className="w-2.5 h-2.5 text-emerald-400" />
                    <span>{instantScalpMode ? "Instant CE" : "CE Scalp"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenScalp(cfg.key, "PE")}
                    className="flex-1 py-1 px-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 active:scale-95 border border-rose-500/25 hover:border-rose-500/40 text-rose-300 font-mono text-[9px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                    title={instantScalpMode ? `⚡ Direct Instant ${cfg.symbol} ATM Put Scalp (₹250 Max Risk)` : `Open ${cfg.symbol} ATM Put Scalp Modal (₹250 Risk Budget)`}
                  >
                    <Zap className="w-2.5 h-2.5 text-rose-400" />
                    <span>{instantScalpMode ? "Instant PE" : "PE Scalp"}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
