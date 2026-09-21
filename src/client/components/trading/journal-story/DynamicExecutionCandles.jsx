import React, { useState, useRef, useEffect } from "react";
import clsx from "clsx";
import { Sparkles, TrendingUp, TrendingDown, AlertCircle, Play, Pause, RotateCcw } from "lucide-react";
import { resolveIndexLotSize } from "../../../stores/slices/tradeHelpers";
import { soundEngine } from "../../../utils/soundEngine";

/**
 * 🌟 Dynamic Trade Journey Canvas & Interactive Milestone Replay Player
 * Institutional execution path visualization with interactive playhead & live P&L ticker.
 * Simulates real-time psychological pressure: Entry Fill ➔ MAE Heat Wick ➔ MFE Alpha Peak ➔ Exit.
 */
export function DynamicExecutionCandles({ trade, isGain }) {
  const containerRef = useRef(null);
  const [hoverData, setHoverData] = useState(null);

  // Replay Player State
  const [isReplaying, setIsReplaying] = useState(false);
  const [replayProgress, setReplayProgress] = useState(0); // 0 (Entry) to 1 (Exit)
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const hasTriggeredMaeAudio = useRef(false);
  const hasTriggeredMfeAudio = useRef(false);

  const effectiveLotSize = resolveIndexLotSize(trade.symbol, trade.lotSize);
  const rawQty = Number(trade.quantity || 1);
  const qty = Number(trade.totalQty || (rawQty >= effectiveLotSize ? rawQty : rawQty * effectiveLotSize));

  const entry = Number(trade.entryPrice || 0);
  const exit = Number(trade.exitPrice || 0);

  // Dynamic Stop Loss & Target derived strictly from ₹250 risk budget
  const defaultSlPts = Number((250 / Math.max(1, qty)).toFixed(2));
  const defaultTpPts = Number((defaultSlPts * 2.0).toFixed(2));

  const sl = Number(trade.stopLoss || (entry > defaultSlPts ? entry - defaultSlPts : Math.max(0.1, entry * 0.95)));
  const tp = Number(trade.targetPrice || (entry + defaultTpPts));

  const isShort = trade.direction === "SHORT" || trade.side === "SELL";
  const pts = isShort ? (entry - exit) : (exit - entry);

  // MFE & MAE Excursions
  const defaultMaePts = isGain ? Math.min(defaultSlPts * 0.4, 1.2) : Math.abs(pts);
  const defaultMfePts = isGain ? Math.abs(pts) * 1.15 : Math.max(0.5, defaultTpPts * 0.35);

  const maePts = Number(trade.maePts ?? defaultMaePts);
  const mfePts = Number(trade.mfePts ?? defaultMfePts);

  const maePrice = isShort ? entry + maePts : entry - maePts;
  const mfePrice = isShort ? entry - mfePts : entry + mfePts;

  // Coordinate Bounds
  const allPrices = [entry, exit, sl, tp, maePrice, mfePrice].filter((p) => Number.isFinite(p) && p > 0);
  const minPrice = allPrices.length > 0 ? Math.min(...allPrices) : 10;
  const maxPrice = allPrices.length > 0 ? Math.max(...allPrices) : 50;
  const priceRange = Math.max(2, maxPrice - minPrice);
  const paddedMin = Math.max(0.1, minPrice - priceRange * 0.12);
  const paddedMax = maxPrice + priceRange * 0.12;
  const paddedRange = Math.max(1, paddedMax - paddedMin);

  // SVG dimensions
  const SVG_WIDTH = 480;
  const SVG_HEIGHT = 120;
  const PADDING_Y = 16;
  const USABLE_HEIGHT = SVG_HEIGHT - PADDING_Y * 2;

  const getY = (price) => {
    const normalized = (price - paddedMin) / paddedRange;
    return PADDING_Y + USABLE_HEIGHT * (1 - Math.max(0, Math.min(1, normalized)));
  };

  const isScratch = maePts < 0.6 && mfePts < 0.6;
  const entryY = getY(entry);
  const exitY = getY(exit);
  const slY = getY(sl);
  const tpY = getY(tp);
  const maeY = getY(maePrice) + (isScratch ? 10 : 0);
  const mfeY = getY(mfePrice) - (isScratch ? 10 : 0);

  // Milestone X Coordinates
  const x0 = 40;  // Pre-entry base
  const x1 = 120; // Entry fill
  const x2 = 230; // MAE adverse heat wick
  const x3 = 340; // MFE favorable peak
  const x4 = 440; // Final Exit fill

  const unharvestedPts = Math.max(0, mfePts - (isGain ? Math.abs(pts) : 0));
  const unharvestedRupees = Math.round(unharvestedPts * qty);
  const riskBudgetRupees = Math.round(Math.abs(entry - sl) * qty);

  // Replay animation loop
  useEffect(() => {
    let animId;
    if (isReplaying) {
      const stepDuration = 3500 / playbackSpeed;
      let startTime = performance.now() - replayProgress * stepDuration;

      const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(1, elapsed / stepDuration);
        setReplayProgress(progress);

        if (progress >= 0.35 && !hasTriggeredMaeAudio.current) {
          soundEngine?.playTick?.();
          hasTriggeredMaeAudio.current = true;
        }
        if (progress >= 0.70 && !hasTriggeredMfeAudio.current) {
          if (isGain) soundEngine?.playSuccessTone?.();
          hasTriggeredMfeAudio.current = true;
        }

        if (progress < 1) {
          animId = requestAnimationFrame(animate);
        } else {
          setIsReplaying(false);
          hasTriggeredMaeAudio.current = false;
          hasTriggeredMfeAudio.current = false;
        }
      };

      animId = requestAnimationFrame(animate);
    }
    return () => cancelAnimationFrame(animId);
  }, [isReplaying, playbackSpeed]);

  const toggleReplay = () => {
    // Proactively unlock audio context within user click gesture
    try {
      soundEngine?.init?.();
    } catch {
      // Ignore audio init restrictions
    }
    if (isReplaying) {
      setIsReplaying(false);
    } else {
      if (replayProgress >= 1) {
        setReplayProgress(0);
        hasTriggeredMaeAudio.current = false;
        hasTriggeredMfeAudio.current = false;
      }
      setIsReplaying(true);
    }
  };

  const resetReplay = () => {
    setIsReplaying(false);
    setReplayProgress(0);
    hasTriggeredMaeAudio.current = false;
    hasTriggeredMfeAudio.current = false;
  };

  const replayX = x1 + replayProgress * (x4 - x1);
  let replayPrice = entry;
  if (replayX <= x2) {
    const t = (replayX - x1) / Math.max(1, x2 - x1);
    replayPrice = entry + (maePrice - entry) * t;
  } else if (replayX <= x3) {
    const t = (replayX - x2) / Math.max(1, x3 - x2);
    replayPrice = maePrice + (mfePrice - maePrice) * t;
  } else {
    const t = Math.min(1, (replayX - x3) / Math.max(1, x4 - x3));
    replayPrice = mfePrice + (exit - mfePrice) * t;
  }
  const replayY = getY(replayPrice);
  const replayPts = isShort ? (entry - replayPrice) : (replayPrice - entry);
  const replayRupees = Math.round(replayPts * qty);

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const pct = x / rect.width;
    const svgX = pct * SVG_WIDTH;

    // Interpolate price milestone along path
    let estPrice = entry;
    if (svgX <= x1) {
      estPrice = entry;
    } else if (svgX <= x2) {
      const t = (svgX - x1) / Math.max(1, x2 - x1);
      estPrice = entry + (maePrice - entry) * t;
    } else if (svgX <= x3) {
      const t = (svgX - x2) / Math.max(1, x3 - x2);
      estPrice = maePrice + (mfePrice - maePrice) * t;
    } else {
      const t = Math.min(1, (svgX - x3) / Math.max(1, x4 - x3));
      estPrice = mfePrice + (exit - mfePrice) * t;
    }

    const excursionPts = isShort ? (entry - estPrice) : (estPrice - entry);
    const rupeeImpact = Math.round(excursionPts * qty);

    setHoverData({
      xPct: pct * 100,
      price: estPrice,
      rupees: rupeeImpact,
      pts: excursionPts
    });
  };

  const handleMouseLeave = () => {
    setHoverData(null);
  };

  return (
    <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-2.5">
      {/* Header telemetry */}
      <div className="flex items-center justify-between text-[10px] text-slate-400 flex-wrap gap-1">
        <span className="font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5 font-sans">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Execution Trajectory &amp; Replay Studio</span>
        </span>

        <div className="flex items-center gap-2 font-mono text-[10px]">
          <span className="text-rose-400">SL: ₹{sl.toFixed(2)} (₹{riskBudgetRupees})</span>
          <span className="text-slate-500">|</span>
          <span className="text-emerald-400">TP: ₹{tp.toFixed(2)}</span>
          <span className="text-slate-500">|</span>
          <span className="text-cyan-300 font-bold">1:{(Math.abs(tp - entry) / Math.max(0.1, Math.abs(entry - sl))).toFixed(2)} RR</span>
        </div>
      </div>

      {/* 🎮 Interactive Replay Scrubber & Control Bar */}
      <div className="flex items-center justify-between gap-2.5 p-2 rounded-xl bg-[#090d16]/80 border border-white/[0.06] flex-wrap text-xs">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={toggleReplay}
            className={clsx(
              "px-2.5 py-1 rounded-lg font-bold text-[10px] flex items-center gap-1 transition-all shadow-sm cursor-pointer",
              isReplaying 
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40" 
                : "bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40"
            )}
            title={isReplaying ? "Pause Execution Replay" : "Play Execution Replay"}
          >
            {isReplaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            <span>{isReplaying ? "Pause" : replayProgress > 0 && replayProgress < 1 ? "Resume" : "▶ Replay"}</span>
          </button>

          <button
            type="button"
            onClick={resetReplay}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition cursor-pointer"
            title="Reset Playhead to Entry"
          >
            <RotateCcw className="w-3 h-3" />
          </button>

          <div className="flex items-center gap-1 pl-1">
            {[1, 2, 4].map((spd) => (
              <button
                key={spd}
                type="button"
                onClick={() => setPlaybackSpeed(spd)}
                className={clsx(
                  "px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition cursor-pointer",
                  playbackSpeed === spd 
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30" 
                    : "text-slate-500 hover:text-slate-300"
                )}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>

        {/* Live Scrubber Slider */}
        <div className="flex items-center gap-2 flex-1 max-w-xs min-w-[120px]">
          <input
            type="range"
            min="0"
            max="1"
            step="0.005"
            value={replayProgress}
            onChange={(e) => {
              setIsReplaying(false);
              setReplayProgress(Number(e.target.value));
            }}
            className="w-full accent-cyan-400 h-1 bg-white/10 rounded-lg cursor-pointer"
          />
        </div>

        {/* Simulated Real-Time P&L Ticker */}
        <div className="flex items-center gap-2 font-mono text-[10px] flex-shrink-0">
          <span className="text-slate-400">Sim: ₹{replayPrice.toFixed(2)}</span>
          <span className={clsx("font-bold px-1.5 py-0.5 rounded", replayRupees >= 0 ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300")}>
            {replayRupees >= 0 ? "+" : ""}₹{replayRupees} ({replayPts >= 0 ? "+" : ""}{replayPts.toFixed(1)}pt)
          </span>
        </div>
      </div>

      {/* SVG Canvas */}
      <div 
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative w-full h-[120px] bg-slate-950/80 rounded-xl border border-white/5 overflow-hidden cursor-crosshair select-none"
      >
        <svg className="w-full h-full" viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} preserveAspectRatio="none">
          {/* Reference channel lines */}
          {/* Target Price Channel (Green) */}
          <line x1="0" y1={tpY} x2={SVG_WIDTH} y2={tpY} stroke="rgba(16,185,129,0.3)" strokeDasharray="3 3" strokeWidth="1" />
          {/* Entry Level Reference (Cyan) */}
          <line x1="0" y1={entryY} x2={SVG_WIDTH} y2={entryY} stroke="rgba(6,182,212,0.25)" strokeDasharray="2 2" strokeWidth="1" />
          {/* Stop Loss Channel (Rose) */}
          <line x1="0" y1={slY} x2={SVG_WIDTH} y2={slY} stroke="rgba(244,63,94,0.3)" strokeDasharray="3 3" strokeWidth="1" />

          {/* Area fill under trajectory */}
          <path
            d={`M ${x1} ${entryY} Q ${(x1 + x2) / 2} ${maeY}, ${x2} ${maeY} Q ${(x2 + x3) / 2} ${mfeY}, ${x3} ${mfeY} L ${x4} ${exitY} L ${x4} ${SVG_HEIGHT} L ${x1} ${SVG_HEIGHT} Z`}
            fill={isGain ? "rgba(16,185,129,0.06)" : "rgba(244,63,94,0.06)"}
          />

          {/* Trajectory Path */}
          <path
            d={`M ${x0} ${entryY} L ${x1} ${entryY} Q ${(x1 + x2) / 2} ${maeY}, ${x2} ${maeY} Q ${(x2 + x3) / 2} ${mfeY}, ${x3} ${mfeY} L ${x4} ${exitY}`}
            fill="none"
            stroke={isGain ? "#10b981" : "#f43f5e"}
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Setup Trigger Marker */}
          <circle cx={x0} cy={entryY} r="3" fill="#64748b" />
          
          {/* Entry Marker */}
          <circle cx={x1} cy={entryY} r="4.5" fill="#06b6d4" stroke="#083344" strokeWidth="1.5" />

          {/* MAE Wick Marker (Adverse heat) */}
          <circle cx={x2} cy={maeY} r="3.5" fill="#f43f5e" stroke="#881337" strokeWidth="1" />

          {/* MFE Peak Marker (Favorable alpha) */}
          <circle cx={x3} cy={mfeY} r="4" fill="#10b981" stroke="#064e3b" strokeWidth="1" />

          {/* Exit Resolution Marker */}
          <circle cx={x4} cy={exitY} r="5" fill={isGain ? "#10b981" : "#f43f5e"} stroke="#ffffff" strokeWidth="1.5" />

          {/* Interactive Replay Playhead Laser & Position Bead */}
          {replayProgress > 0 && (
            <g className="transition-all duration-75 ease-linear pointer-events-none">
              <line
                x1={replayX}
                y1={0}
                x2={replayX}
                y2={SVG_HEIGHT}
                stroke="#38bdf8"
                strokeWidth="1.5"
                strokeDasharray="2 2"
                opacity="0.85"
              />
              <circle
                cx={replayX}
                cy={replayY}
                r="8"
                fill="none"
                stroke={replayRupees >= 0 ? "#34d399" : "#f43f5e"}
                strokeWidth="1.5"
                opacity="0.5"
              />
              <circle
                cx={replayX}
                cy={replayY}
                r="5"
                fill={replayRupees >= 0 ? "#10b981" : "#ef4444"}
                stroke="#ffffff"
                strokeWidth="2"
              />
            </g>
          )}
        </svg>

        {/* Milestone Badges Overlay */}
        <div 
          className="absolute text-[9px] font-mono text-cyan-300 bg-cyan-950/90 px-1.5 py-0.5 rounded border border-cyan-500/40 shadow-sm whitespace-nowrap pointer-events-none"
          style={{ left: `${(x1 / SVG_WIDTH) * 100}%`, top: `${Math.min(85, Math.max(10, (entryY / SVG_HEIGHT) * 100))}%`, transform: "translate(-50%, -120%)" }}
        >
          FILL ₹{entry.toFixed(2)}
        </div>

        <div 
          className="absolute text-[9px] font-mono text-rose-300 bg-rose-950/90 px-1.5 py-0.5 rounded border border-rose-500/40 shadow-sm whitespace-nowrap pointer-events-none"
          style={{ left: `${(x2 / SVG_WIDTH) * 100}%`, top: `${Math.min(85, Math.max(10, (maeY / SVG_HEIGHT) * 100))}%`, transform: "translate(-50%, 20%)" }}
        >
          MAE -{maePts.toFixed(1)}pt
        </div>

        <div 
          className="absolute text-[9px] font-mono text-emerald-300 bg-emerald-950/90 px-1.5 py-0.5 rounded border border-emerald-500/40 shadow-sm whitespace-nowrap pointer-events-none"
          style={{ left: `${(x3 / SVG_WIDTH) * 100}%`, top: `${Math.min(85, Math.max(10, (mfeY / SVG_HEIGHT) * 100))}%`, transform: "translate(-50%, -120%)" }}
        >
          MFE +{mfePts.toFixed(1)}pt
        </div>

        <div 
          className={clsx(
            "absolute text-[9px] font-mono px-1.5 py-0.5 rounded border shadow-sm whitespace-nowrap pointer-events-none",
            isGain ? "text-emerald-200 bg-emerald-950/90 border-emerald-500/40" : "text-rose-200 bg-rose-950/90 border-rose-500/40"
          )}
          style={{ right: "8px", top: `${Math.min(85, Math.max(10, (exitY / SVG_HEIGHT) * 100))}%`, transform: "translateY(-50%)" }}
        >
          EXIT ₹{exit.toFixed(2)} ({isGain ? "+" : ""}{pts.toFixed(1)}pt)
        </div>

        {/* Interactive Hover Reticle & Excursion Inspector */}
        {hoverData && (
          <>
            <div 
              className="absolute top-0 bottom-0 w-px bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)] pointer-events-none"
              style={{ left: `${hoverData.xPct}%` }}
            />
            <div 
              className="absolute top-2 z-10 px-2 py-0.5 rounded-lg bg-[#070b14]/95 border border-cyan-500/40 text-[10px] font-mono text-cyan-300 shadow-xl pointer-events-none -translate-x-1/2 whitespace-nowrap"
              style={{ left: `${Math.min(85, Math.max(15, hoverData.xPct))}%` }}
            >
              <span>₹{hoverData.price.toFixed(2)}</span>
              <span className="mx-1 text-slate-500">·</span>
              <span className={hoverData.rupees >= 0 ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                {hoverData.rupees >= 0 ? "+" : ""}₹{hoverData.rupees} ({hoverData.pts >= 0 ? "+" : ""}{hoverData.pts.toFixed(1)}pt)
              </span>
            </div>
          </>
        )}
      </div>

      {/* Footer milestone narrative */}
      <div className="flex items-center justify-between text-[10px] text-slate-400 font-sans flex-wrap gap-2 pt-0.5">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span>Entry</span>
          </span>
          <span>➔</span>
          <span className="flex items-center gap-1 text-rose-400">
            <TrendingDown className="w-3 h-3" />
            <span>Max Adverse Heat: -₹{Math.round(maePts * qty)}</span>
          </span>
          <span>➔</span>
          <span className="flex items-center gap-1 text-emerald-400">
            <TrendingUp className="w-3 h-3" />
            <span>Max Alpha Peak: +₹{Math.round(mfePts * qty)}</span>
          </span>
        </div>

        {unharvestedPts > 1.5 && (
          <span className="text-amber-300 font-bold bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 flex items-center gap-1">
            <AlertCircle className="w-3 h-3 text-amber-400" />
            <span>Left +₹{unharvestedRupees} unharvested</span>
          </span>
        )}
      </div>
    </div>
  );
}

export default DynamicExecutionCandles;
