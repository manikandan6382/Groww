import React, { useState } from "react";
import clsx from "clsx";
import { Plus } from "lucide-react";
import { soundEngine } from "../../../utils/soundEngine";
import { getInitialLocalDatetime, calculateCustomTradeTaxes } from "./customTradeUtils";

export function ManualTradeForm({ onLogTrade, onClose }) {
  const [symbol, setSymbol] = useState("NIFTY 24600 CE");
  const [direction, setDirection] = useState("LONG");
  const [entryPrice, setEntryPrice] = useState("42.50");
  const [exitPrice, setExitPrice] = useState("54.00");
  const [quantity, setQuantity] = useState("1");
  const [lotSize, setLotSize] = useState("65");
  const [stopLoss, setStopLoss] = useState("37.00");
  const [targetPrice, setTargetPrice] = useState("55.00");
  const [strategyTag, setStrategyTag] = useState("Morning Breakout");
  const [mindset, setMindset] = useState("Disciplined & Patient");
  const [confidenceScore, setConfidenceScore] = useState(9);
  const [mistakeTag, setMistakeTag] = useState("None (Plan Followed)");
  const [catalyst, setCatalyst] = useState("Volume expansion above morning high pivot with favorable India VIX.");
  const [lessonsLearned, setLessonsLearned] = useState("Waited for 5m candle close confirmation; executed target cleanly.");
  const [entryDatetime, setEntryDatetime] = useState(getInitialLocalDatetime());
  const [duration, setDuration] = useState("14 mins");

  const entry = Number(entryPrice || 0);
  const exit = Number(exitPrice || 0);
  const qty = Number(quantity || 1);
  const lot = Number(lotSize || 65);

  const { pts, grossPnl, totalTaxes, netPnl, isGain } = calculateCustomTradeTaxes(entry, exit, qty, lot, direction);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!symbol || !entryPrice || !exitPrice) return;

    const exitDt = new Date(new Date(entryDatetime).getTime() + 15 * 60000).toISOString();
    const customTrade = {
      id: Date.now(),
      symbol: symbol.toUpperCase().trim(),
      tradeType: "INTRADAY",
      direction, entryPrice: entry, exitPrice: exit, quantity: qty, lotSize: lot,
      stopLoss: Number(stopLoss || entry * 0.9), targetPrice: Number(targetPrice || exit * 1.1),
      grossPnl, taxesAndCharges: totalTaxes, netPnl,
      closeReason: isGain ? "TARGET_HIT" : "STOP_LOSS_HIT",
      strategyTags: strategyTag,
      catalyst: catalyst || `${symbol} custom ${strategyTag} technical entry.`,
      executionDetails: `Custom entry at ₹${entry.toFixed(2)} ➔ Closed at ₹${exit.toFixed(2)} (${isGain ? "+" : ""}${pts.toFixed(2)} pts). ${isGain ? "Target reached with 0 slippage." : "Loss cut promptly."}`,
      mindsetEmotion: mindset, mistakeTags: mistakeTag, confidenceScore: Number(confidenceScore),
      followedPlan: mistakeTag !== "Chased Extended Wick",
      lessonsLearned: lessonsLearned || `Custom trade logged with ₹${netPnl} take-home earnings.`,
      entryDatetime: new Date(entryDatetime).toISOString(), exitDatetime: exitDt, duration: duration || "15 mins"
    };

    onLogTrade(customTrade);
    soundEngine.playSuccessTone();
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase">Symbol / Strike</label>
          <input type="text" value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="e.g. RELIANCE, NIFTY 24600 CE" className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-cyan-400" required />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase">Direction</label>
          <select value={direction} onChange={(e) => setDirection(e.target.value)} className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white font-bold text-xs focus:outline-none focus:border-cyan-400">
            <option value="LONG">🟢 LONG (Buy)</option>
            <option value="SHORT">🔴 SHORT (Sell)</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase">Entry Timestamp</label>
          <input type="datetime-local" value={entryDatetime} onChange={(e) => setEntryDatetime(e.target.value)} className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-cyan-400" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase">Entry Price (₹)</label>
          <input type="number" step="0.05" value={entryPrice} onChange={(e) => setEntryPrice(e.target.value)} className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-cyan-400" required />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase">Exit Price (₹)</label>
          <input type="number" step="0.05" value={exitPrice} onChange={(e) => setExitPrice(e.target.value)} className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-cyan-300 font-mono font-bold text-xs focus:outline-none focus:border-cyan-400" required />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase">Lot Size · Lots</label>
          <div className="grid grid-cols-2 gap-2">
            <input type="number" value={lotSize} onChange={(e) => setLotSize(e.target.value)} placeholder="65" className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-2 py-2 text-white font-mono text-xs" />
            <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="1" className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-2 py-2 text-white font-mono text-xs" />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase">Stop Loss (₹)</label>
          <input type="number" step="0.05" value={stopLoss} onChange={(e) => setStopLoss(e.target.value)} className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-rose-400 font-mono text-xs" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase">Target Goal (₹)</label>
          <input type="number" step="0.05" value={targetPrice} onChange={(e) => setTargetPrice(e.target.value)} className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-emerald-400 font-mono text-xs" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase">Setup Strategy</label>
          <input type="text" list="canonicalStrategyList" value={strategyTag} onChange={(e) => setStrategyTag(e.target.value)} placeholder="e.g. 15m VWAP Retest" className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-white text-xs" />
          <datalist id="canonicalStrategyList">
            <option value="15m VWAP Retest" /><option value="Opening Range Breakout" /><option value="EMA Trend Pullback" /><option value="Delta Momentum Scalp" /><option value="Support Bounce Scalp" /><option value="Resistance Rejection Fade" /><option value="Expiry Zero Hero" /><option value="Defined-Risk Spread" />
          </datalist>
        </div>
      </div>

      <div className="space-y-3 pt-2 border-t border-white/5">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase">1. Setup Catalyst (Why Entered?)</label>
          <input type="text" value={catalyst} onChange={(e) => setCatalyst(e.target.value)} className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-slate-200 text-xs" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase">2. Key Retrospective Lesson Learned</label>
          <input type="text" value={lessonsLearned} onChange={(e) => setLessonsLearned(e.target.value)} className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-slate-200 text-xs" />
        </div>
      </div>

      <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
        <div className="space-y-0.5">
          <span className="text-[10px] text-slate-400 block">Gross Gain: {grossPnl >= 0 ? "+" : ""}₹{grossPnl.toFixed(2)} · Est. Taxes: -₹{totalTaxes.toFixed(2)}</span>
          <span className="text-[10px] font-bold text-cyan-400">Net Take-Home Yield:</span>
        </div>
        <strong className={clsx("text-base font-mono font-black", isGain ? "text-emerald-400" : "text-rose-400")}>
          {netPnl >= 0 ? "+" : ""}₹{netPnl.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </strong>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold transition text-xs">
          Cancel
        </button>
        <button type="submit" className="px-6 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-400 hover:from-cyan-400 hover:to-sky-300 text-black font-extrabold shadow-lg shadow-cyan-500/20 transition text-xs flex items-center gap-1.5">
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Save Custom Trade to Journal</span>
        </button>
      </div>
    </form>
  );
}
