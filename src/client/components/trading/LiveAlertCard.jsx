import React, { useEffect, useState } from "react";
import { useLivePriceStore } from "../../stores/useLivePriceStore";
import { useTradingStore, resolveIndexLotSize } from "../../stores/useTradingStore";
import { soundEngine } from "../../utils/soundEngine";
import { Zap, ShieldAlert, Target, RefreshCw, ShieldCheck, Lock, HelpCircle, Info, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";

export function LiveAlertCard({ trade, alert, onMarkHit, onClose, onDelete }) {
  const item = trade || alert || {};
  const { squareOffTrade, squareOffAlert, adjustStopLoss, adjustTargetPrice, setBreakevenSL } = useTradingStore();
  
  const id = item.id;
  const symbol = item.symbol || item.tradingsymbol || "NIFTY 24500 CE";
  const optionType = item.optionType || item.option_type || (symbol.includes("PE") ? "PUT" : "CALL");
  const isCE = optionType === "CALL" || optionType === "CE";
  const entry = Number(item.entryPrice || item.entry_price || 0);
  const target = Number(item.targetPrice || item.target_price || item.target || entry * 1.3);
  const stopLoss = Number(item.stopLoss || item.stop_loss || item.sl || entry * 0.85);
  const quantity = Number(item.quantity || 1);
  const lotSize = resolveIndexLotSize(symbol, item.lotSize);
  const totalQty = quantity * lotSize;
  const strategyTag = item.strategyTag || item.strategyTags || item.setupTag || "Practice Scalp";

  const [currentLtp, setCurrentLtp] = useState(entry);
  const [autoTrailBE, setAutoTrailBE] = useState(true);
  const [hasAutoLockedBE, setHasAutoLockedBE] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [showRulesGuide, setShowRulesGuide] = useState(false);

  // Sync initial tick if already present in store
  useEffect(() => {
    const existingTick =
      (item.serverId && useLivePriceStore.getState().ticks?.[item.serverId]) ||
      useLivePriceStore.getState().ticks?.[id] ||
      useLivePriceStore.getState().ticks?.[symbol] ||
      (item.tokenKey && useLivePriceStore.getState().ticks?.[item.tokenKey]);
    if (existingTick?.ltp) {
      setCurrentLtp(Number(existingTick.ltp));
    }
  }, [id, item.serverId, symbol, item.tokenKey]);

  // Live Tick Subscription with Pure React State Updates
  useEffect(() => {
    if (!id && !item.serverId) return;
    const unsub = useLivePriceStore.subscribe(
      (state) =>
        (item.serverId && state.ticks?.[item.serverId]) ||
        state.ticks?.[id] ||
        state.ticks?.[symbol] ||
        (item.tokenKey && state.ticks?.[item.tokenKey]),
      (tick) => {
        if (!tick) return;
        const ltp = Number(tick.ltp || tick.price || entry);
        setCurrentLtp(ltp);

        const isShort = item.direction === "SHORT";
        const pts = isShort ? (entry - ltp) : (ltp - entry);
        const isGainNow = pts >= 0;

        // Automated Trailing Stop to Breakeven (+1R threshold)
        if (autoTrailBE && !hasAutoLockedBE && isGainNow && target > entry) {
          const halfWayToTarget = entry + (target - entry) * 0.45;
          if (ltp >= halfWayToTarget && stopLoss < entry) {
            setBreakevenSL(id);
            setHasAutoLockedBE(true);
            soundEngine.playBreakevenTone();
          }
        }

        // Automated Target & Hard Stop Loss Execution
        const isLongOption = target > entry && stopLoss < entry;
        const isSlHit = isLongOption ? (stopLoss > 0 && ltp <= stopLoss) : (stopLoss > 0 && ltp >= stopLoss);
        const isTargetHit = isLongOption ? (target > 0 && ltp >= target) : (target > 0 && ltp <= target);

        if (isSlHit) {
          soundEngine.playStopLossTone();
          if (squareOffTrade) squareOffTrade(id, ltp);
          else if (onClose) onClose(id, ltp);
        } else if (isTargetHit) {
          soundEngine.playTargetChime();
          if (squareOffTrade) squareOffTrade(id, ltp);
          else if (onClose) onClose(id, ltp);
        }
      }
    );

    return () => unsub();
  }, [id, item.serverId, symbol, item.tokenKey, entry, target, stopLoss, autoTrailBE, hasAutoLockedBE, setBreakevenSL, item.direction]);

  // Pure React Derived State
  const isShort = item.direction === "SHORT";
  const pts = isShort ? (entry - currentLtp) : (currentLtp - entry);
  const netRupees = pts * totalQty;
  const isGain = pts >= 0;
  const rrRatio = (Math.abs(target - entry) / (Math.abs(entry - stopLoss) || 1)).toFixed(2);

  const slPointsDelta = Math.abs(entry - stopLoss);
  const slPct = entry > 0 ? ((slPointsDelta / entry) * 100).toFixed(1) : "0.0";
  const slRupees = slPointsDelta * totalQty;

  const targetPointsDelta = Math.abs(target - entry);
  const targetGainPct = entry > 0 ? ((targetPointsDelta / entry) * 100).toFixed(1) : "0.0";
  const targetRupees = targetPointsDelta * totalQty;

  const totalSpan = Math.max(0.01, target - stopLoss);
  const rawProgress = ((currentLtp - stopLoss) / totalSpan) * 100;
  const clampedProgress = Math.min(100, Math.max(0, rawProgress));
  const targetDistance = Math.max(0, target - currentLtp);
  const stopDistance = Math.max(0, currentLtp - stopLoss);
  const stopBufferRupees = stopDistance * totalQty;
  const targetDistRupees = targetDistance * totalQty;
  const targetPct = target > entry ? Math.min(100, ((currentLtp - entry) / (target - entry)) * 100).toFixed(0) : "0";

  const handleSquareOff = () => {
    if (isClosing) return;
    setIsClosing(true);
    soundEngine.playOrderFillTone();
    if (onClose) {
      onClose(id, currentLtp);
    } else if (squareOffTrade) {
      squareOffTrade(id, currentLtp);
    } else if (squareOffAlert) {
      squareOffAlert(id, currentLtp);
    }
  };

  const handleManualBreakeven = () => {
    soundEngine.playBreakevenTone();
    setBreakevenSL(id);
    setHasAutoLockedBE(true);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: -10 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={clsx(
        "p-4 sm:p-5 rounded-3xl bg-gradient-to-b from-[#0f172a]/95 via-[#0a101f]/95 to-[#070b16]/95 backdrop-blur-2xl border border-white/[0.08] shadow-[0_16px_36px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] relative overflow-hidden space-y-4 group transition-all duration-300",
        isGain 
          ? "hover:border-emerald-500/30 hover:shadow-[0_20px_45px_rgba(16,185,129,0.12),inset_0_1px_0_rgba(255,255,255,0.12)]" 
          : "hover:border-rose-500/30 hover:shadow-[0_20px_45px_rgba(244,63,94,0.12),inset_0_1px_0_rgba(255,255,255,0.12)]"
      )}
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div 
            title={isCE ? "Option Contract: CALL (Bullish bet — profits as price rises)" : "Option Contract: PUT (Bearish bet — profits as price falls)"}
            className={clsx(
              "w-9 h-9 rounded-2xl flex items-center justify-center font-black text-xs border shadow-sm flex-shrink-0 cursor-help",
              isCE ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20"
            )}
          >
            {isCE ? "CALL" : "PUT"}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <strong 
                title={`Instrument Symbol: ${symbol}`} 
                className="text-sm font-extrabold text-white font-mono block cursor-help"
              >
                {symbol}
              </strong>
              <span 
                title="Algorithmic Strategy Classification — Scalping setup with defined risk-to-reward parameters"
                className="text-[9px] font-bold uppercase px-2 py-0.2 rounded-full bg-white/5 text-slate-300 border border-white/10 cursor-help"
              >
                {strategyTag}
              </span>
            </div>
            <span 
              title={`Entry Price: ₹${entry.toFixed(2)} | Lot Sizing: ${quantity} Lot (${totalQty} shares total)`}
              className="text-[11px] text-slate-400 font-mono cursor-help"
            >
              Entry @ ₹{entry.toFixed(2)} · {quantity} Lot ({totalQty} Qty)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              soundEngine.playTabSwitchTone();
              setShowRulesGuide(!showRulesGuide);
            }}
            title="Trading Controls & Abbreviations Guide (Auto-BE, Breakeven, SL, TP)"
            aria-label="Toggle Trading Rules Cheat-Sheet"
            className={clsx(
              "p-1.5 rounded-lg border text-[11px] font-bold transition flex items-center gap-1",
              showRulesGuide 
                ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40" 
                : "bg-white/5 hover:bg-white/10 text-slate-400 border-white/10"
            )}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[10px]">Guide</span>
          </button>

          <span 
            title={`Live Mark-to-Market P&L: ${isGain ? "+" : ""}₹${netRupees.toFixed(2)} (${isGain ? "+" : ""}${pts.toFixed(2)} pts) based on ${totalQty} shares`}
            aria-label={`Current P&L: ${netRupees.toFixed(2)} rupees`}
            className={clsx(
              "text-xs font-mono font-black tabular-nums px-2.5 py-1 rounded-lg border shadow-sm transition-all cursor-help",
              isGain ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 shadow-emerald-500/10" : "bg-rose-500/15 text-rose-300 border-rose-500/30 shadow-rose-500/10"
            )}
          >
            {isGain ? "+" : ""}₹{netRupees.toFixed(2)} ({isGain ? "+" : ""}{pts.toFixed(2)} pts)
          </span>
        </div>
      </div>

      {/* Expandable Trading Rules & Controls Cheat-Sheet */}
      <AnimatePresence>
        {showRulesGuide && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="p-3.5 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 text-xs space-y-2 text-slate-300 backdrop-blur-md overflow-hidden"
          >
            <div className="flex items-center justify-between font-bold text-cyan-300">
              <span className="flex items-center gap-1.5"><Info className="w-3.5 h-3.5" /> Practice Trade Controls & Abbreviations</span>
              <button 
                type="button" 
                onClick={() => setShowRulesGuide(false)} 
                aria-label="Close Guide"
                className="text-slate-400 hover:text-white transition p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono leading-relaxed">
              <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5">
                <strong className="text-purple-300 block mb-0.5">Auto-BE:</strong>
                Automatically shifts Stop Loss to Entry (₹{entry.toFixed(2)}) when trade hits +1R profit (approx 45% towards target).
              </div>
              <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5">
                <strong className="text-cyan-300 block mb-0.5">BE Lock:</strong>
                1-click manual lock to move Stop Loss to Entry (₹{entry.toFixed(2)}) for 100% risk-free trade once in profit.
              </div>
              <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5">
                <strong className="text-emerald-300 block mb-0.5">Target (TP):</strong>
                Planned profit exit based on 1:{rrRatio} Risk-to-Reward ratio (₹{target.toFixed(2)}).
              </div>
              <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5">
                <strong className="text-rose-300 block mb-0.5">Stop Loss (SL):</strong>
                Hard loss ceiling (₹{stopLoss.toFixed(2)}) to strictly cap maximum risk per lot.
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-3 gap-2.5 py-2.5 px-3 rounded-2xl bg-white/[0.02] border border-white/5 text-center">
        <div 
          title={`Hard Stop Loss (SL): ₹${stopLoss.toFixed(2)} (-${slPointsDelta.toFixed(2)} pts · -${slPct}% · -₹${slRupees.toFixed(2)} max risk)`}
          className="space-y-0.5 cursor-help"
        >
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Stop Loss 🛡️</span>
          <span className="text-xs font-mono font-bold text-rose-400 tabular-nums">₹{stopLoss.toFixed(2)}</span>
          <span className="text-[9px] font-mono text-rose-400/90 font-bold block tabular-nums leading-tight">
            -{slPointsDelta.toFixed(1)} pts (-{slPct}%)
          </span>
        </div>
        <div 
          title={`Last Traded Price (LTP): ₹${currentLtp.toFixed(2)} — Real-time live market option tick from Upstox (<25ms stream)`}
          className="space-y-0.5 border-x border-white/5 cursor-help"
        >
          <span className="text-[9px] font-bold text-cyan-300 uppercase tracking-wider block flex items-center justify-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" /> Live LTP
          </span>
          <span className="text-sm font-mono font-black text-white tabular-nums">₹{currentLtp.toFixed(2)}</span>
          <span className="text-[9px] font-mono text-emerald-400 block leading-tight">🟢 &lt;25ms feed</span>
        </div>
        <div 
          title={`Take Profit Target (TP): ₹${target.toFixed(2)} (+${targetPointsDelta.toFixed(2)} pts · +${targetGainPct}% · +₹${targetRupees.toFixed(2)} expected reward)`}
          className="space-y-0.5 cursor-help"
        >
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Target 🎯</span>
          <span className="text-xs font-mono font-bold text-emerald-400 tabular-nums">₹{target.toFixed(2)}</span>
          <span className="text-[9px] font-mono text-emerald-400/90 font-bold block tabular-nums leading-tight">
            +{targetPointsDelta.toFixed(1)} pts (+{targetGainPct}%)
          </span>
        </div>
      </div>

      <div className="space-y-1.5 pt-1">
        <div className="flex items-center justify-between text-[10px] gap-1.5 flex-wrap font-mono">
          <span 
            title={`Hard Stop Loss: ₹${stopLoss.toFixed(2)} | Maximum Defined Loss = -₹${slRupees.toFixed(2)}`}
            className="text-slate-400 font-mono whitespace-nowrap"
          >
            SL: ₹{stopLoss.toFixed(2)} <span className="text-rose-400 font-bold">(-₹{slRupees.toFixed(0)})</span>
          </span>
          <span className={clsx("font-bold font-mono text-[10px] text-center", isGain ? "text-emerald-400" : "text-rose-400")}>
            {isGain 
              ? `🟢 ${targetPct}% to Target · ₹${targetDistance.toFixed(1)} pts (₹${targetDistRupees.toFixed(0)}) rem` 
              : `⚠️ Drawdown · ₹${stopDistance.toFixed(1)} buffer (₹${stopBufferRupees.toFixed(0)})`}
          </span>
          <span 
            title={`Take Profit Target: ₹${target.toFixed(2)} | Expected Profit = +₹${targetRupees.toFixed(2)}`}
            className="text-slate-400 font-mono whitespace-nowrap"
          >
            TP: ₹{target.toFixed(2)} <span className="text-emerald-400 font-bold">(+₹{targetRupees.toFixed(0)})</span>
          </span>
        </div>
        <div 
          title={`Mark-to-Target Trajectory: ${targetPct}% progress to Target. Distance to TP: ₹${targetDistance.toFixed(2)} pts | Buffer to SL: ₹${stopDistance.toFixed(2)} pts`}
          className="relative w-full h-3.5 rounded-full bg-black/40 border border-white/10 p-0.5 overflow-visible cursor-help group/track shadow-inner"
        >
          {(() => {
            const entryPos = Math.min(100, Math.max(0, ((entry - stopLoss) / totalSpan) * 100));
            return <div className="absolute top-0 bottom-0 w-0.5 bg-white/50 z-10" style={{ left: `${entryPos}%` }} title={`Entry Price: ₹${entry.toFixed(2)} (Starting Baseline)`} />;
          })()}
          <div
            className={clsx(
              "h-full rounded-full transition-all duration-150 shadow-lg",
              isGain ? "bg-gradient-to-r from-teal-500 via-emerald-400 to-emerald-300 shadow-emerald-500/30" : "bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 shadow-rose-500/30"
            )}
            style={{ width: `${clampedProgress}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 -ml-2 w-4 h-4 rounded-full bg-white border-2 border-cyan-400 shadow-lg shadow-cyan-400/50 z-20 pointer-events-none transition-all duration-150 flex items-center justify-center"
            style={{ left: `${clampedProgress}%` }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-ping" />
          </div>
        </div>
      </div>

      <div className="pt-2 border-t border-white/5 space-y-2.5">
        <div className="flex items-center justify-between text-xs gap-2 flex-wrap">
          <div 
            title="Target Quick Adjustment — Shift your take-profit target price up or down"
            className="flex items-center gap-1 text-[11px] text-slate-300 font-bold cursor-help"
          >
            <Target className="w-3.5 h-3.5 text-emerald-400" /> 
            <span>Target Adjust:</span>
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            {[1, 2, 5, 10, -1, -2, -5].map((delta) => (
              <button 
                key={delta} 
                type="button" 
                onClick={() => {
                  soundEngine.playTabSwitchTone();
                  adjustTargetPrice(id, delta);
                }} 
                title={`Quick Target Adjustment: Shift target by ${delta > 0 ? "+" : ""}₹${delta} per share (New Target: ₹${(target + delta).toFixed(2)})`}
                className={clsx("px-2 py-0.5 rounded-lg border text-[10px] font-mono font-bold transition active:scale-95 hover:brightness-125", delta > 0 ? "text-emerald-300 bg-emerald-500/10 border-emerald-500/20" : "text-amber-300 bg-amber-500/10 border-amber-500/20")}
              >
                {delta > 0 ? `+₹${delta}` : `-₹${Math.abs(delta)}`}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs gap-2 flex-wrap">
          <div 
            title="Stop Loss Quick Adjustment — Shift your hard loss exit price up or down, or lock in breakeven"
            className="flex items-center gap-1 text-[11px] text-slate-300 font-bold cursor-help"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" /> 
            <span>SL Adjust:</span>
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            <button 
              type="button" 
              onClick={() => {
                soundEngine.playTabSwitchTone();
                setAutoTrailBE(!autoTrailBE);
              }} 
              title={`Auto-Breakeven (Auto-BE): ${autoTrailBE ? "ENABLED" : "DISABLED"}. When active, automatically moves your Stop Loss to entry price (₹${entry.toFixed(2)}) once the trade reaches +1R profit (approx 45% towards target) for a 100% risk-free trade.`}
              className={clsx("px-2 py-0.5 rounded-lg border text-[10px] font-mono font-bold transition flex items-center gap-1", autoTrailBE ? "bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-sm" : "bg-white/[0.02] text-slate-500 border-white/5")}
            >
              <Lock className="w-2.5 h-2.5" /> 
              <span>Auto-BE: {autoTrailBE ? "ON" : "OFF"}</span>
            </button>
            {(() => {
              const isEligibleForBE = isCE ? (currentLtp >= entry) : (currentLtp <= entry);
              return (
                <button 
                  type="button" 
                  disabled={!isEligibleForBE} 
                  onClick={() => isEligibleForBE && handleManualBreakeven()} 
                  title={isEligibleForBE ? `Manual Breakeven Lock: Instantly move Stop Loss to Entry Price (₹${entry.toFixed(2)}) to lock in a 100% risk-free trade!` : `Manual Breakeven Locked: Unlocks automatically once current market price is in profit (LTP ${isCE ? ">=" : "<="} ₹${entry.toFixed(2)}).`}
                  className={clsx("px-2.5 py-0.5 rounded-lg border text-[10px] font-mono font-bold transition flex items-center gap-1", isEligibleForBE ? "bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border-cyan-500/40 shadow-sm shadow-cyan-500/10 cursor-pointer active:scale-95" : "bg-white/[0.02] text-slate-500 border-white/5 opacity-50 cursor-not-allowed")}
                >
                  <ShieldCheck className="w-3 h-3" /> 
                  <span>BE (₹{entry.toFixed(1)})</span>
                </button>
              );
            })()}
            {[1, 2, 5, -2, -5].map((delta) => (
              <button 
                key={delta} 
                type="button" 
                onClick={() => {
                  soundEngine.playTabSwitchTone();
                  adjustStopLoss(id, delta);
                }} 
                title={`Quick Stop Loss Adjustment: Shift stop loss by ${delta > 0 ? "+" : ""}₹${delta} per share (New SL: ₹${(stopLoss + delta).toFixed(2)})`}
                className={clsx("px-2 py-0.5 rounded-lg border text-[10px] font-mono font-bold transition active:scale-95 hover:brightness-125", delta > 0 ? "text-emerald-300 bg-emerald-500/10 border-emerald-500/20" : "text-rose-300 bg-rose-500/10 border-rose-500/20")}
              >
                {delta > 0 ? `+₹${delta}` : `-₹${Math.abs(delta)}`}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-2 flex items-center justify-between border-t border-white/5">
          <div 
            title={`Risk-to-Reward Ratio: 1:${rrRatio}. Potential Gain: ₹${(Math.abs(target - entry) * totalQty).toFixed(2)} vs Defined Risk: ₹${(Math.abs(entry - stopLoss) * totalQty).toFixed(2)}`}
            className="flex items-center gap-1.5 cursor-help flex-wrap"
          >
            <span className="text-[10px] text-slate-400 font-medium">Risk/Reward:</span>
            <span className="text-[10px] font-mono font-extrabold text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20">1:{rrRatio}</span>
            <span className={clsx(
              "text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full border",
              Number(rrRatio) >= 2.0 ? "text-emerald-300 bg-emerald-500/15 border-emerald-500/30" : "text-amber-300 bg-amber-500/15 border-amber-500/30"
            )}>
              {Number(rrRatio) >= 2.0 ? "🚀 High R:R" : "⚖️ Standard"}
            </span>
          </div>
          <button 
            type="button" 
            disabled={isClosing}
            onClick={handleSquareOff} 
            className={clsx(
              "px-4 py-1.5 rounded-xl bg-gradient-to-r from-rose-600/30 to-red-500/30 hover:from-rose-600/50 hover:to-red-500/50 text-rose-200 border border-rose-500/40 text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-rose-500/10 active:scale-95",
              isClosing ? "opacity-60 cursor-wait" : "cursor-pointer"
            )}
            title="Emergency Market Exit: Immediately liquidates and closes this entire practice trade at current market bid"
          >
            <RefreshCw className={clsx("w-3.5 h-3.5", isClosing && "animate-spin")} /> 
            <span>{isClosing ? "Closing..." : "Square Off Now"}</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}
