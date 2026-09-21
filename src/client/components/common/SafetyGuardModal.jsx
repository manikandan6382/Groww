import React from "react";
import { useTradingStore } from "../../stores/useTradingStore";
import { ShieldCheck, ShieldAlert, X, AlertTriangle, CheckCircle2, Lock, Scale, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getLocalDateKey } from "../../utils/dateUtils";

export function SafetyGuardModal() {
  const { isSafetyGuardModalOpen, setSafetyGuardModalOpen, journalTrades } = useTradingStore();

  if (!isSafetyGuardModalOpen) return null;

  const todayKey = getLocalDateKey();
  const todayTrades = (journalTrades || []).filter((t) => {
    const dateStr = t.exitDatetime || t.entryDatetime || "";
    return dateStr.startsWith(todayKey);
  });

  const losses = todayTrades.filter((t) => Number(t.netPnl || 0) < 0);
  const todayTotalLoss = Math.abs(losses.reduce((acc, t) => acc + Number(t.netPnl || 0), 0));
  const runway = Math.max(0, 750 - todayTotalLoss);
  const stopsRemaining = Math.max(0, Math.floor(runway / 250));
  const isLossCapBreached = todayTotalLoss >= 750;
  const todayTradeCount = todayTrades.length;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="w-full max-w-lg p-6 rounded-3xl bg-[#121424]/98 border border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.08)] space-y-5 text-slate-100 backdrop-blur-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">Daily Execution &amp; Risk Guardrails</h3>
                <span className="text-xs text-cyan-400 font-semibold">Automatic Tilt, Overtrading &amp; Tax Friction Circuit Breakers</span>
              </div>
            </div>
            <button
              onClick={() => setSafetyGuardModalOpen(false)}
              className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Core Telemetry Status */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] block">Daily Loss Circuit Breaker</span>
              <div className="flex items-center justify-between">
                <strong className="font-mono text-white text-sm font-bold">₹{Math.round(todayTotalLoss)} / ₹750 Cap</strong>
                <span className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold border ${
                  isLossCapBreached
                    ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                    : stopsRemaining <= 1
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                }`}>
                  {isLossCapBreached ? "🔴 Tripped" : `${stopsRemaining} Stop${stopsRemaining === 1 ? "" : "s"} Left`}
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] block">Daily Trade Quota</span>
              <div className="flex items-center justify-between">
                <strong className="font-mono text-white text-sm font-bold">{todayTradeCount} / 3 Trades</strong>
                <span className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold border ${
                  todayTradeCount >= 3
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                    : "bg-cyan-500/10 text-cyan-300 border-cyan-500/20"
                }`}>
                  {todayTradeCount >= 3 ? "Quota Full" : "Active Budget"}
                </span>
              </div>
            </div>
          </div>

          {/* 4 Quantitative Protection Pillars */}
          <div className="space-y-2.5 text-xs">
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <Lock className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block font-bold">1. The 3-Stop Daily Circuit Breaker (₹750 Max Loss)</strong>
                <span className="text-slate-400 text-[11px]">If 3 stop-losses are triggered or cumulative daily loss hits ₹750, the terminal locks out new execution to completely eliminate emotional revenge trading.</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <Scale className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block font-bold">2. Maximum 3-Trade Daily Quota (Tax &amp; Friction Guard)</strong>
                <span className="text-slate-400 text-[11px]">Limits execution to top-tier 1:2 setups only. Prevents exchange turnover, STT, and GST from eating 30%+ of your gross scalping profits.</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <Zap className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block font-bold">3. ₹200–₹300 Risk &amp; 1:2.00 Reward Invariant</strong>
                <span className="text-slate-400 text-[11px]">Every trade strictly enforces ₹200–₹300 max risk (default ₹250) aiming for ₹400–₹600 profit (default ₹500). Slippage dynamically adjusts Stop Loss and Target points relative to filled entry.</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block font-bold">4. Next-Day 09:15 AM Fresh Session Reset</strong>
                <span className="text-slate-400 text-[11px]">Daily trade counts, loss runway, and circuit breaker counters cleanly reset every morning with fresh IV and VWAP calculations.</span>
              </div>
            </div>
          </div>

          {/* Footer Action */}
          <div className="pt-2 flex items-center justify-between border-t border-white/10">
            <span className="text-[10px] text-slate-500 font-mono">SEBI 93% Scalper Protection Rule</span>
            <button
              onClick={() => setSafetyGuardModalOpen(false)}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-400 text-black font-extrabold text-xs shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-sky-300 transition"
            >
              Arm Safety Guard &amp; Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
