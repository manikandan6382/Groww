import React, { useState } from "react";
import { useTradingStore } from "../../stores/useTradingStore";
import { PlusCircle, Calculator, Tag, Sparkles, ShieldCheck, AlertCircle, Info } from "lucide-react";
import clsx from "clsx";

export function TradeLoggerForm({ onLogged }) {
  const [symbol, setSymbol] = useState("NIFTY 24500 CE");
  const [side, setSide] = useState("BUY");
  const [entryPrice, setEntryPrice] = useState("28.50");
  const [exitPrice, setExitPrice] = useState("38.00");
  const [quantity, setQuantity] = useState("65");
  const [stopLoss, setStopLoss] = useState("23.50");
  const [targetPrice, setTargetPrice] = useState("43.50");
  const [setupTag, setSetupTag] = useState("Breakout");
  const [mindsetEmotion, setMindsetEmotion] = useState("Disciplined & Patient");
  const [confidenceScore, setConfidenceScore] = useState(9);
  const [mistakeTag, setMistakeTag] = useState("None (Plan Followed)");
  const [notes, setNotes] = useState("15-min volume breakout above morning high with tight risk.");
  const [submitting, setSubmitting] = useState(false);

  const { journalTrades, logJournalTrade } = useTradingStore();

  // Calculate today's executed trades count
  const _todayStr = new Date().toISOString().split("T")[0];
  const todayTradesCount = (journalTrades || []).filter(
    (t) => t.entryDatetime?.split("T")[0] === _todayStr
  ).length;

  const entry = Number(entryPrice || 0);
  const exit = Number(exitPrice || 0);
  const qty = Number(quantity || 1);
  const pts = side === "BUY" ? (exit - entry) : (entry - exit);
  const grossPnl = pts * qty;

  // Indian Statutory Taxes & Friction Calculator (STT, GST, Stamp Duty, Exchange Charges, Brokerage)
  const buyTurnover = entry * qty;
  const sellTurnover = exit * qty;
  const totalTurnover = buyTurnover + sellTurnover;

  const brokerage = 40.0; // ₹20 flat buy + ₹20 flat sell
  const stt = side === "BUY" ? (sellTurnover * 0.001) : (buyTurnover * 0.001); // 0.1% on sell side option turnover
  const exchangeCharges = totalTurnover * 0.0005; // 0.05% on premium turnover
  const gst = 0.18 * (brokerage + exchangeCharges); // 18% GST on brokerage + exchange fee
  const stampDuty = side === "BUY" ? (buyTurnover * 0.00003) : 0; // 0.003% on buy turnover
  const sebiCharges = totalTurnover * 0.000001; // ₹10 per crore

  const totalFriction = Math.round((brokerage + stt + exchangeCharges + gst + stampDuty + sebiCharges) * 100) / 100;
  const netTakeHomePnl = grossPnl - totalFriction;
  const isProfit = netTakeHomePnl >= 0;

  // 1-Click Story Preset Handlers
  const applyPreset = (tag, noteText, emotion, conf, mistake) => {
    setSetupTag(tag);
    if (noteText) setNotes(noteText);
    if (emotion) setMindsetEmotion(emotion);
    if (conf) setConfidenceScore(conf);
    if (mistake) setMistakeTag(mistake);
  };

  async function handleSubmit(e) {
    e.preventDefault();
    if (!symbol || !entryPrice || !exitPrice || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/trading/trades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tradingsymbol: symbol.toUpperCase().trim(),
          transaction_type: side,
          entry_price: entry,
          exit_price: exit,
          quantity: qty,
          stop_loss: Number(stopLoss || entry),
          target_price: Number(targetPrice || exit),
          setup_tag: setupTag,
          notes,
          gross_pnl: grossPnl,
          taxes_charges: totalFriction,
          net_pnl: netTakeHomePnl,
        }),
      });

      const now = new Date();
      const exitTime = new Date(now.getTime() + 14 * 60000); // 14 min typical hold

      const newTrade = {
        id: Date.now(),
        symbol: symbol.toUpperCase().trim(),
        tradeType: "INTRADAY",
        direction: side === "BUY" ? "LONG" : "SHORT",
        entryPrice: entry,
        exitPrice: exit,
        quantity: Math.max(1, Math.round(qty / 65)),
        lotSize: 65,
        stopLoss: Number(stopLoss || entry),
        targetPrice: Number(targetPrice || exit),
        grossPnl: grossPnl,
        taxesAndCharges: totalFriction,
        netPnl: netTakeHomePnl,
        closeReason: netTakeHomePnl >= 0 ? "TARGET_HIT" : "STOP_LOSS_HIT",
        strategyTags: setupTag,
        catalyst: notes || `${symbol} technical ${setupTag} setup with volume expansion above ₹${entry}.`,
        executionDetails: `Order filled at ₹${entry.toFixed(2)} ➔ Closed at ₹${exit.toFixed(2)} (${isProfit ? "+" : ""}${pts.toFixed(2)} pts). ${isProfit ? "Target reached with 0 slippage." : "Loss cut promptly at risk limit."}`,
        mindsetEmotion: mindsetEmotion,
        mistakeTags: mistakeTag,
        confidenceScore: confidenceScore,
        followedPlan: mistakeTag !== "Chased Extended Wick",
        lessonsLearned: notes || `Executed ${setupTag} plan. Captured ${isProfit ? "+" : ""}${pts.toFixed(2)} pts take-home after ₹${totalFriction} statutory friction.`,
        entryDatetime: now.toISOString(),
        exitDatetime: exitTime.toISOString(),
        duration: "14 mins"
      };

      logJournalTrade(newTrade);

      if (onLogged) {
        onLogged();
      }
    } catch (err) {
      console.error("Failed to log trade:", err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="apple-ceramic-card p-6 space-y-4">
      {/* Header with 3-Trade Cap and Volatility Regime Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Fast Trade Logger (12-Col Flow)</h3>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Daily 3-Trade Cap Badge */}
          <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-cyan-400" />
            Session Budget: {todayTradesCount} / 3 Max Trades
          </span>

          {/* India VIX Regime Badge */}
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
            ⚡ VIX 13.4 (Normal Trend Regime)
          </span>
        </div>
      </div>

      {/* 🌟 1-Click Fast Story Presets Strip (Zero-Typing Flow) */}
      <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-bold text-slate-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>1-Click Story Presets (Zero Typing):</span>
          </span>
          <span className="text-[10px] text-slate-500 font-mono">Click any pill to auto-fill setup &amp; psychology</span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs flex-nowrap scrollbar-none">
          <button
            type="button"
            onClick={() => applyPreset("Breakout", "15-min volume breakout above morning resistance with momentum.", "Disciplined & Patient", 9, "None (Plan Followed)")}
            className="px-2.5 py-1 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[11px] font-bold whitespace-nowrap transition flex items-center gap-1"
          >
            <span>⚡ 15m Breakout</span>
          </button>

          <button
            type="button"
            onClick={() => applyPreset("Pullback", "Tested 20 EMA and VWAP support cleanly; entered on green reversal confirmation.", "Calm & Focused", 9, "None (Plan Followed)")}
            className="px-2.5 py-1 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold whitespace-nowrap transition flex items-center gap-1"
          >
            <span>🎯 VWAP Pullback</span>
          </button>

          <button
            type="button"
            onClick={() => applyPreset("Option Scalp", "Opening bell volatility surge; quick 10-point delta expansion scalp.", "High Conviction Execution", 10, "None (Plan Followed)")}
            className="px-2.5 py-1 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[11px] font-bold whitespace-nowrap transition flex items-center gap-1"
          >
            <span>🌊 Opening Bell Scalp</span>
          </button>

          <button
            type="button"
            onClick={() => applyPreset("Breakout", "Chased extended wick at top of candle; honored protective stop without widening.", "Slight FOMO -> Disciplined Exit", 6, "Chased Extended Wick")}
            className="px-2.5 py-1 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[11px] font-bold whitespace-nowrap transition flex items-center gap-1"
          >
            <span>🛡️ Slipped Stop Cut</span>
          </button>
        </div>
      </div>

      {/* 12-Column Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Tab 1: Symbol (3 cols) */}
        <div className="md:col-span-3 space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            1. Symbol / Strike
          </label>
          <input
            id="formTradingsymbol"
            tabIndex={1}
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-white/[0.04] border border-white/10 rounded-xl text-white font-mono focus:outline-none focus:border-cyan-400/50"
            placeholder="e.g. NIFTY 24500 CE"
            required
          />
        </div>

        {/* Tab 2: Direction (2 cols) */}
        <div className="md:col-span-2 space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            2. Action
          </label>
          <select
            tabIndex={2}
            value={side}
            onChange={(e) => setSide(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-900 border border-white/10 rounded-xl text-white font-bold focus:outline-none focus:border-cyan-400/50"
          >
            <option value="BUY">🟢 BUY (Long)</option>
            <option value="SELL">🔴 SELL (Short)</option>
          </select>
        </div>

        {/* Tab 3: Qty (2 cols) */}
        <div className="md:col-span-2 space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              3. Quantity
            </label>
            <button
              type="button"
              onClick={() => useTradingStore.getState().openRosettaWithTopic("lot_size")}
              className="text-slate-500 hover:text-cyan-400 text-[10px] flex items-center gap-0.5"
              title="Learn about Lot Sizes in Guide"
            >
              <span>?</span>
            </button>
          </div>
          <input
            tabIndex={3}
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-white/[0.04] border border-white/10 rounded-xl text-white font-mono focus:outline-none focus:border-cyan-400/50"
            required
          />
        </div>

        {/* Tab 4: Entry Price (2 cols) */}
        <div className="md:col-span-2 space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            4. Entry Price (₹)
          </label>
          <input
            tabIndex={4}
            type="number"
            step="0.05"
            value={entryPrice}
            onChange={(e) => setEntryPrice(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-white/[0.04] border border-white/10 rounded-xl text-white font-mono focus:outline-none focus:border-cyan-400/50"
            required
          />
        </div>

        {/* Tab 5: Exit Price (3 cols) */}
        <div className="md:col-span-3 space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            5. Exit Price (₹)
          </label>
          <input
            tabIndex={5}
            type="number"
            step="0.05"
            value={exitPrice}
            onChange={(e) => setExitPrice(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-white/[0.04] border border-white/10 rounded-xl text-cyan-400 font-mono font-bold focus:outline-none focus:border-cyan-400/50"
            required
          />
        </div>

        {/* Tab 6: Stop Loss (3 cols) */}
        <div className="md:col-span-3 space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              6. Stop Loss (₹)
            </label>
            <button
              type="button"
              onClick={() => useTradingStore.getState().openRosettaWithTopic("stop_loss")}
              className="text-slate-500 hover:text-rose-400 text-[10px] flex items-center gap-0.5"
              title="Learn about Stop Loss in Guide"
            >
              <span>?</span>
            </button>
          </div>
          <input
            tabIndex={6}
            type="number"
            step="0.05"
            value={stopLoss}
            onChange={(e) => setStopLoss(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-white/[0.04] border border-white/10 rounded-xl text-rose-400 font-mono font-bold focus:outline-none focus:border-cyan-400/50"
          />
        </div>

        {/* Tab 7: Target Price (3 cols) */}
        <div className="md:col-span-3 space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              7. Target Goal (₹)
            </label>
            <button
              type="button"
              onClick={() => useTradingStore.getState().openRosettaWithTopic("target_price")}
              className="text-slate-500 hover:text-emerald-400 text-[10px] flex items-center gap-0.5"
              title="Learn about Target Price in Guide"
            >
              <span>?</span>
            </button>
          </div>
          <input
            tabIndex={7}
            type="number"
            step="0.05"
            value={targetPrice}
            onChange={(e) => setTargetPrice(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-white/[0.04] border border-white/10 rounded-xl text-emerald-400 font-mono font-bold focus:outline-none focus:border-cyan-400/50"
          />
        </div>

        {/* Tab 8: Setup Tag (3 cols) */}
        <div className="md:col-span-3 space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            8. Setup Tag
          </label>
          <select
            tabIndex={8}
            value={setupTag}
            onChange={(e) => setSetupTag(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-900 border border-white/10 rounded-xl text-white font-semibold focus:outline-none focus:border-cyan-400/50"
          >
            <option value="Breakout">🚀 Breakout</option>
            <option value="Pullback">🔄 Pullback / EMA Reversal</option>
            <option value="Option Scalp">⚡ Quick Option Scalp</option>
            <option value="Gap Fill">📈 Gap Fill Strategy</option>
            <option value="Gamma Blast">💥 Gamma Blast (Hero Zero)</option>
          </select>
        </div>

        {/* Tab 9: Notes / Trade Execution Story (3 cols) */}
        <div className="md:col-span-3 space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            9. Execution Story / Notes
          </label>
          <input
            tabIndex={9}
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-white/[0.04] border border-white/10 rounded-xl text-slate-200 focus:outline-none focus:border-cyan-400/50"
            placeholder="Trade rationale..."
          />
        </div>
      </div>

      {/* Bottom P&L & Statutory Tax Deductor Output Ribbon */}
      <div className="pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-6 flex-wrap">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Points Captured</span>
            <strong className={clsx("text-sm font-mono font-bold tabular-nums", isProfit ? "text-emerald-400" : "text-rose-400")}>
              {pts >= 0 ? "+" : ""}{pts.toFixed(2)} pts
            </strong>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Gross P&amp;L</span>
            <strong className={clsx("text-sm font-mono font-bold tabular-nums text-slate-300")}>
              {grossPnl >= 0 ? "+" : ""}₹{grossPnl.toFixed(2)}
            </strong>
          </div>

          <div>
            <span className="text-[10px] text-amber-400/90 font-bold uppercase block flex items-center gap-1">
              Est. Taxes &amp; Friction (STT+GST)
            </span>
            <strong className="text-sm font-mono font-bold tabular-nums text-amber-400">
              -₹{totalFriction.toFixed(2)}
            </strong>
          </div>

          <div className="pl-2 border-l border-white/10">
            <span className="text-[10px] text-cyan-400 font-extrabold uppercase block">True Net Take-Home</span>
            <strong className={clsx("text-lg font-mono font-black tabular-nums", isProfit ? "text-emerald-400" : "text-rose-400")}>
              {netTakeHomePnl >= 0 ? "+" : ""}₹{netTakeHomePnl.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </strong>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="px-6 py-2.5 apple-btn-primary flex items-center gap-2 text-xs font-bold"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{submitting ? "Saving Story..." : "Log Take-Home Profit Story (Enter)"}</span>
        </button>
      </div>
    </form>
  );
}
