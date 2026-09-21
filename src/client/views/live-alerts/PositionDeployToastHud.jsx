import React from "react";
import { resolveIndexLotSize } from "../../stores/useTradingStore";
import { ArrowUpRight, ShieldAlert } from "lucide-react";

export function PositionDeployToastHud({ deployToast, onDismiss }) {
  if (!deployToast) return null;

  if (deployToast.error) {
    return (
      <div className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:right-6 sm:bottom-6 z-50 animate-in slide-in-from-bottom-5 duration-300">
        <div className="p-4 sm:p-5 rounded-3xl bg-[#160b14]/95 border border-rose-500/40 shadow-[0_20px_50px_rgba(244,63,94,0.3)] backdrop-blur-2xl max-w-sm sm:max-w-md w-full space-y-3 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/15 rounded-full blur-2xl pointer-events-none -mr-8 -mt-8" />

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400 animate-ping shrink-0" />
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20 flex items-center gap-1 shrink-0">
                <ShieldAlert className="w-3 h-3" />
                Trade Blocked
              </span>
              <strong className="text-white font-mono text-xs font-bold truncate">{deployToast.symbol}</strong>
            </div>
            <button 
              type="button" 
              onClick={onDismiss} 
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition cursor-pointer shrink-0"
            >
              ✕
            </button>
          </div>

          <div className="py-2.5 px-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-mono text-rose-200 leading-relaxed">
            {deployToast.message || "Order rejected by risk management guard."}
          </div>

          <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
            <div className="bg-gradient-to-r from-rose-500 to-amber-500 h-full rounded-full animate-pulse" style={{ width: "100%" }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:right-6 sm:bottom-6 z-50 animate-in slide-in-from-bottom-5 duration-300">
      <div className="p-4 sm:p-5 rounded-3xl bg-[#121424]/95 border border-emerald-500/40 shadow-[0_20px_50px_rgba(16,185,129,0.25)] backdrop-blur-2xl max-w-sm sm:max-w-md w-full space-y-3 relative overflow-hidden">
        {/* Soft Emerald Ambient Glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none -mr-8 -mt-8" />

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              🚀 Trade Deployed
            </span>
            <strong className="text-white font-mono text-xs font-bold">{deployToast.symbol}</strong>
          </div>
          <button 
            type="button" 
            onClick={onDismiss} 
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 py-1.5 px-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-center text-[10px] font-mono">
          <div>
            <span className="text-slate-400 block text-[10px]">Entry (Fill)</span>
            <strong className="text-white font-bold">₹{Number(deployToast.entryPrice || 0).toFixed(2)}</strong>
          </div>
          <div className="border-x border-white/5">
            <span className="text-rose-400 block text-[10px]">Stop Loss</span>
            <strong className="text-rose-300 font-bold">₹{Number(deployToast.stopLoss || 0).toFixed(2)}</strong>
          </div>
          <div>
            <span className="text-emerald-400 block text-[10px]">Target</span>
            <strong className="text-emerald-300 font-bold">₹{Number(deployToast.targetPrice || 0).toFixed(2)}</strong>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] pt-0.5">
          <span className="text-slate-400 font-mono text-[10px]">
            {deployToast.quantity || 1} Lot ({resolveIndexLotSize(deployToast.symbol, deployToast.lotSize) * (deployToast.quantity || 1)} Qty)
          </span>
          <button
            type="button"
            onClick={() => {
              const activeSection = document.getElementById("active-practice-trades");
              if (activeSection) {
                activeSection.scrollIntoView({ behavior: "smooth", block: "nearest" });
              }
              onDismiss();
            }}
            className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 hover:underline text-xs cursor-pointer"
          >
            <span>🎯 Jump to Active Card</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Auto-dismiss animated countdown progress bar */}
        <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-400 to-cyan-400 h-full rounded-full animate-pulse" style={{ width: "100%" }} />
        </div>
      </div>
    </div>
  );
}
