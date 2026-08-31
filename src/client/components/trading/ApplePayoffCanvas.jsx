import React, { useState, useRef, useMemo, useCallback } from "react";
import { soundEngine } from "../../utils/soundEngine";
import { Sparkles, Info, Target, ShieldAlert, Zap, TrendingUp, HelpCircle, Crosshair, AlertCircle, Hand } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";

/**
 * 🌟 Apple Spatial Expiry P&L Map (Level 3 Elite - Human Centered)
 * High-performance SVG mathematical option payoff simulator with dual-gradient fills,
 * interactive pointer/touch scrubbing with 75ms throttled audio haptics, 5-tick strike ruler,
 * dynamic breakeven/SL/Target anchors, defensive input clamping, and 1-click R:R presets with ₹ tags.
 */
export function ApplePayoffCanvas({
  optionType = "CALL", // "CALL" | "PUT"
  direction = "BUY", // "BUY" | "SELL"
  spotPrice = 24005.55,
  strikePrice = 24100,
  netEntryPrice = 100.50,
  stopLoss = 83.50,
  targetPrice = 142.00,
  quantity = 1,
  lotSize = 65,
  strategyMode = "NAKED", // "NAKED" | "SPREAD"
  hedgeStrike = 23900,
  hedgePrice = 23.90,
  onSetTarget,
  onSetStopLoss
}) {
  const containerRef = useRef(null);
  const lastAudioTickRef = useRef(0);
  const [scrubX, setScrubX] = useState(null);
  const [isScrubbing, setIsScrubbing] = useState(false);

  const qty = Number(quantity || 1);
  const lot = Number(lotSize || 65);
  const totalShares = qty * lot;
  const entry = Number(netEntryPrice || 0.05);
  const strike = Number(strikePrice || spotPrice);
  const sl = Number(stopLoss || entry * 0.8);
  const tp = Number(targetPrice || entry * 1.4);
  const isCall = optionType === "CALL";
  const isBuy = direction === "BUY";

  // Defensive SL sanity check
  const rawRiskPts = isBuy ? (entry - sl) : (sl - entry);
  const isSLInverted = rawRiskPts <= 0;
  const riskPts = Math.max(1, rawRiskPts);
  const rawRewardPts = isBuy ? (tp - entry) : (entry - tp);
  const rewardPts = Math.max(1, rawRewardPts);

  // 1. Exact Breakeven Calculation
  const breakevenSpot = useMemo(() => {
    if (strategyMode === "SPREAD") {
      const netDebit = Math.max(0.05, entry - Number(hedgePrice || 0));
      return isCall ? strike + netDebit : strike - netDebit;
    }
    return isCall ? strike + entry : strike - entry;
  }, [strategyMode, isCall, strike, entry, hedgePrice]);

  // 2. Probability of Profit (POP %) Heuristic
  const popPercent = useMemo(() => {
    const dailyVol = spotPrice * (0.135 / Math.sqrt(252)); // 13.5% India VIX proxy
    const distToBE = isCall ? (breakevenSpot - spotPrice) : (spotPrice - breakevenSpot);
    const zScore = distToBE / (dailyVol * 1.5);
    // Sigmoid approximation of standard normal cumulative distribution
    const prob = 1 / (1 + Math.exp(zScore * 1.2));
    const popVal = Math.min(94, Math.max(12, Math.round(prob * 100)));
    return popVal;
  }, [spotPrice, breakevenSpot, isCall]);

  // 3. Domain Range [S_min, S_max] Auto-Scaling
  const domain = useMemo(() => {
    const buffer = Math.max(entry * 3.5, spotPrice * 0.015);
    const minVal = Math.min(strike, spotPrice, breakevenSpot) - buffer;
    const maxVal = Math.max(strike, spotPrice, breakevenSpot) + buffer;
    return {
      min: Math.floor(minVal / 20) * 20,
      max: Math.ceil(maxVal / 20) * 20
    };
  }, [strike, spotPrice, breakevenSpot, entry]);

  // 4. Mathematical Payoff Function at Underlying Price S_T
  const calculatePayoffAtExpiry = useCallback((sT) => {
    let intrinsic = 0;
    if (isCall) {
      intrinsic = Math.max(0, sT - strike);
      if (strategyMode === "SPREAD" && hedgeStrike > strike) {
        intrinsic = Math.min(intrinsic, hedgeStrike - strike);
      }
    } else {
      intrinsic = Math.max(0, strike - sT);
      if (strategyMode === "SPREAD" && hedgeStrike < strike) {
        intrinsic = Math.min(intrinsic, strike - hedgeStrike);
      }
    }

    const netCost = strategyMode === "SPREAD" ? (entry - Number(hedgePrice || 0)) : entry;
    const pnlPerShare = isBuy ? (intrinsic - netCost) : (netCost - intrinsic);
    const totalPnl = pnlPerShare * totalShares;
    const returnPct = netCost > 0 ? (pnlPerShare / netCost) * 100 : 0;

    return { pnl: totalPnl, returnPct, pnlPerShare };
  }, [isCall, strike, strategyMode, hedgeStrike, hedgePrice, entry, isBuy, totalShares]);

  // 5. SVG Coordinate Generator
  const canvasWidth = 600;
  const canvasHeight = 140;
  const zeroY = 78; // Y-coordinate for 0 P&L baseline

  const { points, profitPolygon, lossPolygon, maxPnl, minPnl, beCoordX } = useMemo(() => {
    const steps = 60;
    const stepSize = (domain.max - domain.min) / steps;
    const rawData = [];
    let maxV = 10;
    let minV = -10;

    for (let i = 0; i <= steps; i++) {
      const sT = domain.min + i * stepSize;
      const { pnl } = calculatePayoffAtExpiry(sT);
      if (pnl > maxV) maxV = pnl;
      if (pnl < minV) minV = pnl;
      rawData.push({ sT, pnl });
    }

    const yRange = Math.max(Math.abs(maxV), Math.abs(minV), 100);
    const scaleY = (zeroY - 18) / yRange;

    const coords = rawData.map((d) => {
      const x = ((d.sT - domain.min) / (domain.max - domain.min)) * canvasWidth;
      const y = zeroY - d.pnl * scaleY;
      return { x, y, sT: d.sT, pnl: d.pnl };
    });

    const beX = Math.max(0, Math.min(canvasWidth, ((breakevenSpot - domain.min) / (domain.max - domain.min)) * canvasWidth));

    const profitPts = coords.filter((c) => c.pnl >= 0);
    const lossPts = coords.filter((c) => c.pnl <= 0);

    let profitPoly = "";
    if (profitPts.length > 0) {
      if (isCall) {
        profitPoly = `M ${beX},${zeroY} ` + profitPts.map(p => `L ${p.x},${p.y}`).join(" ") + ` L ${coords[coords.length - 1].x},${zeroY} Z`;
      } else {
        profitPoly = `M ${coords[0].x},${zeroY} ` + profitPts.map(p => `L ${p.x},${p.y}`).join(" ") + ` L ${beX},${zeroY} Z`;
      }
    }

    let lossPoly = "";
    if (lossPts.length > 0) {
      if (isCall) {
        lossPoly = `M ${coords[0].x},${zeroY} ` + lossPts.map(p => `L ${p.x},${p.y}`).join(" ") + ` L ${beX},${zeroY} Z`;
      } else {
        lossPoly = `M ${beX},${zeroY} ` + lossPts.map(p => `L ${p.x},${p.y}`).join(" ") + ` L ${coords[coords.length - 1].x},${zeroY} Z`;
      }
    }

    return {
      points: coords,
      profitPolygon: profitPoly,
      lossPolygon: lossPoly,
      maxPnl: maxV,
      minPnl: minV,
      beCoordX: beX
    };
  }, [domain, calculatePayoffAtExpiry, breakevenSpot, isCall]);

  const mainLinePath = useMemo(() => {
    if (!points || points.length === 0) return "";
    return `M ${points[0].x},${points[0].y} ` + points.slice(1).map(p => `L ${p.x},${p.y}`).join(" ");
  }, [points]);

  const spotX = useMemo(() => {
    return Math.max(10, Math.min(canvasWidth - 10, ((spotPrice - domain.min) / (domain.max - domain.min)) * canvasWidth));
  }, [spotPrice, domain]);

  // 6. Interactive Pointer Scrub Handler with 75ms Throttled Audio Haptics
  const handlePointerScrub = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = e.clientX ?? e.touches?.[0]?.clientX;
    if (clientX == null) return;
    const relX = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const normalizedRatio = relX / rect.width;
    setScrubX(normalizedRatio);

    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    if (now - lastAudioTickRef.current > 75) {
      lastAudioTickRef.current = now;
      soundEngine.playTick();
    }
  };

  const scrubData = useMemo(() => {
    if (scrubX == null) return null;
    const currentST = domain.min + scrubX * (domain.max - domain.min);
    const { pnl, returnPct } = calculatePayoffAtExpiry(currentST);
    return {
      sT: Math.round(currentST),
      pnl: Math.round(pnl),
      returnPct: returnPct.toFixed(1),
      isProfit: pnl >= 0,
      pixelX: scrubX * canvasWidth
    };
  }, [scrubX, domain, calculatePayoffAtExpiry]);

  // 7. Quick 1-Click R:R Preset Handler
  const handleApplyRRPreset = (multiplier) => {
    const safeRisk = Math.max(2, isBuy ? (entry - sl) : (sl - entry));
    const newTargetPts = safeRisk * multiplier;
    const newTargetPrice = Math.round((isBuy ? entry + newTargetPts : entry - newTargetPts) * 100) / 100;
    if (onSetTarget) {
      onSetTarget(newTargetPrice);
      soundEngine.playTargetChime();
    }
  };

  const riskAmount = Math.round(riskPts * totalShares);
  const rewardAmount = Math.round(rewardPts * totalShares);
  const currentRR = riskAmount > 0 ? (rewardAmount / riskAmount).toFixed(2) : "2.00";

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-[#0e1628]/95 via-[#090e1c]/95 to-[#060a14]/95 border border-white/[0.08] shadow-[0_12px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)] space-y-3 relative overflow-hidden group">
      {/* Background Ambient Glow */}
      <div className="absolute top-0 right-1/4 w-48 h-48 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header Telemetry Strip: Plain English & Jargon-Free */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.2)]">
            <TrendingUp className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <strong className="text-xs font-bold text-white tracking-tight">
                Expiry P&amp;L Map
              </strong>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-mono">
                {strategyMode} {optionType}
              </span>
              {isSLInverted && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 font-mono flex items-center gap-1">
                  <AlertCircle className="w-2.5 h-2.5" /> SL Warning
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-400 block sm:inline">
              Outcome Simulator • Exact P&amp;L at 3:30 PM Expiry
            </span>
          </div>
        </div>

        {/* Glance Capsules: Breakeven & POP % */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="px-2.5 py-1 rounded-xl bg-white/[0.03] border border-white/10 flex items-center gap-1.5 text-[11px] font-mono">
            <span className="text-slate-400 text-[10px]">Breakeven:</span>
            <strong className="text-cyan-300 font-bold">₹{breakevenSpot.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</strong>
          </div>
          <div className="px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center gap-1.5 text-[11px] font-mono shadow-sm">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            <span className="text-emerald-300 text-[10px] font-bold">Win Chance:</span>
            <strong className="text-emerald-300 font-bold">{popPercent}%</strong>
          </div>
        </div>
      </div>

      {/* SVG Interactive Canvas with Initial Discovery Hint & In-Chart Watermarks */}
      <div 
        ref={containerRef}
        className="w-full h-32 relative select-none cursor-crosshair touch-none"
        onPointerDown={(e) => { setIsScrubbing(true); handlePointerScrub(e); }}
        onPointerMove={(e) => { if (isScrubbing || e.buttons === 1) handlePointerScrub(e); else handlePointerScrub(e); }}
        onPointerUp={() => setIsScrubbing(false)}
        onPointerLeave={() => { setScrubX(null); setIsScrubbing(false); }}
      >
        {/* Initial Discovery Affordance Hint (Disappears on Scrub) */}
        {!scrubData && (
          <div className="absolute top-1.5 left-1/2 -translate-x-1/2 pointer-events-none z-10 px-3 py-1 rounded-full bg-[#060e1d]/85 border border-cyan-500/30 text-[10px] text-cyan-300 font-medium shadow-lg backdrop-blur-md flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
            <Hand className="w-3 h-3 animate-bounce text-cyan-400" />
            <span>Drag or hover to inspect P&amp;L at any price</span>
          </div>
        )}

        <svg 
          className="w-full h-full overflow-visible" 
          viewBox={`0 0 ${canvasWidth} ${canvasHeight}`} 
          preserveAspectRatio="none"
        >
          <defs>
            {/* Emerald Profit Neon Glow Gradient */}
            <linearGradient id="profitEmeraldGlow" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
              <stop offset="80%" stopColor="#10b981" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>

            {/* Rose Loss Neon Glow Gradient */}
            <linearGradient id="lossRoseGlow" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.30" />
              <stop offset="80%" stopColor="#f43f5e" stopOpacity="0.06" />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
            </linearGradient>

            {/* Specular Neon Stroke Filter */}
            <filter id="neonStrokeFilter" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="#00f5c4" floodOpacity="0.6" />
            </filter>
          </defs>

          {/* Zero P&L Dashed Axis */}
          <line 
            x1="0" 
            y1={zeroY} 
            x2={canvasWidth} 
            y2={zeroY} 
            stroke="rgba(255,255,255,0.18)" 
            strokeDasharray="4,4" 
            strokeWidth="1.2" 
          />
          <text 
            x="8" 
            y={zeroY - 4} 
            fill="rgba(255,255,255,0.35)" 
            fontSize="9" 
            fontFamily="monospace"
          >
            ₹0.00 Breakeven Line
          </text>

          {/* Profit Zone Fill */}
          {profitPolygon && (
            <path d={profitPolygon} fill="url(#profitEmeraldGlow)" />
          )}

          {/* Loss Zone Fill */}
          {lossPolygon && (
            <path d={lossPolygon} fill="url(#lossRoseGlow)" />
          )}

          {/* In-Canvas Plain English Watermark Badges */}
          <text 
            x={isCall ? canvasWidth - 12 : 12} 
            y="26" 
            textAnchor={isCall ? "end" : "start"} 
            fill="rgba(16,185,129,0.35)" 
            fontSize="8.5" 
            fontWeight="bold"
            fontFamily="monospace"
          >
            ▲ PROFIT ZONE (Unlimited Upside)
          </text>

          <text 
            x={isCall ? 12 : canvasWidth - 12} 
            y={canvasHeight - 18} 
            textAnchor={isCall ? "start" : "end"} 
            fill="rgba(244,63,94,0.35)" 
            fontSize="8.5" 
            fontWeight="bold"
            fontFamily="monospace"
          >
            ▼ PROTECTED LOSS (Capped at -₹{riskAmount.toLocaleString("en-IN")})
          </text>

          {/* Main Option Payoff Curve Line */}
          {mainLinePath && (
            <path 
              d={mainLinePath} 
              fill="none" 
              stroke="#00f5c4" 
              strokeWidth="2.5" 
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#neonStrokeFilter)" 
            />
          )}

          {/* Current Spot Vertical Marker */}
          <line 
            x1={spotX} 
            y1="10" 
            x2={spotX} 
            y2={canvasHeight - 15} 
            stroke="#fbbf24" 
            strokeDasharray="2,2" 
            strokeWidth="1.2" 
            strokeOpacity="0.6" 
          />
          <circle cx={spotX} cy={zeroY} r="3" fill="#fbbf24" stroke="#000" strokeWidth="1" />
          <text 
            x={spotX} 
            y="12" 
            textAnchor="middle" 
            fill="#fbbf24" 
            fontSize="8.5" 
            fontWeight="bold"
            fontFamily="monospace"
          >
            LTP
          </text>

          {/* Breakeven Node */}
          <g transform={`translate(${beCoordX}, ${zeroY})`}>
            <circle r="6" fill="#00f5c4" fillOpacity="0.2" className="animate-ping" />
            <circle r="4" fill="#ffffff" stroke="#00f5c4" strokeWidth="2" />
          </g>

          {/* Crosshair & Scrub Marker */}
          {scrubData && (
            <g>
              <line 
                x1={scrubData.pixelX} 
                y1="5" 
                x2={scrubData.pixelX} 
                y2={canvasHeight - 10} 
                stroke="#38bdf8" 
                strokeWidth="1.5" 
                strokeDasharray="3,3" 
              />
              <circle 
                cx={scrubData.pixelX} 
                cy={zeroY - (scrubData.pnl * ((zeroY - 18) / Math.max(Math.abs(maxPnl), Math.abs(minPnl), 100)))} 
                r="4.5" 
                fill={scrubData.isProfit ? "#10b981" : "#f43f5e"} 
                stroke="#ffffff" 
                strokeWidth="2" 
              />
            </g>
          )}
        </svg>

        {/* Floating Glass Crosshair HUD Tooltip */}
        {scrubData && (
          <div 
            className="absolute top-1 pointer-events-none z-20 transform -translate-x-1/2 transition-transform duration-75"
            style={{ left: `${Math.max(12, Math.min(88, scrubX * 100))}%` }}
          >
            <div className="px-2.5 py-1.5 rounded-xl bg-[#060e1d]/95 border border-cyan-500/40 shadow-2xl backdrop-blur-xl space-y-0.5 text-center whitespace-nowrap">
              <div className="text-[10px] font-mono text-slate-300">
                Index @ <strong className="text-white">₹{scrubData.sT.toLocaleString("en-IN")}</strong>
              </div>
              <div className={clsx("text-xs font-mono font-bold", scrubData.isProfit ? "text-emerald-400" : "text-rose-400")}>
                {scrubData.isProfit ? "Profit: +" : "Loss: "}₹{Math.abs(scrubData.pnl).toLocaleString("en-IN")} ({scrubData.returnPct}%)
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Apple Glass 5-Tick Strike Scale Ruler */}
      <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 border-t border-white/[0.04] pt-1 px-1">
        <span>₹{domain.min.toLocaleString("en-IN")}</span>
        <span className="hidden sm:inline text-slate-600">₹{(domain.min + (domain.max - domain.min) * 0.25).toFixed(0)}</span>
        <span className="text-cyan-400/80 font-bold">ATM ₹{strike.toLocaleString("en-IN")}</span>
        <span className="hidden sm:inline text-slate-600">₹{(domain.min + (domain.max - domain.min) * 0.75).toFixed(0)}</span>
        <span>₹{domain.max.toLocaleString("en-IN")}</span>
      </div>

      {/* Footer Controls: Quick R:R Presets with Estimated ₹ Profit Tags */}
      <div className="pt-1.5 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
        {/* Quick R:R Preset Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-bold text-slate-400 uppercase font-mono flex items-center gap-1">
            <Crosshair className="w-3 h-3 text-cyan-400" />
            Quick Targets:
          </span>
          {[
            { label: "1:1.5", mult: 1.5 },
            { label: "1:2.0", mult: 2.0 },
            { label: "1:3.0", mult: 3.0 },
            { label: "1:4.0", mult: 4.0 }
          ].map((preset) => {
            const estProfit = Math.round(riskPts * preset.mult * totalShares);
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => handleApplyRRPreset(preset.mult)}
                className="px-2 py-0.5 rounded-lg bg-white/[0.04] hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 border border-white/10 hover:border-cyan-500/30 text-[10px] font-mono font-bold transition-all active:scale-95 flex items-center gap-1"
                title={`Set target to capture ₹${estProfit.toLocaleString("en-IN")} profit`}
              >
                <span>{preset.label}</span>
                <span className="text-[9px] text-emerald-400 font-normal">(+₹{estProfit.toLocaleString("en-IN")})</span>
              </button>
            );
          })}
        </div>

        {/* Risk / Reward Readouts */}
        <div className="flex items-center gap-3 font-mono text-[11px] self-end sm:self-auto">
          <span className="text-rose-400 flex items-center gap-1 font-semibold">
            🛑 Max Risk: -₹{riskAmount.toLocaleString("en-IN")}
          </span>
          <span className="text-cyan-300 font-bold bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20">
            R:R 1:{currentRR}
          </span>
          <span className="text-emerald-400 flex items-center gap-1 font-semibold">
            🎯 Target: +₹{rewardAmount.toLocaleString("en-IN")}
          </span>
        </div>
      </div>
    </div>
  );
}
