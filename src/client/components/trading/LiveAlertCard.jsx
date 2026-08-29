import React, { useRef, useEffect, useState } from "react";
import { useLivePriceStore } from "../../stores/useLivePriceStore";
import { useTradingStore, resolveIndexLotSize } from "../../stores/useTradingStore";
import { Zap, ShieldAlert, Target, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, RefreshCw, Sparkles, Sliders, ShieldCheck, Award } from "lucide-react";
import { motion } from "framer-motion";
import clsx from "clsx";

export function LiveAlertCard({ trade, alert, onMarkHit, onClose, onDelete }) {
  const item = trade || alert || {};
  const { squareOffAlert, adjustStopLoss, adjustTargetPrice, setBreakevenSL } = useTradingStore();
  
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

  const ltpRef = useRef(null);
  const pnlRef = useRef(null);
  const cardRef = useRef(null);
  const progressBarRef = useRef(null);
  const beaconRef = useRef(null);
  const statusTextRef = useRef(null);

  // Transient Zero-Lag DOM Subscription (60 FPS Performance)
  useEffect(() => {
    if (!id) return;
    const unsub = useLivePriceStore.subscribe(
      (state) => state.ticks?.[id] || state.ticks?.[symbol],
      (tick) => {
        if (!tick) return;
        const ltp = Number(tick.ltp || tick.price || entry);
        setCurrentLtp(ltp);

        if (ltpRef.current) {
          ltpRef.current.textContent = `₹${ltp.toFixed(2)}`;
        }

        const pts = (optionType === "PUT" || optionType === "PE")
          ? (entry - ltp) 
          : (ltp - entry);
        const netRupees = pts * totalQty;
        const isGain = pts >= 0;

        if (pnlRef.current) {
          pnlRef.current.textContent = `${isGain ? "+" : ""}₹${netRupees.toFixed(2)} (${isGain ? "+" : ""}${pts.toFixed(2)} pts)`;
          pnlRef.current.className = clsx(
            "text-xs font-mono font-black tabular-nums px-2.5 py-1 rounded-lg transition-all",
            isGain 
              ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm shadow-emerald-500/10" 
              : "bg-rose-500/15 text-rose-300 border border-rose-500/30 shadow-sm shadow-rose-500/10"
          );
        }

        // Calculate progress along Stop Loss <-> Target trajectory
        const totalSpan = Math.max(0.01, target - stopLoss);
        const rawProgress = ((ltp - stopLoss) / totalSpan) * 100;
        const clampedProgress = Math.min(100, Math.max(0, rawProgress));

        if (progressBarRef.current) {
          progressBarRef.current.style.width = `${clampedProgress}%`;
          progressBarRef.current.className = clsx(
            "h-full rounded-full transition-all duration-150",
            isGain 
              ? "bg-gradient-to-r from-teal-500 via-emerald-400 to-emerald-300 shadow-lg shadow-emerald-500/30" 
              : "bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 shadow-lg shadow-rose-500/30"
          );
        }

        if (beaconRef.current) {
          beaconRef.current.style.left = `${clampedProgress}%`;
        }

        if (statusTextRef.current) {
          if (isGain) {
            const targetDistance = Math.max(0, target - ltp);
            const targetPct = target > entry ? Math.min(100, ((ltp - entry) / (target - entry)) * 100).toFixed(0) : "0";
            statusTextRef.current.textContent = `🟢 ${targetPct}% to Target · ₹${targetDistance.toFixed(2)} pts remaining`;
            statusTextRef.current.className = "text-[10px] font-mono text-emerald-400 font-bold";
          } else {
            const stopDistance = Math.max(0, ltp - stopLoss);
            statusTextRef.current.textContent = `⚠️ Drawdown · ₹${stopDistance.toFixed(2)} buffer to Stop Loss`;
            statusTextRef.current.className = "text-[10px] font-mono text-rose-400 font-bold";
          }
        }

        // Trigger micro-pulse on price updates
        if (cardRef.current) {
          cardRef.current.classList.remove("animate-pulse-gain", "animate-pulse-loss");
          void cardRef.current.offsetWidth; // Force reflow
          cardRef.current.classList.add(isGain ? "animate-pulse-gain" : "animate-pulse-loss");
        }
      }
    );

    return () => unsub();
  }, [id, symbol, entry, target, stopLoss, optionType, totalQty]);

  const risk = Math.abs(entry - stopLoss);
  const reward = Math.abs(target - entry);
  const rrRatio = (reward / (risk || 1)).toFixed(2);

  const handleSquareOff = () => {
    if (onClose) onClose(id);
    else if (squareOffAlert) squareOffAlert(id);
  };

  return (
    <motion.div
      ref={cardRef}
      layout
      initial={{ opacity: 0, scale: 0.95, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: -15 }}
      className="p-5 rounded-3xl bg-[#060e1d]/90 border border-white/10 hover:border-cyan-500/40 transition-all duration-300 space-y-4 shadow-2xl backdrop-blur-2xl relative group overflow-hidden"
    >
      {/* Top Header Strip */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span
            className={clsx(
              "px-2.5 py-1 rounded-xl text-[10px] font-black tracking-wider uppercase flex items-center gap-1 shadow-sm",
              isCE 
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-cyan-500/10" 
                : "bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-rose-500/10"
            )}
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            {optionType}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <strong className="text-sm font-extrabold text-white font-mono block">
                {symbol}
              </strong>
              <span className="text-[9px] font-bold uppercase px-2 py-0.2 rounded-full bg-white/5 text-slate-300 border border-white/10">
                {strategyTag}
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              Entry @ ₹{entry.toFixed(2)} · {quantity} Lot ({totalQty} Qty)
            </span>
          </div>
        </div>

        {/* Live Real-time P&L Badge */}
        <div className="flex items-center gap-2">
          <span 
            ref={pnlRef} 
            className="text-xs font-mono font-black tabular-nums px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm"
          >
            +₹0.00 (+0.00 pts)
          </span>
        </div>
      </div>

      {/* Target & Risk Numerical Cards */}
      <div className="grid grid-cols-3 gap-2.5 py-2.5 px-3 rounded-2xl bg-white/[0.02] border border-white/5 text-center">
        <div className="space-y-0.5">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Stop Loss 🛡️</span>
          <span className="text-xs font-mono font-bold text-rose-400 tabular-nums">
            ₹{stopLoss.toFixed(2)}
          </span>
        </div>

        <div className="space-y-0.5 border-x border-white/5">
          <span className="text-[9px] font-bold text-cyan-300 uppercase tracking-wider block flex items-center justify-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            Live LTP
          </span>
          <span ref={ltpRef} className="text-sm font-mono font-black text-white tabular-nums">
            ₹{entry.toFixed(2)}
          </span>
        </div>

        <div className="space-y-0.5">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Target 🎯</span>
          <span className="text-xs font-mono font-bold text-emerald-400 tabular-nums">
            ₹{target.toFixed(2)}
          </span>
        </div>
      </div>

      {/* 🌟 The Live Trajectory Progress Bar (The Vibe Gauge) */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-slate-400 font-mono">SL: ₹{stopLoss.toFixed(2)}</span>
          <span ref={statusTextRef} className="text-emerald-400 font-bold font-mono">
            🟢 Trajectory Tracking Active
          </span>
          <span className="text-slate-400 font-mono">TP: ₹{target.toFixed(2)}</span>
        </div>

        {/* Progress Track with Moving Beacon */}
        <div className="relative w-full h-3 rounded-full bg-white/5 border border-white/10 p-0.5 overflow-visible">
          {/* Entry Price Middle Marker */}
          {(() => {
            const totalSpan = Math.max(0.01, target - stopLoss);
            const entryPos = Math.min(100, Math.max(0, ((entry - stopLoss) / totalSpan) * 100));
            return (
              <div 
                className="absolute top-0 bottom-0 w-0.5 bg-white/40 z-10" 
                style={{ left: `${entryPos}%` }}
                title={`Entry Price: ₹${entry}`}
              />
            );
          })()}

          {/* Dynamic Fill Bar */}
          <div
            ref={progressBarRef}
            className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-400 transition-all duration-150"
            style={{ width: "50%" }}
          />

          {/* Pulsing Beacon Dot */}
          <div
            ref={beaconRef}
            className="absolute top-1/2 -translate-y-1/2 -ml-2 w-4 h-4 rounded-full bg-white border-2 border-cyan-400 shadow-lg shadow-cyan-400/50 z-20 pointer-events-none transition-all duration-150 flex items-center justify-center"
            style={{ left: "50%" }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-ping" />
          </div>
        </div>
      </div>

      {/* Multi-Step Quick Action Toolbar */}
      <div className="pt-2 border-t border-white/5 space-y-2.5">
        {/* Target Adjust Quick Pills */}
        <div className="flex items-center justify-between text-xs gap-2 flex-wrap">
          <div className="flex items-center gap-1 text-[11px] text-slate-300 font-bold">
            <Target className="w-3.5 h-3.5 text-emerald-400" />
            <span>Target Adjust:</span>
          </div>

          <div className="flex items-center gap-1 flex-wrap">
            {[
              { label: "+₹1", delta: 1, color: "text-emerald-300 bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20" },
              { label: "+₹2", delta: 2, color: "text-emerald-300 bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20" },
              { label: "+₹5", delta: 5, color: "text-emerald-300 bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20" },
              { label: "+₹10", delta: 10, color: "text-emerald-300 bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20" },
              { label: "-₹1", delta: -1, color: "text-amber-300 bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20" },
              { label: "-₹2", delta: -2, color: "text-amber-300 bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20" },
              { label: "-₹5", delta: -5, color: "text-amber-300 bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20" },
            ].map((btn) => (
              <button
                key={btn.label}
                type="button"
                onClick={() => adjustTargetPrice(id, btn.delta)}
                className={clsx(
                  "px-2 py-0.5 rounded-lg border text-[10px] font-mono font-bold transition active:scale-95 hover:brightness-125",
                  btn.color
                )}
                title={`Adjust Target by ${btn.label}`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* Stop Loss Adjust Quick Pills & Breakeven Lock */}
        <div className="flex items-center justify-between text-xs gap-2 flex-wrap">
          <div className="flex items-center gap-1 text-[11px] text-slate-300 font-bold">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            <span>SL Adjust:</span>
          </div>

          <div className="flex items-center gap-1 flex-wrap">
            {/* Trail to Breakeven Cost Button (Gated by Positive P&L) */}
            {(() => {
              const isEligibleForBE = isCE ? (currentLtp >= entry) : (currentLtp <= entry);
              return (
                <button
                  type="button"
                  disabled={!isEligibleForBE}
                  onClick={() => isEligibleForBE && setBreakevenSL(id)}
                  className={clsx(
                    "px-2.5 py-0.5 rounded-lg border text-[10px] font-mono font-bold transition flex items-center gap-1",
                    isEligibleForBE
                      ? "bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border-cyan-500/40 shadow-sm shadow-cyan-500/10 active:scale-95 cursor-pointer"
                      : "bg-white/[0.02] text-slate-500 border-white/5 opacity-50 cursor-not-allowed"
                  )}
                  title={isEligibleForBE ? "Lock Stop Loss to Entry Price (100% Risk-Free)" : "Breakeven trailing unlocks once trade is in profit (LTP > Entry)"}
                >
                  <ShieldCheck className="w-3 h-3" />
                  <span>BE (₹{entry.toFixed(1)})</span>
                </button>
              );
            })()}

            {/* Quick +/- SL Pills */}
            {[
              { label: "+₹1", delta: 1, color: "text-emerald-300 bg-emerald-500/10 border-emerald-500/20" },
              { label: "+₹2", delta: 2, color: "text-emerald-300 bg-emerald-500/10 border-emerald-500/20" },
              { label: "+₹5", delta: 5, color: "text-emerald-300 bg-emerald-500/10 border-emerald-500/20" },
              { label: "-₹2", delta: -2, color: "text-rose-300 bg-rose-500/10 border-rose-500/20" },
              { label: "-₹5", delta: -5, color: "text-rose-300 bg-rose-500/10 border-rose-500/20" },
            ].map((btn) => (
              <button
                key={btn.label}
                type="button"
                onClick={() => adjustStopLoss(id, btn.delta)}
                className={clsx(
                  "px-2 py-0.5 rounded-lg border text-[10px] font-mono font-bold transition active:scale-95 hover:brightness-125",
                  btn.color
                )}
                title={`Adjust Stop Loss by ${btn.label}`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* Bottom Bar: R:R Tag & Emergency Square Off */}
        <div className="pt-2 flex items-center justify-between border-t border-white/5">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400 font-medium">Risk/Reward:</span>
            <span className="text-[10px] font-mono font-extrabold text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20">
              1:{rrRatio}
            </span>
          </div>

          <button
            type="button"
            onClick={handleSquareOff}
            className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-rose-600/30 to-red-500/30 hover:from-rose-600/50 hover:to-red-500/50 text-rose-200 border border-rose-500/40 text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-rose-500/10 active:scale-95"
            title="Square Off this trade immediately at current market bid"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Square Off Now</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}
