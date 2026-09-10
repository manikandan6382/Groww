import React, { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { soundEngine } from "../../utils/soundEngine";
import { useTradingStore } from "../../stores/useTradingStore";
import { useLivePriceStore } from "../../stores/useLivePriceStore";
import { Sparkles, ShieldAlert, TrendingUp, Crosshair, AlertCircle, ShieldCheck, Zap, Activity, CheckCircle2, RefreshCw } from "lucide-react";
import clsx from "clsx";

/**
 * 🌟 Apple Spatial Option Simulator & "Direct Buy" Payoff Engine (Level 3 Elite - 100% Universal Clarity)
 * Features:
 * 1. Multi-Trade Interlink: Switch seamlessly between OrderPad draft and active practice trades.
 * 2. Live Upstox tick streaming: Real-time option contract mark price and underlying spot index.
 * 3. 1-Click R:R Presets with direct synchronization back to active positions.
 * 4. Intraday Delta what-if simulation & expiry risk curves.
 */
// NSE Standard Tick Size Snapping (₹0.05 multiples)
const snapToTick = (val) => Math.round(Number(val) * 20) / 20;

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
  const [viewMode, setViewMode] = useState("chart"); // "chart" | "simple"
  const [holdDuration, setHoldDuration] = useState("flash"); // "flash" | "30m" | "2h"

  // 🚀 Store Subscriptions for Active Trades Interlink
  const { 
    openAlerts = [], 
    simulatorActiveTradeId, 
    setSimulatorActiveTradeId,
    updateTargetPrice,
    updateStopLossPrice
  } = useTradingStore();

  const ticks = useLivePriceStore((state) => state.ticks);
  const indices = useLivePriceStore((state) => state.indices);

  // Active Trade Resolution
  const activeTrade = useMemo(() => {
    if (!simulatorActiveTradeId || !openAlerts.length) return null;
    return openAlerts.find((t) => t.id === simulatorActiveTradeId) || null;
  }, [simulatorActiveTradeId, openAlerts]);

  const isTradeActive = Boolean(activeTrade);
  const tradeSymbol = activeTrade?.symbol || activeTrade?.tradingsymbol || "";
  const isBankNifty = tradeSymbol.includes("BANK") || Boolean(activeTrade?.underlyingSymbol?.includes("BANK"));
  
  const liveSpot = isBankNifty 
    ? (indices?.["NSE_INDEX|Nifty Bank"]?.ltp || 57317.75) 
    : (indices?.["NSE_INDEX|Nifty 50"]?.ltp || spotPrice);

  const effectiveOptionType = activeTrade ? (activeTrade.optionType || (tradeSymbol.includes("PE") ? "PUT" : "CALL")) : optionType;
  const effectiveDirection = activeTrade ? (activeTrade.direction || "BUY") : direction;
  const effectiveSpot = isTradeActive ? liveSpot : spotPrice;
  const effectiveStrike = isTradeActive ? Number(activeTrade.strikePrice || strikePrice) : Number(strikePrice || spotPrice);
  const effectiveEntry = isTradeActive ? Math.max(0.05, Number(activeTrade.entryPrice || activeTrade.plannedEntryPrice || netEntryPrice)) : Math.max(0.05, Number(netEntryPrice || 0.05));
  
  const liveLtp = isTradeActive ? (ticks?.[activeTrade.id]?.ltp || activeTrade.lastMarkPrice || effectiveEntry) : effectiveEntry;

  const [localTarget, setLocalTarget] = useState(null);
  const [localSL, setLocalSL] = useState(null);
  const [syncStatus, setSyncStatus] = useState(null);
  const [closedTradeNotice, setClosedTradeNotice] = useState(null);

  // 🛡️ Auto-Liquidation Watchdog: If background trade hits SL / squares off, smoothly transition back
  useEffect(() => {
    if (simulatorActiveTradeId && openAlerts.length > 0) {
      const stillExists = openAlerts.some((t) => t.id === simulatorActiveTradeId);
      if (!stillExists) {
        setClosedTradeNotice("Active position squared off / closed in background. Returned to OrderPad Draft.");
        setSimulatorActiveTradeId(null);
        soundEngine.playTabSwitchTone();
        const timer = setTimeout(() => setClosedTradeNotice(null), 5000);
        return () => clearTimeout(timer);
      }
    }
  }, [openAlerts, simulatorActiveTradeId, setSimulatorActiveTradeId]);

  useEffect(() => {
    setLocalTarget(null);
    setLocalSL(null);
    setSyncStatus(null);
  }, [simulatorActiveTradeId]);

  const isLiveStreaming = Boolean(isTradeActive && ticks?.[activeTrade.id]?.ltp);

  // 0DTE Expiry Awareness (Wed for BankNifty, Thu for Nifty 50)
  const isZeroDte = useMemo(() => {
    const day = new Date().getDay();
    if (isBankNifty && day === 3) return true;
    if (!isBankNifty && day === 4) return true;
    return Boolean(activeTrade?.isExpiryToday || activeTrade?.isZeroDte);
  }, [isBankNifty, activeTrade]);

  const effectiveSL = localSL != null 
    ? localSL 
    : (isTradeActive ? Number(activeTrade.stopLoss || effectiveEntry * 0.85) : Number(stopLoss || effectiveEntry * 0.8));
    
  const effectiveTP = localTarget != null 
    ? localTarget 
    : (isTradeActive ? Number(activeTrade.targetPrice || effectiveEntry * 1.35) : Number(targetPrice || effectiveEntry * 1.4));

  const qty = isTradeActive ? Number(activeTrade.quantity || 1) : Number(quantity || 1);
  const lot = isTradeActive ? Number(activeTrade.lotSize || 65) : Number(lotSize || 65);
  const totalShares = qty * lot;
  const entry = effectiveEntry;
  const strike = effectiveStrike;
  const sl = effectiveSL;
  const tp = effectiveTP;
  const isCall = effectiveOptionType === "CALL";
  const isBuy = effectiveDirection === "BUY";
  const isDirect = isTradeActive ? (activeTrade.strategyMode !== "SPREAD") : (strategyMode !== "SPREAD");
  const hedgeStrk = isTradeActive ? Number(activeTrade.hedgeStrike || hedgeStrike) : hedgeStrike;
  const hedgePrc = isTradeActive ? Number(activeTrade.hedgePrice || hedgePrice) : hedgePrice;

  // Active position live PnL
  const currentActivePnl = isTradeActive ? Math.round((liveLtp - entry) * totalShares) : 0;

  // Capital outlay (Total premium paid)
  const capitalOutlay = Math.round(entry * totalShares);

  // Defensive SL sanity check
  const rawRiskPts = isBuy ? (entry - sl) : (sl - entry);
  const isSLInverted = rawRiskPts <= 0;
  const riskPts = Math.max(1, rawRiskPts);
  const rawRewardPts = isBuy ? (tp - entry) : (entry - tp);
  const rewardPts = Math.max(1, rawRewardPts);

  const riskAmount = Math.round(riskPts * totalShares);
  const rewardAmount = Math.round(rewardPts * totalShares);
  const riskPct = entry > 0 ? (riskPts / entry) * 100 : 0;
  const rewardPct = entry > 0 ? (rewardPts / entry) * 100 : 0;
  const currentRR = riskAmount > 0 ? (rewardAmount / riskAmount).toFixed(2) : "2.00";

  // 1. Exact Breakeven Calculation
  const breakevenSpot = useMemo(() => {
    if (!isDirect) {
      const netDebit = Math.max(0.05, entry - Number(hedgePrc || 0));
      return isCall ? strike + netDebit : strike - netDebit;
    }
    return isCall ? strike + entry : strike - entry;
  }, [isDirect, isCall, strike, entry, hedgePrc]);

  const distToBE = isCall ? (breakevenSpot - effectiveSpot) : (effectiveSpot - breakevenSpot);

  // 2. Win Chance (Probability of Profit % heuristic)
  const popPercent = useMemo(() => {
    const dailyVol = effectiveSpot * (0.135 / Math.sqrt(252)); // 13.5% India VIX proxy
    const distToBEVal = isCall ? (breakevenSpot - effectiveSpot) : (effectiveSpot - breakevenSpot);
    const zScore = distToBEVal / (dailyVol * 1.5);
    const prob = 1 / (1 + Math.exp(zScore * 1.2));
    return Math.min(94, Math.max(12, Math.round(prob * 100)));
  }, [effectiveSpot, breakevenSpot, isCall]);

  // 3. Domain Range [S_min, S_max] Auto-Scaling
  const domain = useMemo(() => {
    const buffer = Math.max(entry * 3.5, effectiveSpot * 0.015, 120);
    const minVal = Math.min(strike, effectiveSpot, breakevenSpot) - buffer;
    const maxVal = Math.max(strike, effectiveSpot, breakevenSpot) + buffer;
    return {
      min: Math.floor(minVal / 20) * 20,
      max: Math.ceil(maxVal / 20) * 20
    };
  }, [strike, effectiveSpot, breakevenSpot, entry]);

  // Normalized position of current spot in the domain
  const spotRatio = useMemo(() => {
    if (domain.max <= domain.min) return 0.5;
    return Math.max(0, Math.min(1, (effectiveSpot - domain.min) / (domain.max - domain.min)));
  }, [effectiveSpot, domain]);

  // Interactive Scrub state: defaults to current spot price ratio
  const [scrubRatio, setScrubRatio] = useState(spotRatio);
  const [isScrubbing, setIsScrubbing] = useState(false);

  // Sync scrubRatio whenever active trade switches or underlying spot moves
  useEffect(() => {
    setScrubRatio(spotRatio);
  }, [spotRatio]);

  // 4. Mathematical Payoff Function at Expiry S_T
  const calculatePayoffAtExpiry = useCallback((sT) => {
    let intrinsic = 0;
    if (isCall) {
      intrinsic = Math.max(0, sT - strike);
      if (!isDirect && hedgeStrk > strike) {
        intrinsic = Math.min(intrinsic, hedgeStrk - strike);
      }
    } else {
      intrinsic = Math.max(0, strike - sT);
      if (!isDirect && hedgeStrk < strike) {
        intrinsic = Math.min(intrinsic, strike - hedgeStrk);
      }
    }

    const netCost = !isDirect ? (entry - Number(hedgePrc || 0)) : entry;
    const pnlPerShare = isBuy ? (intrinsic - netCost) : (netCost - intrinsic);
    const totalPnl = pnlPerShare * totalShares;
    const returnPct = netCost > 0 ? (pnlPerShare / netCost) * 100 : 0;

    return { pnl: totalPnl, returnPct, pnlPerShare };
  }, [isCall, strike, isDirect, hedgeStrk, hedgePrc, entry, isBuy, totalShares]);

  // Approximate Delta & Gamma for 0DTE curvature
  const approxDelta = useMemo(() => {
    if (isCall) {
      if (effectiveSpot > strike) return Math.min(0.95, 0.52 + (effectiveSpot - strike) * 0.0018);
      return Math.max(0.08, 0.52 - (strike - effectiveSpot) * 0.0018);
    } else {
      if (effectiveSpot < strike) return Math.max(-0.95, -0.48 - (strike - effectiveSpot) * 0.0018);
      return Math.min(-0.08, -0.48 + (effectiveSpot - strike) * 0.0018);
    }
  }, [isCall, effectiveSpot, strike]);

  const gammaFactor = useMemo(() => {
    const distFromAtm = Math.abs(effectiveSpot - strike);
    const baseGamma = isZeroDte ? 0.0032 : 0.0016;
    return baseGamma / (1 + distFromAtm * 0.002);
  }, [effectiveSpot, strike, isZeroDte]);

  // Intraday Theta Decay Impact based on hold duration
  const thetaDecayPct = useMemo(() => {
    if (holdDuration === "flash") return 0;
    // On 0DTE, theta decay accelerates (8% for 30m, 22% for 2h) vs regular session (4.5% for 30m, 13% for 2h)
    if (holdDuration === "30m") return isZeroDte ? 0.08 : 0.045;
    if (holdDuration === "2h") return isZeroDte ? 0.22 : 0.13;
    return 0;
  }, [holdDuration, isZeroDte]);

  // 5. Intraday Greek Simulation (Live Scalp Delta + 0DTE Gamma Convexity - Time Decay)
  const currentSimulatedSpot = useMemo(() => {
    return domain.min + scrubRatio * (domain.max - domain.min);
  }, [scrubRatio, domain]);

  const simulatedOutcome = useMemo(() => {
    const deltaMove = currentSimulatedSpot - effectiveSpot;
    
    // 2nd-order Taylor expansion: Delta * dS + 0.5 * Gamma * dS^2
    const linearDeltaChange = deltaMove * approxDelta;
    const gammaConvexity = 0.5 * gammaFactor * (deltaMove * deltaMove) * (isBuy ? 1 : -1);
    const optDeltaChange = linearDeltaChange + gammaConvexity;
    
    const thetaDecayAmount = entry * thetaDecayPct;
    const rawEstOptPrice = Math.max(0.05, entry + optDeltaChange - thetaDecayAmount);
    const estOptPrice = snapToTick(rawEstOptPrice);
    const estPnl = Math.round((estOptPrice - entry) * totalShares);
    const estReturnPct = entry > 0 ? Math.round(((estOptPrice - entry) / entry) * 1000) / 10 : 0;

    // Also get expiry payoff
    const expiryData = calculatePayoffAtExpiry(currentSimulatedSpot);

    return {
      spot: Math.round(currentSimulatedSpot),
      spotDelta: Math.round(deltaMove),
      estOptPrice,
      estPnl,
      estReturnPct,
      expiryPnl: Math.round(expiryData.pnl),
      isProfit: estPnl >= 0,
      thetaDecayAmount: Math.round(thetaDecayAmount * 100) / 100
    };
  }, [currentSimulatedSpot, effectiveSpot, approxDelta, gammaFactor, isBuy, entry, thetaDecayPct, totalShares, calculatePayoffAtExpiry]);

  // 6. SVG Canvas Coordinates
  const canvasWidth = 700;
  const canvasHeight = 160;
  const zeroY = 88;

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
    const scaleY = (zeroY - 20) / yRange;

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
    return Math.max(10, Math.min(canvasWidth - 10, spotRatio * canvasWidth));
  }, [spotRatio]);

  const cursorPixelX = useMemo(() => {
    return Math.max(8, Math.min(canvasWidth - 8, scrubRatio * canvasWidth));
  }, [scrubRatio]);

  // Spatial coordinates for Stop-Loss & Target flags on the SVG canvas
  const slCoordX = useMemo(() => {
    const delta = isCall ? Math.max(0.15, approxDelta) : Math.min(-0.15, approxDelta);
    const spotOffset = (sl - entry) / delta;
    const spotAtSL = effectiveSpot + spotOffset;
    if (domain.max <= domain.min) return 20;
    const ratio = (spotAtSL - domain.min) / (domain.max - domain.min);
    return Math.max(16, Math.min(canvasWidth - 16, ratio * canvasWidth));
  }, [sl, entry, approxDelta, effectiveSpot, domain, isCall]);

  const tpCoordX = useMemo(() => {
    const delta = isCall ? Math.max(0.15, approxDelta) : Math.min(-0.15, approxDelta);
    const spotOffset = (tp - entry) / delta;
    const spotAtTP = effectiveSpot + spotOffset;
    if (domain.max <= domain.min) return canvasWidth - 20;
    const ratio = (spotAtTP - domain.min) / (domain.max - domain.min);
    return Math.max(16, Math.min(canvasWidth - 16, ratio * canvasWidth));
  }, [tp, entry, approxDelta, effectiveSpot, domain, isCall]);

  const cursorY = useMemo(() => {
    const yRange = Math.max(Math.abs(maxPnl), Math.abs(minPnl), 100);
    const scaleY = (zeroY - 20) / yRange;
    return zeroY - simulatedOutcome.expiryPnl * scaleY;
  }, [zeroY, maxPnl, minPnl, simulatedOutcome.expiryPnl]);

  // Audio-throttled slider scrub handler
  const handleScrubChange = (newRatio) => {
    const clamped = Math.max(0, Math.min(1, newRatio));
    setScrubRatio(clamped);

    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    if (now - lastAudioTickRef.current > 75) {
      lastAudioTickRef.current = now;
      soundEngine.playTick();
    }
  };

  // Pointer scrub on the SVG canvas directly
  const handlePointerScrub = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = e.clientX ?? e.touches?.[0]?.clientX;
    if (clientX == null) return;
    const relX = Math.max(0, Math.min(rect.width, clientX - rect.left));
    handleScrubChange(relX / rect.width);
  };

  // Quick 1-Click R:R Target Preset Handler
  const handleApplyRRPreset = (multiplier) => {
    const safeRisk = Math.max(2, isBuy ? (entry - sl) : (sl - entry));
    const newTargetPts = safeRisk * multiplier;
    const newTargetPrice = snapToTick(isBuy ? entry + newTargetPts : entry - newTargetPts);
    setLocalTarget(newTargetPrice);
    if (onSetTarget) {
      onSetTarget(newTargetPrice);
    }
    soundEngine.playTargetChime();
  };

  // Sync simulated target & stop loss directly back to live active trade in store
  const handleSyncToActiveTrade = () => {
    if (!activeTrade) return;
    if (updateTargetPrice && localTarget != null) {
      updateTargetPrice(activeTrade.id, localTarget);
    }
    if (updateStopLossPrice && localSL != null) {
      updateStopLossPrice(activeTrade.id, localSL);
    }
    setSyncStatus("synced");
    soundEngine.playTradeConfirmed();
    setTimeout(() => setSyncStatus(null), 2500);
  };

  return (
    <div className="p-4 sm:p-6 rounded-3xl bg-[var(--card)] border border-[var(--line)] backdrop-blur-3xl shadow-[0_20px_50px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.12)] space-y-4 relative overflow-hidden group">
      {/* Dynamic Ambient Spotlights */}
      <div className="absolute -top-16 right-1/4 w-72 h-72 bg-slate-400/[0.02] rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 left-1/4 w-72 h-72 bg-emerald-500/[0.03] rounded-full blur-3xl pointer-events-none" />

      {/* ─── AUTO-LIQUIDATION WATCHDOG NOTICE ─── */}
      {closedTradeNotice && (
        <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-zinc-300 text-xs font-mono flex items-center justify-between gap-2 animate-pulse">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-zinc-400 shrink-0" />
            <span>{closedTradeNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setClosedTradeNotice(null)}
            className="text-zinc-400 hover:text-white text-xs cursor-pointer font-bold px-1.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* ─── MULTI-TRADE SELECTOR DOCK (OrderPad Draft + Active Practice Trades) ─── */}
      <div className="p-2.5 sm:p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none flex-1">
          <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1.5 pl-1">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            Source:
            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-white/5 border border-white/10 text-zinc-200">
              {openAlerts.length} Active
            </span>
          </span>

          {/* Pill 1: OrderPad Draft */}
          <button
            type="button"
            onClick={() => {
              setSimulatorActiveTradeId(null);
              soundEngine.playTabSwitchTone();
            }}
            className={clsx(
              "px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer",
              !simulatorActiveTradeId
                ? "bg-white/[0.08] text-white border border-white/20 shadow-sm"
                : "bg-white/[0.03] text-slate-400 hover:text-white border border-white/[0.06] hover:bg-white/[0.06]"
            )}
          >
            <span>📝 OrderPad Draft</span>
            {!simulatorActiveTradeId && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>

          {/* Open Practice Trades Pills */}
          {openAlerts.map((trade) => {
            const isSelected = simulatorActiveTradeId === trade.id;
            const sym = trade.symbol || trade.tradingsymbol || "Trade";
            const tEntry = Number(trade.entryPrice || 100);
            const tLot = Number(trade.lotSize || 65);
            const tQty = Number(trade.quantity || 1) * tLot;
            const tLtp = Number(ticks?.[trade.id]?.ltp || trade.lastMarkPrice || tEntry);
            const tPnl = Math.round((tLtp - tEntry) * tQty);
            const isGain = tPnl >= 0;

            return (
              <button
                key={trade.id}
                type="button"
                onClick={() => {
                  setSimulatorActiveTradeId(trade.id);
                  soundEngine.playTabSwitchTone();
                }}
                className={clsx(
                  "px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition flex items-center gap-2 shrink-0 cursor-pointer",
                  isSelected
                    ? "bg-gradient-to-r from-emerald-500/15 via-zinc-800 to-emerald-500/15 text-white border border-white/20 shadow-sm"
                    : "bg-white/[0.03] text-slate-300 hover:text-white border border-white/[0.06] hover:bg-white/[0.06]"
                )}
              >
                <span className={clsx("w-1.5 h-1.5 rounded-full", isGain ? "bg-emerald-400" : "bg-rose-500")} />
                <span>{sym}</span>
                <span className={clsx("text-[10px] px-1.5 py-0.2 rounded font-mono font-bold", isGain ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400")}>
                  {isGain ? "+" : ""}₹{tPnl.toLocaleString("en-IN")}
                </span>
                {isSelected && (
                  <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-white/10 text-zinc-200 font-sans font-bold">Active</span>
                )}
              </button>
            );
          })}
        </div>

        {openAlerts.length === 0 && (
          <span className="text-[11px] font-mono text-slate-500 hidden sm:inline shrink-0 pr-1">
            0 active practice trades open
          </span>
        )}
      </div>

      {/* ─── ACTIVE TRADE LIVE TELEMETRY STRIP (Shown when simulating an active trade) ─── */}
      {isTradeActive && (
        <div className="p-3 rounded-2xl bg-gradient-to-r from-zinc-950 via-[#0d0f14] to-zinc-950 border border-white/10 shadow-inner flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs font-mono">
              <span className="text-slate-400 text-[11px]">Active Trade:</span>
              <strong className="text-white font-bold">{tradeSymbol}</strong>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-mono">
              <span className="text-slate-400 text-[11px]">Entry:</span>
              <span className="text-slate-200">₹{entry.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-mono">
              <span className="text-slate-400 text-[11px]">Mark LTP:</span>
              <span className={clsx("font-bold", liveLtp >= entry ? "text-emerald-400" : "text-rose-400")}>
                ₹{liveLtp.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-mono">
              <span className="text-slate-400 text-[11px]">{isBankNifty ? "BANKNIFTY" : "NIFTY"} Spot:</span>
              <span className="text-zinc-200 font-bold font-mono">₹{Math.round(liveSpot).toLocaleString("en-IN")}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-mono">
              <span className="text-slate-400 text-[11px]">Running P&L:</span>
              <span className={clsx("font-black text-sm", currentActivePnl >= 0 ? "text-emerald-400" : "text-rose-400")}>
                {currentActivePnl >= 0 ? "+" : ""}₹{currentActivePnl.toLocaleString("en-IN")}
              </span>
            </div>
            {/* Feed Streaming Health Badge */}
            <div className="flex items-center gap-1.5 text-[10.5px] font-mono px-2 py-0.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <span className={clsx("w-1.5 h-1.5 rounded-full", isLiveStreaming ? "bg-emerald-400 animate-pulse" : "bg-white")} />
              <span className="text-slate-300">{isLiveStreaming ? "Live Ticks" : "Last Mark"}</span>
            </div>
            {isZeroDte && (
              <span className="px-2 py-0.5 rounded-lg bg-white/10 text-zinc-200 border border-white/15 text-[10px] font-mono font-bold">
                ⚡ 0DTE Expiry
              </span>
            )}
          </div>

          {(localTarget != null || localSL != null) && (
            <button
              type="button"
              onClick={handleSyncToActiveTrade}
              className={clsx(
                "px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer shadow-md",
                syncStatus === "synced"
                  ? "bg-emerald-500 text-black border border-emerald-400"
                  : "bg-white hover:bg-zinc-200 text-black font-extrabold shadow-[0_0_15px_rgba(255,255,255,0.25)] animate-pulse"
              )}
            >
              {syncStatus === "synced" ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Trade Synced!</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Commit Target/SL to Live Trade</span>
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Top Header: Strategy Title, Direction Guide & View Toggle */}
      <div className="space-y-2 border-b border-white/[0.06] pb-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-zinc-200 shadow-sm">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <strong className="text-sm sm:text-base font-black text-white tracking-tight">
                  Option Outcome Simulator
                </strong>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-white/[0.06] text-zinc-200 border border-white/10 font-sans flex items-center gap-1">
                  {isDirect ? (
                    <>
                      <span>⚡ Direct {optionType} Buy</span>
                      <span className="opacity-75 font-normal">
                        · {isCall ? "Bullish (Up 📈)" : "Bearish (Down 📉)"}
                      </span>
                    </>
                  ) : (
                    <span>🛡️ Spread (2-Legs)</span>
                  )}
                </span>
                {isSLInverted && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-zinc-200 border border-white/15 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Fix SL: Must be below ₹{entry}
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-400 block sm:inline">
                Interactive "What-If" Market Simulator &amp; Risk Visualizer
              </span>
            </div>
          </div>

          {/* Quick Stats & View Mode Segmented Control */}
          <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
            {/* View Mode Toggle */}
            <div className="flex rounded-xl bg-white/[0.04] border border-white/10 p-0.5 text-[11px] font-sans">
              <button
                type="button"
                onClick={() => setViewMode("chart")}
                className={clsx(
                  "px-2.5 py-1 rounded-lg font-bold transition cursor-pointer",
                  viewMode === "chart" ? "bg-white/15 text-white shadow-sm border border-white/15" : "text-slate-400 hover:text-white"
                )}
              >
                📊 Full View
              </button>
              <button
                type="button"
                onClick={() => setViewMode("simple")}
                className={clsx(
                  "px-2.5 py-1 rounded-lg font-bold transition cursor-pointer",
                  viewMode === "simple" ? "bg-white/15 text-white shadow-sm border border-white/15" : "text-slate-400 hover:text-white"
                )}
              >
                💡 Simple Story
              </button>
            </div>

            <div className="px-2.5 py-1 rounded-xl bg-white/[0.03] border border-white/10 flex items-center gap-1.5 text-xs font-mono">
              <span className="text-slate-400 text-[10px]">Cost:</span>
              <strong className="text-white font-bold">₹{capitalOutlay.toLocaleString("en-IN")}</strong>
            </div>

            <div className="px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-1 text-xs text-emerald-300 font-bold shadow-sm">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              <span>{popPercent}% Win</span>
            </div>
          </div>
        </div>

        {/* Dynamic 1-Sentence Plain English Explainer & Contextual Role Guidance */}
        <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05] text-[11.5px] leading-relaxed text-slate-300 space-y-1.5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            {isDirect ? (
              <span>
                <strong className="text-white font-semibold">{isCall ? "Call Option" : "Put Option"} Scalp:</strong> You pay a 1-time premium of <strong className="text-white">₹{capitalOutlay.toLocaleString("en-IN")}</strong>. You profit when market moves {isCall ? "UP 📈" : "DOWN 📉"}, and your loss can <strong className="text-rose-300">never exceed</strong> what you paid.
              </span>
            ) : (
              <span>
                <strong className="text-white font-semibold">Protected Spread:</strong> Lowers your entry cost to <strong className="text-white">₹{capitalOutlay.toLocaleString("en-IN")}</strong>. Protects against sudden pullbacks by capping both maximum risk and reward.
              </span>
            )}
          </div>
          <div className="text-[10.5px] font-mono text-slate-400 flex items-center gap-1.5 pl-6 border-t border-white/[0.04] pt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-white" />
            <span>Tactical Guidance: Use 1-tap card buttons for fast in-flight exits. Use this Simulator to model Theta decay horizons and structure R:R targets.</span>
          </div>
        </div>
      </div>

      {/* 3 Outcome Story Cards (Crystal-clear for ordinary users) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* 1. Stop Loss Protection Card */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-rose-500/10 to-[#140a12] border border-rose-500/25 space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-300 uppercase tracking-wider flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              Worst-Case Loss
            </span>
            <span className="text-[10px] font-mono text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
              SL @ ₹{sl.toFixed(2)}
            </span>
          </div>
          <div className="text-xl font-black font-mono text-rose-400">
            -₹{riskAmount.toLocaleString("en-IN")}
          </div>
          <span className="text-[10.5px] text-slate-400 block">
            Safe Exit • Loss strictly capped at -{riskPct.toFixed(1)}%
          </span>
        </div>

        {/* 2. Breakeven Safety Card */}
        <div className="p-3.5 rounded-2xl bg-[#0b0e14] border border-white/10 space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-1">
              <Crosshair className="w-3.5 h-3.5 text-emerald-400" />
              Safety Breakeven
            </span>
            <span className="text-[10px] font-mono text-zinc-300 bg-white/10 px-1.5 py-0.5 rounded border border-white/15 tabular-nums">
              ₹0.00 Line
            </span>
          </div>
          <div className="text-xl font-black font-mono text-zinc-200 tabular-nums">
            ₹{Math.round(breakevenSpot).toLocaleString("en-IN")}
          </div>
          <span className="text-[10.5px] text-slate-400 block">
            Index level to reach • {distToBE >= 0 ? "+" : ""}{distToBE.toFixed(0)} pts away
          </span>
        </div>

        {/* 3. Target Profit Card */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-[var(--card)] border border-emerald-500/25 space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              Profit Target Goal
            </span>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
              TP @ ₹{tp.toFixed(2)}
            </span>
          </div>
          <div className="text-xl font-black font-mono text-emerald-400">
            +₹{rewardAmount.toLocaleString("en-IN")}
          </div>
          <span className="text-[10.5px] text-slate-400 block">
            Target Hit • +{rewardPct.toFixed(1)}% Gain (R:R 1:{currentRR})
          </span>
        </div>
      </div>

      {/* Unified Interactive Simulator Capsule (Narrative + Slider Merged) */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-zinc-950 via-[#0d0f14] to-zinc-950 border border-white/10 shadow-2xl space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <span className="text-[11px] font-black text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            Interactive "What-If" Market Simulator
          </span>

          {/* Hold Horizon / Theta Bleed Factor Segmented Toggle */}
          <div className="flex items-center gap-1 bg-black/50 p-1 rounded-xl border border-white/10 text-[10.5px] font-mono">
            <span className="text-slate-400 text-[10px] px-1 font-sans">Decay Horizon:</span>
            {[
              { id: "flash", label: "⚡ <5m (0%)", title: "Instant move: Pure Delta/Gamma (0% Theta decay)" },
              { id: "30m", label: "⏱️ 30m (-5%)", title: "30-minute hold: Deducts ~5% time decay" },
              { id: "2h", label: "⏳ 2h (-15%)", title: "2-hour hold: Deducts ~15% time decay (accelerated on 0DTE)" }
            ].map((dur) => (
              <button
                key={dur.id}
                type="button"
                onClick={() => {
                  setHoldDuration(dur.id);
                  soundEngine.playTick();
                }}
                className={clsx(
                  "px-2 py-0.5 rounded-lg transition-all font-bold cursor-pointer",
                  holdDuration === dur.id
                    ? "bg-white text-black font-black shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                )}
                title={dur.title}
              >
                {dur.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Human Narrative Statement */}
        <div className="text-sm sm:text-base font-medium text-white leading-snug">
          If {isBankNifty ? "BANKNIFTY" : "NIFTY"} moves to <strong className="text-zinc-200 font-mono font-bold">₹{simulatedOutcome.spot.toLocaleString("en-IN")}</strong>{" "}
          <span className="text-xs text-slate-300 font-mono">
            ({simulatedOutcome.spotDelta >= 0 ? "+" : ""}{simulatedOutcome.spotDelta} pts)
          </span>{" "}
          ➔ Option estimated at <strong className="text-zinc-200 font-mono font-bold">₹{simulatedOutcome.estOptPrice.toFixed(2)}</strong>{" "}
          ➔ You {simulatedOutcome.isProfit ? "make" : "lose"}{" "}
          <strong className={clsx("font-mono font-black text-base sm:text-lg", simulatedOutcome.isProfit ? "text-emerald-400" : "text-rose-400")}>
            {simulatedOutcome.isProfit ? "+" : ""}₹{simulatedOutcome.estPnl.toLocaleString("en-IN")} ({simulatedOutcome.estReturnPct}%)
          </strong>
        </div>

        {/* Dynamic 1-Click Adopt from Scrubbed What-If Scenario */}
        <div className="flex items-center justify-between gap-2 pt-1 pb-0.5 border-t border-white/[0.06] flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {simulatedOutcome.isProfit ? (
              <button
                type="button"
                onClick={() => {
                  setLocalTarget(simulatedOutcome.estOptPrice);
                  soundEngine.playTargetChime();
                }}
                className="px-2.5 py-1 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm"
                title={`Adopt simulated price ₹${simulatedOutcome.estOptPrice.toFixed(2)} as your profit target`}
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Adopt as Target: ₹{simulatedOutcome.estOptPrice.toFixed(2)}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setLocalSL(simulatedOutcome.estOptPrice);
                  soundEngine.playTick();
                }}
                className="px-2.5 py-1 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-mono font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm"
                title={`Adopt simulated price ₹${simulatedOutcome.estOptPrice.toFixed(2)} as your stop loss`}
              >
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                <span>Adopt as SL: ₹{simulatedOutcome.estOptPrice.toFixed(2)}</span>
              </button>
            )}

            {isTradeActive && (localTarget != null || localSL != null) && (
              <button
                type="button"
                onClick={handleSyncToActiveTrade}
                className={clsx(
                  "px-2.5 py-1 rounded-xl text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm",
                  syncStatus === "synced"
                    ? "bg-emerald-500 text-black border border-emerald-400"
                    : "bg-white hover:bg-zinc-200 text-black font-extrabold shadow-[0_0_15px_rgba(255,255,255,0.25)] animate-pulse"
                )}
              >
                {syncStatus === "synced" ? (
                  <>
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Synced to Trade!</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3 h-3" />
                    <span>Sync to Live Position</span>
                  </>
                )}
              </button>
            )}
          </div>

          <span className="text-[10px] font-mono text-slate-400">
            {isZeroDte ? "⚡ 0DTE Gamma Accelerated" : "Intraday Convex Delta"}
          </span>
        </div>

        {/* Tactile Slider Track with 1-Tap Reset */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>Bear Pullback: ₹{domain.min.toLocaleString("en-IN")}</span>
            <button
              type="button"
              onClick={() => {
                handleScrubChange(spotRatio);
                soundEngine.playTick();
              }}
              className="text-emerald-400 hover:text-zinc-200 font-bold flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 hover:bg-white/10 border border-white/15 transition cursor-pointer active:scale-95"
              title="Click to reset slider to current market price"
            >
              <span>📍 Current Market: ₹{Math.round(effectiveSpot).toLocaleString("en-IN")}</span>
              <span className="text-[9.5px] text-zinc-200/90 bg-white/10 px-1.5 py-0.2 rounded font-sans">↺ Reset</span>
            </button>
            <span>Bull Rally: ₹{domain.max.toLocaleString("en-IN")}</span>
          </div>
          <input 
            type="range"
            min="0"
            max="1"
            step="0.005"
            value={scrubRatio}
            aria-label="Simulate market price move"
            onChange={(e) => handleScrubChange(parseFloat(e.target.value))}
            className="w-full h-3 bg-slate-800/80 rounded-full appearance-none cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#060709]
            [&::-webkit-slider-thumb]:appearance-none 
            [&::-webkit-slider-thumb]:w-6 
            [&::-webkit-slider-thumb]:h-6 
            [&::-webkit-slider-thumb]:rounded-full 
            [&::-webkit-slider-thumb]:bg-gradient-to-tr 
            [&::-webkit-slider-thumb]:from-white 
            [&::-webkit-slider-thumb]:to-emerald-300 
            [&::-webkit-slider-thumb]:shadow-[0_0_18px_rgba(245,158,11,0.8),0_2px_4px_rgba(0,0,0,0.5)] 
            [&::-webkit-slider-thumb]:cursor-grab 
            [&::-webkit-slider-thumb]:active:cursor-grabbing 
            [&::-webkit-slider-thumb]:active:scale-110 
            [&::-webkit-slider-thumb]:transition-transform
            [&::-moz-range-thumb]:w-6 
            [&::-moz-range-thumb]:h-6 
            [&::-moz-range-thumb]:rounded-full 
            [&::-moz-range-thumb]:bg-white 
            [&::-moz-range-thumb]:border-none"
          />
        </div>
      </div>

      {/* SVG Interactive Payoff Canvas (Shown in "chart" view mode) */}
      {viewMode === "chart" && (
        <div 
          ref={containerRef}
          className="w-full h-36 relative select-none cursor-crosshair touch-none rounded-2xl bg-[#050608]/90 border border-white/[0.06] p-1 overflow-hidden"
          onPointerDown={(e) => { setIsScrubbing(true); handlePointerScrub(e); }}
          onPointerMove={(e) => { if (isScrubbing || e.buttons === 1) handlePointerScrub(e); else handlePointerScrub(e); }}
          onPointerUp={() => setIsScrubbing(false)}
          onPointerLeave={() => setIsScrubbing(false)}
        >
          <svg 
            className="w-full h-full overflow-visible" 
            viewBox={`0 0 ${canvasWidth} ${canvasHeight}`} 
            preserveAspectRatio="none"
          >
            <defs>
              {/* Emerald Profit Neon Glow Gradient */}
              <linearGradient id="profitEmeraldGlow" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.40" />
                <stop offset="70%" stopColor="#10b981" stopOpacity="0.10" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
              </linearGradient>

              {/* Rose Loss Neon Glow Gradient */}
              <linearGradient id="lossRoseGlow" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.35" />
                <stop offset="70%" stopColor="#f43f5e" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
              </linearGradient>

              {/* Specular Neon Stroke Filter */}
              <filter id="neonPayoffGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Zero P&L Dashed Axis */}
            <line 
              x1="0" 
              y1={zeroY} 
              x2={canvasWidth} 
              y2={zeroY} 
              stroke="rgba(255,255,255,0.22)" 
              strokeDasharray="4,4" 
              strokeWidth="1.2" 
            />
            <text 
              x="12" 
              y={zeroY - 5} 
              fill="rgba(255,255,255,0.45)" 
              fontSize="9.5" 
              fontFamily="sans-serif"
              fontWeight="bold"
            >
              ₹0.00 Breakeven Baseline
            </text>

            {/* Profit Zone Fill */}
            {profitPolygon && (
              <path d={profitPolygon} fill="url(#profitEmeraldGlow)" />
            )}

            {/* Loss Zone Fill */}
            {lossPolygon && (
              <path d={lossPolygon} fill="url(#lossRoseGlow)" />
            )}

            {/* In-Canvas Plain English Zone Badges */}
            <text 
              x={isCall ? canvasWidth - 14 : 14} 
              y="28" 
              textAnchor={isCall ? "end" : "start"} 
              fill="rgba(16,185,129,0.5)" 
              fontSize="9.5" 
              fontWeight="bold"
              fontFamily="sans-serif"
            >
              ▲ PROFIT ZONE (Unlimited Upside)
            </text>

            <text 
              x={isCall ? 14 : canvasWidth - 14} 
              y={canvasHeight - 16} 
              textAnchor={isCall ? "start" : "end"} 
              fill="rgba(244,63,94,0.5)" 
              fontSize="9.5" 
              fontWeight="bold"
              fontFamily="sans-serif"
            >
              ▼ PROTECTED LOSS (Loss strictly capped at -₹{riskAmount.toLocaleString("en-IN")})
            </text>

            {/* Main Option Payoff Curve Line */}
            {mainLinePath && (
              <path 
                d={mainLinePath} 
                fill="none" 
                stroke="#00f5c4" 
                strokeWidth="3" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                filter="url(#neonPayoffGlow)" 
              />
            )}

            {/* Active Stop Loss Marker & Tactical Pill Flag */}
            <g>
              <line 
                x1={slCoordX} 
                y1="18" 
                x2={slCoordX} 
                y2={canvasHeight - 12} 
                stroke="#f43f5e" 
                strokeDasharray="3,3" 
                strokeWidth="1.2" 
                strokeOpacity="0.8" 
              />
              <rect 
                x={slCoordX - 26} 
                y={canvasHeight - 20} 
                width="52" 
                height="14" 
                rx="3.5" 
                fill="#881337" 
                stroke="#f43f5e" 
                strokeWidth="1" 
              />
              <text 
                x={slCoordX} 
                y={canvasHeight - 10} 
                textAnchor="middle" 
                fill="#fecdd3" 
                fontSize="8.5" 
                fontWeight="bold" 
                fontFamily="monospace"
              >
                SL ₹{sl.toFixed(1)}
              </text>
            </g>

            {/* Active Target Marker & Tactical Pill Flag */}
            <g>
              <line 
                x1={tpCoordX} 
                y1="18" 
                x2={tpCoordX} 
                y2={canvasHeight - 12} 
                stroke="#10b981" 
                strokeDasharray="3,3" 
                strokeWidth="1.2" 
                strokeOpacity="0.8" 
              />
              <rect 
                x={tpCoordX - 26} 
                y="5" 
                width="52" 
                height="14" 
                rx="3.5" 
                fill="#064e3b" 
                stroke="#10b981" 
                strokeWidth="1" 
              />
              <text 
                x={tpCoordX} 
                y="15" 
                textAnchor="middle" 
                fill="#a7f3d0" 
                fontSize="8.5" 
                fontWeight="bold" 
                fontFamily="monospace"
              >
                TP ₹{tp.toFixed(1)}
              </text>
            </g>

            {/* Current Spot Vertical Marker */}
            <line 
              x1={spotX} 
              y1="10" 
              x2={spotX} 
              y2={canvasHeight - 10} 
              stroke="#fbbf24" 
              strokeDasharray="3,3" 
              strokeWidth="1.5" 
              strokeOpacity="0.7" 
            />
            <circle cx={spotX} cy={zeroY} r="3.5" fill="#fbbf24" stroke="#000" strokeWidth="1" />
            <text 
              x={spotX} 
              y="14" 
              textAnchor="middle" 
              fill="#fbbf24" 
              fontSize="9" 
              fontWeight="bold" 
              fontFamily="sans-serif"
            >
              CURRENT PRICE
            </text>

            {/* Breakeven Node */}
            <g transform={`translate(${beCoordX}, ${zeroY})`}>
              <circle r="7" fill="#00f5c4" fillOpacity="0.25" className="animate-ping" />
              <circle r="4.5" fill="#ffffff" stroke="#00f5c4" strokeWidth="2.5" />
            </g>

            {/* Interactive Scrub Cursor with Pinned Floating Tooltip HUD */}
            <g>
              <line 
                x1={cursorPixelX} 
                y1="5" 
                x2={cursorPixelX} 
                y2={canvasHeight - 8} 
                stroke="#38bdf8" 
                strokeWidth="2" 
                strokeDasharray="4,4" 
              />
              <circle 
                cx={cursorPixelX} 
                cy={cursorY} 
                r="6" 
                fill={simulatedOutcome.isProfit ? "#10b981" : "#f43f5e"} 
                stroke="#ffffff" 
                strokeWidth="2.5" 
              />

              {/* Floating Dynamic Tooltip HUD */}
              <g transform={`translate(${Math.max(50, Math.min(canvasWidth - 50, cursorPixelX))}, ${Math.max(22, cursorY - 14)})`}>
                <rect 
                  x="-48" 
                  y="-14" 
                  width="96" 
                  height="16" 
                  rx="4" 
                  fill="#090b10" 
                  stroke={simulatedOutcome.isProfit ? "#10b981" : "#f43f5e"} 
                  strokeWidth="1.2" 
                  fillOpacity="0.95" 
                  filter="drop-shadow(0 2px 4px rgba(0,0,0,0.6))"
                />
                <text 
                  x="0" 
                  y="-3" 
                  textAnchor="middle" 
                  fill="#ffffff" 
                  fontSize="8.5" 
                  fontWeight="bold" 
                  fontFamily="monospace"
                >
                  ₹{simulatedOutcome.estOptPrice.toFixed(1)} ({simulatedOutcome.isProfit ? "+" : ""}₹{simulatedOutcome.estPnl})
                </text>
              </g>
            </g>
          </svg>
        </div>
      )}

      {/* Quick 1-Click R:R Target Presets with Plain-English Multipliers & Focus Rings */}
      <div className="pt-2 border-t border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <span className="text-[11px] font-bold text-slate-400 uppercase font-sans flex items-center gap-1.5 shrink-0">
            <Crosshair className="w-3.5 h-3.5 text-emerald-400" />
            Quick Targets:
          </span>
          {[
            { label: "1:1.5", mult: 1.5 },
            { label: "1:2.0", mult: 2.0, tag: "Double" },
            { label: "1:3.0", mult: 3.0, tag: "Triple" },
            { label: "1:4.0", mult: 4.0, tag: "Quad" }
          ].map((preset) => {
            const estProfit = Math.round(riskPts * preset.mult * totalShares);
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => handleApplyRRPreset(preset.mult)}
                className="px-2.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/10 text-slate-300 hover:text-zinc-200 border border-white/10 hover:border-white/20 text-xs font-mono font-bold transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#060709]"
                title={`Set target to capture ₹${estProfit.toLocaleString("en-IN")} profit`}
              >
                <span>{preset.label}</span>
                {preset.tag && (
                  <span className="text-[9.5px] px-1 py-0.2 rounded bg-white/10 text-zinc-300 font-sans font-normal">
                    {preset.tag}
                  </span>
                )}
                <span className="text-[10px] text-emerald-400 font-normal">
                  (+₹{estProfit.toLocaleString("en-IN")})
                </span>
              </button>
            );
          })}

          {isTradeActive && (localTarget != null || localSL != null) && (
            <button
              type="button"
              onClick={handleSyncToActiveTrade}
              className={clsx(
                "px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer shadow-lg",
                syncStatus === "synced"
                  ? "bg-emerald-500 text-black border border-emerald-400"
                  : "bg-white hover:bg-zinc-200 text-black shadow-[0_0_15px_rgba(255,255,255,0.25)] animate-pulse font-extrabold"
              )}
              title="Apply modified target/SL directly to your live running practice trade"
            >
              {syncStatus === "synced" ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Synced to Trade!</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Sync to Live Trade</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Live Risk vs Reward Ratio Readout */}
        <div className="flex items-center gap-3 font-mono text-xs self-end sm:self-auto shrink-0">
          <span className="text-rose-400 flex items-center gap-1 font-bold">
            🛑 Max Risk: -₹{riskAmount.toLocaleString("en-IN")}
          </span>
          <span className="text-zinc-200 font-black bg-white/10 px-2.5 py-1 rounded-lg border border-white/15">
            R:R 1:{currentRR}
          </span>
          <span className="text-emerald-400 flex items-center gap-1 font-bold">
            🎯 Target: +₹{rewardAmount.toLocaleString("en-IN")}
          </span>
        </div>
      </div>
    </div>
  );
}

export default ApplePayoffCanvas;
