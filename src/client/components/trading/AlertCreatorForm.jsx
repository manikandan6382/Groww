import React, { useState, useEffect } from "react";
import { PlusCircle, Target, ShieldAlert, Sparkles, ChevronDown, Zap } from "lucide-react";
import { useTradingStore } from "../../stores/useTradingStore";
import { motion } from "framer-motion";
import clsx from "clsx";

const QUICK_STRIKES = [
  "NIFTY 24500 CE",
  "NIFTY 24500 PE",
  "NIFTY 24600 CE",
  "BANKNIFTY 52000 CE",
  "BANKNIFTY 52000 PE",
];

export function AlertCreatorForm({ onCreated }) {
  const { orderPadPreFill, setOrderPadPreFill } = useTradingStore();
  const [symbol, setSymbol] = useState("NIFTY 24500 CE");
  const [optionType, setOptionType] = useState("CE");
  const [entryPrice, setEntryPrice] = useState("28.50");
  const [targetPrice, setTargetPrice] = useState("40.00");
  const [stopLoss, setStopLoss] = useState("22.00");
  const [submitting, setSubmitting] = useState(false);

  // Auto-consume pre-fill from 1-Click Watchlist Deploy
  useEffect(() => {
    if (orderPadPreFill) {
      if (orderPadPreFill.symbol) {
        setSymbol(orderPadPreFill.symbol);
        setOptionType(orderPadPreFill.symbol.endsWith("PE") ? "PE" : "CE");
      }
      if (orderPadPreFill.entryPrice) setEntryPrice(String(orderPadPreFill.entryPrice));
      if (orderPadPreFill.targetPrice) setTargetPrice(String(orderPadPreFill.targetPrice));
      if (orderPadPreFill.stopLoss) setStopLoss(String(orderPadPreFill.stopLoss));
      setOrderPadPreFill(null);
    }
  }, [orderPadPreFill, setOrderPadPreFill]);

  const entry = Number(entryPrice || 0);
  const target = Number(targetPrice || 0);
  const sl = Number(stopLoss || 0);
  const risk = Math.abs(entry - sl);
  const reward = Math.abs(target - entry);
  const rrRatio = (reward / (risk || 1)).toFixed(2);
  const isHealthyRR = Number(rrRatio) >= 1.5;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!symbol || !entryPrice || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/live-alerts/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tradingsymbol: symbol.toUpperCase().trim(),
          option_type: optionType,
          entry_price: entry,
          target_price: target,
          stop_loss: sl,
        }),
      });

      if (res.ok && onCreated) {
        onCreated();
      }
    } catch (err) {
      console.error("Failed to create alert:", err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <motion.form
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      onSubmit={handleSubmit}
      className="apple-ceramic-card p-5 space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Fast Practice Setup</h3>
        </div>
        <span className={clsx(
          "text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border transition-colors",
          isHealthyRR 
            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
            : "bg-amber-500/10 text-amber-400 border-amber-500/20"
        )}>
          R:R 1:{rrRatio}
        </span>
      </div>

      {/* Quick Select Strike Chips */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
          Quick Strike
        </label>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_STRIKES.map((strike) => (
            <motion.button
              whileTap={{ scale: 0.94 }}
              key={strike}
              type="button"
              onClick={() => {
                setSymbol(strike);
                setOptionType(strike.includes("PE") ? "PE" : "CE");
              }}
              className={clsx(
                "px-2 py-1 rounded-lg text-[10px] font-bold font-mono transition-all",
                symbol === strike
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                  : "bg-white/[0.03] text-slate-400 hover:text-white border border-white/5"
              )}
            >
              {strike}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Inputs Grid */}
      <div className="space-y-3">
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Symbol / Strike
          </label>
          <input
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-white/[0.04] border border-white/10 rounded-xl text-white font-mono focus:outline-none focus:border-cyan-400/50"
            placeholder="e.g. NIFTY 24500 CE"
            required
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Entry (₹)
            </label>
            <input
              type="number"
              step="0.05"
              value={entryPrice}
              onChange={(e) => setEntryPrice(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-white/[0.04] border border-white/10 rounded-xl text-white font-mono focus:outline-none focus:border-cyan-400/50"
              required
            />
          </div>

          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Target (₹)
            </label>
            <input
              type="number"
              step="0.05"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-white/[0.04] border border-white/10 rounded-xl text-emerald-400 font-mono font-bold focus:outline-none focus:border-emerald-400/50"
              required
            />
          </div>

          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Stop Loss (₹)
            </label>
            <input
              type="number"
              step="0.05"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-white/[0.04] border border-white/10 rounded-xl text-rose-400 font-mono font-bold focus:outline-none focus:border-rose-400/50"
              required
            />
          </div>
        </div>
      </div>

      {/* Submit Button with Framer Motion Spring */}
      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        type="submit"
        disabled={submitting}
        className="w-full py-2.5 apple-btn-primary flex items-center justify-center gap-2 text-xs font-bold"
      >
        <PlusCircle className="w-4 h-4" />
        <span>{submitting ? "Arming Watch Alert..." : "Deploy Live Watch Alert"}</span>
      </motion.button>
    </motion.form>
  );
}
