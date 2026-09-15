import React from "react";
import { ShieldAlert } from "lucide-react";
import clsx from "clsx";

export function SquareOffAllModal({
  isOpen,
  onClose,
  onConfirm,
  openAlertsCount,
  totalOpenPnl = 0
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xl animate-fadeIn">
      <div className="relative w-full max-w-md p-6 sm:p-7 rounded-3xl bg-[#121424]/95 border border-rose-500/30 shadow-[0_25px_60px_rgba(244,63,94,0.25)] space-y-5 overflow-hidden">
        {/* Ambient Rose Light */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shadow-md flex-shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-white tracking-tight">
              Square Off All Active Positions?
            </h3>
            <span className="text-[11px] text-slate-400">
              Dual-confirmation safety shield active
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          You are about to execute market square-off orders for all{" "}
          <strong className="text-white font-mono">{openAlertsCount} active position(s)</strong>.
        </p>

        <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center justify-between text-xs font-mono">
          <span className="text-slate-400">Estimated Open MTM P&amp;L:</span>
          <strong className={clsx("font-bold text-sm", totalOpenPnl >= 0 ? "text-emerald-400" : "text-rose-400")}>
            {totalOpenPnl >= 0 ? "+" : ""}₹{Number(totalOpenPnl).toFixed(2)}
          </strong>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-300 hover:text-white transition shadow-sm cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 active:scale-95 text-xs font-black text-white shadow-lg shadow-rose-500/30 transition-all cursor-pointer"
          >
            Confirm Liquidation
          </button>
        </div>
      </div>
    </div>
  );
}
