import React, { useState, useEffect } from "react";
import clsx from "clsx";
import { 
  X, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  ShieldCheck, 
  Zap, 
  ExternalLink, 
  Check, 
  TrendingUp, 
  TrendingDown,
  Sparkles
} from "lucide-react";
import { useTradingStore } from "../../../stores/useTradingStore";
import { soundEngine } from "../../../utils/soundEngine";

export function HoldingQuickActionModal({
  item,
  isOpen,
  onClose,
  initialTab = "accumulate",
  currencySymbol = "₹",
  fxRate = 1,
}) {
  const { setActiveView, setOrderPadPreFill, deployPracticeTrade } = useTradingStore();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [accumulateQty, setAccumulateQty] = useState(5);
  const [trimQty, setTrimQty] = useState(1);
  const [isExecuting, setIsExecuting] = useState(false);
  const [fillSuccessNotice, setFillSuccessNotice] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setFillSuccessNotice(null);
      setIsExecuting(false);
      if (item?.qty) {
        setTrimQty(Math.max(1, Math.floor(Number(item.qty) / 2)));
      }
    }
  }, [isOpen, initialTab, item?.qty]);

  if (!isOpen || !item) return null;

  const currentQty = Number(item.qty || 0);
  const avg = Number(item.avg || 0);
  const ltp = Number(item.ltp || avg || 100);
  const investedVal = Number(item.investedVal || currentQty * avg);

  // Converted FX amounts
  const convertedAvg = avg / fxRate;
  const convertedLtp = ltp / fxRate;
  const convertedInvestedVal = Math.round(investedVal / fxRate);
  const convertedVal = Math.round((item.val || 0) / fxRate);
  const convertedPnl = Math.round((item.pnl || 0) / fxRate);

  // Accumulate calculations
  const totalQtyAfterBuy = currentQty + Number(accumulateQty);
  const requiredCapital = Number(accumulateQty) * ltp;
  const convertedRequiredCapital = Math.round(requiredCapital / fxRate);
  const newBreakEvenPrice = totalQtyAfterBuy > 0 ? (investedVal + requiredCapital) / totalQtyAfterBuy : avg;
  const convertedNewBreakEven = newBreakEvenPrice / fxRate;
  const breakEvenDelta = newBreakEvenPrice - avg;
  const convertedBreakEvenDelta = breakEvenDelta / fxRate;

  // Trim calculations
  const safeTrimQty = Math.min(currentQty, Math.max(1, Number(trimQty)));
  const capitalReleased = safeTrimQty * ltp;
  const convertedCapitalReleased = Math.round(capitalReleased / fxRate);
  const realizedProfit = safeTrimQty * (ltp - avg);
  const convertedRealizedProfit = Math.round(realizedProfit / fxRate);
  const remainingQty = Math.max(0, currentQty - safeTrimQty);

  // 🧪 Simulated Paper Ledger Execution
  const handleInstantBuy = () => {
    if (isExecuting) return;
    setIsExecuting(true);
    const cleanSym = item.tradingsymbol.replace(/\.(NS|BO)$/, "");

    deployPracticeTrade({
      symbol: cleanSym,
      tradingsymbol: cleanSym,
      underlying: cleanSym,
      tradeType: "DELIVERY",
      optionType: "BUY",
      direction: "LONG",
      entryPrice: ltp,
      quantity: Number(accumulateQty),
      lotSize: 1,
      strategy: "Demat Position Accumulation",
      entryDatetime: new Date().toISOString()
    });

    soundEngine.playOrderFillTone();
    setFillSuccessNotice(`[Paper Lab] Simulated +${accumulateQty} shs of ${cleanSym} @ ${currencySymbol}${convertedLtp.toFixed(2)}`);
    
    setTimeout(() => {
      setIsExecuting(false);
      setFillSuccessNotice(null);
      onClose();
    }, 1200);
  };

  const handleInstantTrim = () => {
    if (isExecuting) return;
    setIsExecuting(true);
    const cleanSym = item.tradingsymbol.replace(/\.(NS|BO)$/, "");

    deployPracticeTrade({
      symbol: cleanSym,
      tradingsymbol: cleanSym,
      underlying: cleanSym,
      tradeType: "DELIVERY",
      optionType: "SELL",
      direction: "SHORT",
      entryPrice: ltp,
      quantity: safeTrimQty,
      lotSize: 1,
      strategy: "Demat Profit Booking / Trim",
      entryDatetime: new Date().toISOString()
    });

    soundEngine.playOrderFillTone();
    setFillSuccessNotice(`[Paper Lab] Simulated -${safeTrimQty} shs of ${cleanSym} @ ${currencySymbol}${convertedLtp.toFixed(2)}`);

    setTimeout(() => {
      setIsExecuting(false);
      setFillSuccessNotice(null);
      onClose();
    }, 1200);
  };

  // ⚡ 1-Click Bridge to Live OrderPad
  const handleStageInOrderPad = (side = "BUY", qty = 1) => {
    const cleanSym = item.tradingsymbol.replace(/\.(NS|BO)$/, "");
    setOrderPadPreFill({
      symbol: cleanSym,
      underlying: cleanSym,
      instrumentType: "EQUITY",
      entryPrice: ltp,
      quantity: qty,
      lotSize: 1,
      orderType: side,
      product: "CNC", // Demat long-term delivery
    });
    soundEngine.playSuccessTone();
    setActiveView("paper");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-2xl flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg rounded-[28px] bg-[#0c121e]/95 border border-white/20 p-6 shadow-[0_24px_64px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.2)] space-y-5 text-white font-sans relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Apple Ambient Glow */}
        <div className="absolute top-0 right-1/4 w-[320px] h-[160px] bg-cyan-500/[0.08] rounded-full blur-[80px] pointer-events-none -mt-20" />

        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm border border-white/10 shadow-sm"
              style={{ backgroundColor: `${item.meta?.color || "#38bdf8"}25` }}
            >
              {item.tradingsymbol.slice(0, 2)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base font-mono text-white tracking-tight">
                  {item.tradingsymbol}
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-300">
                  {item.meta?.sector || "Equity"}
                </span>
              </div>
              <div className="text-xs text-slate-400 mt-0.5 font-mono">
                {currentQty} shs @ <strong className="text-slate-200">{currencySymbol}{convertedAvg.toFixed(2)}</strong> · LTP:{" "}
                <strong className="text-cyan-300">{currencySymbol}{convertedLtp.toFixed(2)}</strong>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Position Health Strip */}
        <div className="grid grid-cols-3 gap-2.5 p-3 rounded-2xl bg-white/[0.03] border border-white/10 font-mono text-xs">
          <div>
            <span className="text-[9px] uppercase text-slate-400 block">Cost Basis</span>
            <span className="font-bold text-slate-200">{currencySymbol}{convertedInvestedVal.toLocaleString("en-IN")}</span>
          </div>
          <div>
            <span className="text-[9px] uppercase text-slate-400 block">Live Market NAV</span>
            <span className="font-bold text-white">{currencySymbol}{convertedVal.toLocaleString("en-IN")}</span>
          </div>
          <div>
            <span className="text-[9px] uppercase text-slate-400 block">Unrealized P&amp;L</span>
            <span className={clsx("font-bold", item.isGain ? "text-emerald-400" : "text-rose-400")}>
              {item.isGain ? "+" : "-"}{currencySymbol}{convertedPnl.toLocaleString("en-IN")} ({item.pnlPct}%)
            </span>
          </div>
        </div>

        {/* Action Tabs: Accumulate vs Trim */}
        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-black/50 border border-white/10 text-xs font-mono">
          <button
            type="button"
            onClick={() => {
              setActiveTab("accumulate");
              soundEngine.playTabSwitchTone();
            }}
            className={clsx(
              "py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition cursor-pointer",
              activeTab === "accumulate"
                ? "bg-indigo-500/30 text-indigo-200 border border-indigo-500/40 shadow-sm"
                : "text-slate-400 hover:text-white"
            )}
          >
            <ArrowDownCircle className="w-3.5 h-3.5 text-indigo-400" />
            <span>+ Accumulate / Dip Buy</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("trim");
              soundEngine.playTabSwitchTone();
            }}
            className={clsx(
              "py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition cursor-pointer",
              activeTab === "trim"
                ? "bg-emerald-500/30 text-emerald-200 border border-emerald-500/40 shadow-sm"
                : "text-slate-400 hover:text-white"
            )}
          >
            <ArrowUpCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>- Trim / Rebalance</span>
          </button>
        </div>

        {/* Tab 1: Accumulate / Dip Averager */}
        {activeTab === "accumulate" && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 flex justify-between font-mono">
                <span>Shares to Accumulate</span>
                <span className="text-indigo-300 font-bold">+{accumulateQty} shs</span>
              </label>
              <div className="flex items-center gap-2">
                {[1, 5, 10, 25, 50].map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setAccumulateQty(q)}
                    className={clsx(
                      "flex-1 py-1.5 rounded-xl border text-xs font-mono font-bold transition cursor-pointer",
                      accumulateQty === q
                        ? "bg-indigo-500/25 border-indigo-500/50 text-white shadow-sm"
                        : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                    )}
                  >
                    +{q}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-indigo-500/[0.08] border border-indigo-500/20 space-y-1.5 text-xs font-mono">
              <div className="flex justify-between text-slate-300">
                <span>Capital Required:</span>
                <strong className="text-white">{currencySymbol}{convertedRequiredCapital.toLocaleString("en-IN")}</strong>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>New Total Holdings:</span>
                <strong className="text-white">{totalQtyAfterBuy} shares</strong>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Projected Break-Even:</span>
                <strong className="text-indigo-300">
                  {currencySymbol}{convertedNewBreakEven.toFixed(2)}{" "}
                  <span className="text-[10px] font-sans">
                    ({convertedBreakEvenDelta >= 0 ? "+" : ""}{currencySymbol}{convertedBreakEvenDelta.toFixed(2)})
                  </span>
                </strong>
              </div>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleStageInOrderPad("BUY", accumulateQty)}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-400 hover:to-blue-500 text-white font-extrabold font-mono text-xs tracking-wider transition shadow-[0_4px_20px_rgba(99,102,241,0.4)] active:scale-98 cursor-pointer flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4 text-amber-300" />
                <span>⚡ Stage in Live OrderPad (+{accumulateQty} Shares)</span>
              </button>

              <button
                type="button"
                onClick={handleInstantBuy}
                disabled={isExecuting}
                className="w-full py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-300 hover:text-white text-[11px] font-mono transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <span>🧪 Simulate in Paper Ledger</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Trim / Profit Booking */}
        {activeTab === "trim" && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 flex justify-between font-mono">
                <span>Shares to Trim / Rebalance</span>
                <span className="text-emerald-300 font-bold">{safeTrimQty} / {currentQty} shs</span>
              </label>
              <input
                type="range"
                min="1"
                max={currentQty}
                value={safeTrimQty}
                onChange={(e) => setTrimQty(Number(e.target.value))}
                className="w-full accent-emerald-400 cursor-pointer"
              />
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-500/[0.08] border border-emerald-500/20 space-y-1.5 text-xs font-mono">
              <div className="flex justify-between text-slate-300">
                <span>Capital Released to Margin:</span>
                <strong className="text-white">{currencySymbol}{convertedCapitalReleased.toLocaleString("en-IN")}</strong>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Realized Gain / Loss:</span>
                <strong className={convertedRealizedProfit >= 0 ? "text-emerald-400" : "text-rose-400"}>
                  {convertedRealizedProfit >= 0 ? "+" : "-"}{currencySymbol}{Math.abs(convertedRealizedProfit).toLocaleString("en-IN")}
                </strong>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Remaining Position:</span>
                <strong className="text-slate-200">{remainingQty} shares</strong>
              </div>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleStageInOrderPad("SELL", safeTrimQty)}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-extrabold font-mono text-xs tracking-wider transition shadow-[0_4px_20px_rgba(16,185,129,0.4)] active:scale-98 cursor-pointer flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4 text-slate-950" />
                <span>⚡ Stage in Live OrderPad (-{safeTrimQty} Shares)</span>
              </button>

              <button
                type="button"
                onClick={handleInstantTrim}
                disabled={isExecuting}
                className="w-full py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-300 hover:text-white text-[11px] font-mono transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <span>🧪 Simulate in Paper Ledger</span>
              </button>
            </div>
          </div>
        )}

        {/* Live Feedback Toast Banner */}
        {fillSuccessNotice && (
          <div className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono text-xs flex items-center gap-2 animate-in fade-in duration-150">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{fillSuccessNotice}</span>
          </div>
        )}

        {/* Dhandho Long-Term Compounding Anchor */}
        <div className="p-3 rounded-2xl bg-white/[0.025] border border-white/[0.08] flex items-center gap-2.5 text-[11px] font-mono text-slate-300">
          <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="leading-relaxed">
            <strong className="text-cyan-300">Dhandho Rule:</strong> Low risk, high uncertainty. Buy at deep discounts, trim into strength, let wealth compound.
          </span>
        </div>
      </div>
    </div>
  );
}
