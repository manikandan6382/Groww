import React from "react";
import { ArrowUpRight } from "lucide-react";

export function SettlementToastHud({ settlementToast, onDismiss }) {
  if (!settlementToast) return null;

  const handleHighlightInLedger = () => {
    const id = settlementToast.id || settlementToast.serverId;
    onDismiss();
    const rowElem = document.getElementById(`trade-row-${id}`);
    if (rowElem) {
      rowElem.scrollIntoView({ behavior: "smooth", block: "center" });
      rowElem.classList.add("bg-cyan-500/30", "ring-2", "ring-cyan-400");
      setTimeout(() => rowElem.classList.remove("bg-cyan-500/30", "ring-2", "ring-cyan-400"), 3500);
    } else {
      const ledger = document.getElementById("trade-history-ledger");
      if (ledger) ledger.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-300">
      <div className="p-4 sm:p-5 rounded-3xl bg-[#121424]/95 border border-cyan-500/30 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-2xl max-w-sm w-full space-y-3 relative overflow-hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <strong className="text-white font-mono text-xs font-bold">{settlementToast.symbol}</strong>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 font-bold border border-cyan-500/20">
              Squared Off @ ₹{settlementToast.exitPrice}
            </span>
          </div>
          <button 
            type="button" 
            onClick={onDismiss} 
            className="text-slate-400 hover:text-white p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="flex items-center justify-between text-xs font-mono pt-1 border-t border-white/5">
          <span className="text-slate-400">Net Realized P&amp;L:</span>
          <strong className={settlementToast.netPnl >= 0 ? "text-emerald-400 font-black text-sm" : "text-rose-400 font-black text-sm"}>
            {settlementToast.netPnl >= 0 ? "+" : ""}₹{settlementToast.netPnl?.toFixed(2)}
          </strong>
        </div>

        <div className="space-y-1 text-[10px] text-slate-400 pt-0.5 border-t border-white/5">
          <div className="flex items-center justify-between">
            <span>Statutory Friction: -₹{settlementToast.taxesAndCharges?.toFixed(2) || "56.00"}</span>
            {settlementToast.slippageCost > 0 && (
              <span className="text-amber-400/90 font-mono font-bold">
                Slippage Penalty: -₹{settlementToast.slippageCost?.toFixed(1)}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] text-slate-500 font-mono">
              {settlementToast.closeReason?.replace(/_/g, " ") || "SETTLED"}
            </span>
            <button
              type="button"
              onClick={handleHighlightInLedger}
              className="px-3 py-1 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-bold text-[11px] border border-cyan-500/30 flex items-center gap-1 transition active:scale-95 cursor-pointer shadow-sm"
            >
              <span>Highlight in Ledger</span>
              <ArrowUpRight className="w-3 h-3 text-cyan-400" />
            </button>
          </div>
        </div>

        {/* Auto-dismiss animated progress bar */}
        <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
          <div className="bg-cyan-400 h-full rounded-full animate-pulse" style={{ width: "100%" }} />
        </div>
      </div>
    </div>
  );
}
