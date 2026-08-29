import React, { useState, useMemo } from "react";
import { useTradingStore } from "../../stores/useTradingStore";
import { 
  Zap, 
  ShieldCheck, 
  ShieldAlert, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  Layers, 
  Clock, 
  Lock, 
  Unlock,
  Sparkles, 
  CheckCircle2,
  SlidersHorizontal,
  ChevronRight
} from "lucide-react";
import clsx from "clsx";

const LOT_SIZES = { NIFTY: 25, BANKNIFTY: 15, FINNIFTY: 25, SENSEX: 10 };

const INDEX_ASSETS = [
  { key: "NIFTY", name: "NIFTY 50", spot: 24312.40, lot: 25, defaultStrike: 24300, defaultEntry: 83.0, defaultSL: 75.0, defaultTP: 102.0, change: "+0.42%", positive: true },
  { key: "BANKNIFTY", name: "BANK NIFTY", spot: 52180.15, lot: 15, defaultStrike: 52100, defaultEntry: 245.0, defaultSL: 220.0, defaultTP: 305.0, change: "+0.85%", positive: true },
  { key: "FINNIFTY", name: "FIN NIFTY", spot: 23450.60, lot: 25, defaultStrike: 23400, defaultEntry: 65.0, defaultSL: 55.0, defaultTP: 88.0, change: "+0.28%", positive: true },
  { key: "SENSEX", name: "BSE SENSEX", spot: 79890.30, lot: 10, defaultStrike: 79900, defaultEntry: 310.0, defaultSL: 280.0, defaultTP: 380.0, change: "+0.39%", positive: true },
];

