import React from "react";
import { AlertTriangle } from "lucide-react";

export function DuplicateStackingGuard({ warning, onDismiss }) {
  if (!warning) return null;

  return (
    <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs flex items-center justify-between gap-3 shadow-lg">
      <div className="flex items-center gap-2.5">
        <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
        <div>
          <strong className="text-amber-300 font-bold block">
            Contract Warning: {warning}
          </strong>
          <span className="text-[11px] text-slate-300">
            You already have an active position on this contract tracking in your cockpit below. Scalp stacking is prevented to protect your margin.
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-slate-200 border border-white/10 text-[10px] font-bold cursor-pointer transition shrink-0"
      >
        Dismiss
      </button>
    </div>
  );
}
