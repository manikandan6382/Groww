import React, { useState } from "react";
import { ArrowUpRight, ArrowDownRight, Zap } from "lucide-react";
import clsx from "clsx";

export const WatchlistEquityForm = React.memo(function WatchlistEquityForm({
  activeStockMeta,
  activeCleanSym,
  orderSide,
  setOrderSide,
  productType,
  setProductType,
  tradeQty,
  setTradeQty,
  onExecute,
  currencySymbol = "₹",
  fxRate = 1,
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const price = Number(activeStockMeta?.price || 1000);
  const priceInFx = price / fxRate;
  const grossInvestment = price * tradeQty;
  const grossInFx = grossInvestment / fxRate;

  const handleDispatch = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      onExecute(activeStockMeta, activeCleanSym);
    } finally {
      setTimeout(() => setIsSubmitting(false), 500);
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Buy / Sell Direction */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setOrderSide("BUY")}
          className={clsx(
            "py-2.5 rounded-xl font-bold font-mono text-xs transition border flex items-center justify-center gap-1.5 cursor-pointer",
            orderSide === "BUY"
              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_16px_rgba(16,185,129,0.2)]"
              : "bg-white/[0.03] text-slate-400 border-white/10 hover:text-white"
          )}
        >
          <ArrowUpRight className="w-3.5 h-3.5" />
          <span>BUY (Long Asset)</span>
        </button>
        <button
          type="button"
          onClick={() => setOrderSide("SELL")}
          className={clsx(
            "py-2.5 rounded-xl font-bold font-mono text-xs transition border flex items-center justify-center gap-1.5 cursor-pointer",
            orderSide === "SELL"
              ? "bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-[0_0_16px_rgba(244,63,94,0.2)]"
              : "bg-white/[0.03] text-slate-400 border-white/10 hover:text-white"
          )}
        >
          <ArrowDownRight className="w-3.5 h-3.5" />
          <span>SELL (Short / Exit)</span>
        </button>
      </div>

      {/* 2. Product Mode Switcher */}
      <div className="flex items-center justify-between text-xs font-mono p-2 rounded-xl bg-white/[0.03] border border-white/5">
        <span className="text-slate-400">Execution Mode:</span>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => setProductType("CNC")}
            className={clsx(
              "px-3 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer",
              productType === "CNC" ? "bg-white/20 text-white shadow-sm" : "text-slate-400 hover:text-white"
            )}
          >
            CNC (Delivery / Wealth)
          </button>
          <button
            type="button"
            onClick={() => setProductType("MIS")}
            className={clsx(
              "px-3 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer",
              productType === "MIS" ? "bg-white/20 text-white shadow-sm" : "text-slate-400 hover:text-white"
            )}
          >
            MIS (Intraday Momentum)
          </button>
        </div>
      </div>

      {/* 3. Quantity Stepper & Quick Pills */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs font-mono text-slate-400">
          <span>Order Quantity (Shares):</span>
          <span>LTP: {currencySymbol}{priceInFx.toFixed(2)}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTradeQty((q) => Math.max(1, q - 5))}
            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 text-white text-lg font-bold border border-white/10 transition cursor-pointer active:scale-95"
          >
            -
          </button>
          <input
            type="number"
            min={1}
            value={tradeQty}
            onChange={(e) => setTradeQty(Math.max(1, parseInt(e.target.value) || 1))}
            className="flex-1 bg-black/60 border border-white/15 rounded-xl text-center py-2 text-sm font-mono font-bold text-white focus:outline-none focus:border-white/40"
          />
          <button
            type="button"
            onClick={() => setTradeQty((q) => q + 5)}
            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 text-white text-lg font-bold border border-white/10 transition cursor-pointer active:scale-95"
          >
            +
          </button>
        </div>
        <div className="flex gap-1.5 pt-1">
          {[5, 10, 25, 50, 100].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => setTradeQty(num)}
              className={clsx(
                "px-2.5 py-1 rounded-lg text-[10px] font-mono border transition cursor-pointer",
                tradeQty === num
                  ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/30"
                  : "bg-white/[0.04] hover:bg-white/[0.10] text-slate-300 border-white/5"
              )}
            >
              {num} Qty
            </button>
          ))}
        </div>
      </div>

      {/* 4. Capital Breakdown Card */}
      <div className="p-3.5 rounded-2xl bg-black/50 border border-white/10 space-y-2 text-xs font-mono">
        <div className="flex justify-between text-slate-400">
          <span>Gross Order Value:</span>
          <strong className="text-white">
            {currencySymbol}{grossInFx.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </strong>
        </div>
        <div className="flex justify-between text-slate-400">
          <span>Brokerage (Zero Delivery):</span>
          <span className="text-emerald-400 font-bold">₹0.00 Brokerage Free</span>
        </div>
        <div className="flex justify-between text-slate-400 border-t border-white/10 pt-1.5">
          <span>Available Cash Margin:</span>
          <span className="text-cyan-300 font-bold">₹1,25,000.00</span>
        </div>
      </div>

      {/* 5. Dispatch Order Trigger with isSubmitting Lock */}
      <button
        type="button"
        disabled={isSubmitting}
        onClick={handleDispatch}
        className={clsx(
          "w-full py-3 rounded-2xl font-black font-mono text-sm transition-all duration-200 cursor-pointer shadow-lg active:scale-95 flex items-center justify-center gap-2",
          isSubmitting
            ? "opacity-60 cursor-not-allowed bg-slate-700 text-slate-300"
            : orderSide === "BUY"
              ? "bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_20px_rgba(16,185,129,0.3)]"
              : "bg-rose-500 hover:bg-rose-400 text-white shadow-[0_0_20px_rgba(244,63,94,0.3)]"
        )}
      >
        <Zap className={clsx("w-4 h-4", isSubmitting && "animate-spin")} />
        <span>
          {isSubmitting
            ? "Deploying Order..."
            : `Execute ${orderSide} Order · ${currencySymbol}${grossInFx.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
        </span>
      </button>
    </div>
  );
});