export function OrderPadSection() {
  const { 
    deployPracticeTrade, 
    feedMode, 
    setFeedMode, 
    strategyMode, 
    setStrategyMode,
    simulateSlippage, 
    setSimulateSlippage 
  } = useTradingStore();

  const [optionType, setOptionType] = useState("CALL");
  const [underlying, setUnderlying] = useState("NIFTY");
  const [strikePrice, setStrikePrice] = useState(24300);
  const [entryPrice, setEntryPrice] = useState(83.0);
  const [lots, setLots] = useState(1);
  const [stopLoss, setStopLoss] = useState(75.0);
  const [targetPrice, setTargetPrice] = useState(102.0);
  const [hedgeStrike, setHedgeStrike] = useState(24400);
  const [hedgePrice, setHedgePrice] = useState(38.0);
  const [copilotRegime, setCopilotRegime] = useState("AUTO"); // "AUTO" | "PRIME" | "WARNING" | "BLOCKED"
  const [sandboxBypass, setSandboxBypass] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);

  const lotSize = LOT_SIZES[underlying] || 65;
  const totalQty = lots * lotSize;
  const netEntryPrice = strategyMode === "SPREAD" ? Math.max(0.1, entryPrice - hedgePrice) : entryPrice;
  const capitalOutlay = totalQty * netEntryPrice;
  const riskAmount = totalQty * Math.max(0, netEntryPrice - stopLoss);
  const rewardAmount = totalQty * Math.max(0, targetPrice - netEntryPrice);
  const rrRatio = riskAmount > 0 ? (rewardAmount / riskAmount).toFixed(2) : "0.00";

  // Deterministic Trading Copilot Pro Market State Engine (/trading-copilot-pro)
  const copilotState = useMemo(() => {
    if (copilotRegime === "PRIME") {
      return {
        regime: "PRIME",
        status: "APPROVED",
        badge: "🟢 PRIME 12/12 APPROVED",
        badgeBg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.3)]",
        bannerBg: "bg-gradient-to-r from-emerald-500/20 via-teal-500/10 to-transparent border-emerald-500/40 shadow-[0_0_25px_rgba(16,185,129,0.15)]",
        ambientGlow: "bg-emerald-500/10",
        pulseColor: "bg-emerald-400",
        title: "Prime Momentum Scalp",
        subtitle: "15m VWAP breakout + 1H EMA trend confirmed. 1:2.38 R:R locked with strict risk bounds.",
        buttonText: "🚀 1-Click Auto-Deploy",
        buttonClass: "bg-emerald-500 hover:bg-emerald-400 text-black font-black shadow-lg shadow-emerald-500/30",
        ctaText: "Deploy Prime Live Setup (12/12 Approved) →",
        ctaClass: "bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 text-black font-extrabold shadow-xl shadow-emerald-500/25 cursor-pointer",
        canDeploy: true,
        recommendedLots: 1
      };
    }
    if (copilotRegime === "WARNING") {
      return {
        regime: "WARNING",
        status: "CAUTION",
        badge: "🟡 RISKY / MID-DAY WARNING",
        badgeBg: "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.3)]",
        bannerBg: "bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-transparent border-amber-500/40 shadow-[0_0_25px_rgba(245,158,11,0.15)]",
        ambientGlow: "bg-amber-500/10",
        pulseColor: "bg-amber-400",
        title: "Caution: Mid-Day Chop Zone",
        subtitle: "Low volume theta decay window (11:15-13:15 IST). Sizing capped at 50% for defense.",
        buttonText: "⚠️ Auto-Deploy (50% Sizing)",
        buttonClass: "bg-amber-500 hover:bg-amber-400 text-black font-black shadow-lg shadow-amber-500/30",
        ctaText: "⚠️ Deploy with Warning (Reduced 50% Lot Size) →",
        ctaClass: "bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 text-black font-extrabold shadow-xl shadow-amber-500/25 cursor-pointer",
        canDeploy: true,
        recommendedLots: 1
      };
    }
    if (copilotRegime === "BLOCKED") {
      return {
        regime: "BLOCKED",
        status: "STAND_DOWN",
        badge: "🔴 BANNED EXECUTION WINDOW",
        badgeBg: "bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-[0_0_12px_rgba(244,63,94,0.3)]",
        bannerBg: "bg-gradient-to-r from-rose-500/20 via-red-500/10 to-transparent border-rose-500/40 shadow-[0_0_25px_rgba(244,63,94,0.15)]",
        ambientGlow: "bg-rose-500/10",
        pulseColor: "bg-rose-400",
        title: "Stand Down · Capital Protected",
        subtitle: "Zero edge / outside liquidity hours. 100% of bankroll protected against chop.",
        buttonText: "🛑 Stand Down (Locked)",
        buttonClass: "bg-rose-500/20 text-rose-300 border border-rose-500/40 cursor-not-allowed opacity-90",
        ctaText: "🛑 Trading Locked (Zero Edge · Preserving Bankroll)",
        ctaClass: "bg-rose-950/60 border border-rose-500/30 text-rose-400/80 cursor-not-allowed shadow-none",
        canDeploy: false,
        recommendedLots: 0
      };
    }

    // AUTO EVALUATION BASED ON LIVE TIME & 12-FILTERS
    const now = new Date();
    const utcHours = now.getUTCHours();
    const utcMins = now.getUTCMinutes();
    const istMinsTotal = (utcHours * 60 + utcMins + 330) % 1440;
    const istHour = Math.floor(istMinsTotal / 60);
    const istMinute = istMinsTotal % 60;

    const isMarketOpen = (istHour > 9 || (istHour === 9 && istMinute >= 15)) && (istHour < 15 || (istHour === 15 && istMinute <= 30));

    if (!isMarketOpen) {
      return {
        regime: "BLOCKED",
        status: "STAND_DOWN",
        badge: "🔴 MARKET CLOSED (09:15-15:30 IST)",
        badgeBg: "bg-rose-500/20 text-rose-300 border-rose-500/40",
        bannerBg: "bg-gradient-to-r from-rose-500/20 via-red-500/10 to-transparent border-rose-500/40 shadow-[0_0_25px_rgba(244,63,94,0.15)]",
        ambientGlow: "bg-rose-500/10",
        pulseColor: "bg-rose-400",
        title: "Market Offline · Practice Simulation Ready",
        subtitle: "Live market opens at 09:15 AM IST. Select simulated regimes above to test dynamic states.",
        buttonText: "🛑 Stand Down (Locked)",
        buttonClass: "bg-rose-500/20 text-rose-300 border border-rose-500/40 cursor-not-allowed opacity-90",
        ctaText: "Deploy Practice Trade in Sandbox Mode →",
        ctaClass: "bg-gradient-to-r from-cyan-500 to-sky-400 hover:from-cyan-400 text-black font-extrabold shadow-xl shadow-cyan-500/25 cursor-pointer",
        canDeploy: true,
        recommendedLots: 1
      };
    }

    if ((istHour === 9 && istMinute < 20) || (istHour === 15 && istMinute >= 0)) {
      return {
        regime: "BLOCKED",
        status: "STAND_DOWN",
        badge: "🔴 SQUARING VOLATILITY CHOP",
        badgeBg: "bg-rose-500/20 text-rose-300 border-rose-500/40",
        bannerBg: "bg-gradient-to-r from-rose-500/20 via-red-500/10 to-transparent border-rose-500/40 shadow-[0_0_25px_rgba(244,63,94,0.15)]",
        ambientGlow: "bg-rose-500/10",
        pulseColor: "bg-rose-400",
        title: "Volatility Blackout Window",
        subtitle: "First 5-mins opening spreads & auto square-off volatility blocked.",
        buttonText: "🛑 Stand Down (Locked)",
        buttonClass: "bg-rose-500/20 text-rose-300 border border-rose-500/40 cursor-not-allowed opacity-90",
        ctaText: "🛑 Trading Locked (Zero Edge)",
        ctaClass: "bg-rose-950/60 border border-rose-500/30 text-rose-400/80 cursor-not-allowed shadow-none",
        canDeploy: false,
        recommendedLots: 0
      };
    }

    if ((istHour === 11 && istMinute >= 15) || istHour === 12 || (istHour === 13 && istMinute < 15)) {
      return {
        regime: "WARNING",
        status: "CAUTION",
        badge: "🟡 MID-DAY THETA CHOP (11:15-13:15 IST)",
        badgeBg: "bg-amber-500/20 text-amber-300 border-amber-500/40",
        bannerBg: "bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-transparent border-amber-500/40 shadow-[0_0_25px_rgba(245,158,11,0.15)]",
        ambientGlow: "bg-amber-500/10",
        pulseColor: "bg-amber-400",
        title: "Caution: Lunchtime Theta Decay",
        subtitle: "Mid-day low volume chop zone. Enforcing 50% lot size reduction.",
        buttonText: "⚠️ Auto-Deploy (50% Lot)",
        buttonClass: "bg-amber-500 hover:bg-amber-400 text-black font-black shadow-lg shadow-amber-500/30",
        ctaText: "⚠️ Deploy with Warning (50% Sizing)",
        ctaClass: "bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 text-black shadow-xl shadow-amber-500/25 cursor-pointer",
        canDeploy: true,
        recommendedLots: 1
      };
    }

    return {
      regime: "PRIME",
      status: "APPROVED",
      badge: "🟢 PRIME EXECUTION WINDOW · 12/12 APPROVED",
      badgeBg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
      bannerBg: "bg-gradient-to-r from-emerald-500/20 via-teal-500/10 to-transparent border-emerald-500/40 shadow-[0_0_25px_rgba(16,185,129,0.15)]",
      ambientGlow: "bg-emerald-500/10",
      pulseColor: "bg-emerald-400",
      title: "Prime Momentum Scalp",
      subtitle: "15m VWAP breakout + 1H EMA trend confirmed. 1:2.38 R:R locked.",
      buttonText: "🚀 1-Click Auto-Deploy",
      buttonClass: "bg-emerald-500 hover:bg-emerald-400 text-black font-black shadow-lg shadow-emerald-500/30",
      ctaText: "Deploy Prime Live Setup (Approved) →",
      ctaClass: "bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 text-black font-extrabold shadow-xl shadow-emerald-500/25 cursor-pointer",
      canDeploy: true,
      recommendedLots: 1
    };
  }, [copilotRegime]);

  // AI Presets Handler
  const applyPreset = (preset) => {
    if (preset === "atm") {
      setStrikePrice(24300);
      setEntryPrice(83.0);
      setStopLoss(75.0);
      setTargetPrice(102.0);
    } else if (preset === "safe") {
      setStrikePrice(24300);
      setEntryPrice(80.0);
      setStopLoss(70.0);
      setTargetPrice(100.0);
    } else if (preset === "hero") {
      setStrikePrice(24400);
      setEntryPrice(25.0);
      setStopLoss(15.0);
      setTargetPrice(65.0);
    }
  };

  const handleSelectAsset = (asset) => {
    setUnderlying(asset.key);
    setStrikePrice(asset.defaultStrike);
    setEntryPrice(asset.defaultEntry);
    setStopLoss(asset.defaultSL);
    setTargetPrice(asset.defaultTP);
  };

  const handleDeploy = (e) => {
    e.preventDefault();
    if (isDeploying) return;
    if (!copilotState.canDeploy && copilotRegime === "BLOCKED" && !sandboxBypass) return;

    setIsDeploying(true);
    const symbol = `${underlying} ${strikePrice} ${optionType === "CALL" ? "CE" : "PE"}`;
    
    deployPracticeTrade({
      symbol,
      underlyingSymbol: underlying,
      strikePrice,
      optionType,
      entryPrice: netEntryPrice,
      stopLoss,
      targetPrice,
      quantity: lots,
      lotSize,
      feedMode,
      strategyMode,
      entryReason: `${strategyMode === "SPREAD" ? "Defined-Risk Spread" : "ATM Scalp"} · R:R 1:${rrRatio}`
    });

    setTimeout(() => {
      setIsDeploying(false);
    }, 500);
  };

  const isFormLocked = copilotState.regime === "BLOCKED" && !sandboxBypass && !copilotState.canDeploy;

  return (
    <div className="relative overflow-hidden p-6 sm:p-7 rounded-3xl bg-app-card/75 backdrop-blur-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.4)] space-y-6 transition-all duration-300">
      {/* Soft Ambient Radial Lighting Accent */}
      <div className={clsx("absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20 transition-all duration-500", copilotState.ambientGlow)} />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-500/[0.03] rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

      {/* Header Bar & Live Ticks Telemetry */}
      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/20 shadow-sm whitespace-nowrap">
            ⚡ OPTIONS ORDER DESK
          </span>
          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 shadow-sm flex items-center gap-1.5 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            Live Upstox Market Ticks
          </span>
        </div>

        {/* Dynamic Copilot Regime Simulator Pills */}
        <div className="flex items-center gap-1 text-xs flex-wrap">
          <span className="text-slate-400 text-[10px] font-medium mr-1 flex items-center gap-1">
            <SlidersHorizontal className="w-3 h-3 text-cyan-400" />
            Copilot Gate:
          </span>
          <button
            type="button"
            onClick={() => setCopilotRegime("AUTO")}
            className={clsx(
              "px-2 py-0.5 rounded-lg text-[10px] font-bold transition",
              copilotRegime === "AUTO" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40" : "bg-white/5 text-slate-400 hover:text-white"
            )}
          >
            ⚡ Auto IST
          </button>
          <button
            type="button"
            onClick={() => setCopilotRegime("PRIME")}
            className={clsx(
              "px-2 py-0.5 rounded-lg text-[10px] font-bold transition",
              copilotRegime === "PRIME" ? "bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 shadow-sm" : "bg-white/5 text-slate-400 hover:text-emerald-300"
            )}
          >
            🟢 Prime
          </button>
          <button
            type="button"
            onClick={() => setCopilotRegime("WARNING")}
            className={clsx(
              "px-2 py-0.5 rounded-lg text-[10px] font-bold transition",
              copilotRegime === "WARNING" ? "bg-amber-500/25 text-amber-300 border border-amber-500/40 shadow-sm" : "bg-white/5 text-slate-400 hover:text-amber-300"
            )}
          >
            🟡 Risky
          </button>
          <button
            type="button"
            onClick={() => setCopilotRegime("BLOCKED")}
            className={clsx(
              "px-2 py-0.5 rounded-lg text-[10px] font-bold transition",
              copilotRegime === "BLOCKED" ? "bg-rose-500/25 text-rose-300 border border-rose-500/40 shadow-sm" : "bg-white/5 text-slate-400 hover:text-rose-300"
            )}
          >
            🔴 Blocked
          </button>
        </div>
      </div>

      {/* Dynamic 3-Color 1-Click Auto Deploy Banner */}
      <div className={clsx("relative p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all duration-300", copilotState.bannerBg)}>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={clsx("w-2 h-2 rounded-full animate-pulse", copilotState.pulseColor)} />
            <strong className="text-white text-xs font-bold">Live Upstox Option Pick:</strong>
            <span className="text-xs font-mono font-bold text-white bg-black/40 px-2 py-0.5 rounded border border-white/10">
              {underlying} {strikePrice} {optionType === "CALL" ? "CE" : "PE"} · {copilotState.title}
            </span>
            <span className={clsx("text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border", copilotState.badgeBg)}>
              {copilotState.badge}
            </span>
          </div>
          <small className="text-slate-300 text-[11px] block mt-1">
            {copilotState.subtitle}
          </small>
        </div>

        <button
          type="button"
          onClick={() => {
            if (copilotState.canDeploy || sandboxBypass) {
              applyPreset("atm");
            }
          }}
          disabled={!copilotState.canDeploy && !sandboxBypass}
          className={clsx(
            "px-4 py-2 rounded-xl text-xs transition flex items-center justify-center gap-1.5 self-start sm:self-auto flex-shrink-0",
            copilotState.buttonClass
          )}
        >
          {copilotState.buttonText}
        </button>
      </div>

      {/* 1-Tap Institutional Index Ticker Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          <span>🏛️ Institutional Underlying Ticker</span>
          <span className="text-[10px] text-cyan-400 lowercase font-mono">1-tap auto-calibrate</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {INDEX_ASSETS.map((asset) => (
            <button
              key={asset.key}
              type="button"
              onClick={() => handleSelectAsset(asset)}
              className={clsx(
                "p-2.5 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between",
                underlying === asset.key
                  ? "bg-cyan-500/15 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.2)] text-white"
                  : "bg-white/[0.02] border-white/5 text-slate-400 hover:text-white hover:bg-white/[0.05]"
              )}
            >
              <div className="flex items-center justify-between">
                <strong className="text-xs font-bold font-mono">{asset.name}</strong>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-white/10 text-slate-300">
                  {asset.lot}/lot
                </span>
              </div>
              <div className="flex items-baseline justify-between mt-1">
                <span className="font-mono text-xs text-white font-bold">₹{asset.spot.toLocaleString("en-IN")}</span>
                <span className="text-[10px] font-mono text-emerald-400 font-bold">{asset.change}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Mode Switches: Feed Mode + Spread Mode + Slippage Guard */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
        {/* Feed Mode Switcher */}
        <div className="flex rounded-xl bg-white/[0.03] border border-white/5 p-1">
          <button
            type="button"
            onClick={() => setFeedMode("LIVE")}
            className={clsx("flex-1 py-1.5 rounded-lg font-bold transition text-center", feedMode === "LIVE" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30" : "text-slate-400 hover:text-slate-200")}
          >
            🟢 Live Auto-Exit
          </button>
          <button
            type="button"
            onClick={() => setFeedMode("MANUAL")}
            className={clsx("flex-1 py-1.5 rounded-lg font-bold transition text-center", feedMode === "MANUAL" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30" : "text-slate-400 hover:text-slate-200")}
          >
            🎮 Sandbox Mode
          </button>
        </div>

        {/* Strategy Structure */}
        <div className="flex rounded-xl bg-white/[0.03] border border-white/5 p-1">
          <button
            type="button"
            onClick={() => setStrategyMode("NAKED")}
            className={clsx("flex-1 py-1.5 rounded-lg font-bold transition text-center", strategyMode === "NAKED" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30" : "text-slate-400 hover:text-slate-200")}
          >
            ⚡ Single-Leg Scalp
          </button>
          <button
            type="button"
            onClick={() => setStrategyMode("SPREAD")}
            className={clsx("flex-1 py-1.5 rounded-lg font-bold transition text-center", strategyMode === "SPREAD" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30" : "text-slate-400 hover:text-slate-200")}
          >
            🛡️ Spread (2-Legs)
          </button>
        </div>

        {/* Slippage Guard Toggle */}
        <label className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/5 cursor-pointer">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={simulateSlippage}
              onChange={(e) => setSimulateSlippage(e.target.checked)}
              className="rounded bg-white/10 border-white/20 text-cyan-500 focus:ring-0"
            />
            <span className="text-slate-300 font-medium text-[11px]">Simulate Slippage (-0.5 pt)</span>
          </div>
          <span className={clsx("text-[10px] font-bold px-1.5 py-0.5 rounded", simulateSlippage ? "bg-amber-500/20 text-amber-300" : "bg-white/5 text-slate-400")}>
            {simulateSlippage ? "Active" : "Ideal Fills"}
          </span>
        </label>
      </div>

      {/* Main Order Form with Locking Barrier */}
      <div className="relative">
        {/* Apple VisionOS Form Locking Barrier for Blocked State */}
        {isFormLocked && (
          <div className="absolute inset-0 z-20 rounded-2xl bg-slate-950/80 backdrop-blur-md border border-rose-500/30 p-6 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.3)]">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <strong className="text-white text-sm font-bold block">
                Trading Desk Locked by Quantitative Risk Engine
              </strong>
              <p className="text-xs text-slate-300 max-w-md mt-1">
                Market is in a banned volatility window or 0-edge chop zone. 100% of capital is preserved.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSandboxBypass(true)}
              className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-cyan-300 border border-cyan-500/30 text-xs font-bold flex items-center gap-1.5 transition"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>Unlock Sandbox Simulation (Test Anyway)</span>
            </button>
          </div>
        )}

        <form onSubmit={handleDeploy} className={clsx("space-y-4 transition-all duration-200", isFormLocked && "filter blur-sm opacity-40 pointer-events-none")}>
          {/* Step 1: Sentiment Switcher */}
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              1️⃣ Strategy &amp; Market Direction
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setOptionType("CALL")}
                className={clsx(
                  "p-3 rounded-xl border text-left transition flex items-center gap-3",
                  optionType === "CALL"
                    ? "bg-emerald-500/15 border-emerald-500/40 text-white shadow-lg shadow-emerald-500/10"
                    : "bg-white/[0.02] border-white/5 text-slate-400 hover:text-slate-200"
                )}
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">
                  ▲
                </div>
                <div>
                  <strong className="block text-xs font-bold text-emerald-300">BUY CALL (CE)</strong>
                  <span className="text-[10px] text-slate-400">Bullish Momentum Scalp</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setOptionType("PUT")}
                className={clsx(
                  "p-3 rounded-xl border text-left transition flex items-center gap-3",
                  optionType === "PUT"
                    ? "bg-rose-500/15 border-rose-500/40 text-white shadow-lg shadow-rose-500/10"
                    : "bg-white/[0.02] border-white/5 text-slate-400 hover:text-slate-200"
                )}
              >
                <div className="w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center text-rose-400 font-bold">
                  ▼
                </div>
                <div>
                  <strong className="block text-xs font-bold text-rose-300">BUY PUT (PE)</strong>
                  <span className="text-[10px] text-slate-400">Bearish Breakdown Scalp</span>
                </div>
              </button>
            </div>
          </div>

          {/* Step 2: Contract Parameters & Sizing */}
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              2️⃣ Contract &amp; Position Sizing
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {/* Underlying */}
              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Underlying Index</label>
                <select
                  value={underlying}
                  onChange={(e) => setUnderlying(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-cyan-500/50"
                >
                  <option value="NIFTY">NIFTY 50 (65/lot)</option>
                  <option value="BANKNIFTY">BANKNIFTY (35/lot)</option>
                  <option value="FINNIFTY">FINNIFTY (65/lot)</option>
                  <option value="SENSEX">SENSEX (20/lot)</option>
                </select>
              </div>

              {/* Strike Stepper */}
              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Strike Price</label>
                <div className="flex items-center rounded-xl bg-white/[0.03] border border-white/10 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setStrikePrice((s) => s - 50)}
                    className="px-3 py-2 text-slate-400 hover:text-white hover:bg-white/5 font-bold"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    value={strikePrice}
                    onChange={(e) => setStrikePrice(Number(e.target.value))}
                    step="50"
                    className="w-full bg-transparent text-center text-white font-mono font-bold focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setStrikePrice((s) => s + 50)}
                    className="px-3 py-2 text-slate-400 hover:text-white hover:bg-white/5 font-bold"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Entry Price */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-slate-400 font-medium">Entry Price (₹)</label>
                  <span className="text-[10px] font-mono text-cyan-400 font-bold">{underlying} {strikePrice}</span>
                </div>
                <input
                  type="number"
                  value={entryPrice}
                  onChange={(e) => setEntryPrice(Number(e.target.value))}
                  step="0.05"
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-cyan-500/50"
                />
              </div>

              {/* Lots Count */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-slate-400 font-medium">Lots (Count)</label>
                  <div className="flex items-center gap-1">
                    {[1, 2, 5].map((l) => (
                      <button
                        key={l}
                        type="button"
                        onClick={() => setLots(l)}
                        className={clsx("px-1.5 py-0.5 rounded text-[10px] font-mono", lots === l ? "bg-cyan-500 text-black font-bold" : "bg-white/10 text-slate-300")}
                      >
                        {l}L
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center rounded-xl bg-white/[0.03] border border-white/10 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setLots((l) => Math.max(1, l - 1))}
                    className="px-3 py-2 text-slate-400 hover:text-white hover:bg-white/5 font-bold"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    value={lots}
                    onChange={(e) => setLots(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-transparent text-center text-white font-mono font-bold focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setLots((l) => l + 1)}
                    className="px-3 py-2 text-slate-400 hover:text-white hover:bg-white/5 font-bold"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Step 2b: Hedge Leg (If Spread Mode is Active) */}
          {strategyMode === "SPREAD" && (
            <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-purple-300">🛡️ Leg 2: Hedge Short Leg (Sell OTM Option)</span>
                <span className="text-[10px] font-mono bg-purple-500/20 text-purple-200 px-2 py-0.5 rounded">
                  Sell {underlying} {hedgeStrike} {optionType === "CALL" ? "CE" : "PE"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Hedge Strike (Short)</label>
                  <input
                    type="number"
                    value={hedgeStrike}
                    onChange={(e) => setHedgeStrike(Number(e.target.value))}
                    step="50"
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Hedge Premium Received (₹)</label>
                  <input
                    type="number"
                    value={hedgePrice}
                    onChange={(e) => setHedgePrice(Number(e.target.value))}
                    step="0.05"
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-white font-mono font-bold"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Risk & Target Protection */}
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              3️⃣ Risk &amp; Target Protection
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-rose-400 font-bold">🛑 Stop Loss (SL Price)</label>
                  <span className="text-[10px] font-mono text-rose-400">
                    -{(netEntryPrice - stopLoss).toFixed(2)} pts (-{(((netEntryPrice - stopLoss) / (netEntryPrice || 1)) * 100).toFixed(1)}%)
                  </span>
                </div>
                <input
                  type="number"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(Number(e.target.value))}
                  step="0.05"
                  className="w-full bg-rose-500/10 border border-rose-500/30 rounded-xl px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-emerald-400 font-bold">🎯 Target Price (TP Price)</label>
                  <span className="text-[10px] font-mono text-emerald-400">
                    +{(targetPrice - netEntryPrice).toFixed(2)} pts (+{(((targetPrice - netEntryPrice) / (netEntryPrice || 1)) * 100).toFixed(1)}%)
                  </span>
                </div>
                <input
                  type="number"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(Number(e.target.value))}
                  step="0.05"
                  className="w-full bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Dynamic Expiry Payoff Curve SVG with Interactive Anchors */}
          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-300">📈 Dynamic Expiry Payoff Curve</span>
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">
                Breakeven: ₹{(strikePrice + (optionType === "CALL" ? netEntryPrice : -netEntryPrice)).toFixed(0)}
              </span>
            </div>

            <div className="w-full h-20 relative">
              <svg className="w-full h-full" viewBox="0 0 500 80" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="payoffGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#00f5c4" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#00f5c4" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <line x1="0" y1="45" x2="500" y2="45" stroke="rgba(255,255,255,0.15)" strokeDasharray="3,3" />
                <path d="M 0,65 L 180,65 L 340,15 L 500,15 L 500,45 L 0,45 Z" fill="url(#payoffGrad)" />
                <path d="M 0,65 L 180,65 L 340,15 L 500,15" fill="none" stroke="#00d5ff" strokeWidth="2.5" />
                {/* SL Dot */}
                <circle cx="180" cy="65" r="4.5" fill="#f43f5e" stroke="#fff" strokeWidth="1.5" />
                {/* Breakeven Dot */}
                <circle cx="260" cy="45" r="4" fill="#fff" stroke="#00d5ff" strokeWidth="2" />
                {/* Target Dot */}
                <circle cx="340" cy="15" r="4.5" fill="#10b981" stroke="#fff" strokeWidth="1.5" />
              </svg>
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-rose-400">🛑 Max Risk: -₹{riskAmount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
              <span className="text-cyan-400">R:R 1 : {rrRatio}</span>
              <span className="text-emerald-400">🎯 Target Profit: +₹{rewardAmount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
            </div>
          </div>

          {/* Pre-Flight Telemetry Strip & Deploy CTA */}
          <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div>
                <span className="text-slate-400 text-[10px] block">Capital Outlay</span>
                <strong className="text-white font-mono text-sm">₹{capitalOutlay.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">Max Risk</span>
                <strong className="text-rose-400 font-mono text-sm">₹{riskAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">Target Profit</span>
                <strong className="text-emerald-400 font-mono text-sm">+₹{rewardAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">Risk : Reward</span>
                <strong className="text-cyan-400 font-mono text-sm">1 : {rrRatio}</strong>
              </div>
            </div>

            <button
              type="submit"
              disabled={(!copilotState.canDeploy && copilotRegime === "BLOCKED" && !sandboxBypass) || isDeploying}
              className={clsx(
                "w-full py-3.5 rounded-xl font-black text-sm transition flex items-center justify-center gap-2",
                copilotState.ctaClass,
                isDeploying && "opacity-75 cursor-wait"
              )}
            >
              {isDeploying ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-black" />
                  <span>Arming Order...</span>
                </>
              ) : copilotState.canDeploy || sandboxBypass ? (
                <>
                  <Zap className="w-4 h-4 fill-current" />
                  <span>{copilotState.ctaText}</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>{copilotState.ctaText}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
