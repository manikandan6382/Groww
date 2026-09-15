import React from "react";
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
}) {
  const price = Number(activeStockMeta?.price || 1000);

  return (
    <div className="space-y-4">
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

      <div className="flex items-center justify-between text-xs font-mono p-2 rounded-xl bg-white/[0.03] border border-white/5">
        <span className="text-slate-400">Product Mode:</span>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => setProductType("CNC")}
            className={clsx(
              "px-2.5 py-1 rounded-lg text-[11px] font-bold transition",
              productType === "CNC" ? "bg-white/20 text-white" : "text-slate-400 hover:text-white"
            )}
          >
            CNC (Delivery / Wealth)
          </button>
          <button
            type="button"
            onClick={() => setProductType("MIS")}
            className={clsx(
              "px-2.5 py-1 rounded-lg text-[11px] font-bold transition",
              productType === "MIS" ? "bg-white/20 text-white" : "text-slate-400 hover:text-white"
            )}
          >
            MIS (Intraday)
          </button>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between text-xs font-mono text-slate-400">
          <span>Order Quantity (Shares):</span>
          <span>LTP: ₹{price}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTradeQty((q) => Math.max(1, q - 5))}
            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 text-white text-lg font-bold border border-white/10 transition cursor-pointer"
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
            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 text-white text-lg font-bold border border-white/10 transition cursor-pointer"
          >
            +
          </button>
        </div>
        <div className="flex gap-1.5 pt-1">
          {[10, 25, 50, 100].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => setTradeQty(num)}
              className="px-2 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.10] text-[10px] font-mono text-slate-300 border border-white/5 transition"
            >
              {num} Qty
            </button>
          ))}
        </div>
      </div>

      <div className="p-3.5 rounded-2xl bg-black/50 border border-white/10 space-y-2 text-xs font-mono">
        <div className="flex justify-between text-slate-400">
          <span>Gross Investment:</span>
          <strong className="text-white">
            ₹{(price * tradeQty).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </strong>
        </div>
        <div className="flex justify-between text-slate-400">
          <span>Est. Brokerage &amp; Taxes:</span>
          <span className="text-emerald-400 font-bold">₹0.00 (Zero Delivery Brokerage)</span>
        </div>
        <div className="flex justify-between text-slate-400 border-t border-white/10 pt-1.5">
          <span>Available Cash Margin:</span>
          <span className="text-cyan-300 font-bold">₹1,25,000.00</span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onExecute(activeStockMeta, activeCleanSym)}
        className={clsx(
          "w-full py-3 rounded-2xl font-bold font-mono text-sm transition-all duration-200 cursor-pointer shadow-lg active:scale-95 flex items-center justify-center gap-2",
          orderSide === "BUY"
            ? "bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_20px_rgba(16,185,129,0.3)]"
            : "bg-rose-500 hover:bg-rose-400 text-white shadow-[0_0_20px_rgba(244,63,94,0.3)]"
        )}
      >
        <Zap className="w-4 h-4" />
        <span>Execute {orderSide} Order · ₹{(price * tradeQty).toLocaleString("en-IN")}</span>
      </button>
    </div>
  );
});
