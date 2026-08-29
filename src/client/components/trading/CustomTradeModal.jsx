import React, { useState } from "react";
import { useTradingStore } from "../../stores/useTradingStore";
import { 
  Plus, 
  Upload, 
  Sparkles, 
  RotateCcw, 
  CheckCircle2, 
  X, 
  Flame, 
  Receipt, 
  BrainCircuit, 
  Calendar, 
  Tag, 
  FileSpreadsheet 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";

export function CustomTradeModal({ isOpen, onClose }) {
  const { logJournalTrade, bulkAddJournalTrades, resetJournalTrades } = useTradingStore();

  const [activeTab, setActiveTab] = useState("manual"); // "manual" | "presets" | "bulk"

  // Manual Custom Trade State
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
  const [entryDatetime, setEntryDatetime] = useState(new Date().toISOString().slice(0, 16));
  const [duration, setDuration] = useState("14 mins");

  // Bulk JSON/CSV state
  const [bulkInput, setBulkInput] = useState("");
  const [bulkError, setBulkError] = useState("");

  if (!isOpen) return null;

  const entry = Number(entryPrice || 0);
  const exit = Number(exitPrice || 0);
  const qty = Number(quantity || 1);
  const lot = Number(lotSize || 65);
  const pts = direction === "LONG" ? (exit - entry) : (entry - exit);
  const grossPnl = pts * qty * lot;

  // Indian statutory tax estimation
  const turnover = (entry + exit) * qty * lot;
  const brokerage = 40.0;
  const stt = turnover * 0.0005;
  const exchangeFees = turnover * 0.00053;
  const gst = 0.18 * (brokerage + exchangeFees);
  const totalTaxes = Math.round((brokerage + stt + exchangeFees + gst) * 100) / 100;
  const netPnl = Math.round((grossPnl - totalTaxes) * 100) / 100;
  const isGain = netPnl >= 0;

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!symbol || !entryPrice || !exitPrice) return;

    const exitDt = new Date(new Date(entryDatetime).getTime() + 15 * 60000).toISOString();

    const customTrade = {
      id: Date.now(),
      symbol: symbol.toUpperCase().trim(),
      tradeType: "INTRADAY",
      direction: direction,
      entryPrice: entry,
      exitPrice: exit,
      quantity: qty,
      lotSize: lot,
      stopLoss: Number(stopLoss || entry * 0.9),
      targetPrice: Number(targetPrice || exit * 1.1),
      grossPnl: grossPnl,
      taxesAndCharges: totalTaxes,
      netPnl: netPnl,
      closeReason: isGain ? "TARGET_HIT" : "STOP_LOSS_HIT",
      strategyTags: strategyTag,
      catalyst: catalyst || `${symbol} custom ${strategyTag} technical entry.`,
      executionDetails: `Custom entry at ₹${entry.toFixed(2)} ➔ Closed at ₹${exit.toFixed(2)} (${isGain ? "+" : ""}${pts.toFixed(2)} pts). ${isGain ? "Target reached with 0 slippage." : "Loss cut promptly."}`,
      mindsetEmotion: mindset,
      mistakeTags: mistakeTag,
      confidenceScore: Number(confidenceScore),
      followedPlan: mistakeTag !== "Chased Extended Wick",
      lessonsLearned: lessonsLearned || `Custom trade logged with ₹${netPnl} take-home earnings.`,
      entryDatetime: new Date(entryDatetime).toISOString(),
      exitDatetime: exitDt,
      duration: duration || "15 mins"
    };

    logJournalTrade(customTrade);
    onClose();
  };

  // Quick Preset Sample Trade Generator
  const addQuickPresetTrade = (preset) => {
    const now = new Date();
    const trade = {
      id: Date.now(),
      entryDatetime: now.toISOString(),
      exitDatetime: new Date(now.getTime() + 18 * 60000).toISOString(),
      ...preset
    };
    logJournalTrade(trade);
    onClose();
  };

  // Bulk Import Handler
  const handleBulkImport = () => {
    setBulkError("");
    try {
      const parsed = JSON.parse(bulkInput);
      if (!Array.isArray(parsed)) {
        setBulkError("Input must be a valid JSON array of trade objects.");
        return;
      }
      bulkAddJournalTrades(parsed);
      onClose();
    } catch (err) {
      setBulkError("Invalid JSON format. Please verify syntax.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-2xl bg-[#060e1d] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center font-bold">
              <Plus className="w-4 h-4 stroke-[3]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Add Custom Trade &amp; Data</h2>
              <p className="text-[11px] text-slate-400">Log custom stock, option, or future trades with full forensic story analytics.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex items-center gap-2 px-5 pt-3 border-b border-white/5 bg-white/[0.01]">
          {[
            { id: "manual", label: "✍️ Manual Custom Entry" },
            { id: "presets", label: "⚡ 1-Click Sample Templates" },
            { id: "bulk", label: "📋 Bulk JSON / CSV Paste" }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                "px-3 py-2 text-xs font-bold border-b-2 transition whitespace-nowrap",
                activeTab === tab.id
                  ? "border-cyan-400 text-cyan-300 bg-cyan-500/5"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Modal Body Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* TAB 1: MANUAL CUSTOM ENTRY */}
          {activeTab === "manual" && (
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {/* Symbol */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Symbol / Strike</label>
                  <input
                    type="text"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                    placeholder="e.g. RELIANCE, NIFTY 24600 CE"
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                    required
                  />
                </div>

                {/* Direction */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Direction</label>
                  <select
                    value={direction}
                    onChange={(e) => setDirection(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white font-bold text-xs focus:outline-none focus:border-cyan-400"
                  >
                    <option value="LONG">🟢 LONG (Buy)</option>
                    <option value="SHORT">🔴 SHORT (Sell)</option>
                  </select>
                </div>

                {/* Date & Time */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Entry Timestamp</label>
                  <input
                    type="datetime-local"
                    value={entryDatetime}
                    onChange={(e) => setEntryDatetime(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                  />
                </div>

                {/* Entry Price */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Entry Price (₹)</label>
                  <input
                    type="number"
                    step="0.05"
                    value={entryPrice}
                    onChange={(e) => setEntryPrice(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                    required
                  />
                </div>

                {/* Exit Price */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Exit Price (₹)</label>
                  <input
                    type="number"
                    step="0.05"
                    value={exitPrice}
                    onChange={(e) => setExitPrice(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-cyan-300 font-mono font-bold text-xs focus:outline-none focus:border-cyan-400"
                    required
                  />
                </div>

                {/* Lot Size & Quantity */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Lot Size · Lots</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      value={lotSize}
                      onChange={(e) => setLotSize(e.target.value)}
                      placeholder="Lot Size (65)"
                      className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-2 py-2 text-white font-mono text-xs"
                    />
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      placeholder="Lots (1)"
                      className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-2 py-2 text-white font-mono text-xs"
                    />
                  </div>
                </div>

                {/* Stop Loss */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Stop Loss (₹)</label>
                  <input
                    type="number"
                    step="0.05"
                    value={stopLoss}
                    onChange={(e) => setStopLoss(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-rose-400 font-mono text-xs"
                  />
                </div>

                {/* Target Price */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Target Goal (₹)</label>
                  <input
                    type="number"
                    step="0.05"
                    value={targetPrice}
                    onChange={(e) => setTargetPrice(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-emerald-400 font-mono text-xs"
                  />
                </div>

                {/* Strategy Tag */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Setup Strategy</label>
                  <input
                    type="text"
                    value={strategyTag}
                    onChange={(e) => setStrategyTag(e.target.value)}
                    placeholder="e.g. Breakout, Reversal"
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-white text-xs"
                  />
                </div>
              </div>

              {/* Story Narrative Fields */}
              <div className="space-y-3 pt-2 border-t border-white/5">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">1. Setup Catalyst (Why Entered?)</label>
                  <input
                    type="text"
                    value={catalyst}
                    onChange={(e) => setCatalyst(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-slate-200 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">2. Key Retrospective Lesson Learned</label>
                  <input
                    type="text"
                    value={lessonsLearned}
                    onChange={(e) => setLessonsLearned(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-slate-200 text-xs"
                  />
                </div>
              </div>

              {/* Realized Financial Preview */}
              <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-400 block">Gross Gain: {grossPnl >= 0 ? "+" : ""}₹{grossPnl.toFixed(2)} · Est. Taxes: -₹{totalTaxes.toFixed(2)}</span>
                  <span className="text-[10px] font-bold text-cyan-400">Net Take-Home Yield:</span>
                </div>
                <strong className={clsx("text-base font-mono font-black", isGain ? "text-emerald-400" : "text-rose-400")}>
                  {netPnl >= 0 ? "+" : ""}₹{netPnl.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </strong>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold transition text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-400 hover:from-cyan-400 hover:to-sky-300 text-black font-extrabold shadow-lg shadow-cyan-500/20 transition text-xs flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Save Custom Trade to Journal</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: 1-CLICK PRESET SAMPLES */}
          {activeTab === "presets" && (
            <div className="space-y-3">
              <p className="text-slate-400 text-xs">
                Instantly populate your journal with realistic, high-conviction institutional trade templates:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Sample 1: NIFTY 0DTE Winner */}
                <button
                  type="button"
                  onClick={() => addQuickPresetTrade({
                    symbol: "NIFTY 24450 CE",
                    tradeType: "INTRADAY",
                    direction: "LONG",
                    entryPrice: 32.00,
                    exitPrice: 45.00,
                    quantity: 1,
                    lotSize: 65,
                    stopLoss: 28.00,
                    targetPrice: 45.00,
                    grossPnl: 845.00,
                    taxesAndCharges: 56.00,
                    netPnl: 789.00,
                    closeReason: "TARGET_HIT",
                    strategyTags: "0DTE Momentum",
                    catalyst: "15m candle closed above morning high pivot with massive call OI buildup.",
                    executionDetails: "Limit entry on 1m pullback into VWAP band. Captured +13.00 pts cleanly into target.",
                    mindsetEmotion: "Disciplined & Patient",
                    mistakeTags: "None (Plan Followed)",
                    confidenceScore: 9,
                    followedPlan: true,
                    lessonsLearned: "Waited patiently for 15m candle close before entering. 1:3.25 R:R captured flawlessly.",
                    duration: "11 mins"
                  })}
                  className="p-4 rounded-2xl bg-white/[0.02] hover:bg-emerald-500/10 border border-white/5 hover:border-emerald-500/30 text-left transition group space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <strong className="text-white font-mono font-bold">NIFTY 24450 CE</strong>
                    <span className="text-xs font-mono font-bold text-emerald-400">+₹789.00</span>
                  </div>
                  <p className="text-[11px] text-slate-400">0DTE Momentum Breakout on 15m chart with clean +13 pts target fill.</p>
                  <span className="text-[10px] font-bold text-cyan-400 group-hover:underline block">+ Add Winning Scalp Template</span>
                </button>

                {/* Sample 2: Bank Nifty Breakout */}
                <button
                  type="button"
                  onClick={() => addQuickPresetTrade({
                    symbol: "BANKNIFTY 52500 PE",
                    tradeType: "INTRADAY",
                    direction: "LONG",
                    entryPrice: 145.00,
                    exitPrice: 185.00,
                    quantity: 1,
                    lotSize: 35,
                    stopLoss: 125.00,
                    targetPrice: 185.00,
                    grossPnl: 1400.00,
                    taxesAndCharges: 62.00,
                    netPnl: 1338.00,
                    closeReason: "TARGET_HIT",
                    strategyTags: "Reversal Scalp",
                    catalyst: "HDFC Bank & ICICI Bank broke day's open simultaneously; strong institutional put buying.",
                    executionDetails: "Market order filled on VWAP rejection. Target hit in 22 mins.",
                    mindsetEmotion: "High Conviction Execution",
                    mistakeTags: "None (Plan Followed)",
                    confidenceScore: 10,
                    followedPlan: true,
                    lessonsLearned: "Banking sector breadth confirmed direction; held through 3m wick with zero panic.",
                    duration: "22 mins"
                  })}
                  className="p-4 rounded-2xl bg-white/[0.02] hover:bg-emerald-500/10 border border-white/5 hover:border-emerald-500/30 text-left transition group space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <strong className="text-white font-mono font-bold">BANKNIFTY 52500 PE</strong>
                    <span className="text-xs font-mono font-bold text-emerald-400">+₹1,338.00</span>
                  </div>
                  <p className="text-[11px] text-slate-400">Reversal Scalp on Banking sector breadth with +40 pts expansion.</p>
                  <span className="text-[10px] font-bold text-cyan-400 group-hover:underline block">+ Add Bank Nifty Template</span>
                </button>

                {/* Sample 3: Protected Loss */}
                <button
                  type="button"
                  onClick={() => addQuickPresetTrade({
                    symbol: "NIFTY 24350 PE",
                    tradeType: "INTRADAY",
                    direction: "LONG",
                    entryPrice: 65.00,
                    exitPrice: 58.00,
                    quantity: 1,
                    lotSize: 65,
                    stopLoss: 58.00,
                    targetPrice: 85.00,
                    grossPnl: -455.00,
                    taxesAndCharges: 56.00,
                    netPnl: -511.00,
                    closeReason: "STOP_LOSS_HIT",
                    strategyTags: "Support Retest",
                    catalyst: "Attempted support bounce at morning VWAP band.",
                    executionDetails: "Price broke dynamic support. Cut stop immediately at predetermined -7 pts.",
                    mindsetEmotion: "Calm & Protected",
                    mistakeTags: "None (Disciplined Cut)",
                    confidenceScore: 8,
                    followedPlan: true,
                    lessonsLearned: "Honored stop loss immediately without widening or averaging down.",
                    duration: "7 mins"
                  })}
                  className="p-4 rounded-2xl bg-white/[0.02] hover:bg-rose-500/10 border border-white/5 hover:border-rose-500/30 text-left transition group space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <strong className="text-white font-mono font-bold">NIFTY 24350 PE</strong>
                    <span className="text-xs font-mono font-bold text-rose-400">-₹511.00</span>
                  </div>
                  <p className="text-[11px] text-slate-400">Protected Stop Loss cut cleanly at -7 pts (Shield of Honor Discipline).</p>
                  <span className="text-[10px] font-bold text-rose-300 group-hover:underline block">+ Add Disciplined Loss Template</span>
                </button>

                {/* Sample 4: Equity Swing */}
                <button
                  type="button"
                  onClick={() => addQuickPresetTrade({
                    symbol: "RELIANCE",
                    tradeType: "SWING",
                    direction: "LONG",
                    entryPrice: 1290.00,
                    exitPrice: 1335.00,
                    quantity: 50,
                    lotSize: 1,
                    stopLoss: 1270.00,
                    targetPrice: 1340.00,
                    grossPnl: 2250.00,
                    taxesAndCharges: 110.00,
                    netPnl: 2140.00,
                    closeReason: "TARGET_HIT",
                    strategyTags: "Daily Breakout",
                    catalyst: "Daily chart cup & handle breakout with surging delivery volume.",
                    executionDetails: "Limit order filled on 1D retest. Held across 3 sessions.",
                    mindsetEmotion: "Patient Swing Execution",
                    mistakeTags: "None (Plan Followed)",
                    confidenceScore: 9,
                    followedPlan: true,
                    lessonsLearned: "Higher timeframe trend alignment yielded high expectancy.",
                    duration: "3 days"
                  })}
                  className="p-4 rounded-2xl bg-white/[0.02] hover:bg-purple-500/10 border border-white/5 hover:border-purple-500/30 text-left transition group space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <strong className="text-white font-mono font-bold">RELIANCE (Equity)</strong>
                    <span className="text-xs font-mono font-bold text-emerald-400">+₹2,140.00</span>
                  </div>
                  <p className="text-[11px] text-slate-400">Daily Cup &amp; Handle Swing Breakout (50 Shares).</p>
                  <span className="text-[10px] font-bold text-purple-300 group-hover:underline block">+ Add Equity Swing Template</span>
                </button>
              </div>

              {/* Reset to Model Data Button */}
              <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">Want to restore initial sample model trades?</span>
                <button
                  type="button"
                  onClick={() => { resetJournalTrades(); onClose(); }}
                  className="px-3 py-1.5 rounded-xl bg-white/[0.03] hover:bg-rose-500/10 border border-white/10 hover:border-rose-500/30 text-slate-400 hover:text-rose-300 text-xs font-bold transition flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset to Initial Model Seed</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: BULK IMPORT */}
          {activeTab === "bulk" && (
            <div className="space-y-3">
              <p className="text-slate-400 text-xs">
                Paste a JSON array of custom trade objects to import them in bulk into your journal:
              </p>

              <textarea
                rows={8}
                value={bulkInput}
                onChange={(e) => setBulkInput(e.target.value)}
                placeholder='[
  {
    "symbol": "TCS.NS",
    "entryPrice": 2240,
    "exitPrice": 2280,
    "netPnl": 2000,
    "closeReason": "TARGET_HIT",
    "strategyTags": "Swing Pullback"
  }
]'
                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-3 text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
              />

              {bulkError && (
                <div className="text-rose-400 text-xs font-bold bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20">
                  {bulkError}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold transition text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBulkImport}
                  className="px-6 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-400 hover:from-cyan-400 hover:to-sky-300 text-black font-extrabold shadow-lg shadow-cyan-500/20 transition text-xs flex items-center gap-1.5"
                >
                  <Upload className="w-4 h-4" />
                  <span>Import Custom Trades</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
