import React from "react";
import { KeyRound, LogIn, ShieldAlert } from "lucide-react";
import { useTradingStore } from "../../stores/useTradingStore";
import { openBrokerAuthPopup } from "../../utils/brokerPopupAuth";

export function UpstoxSessionExpiryBanner() {
  const { brokerStatus } = useTradingStore();
  const isUpstoxExpired = Boolean(brokerStatus?.upstoxExpired);

  if (!isUpstoxExpired) return null;

  return (
    <div className="relative overflow-hidden rounded-3xl p-5 sm:p-6 border border-purple-500/30 bg-gradient-to-r from-purple-900/30 via-purple-900/10 to-transparent backdrop-blur-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_12px_36px_rgba(168,85,247,0.15)] animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 shrink-0 shadow-[0_0_20px_rgba(168,85,247,0.3)]">
          <KeyRound className="w-6 h-6 animate-pulse" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-black text-purple-200 tracking-wide uppercase font-mono">
              Upstox Pro Market Feed Expired
            </h3>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
              <ShieldAlert className="w-3 h-3" />
              Daily Reset Active
            </span>
          </div>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Exchange regulations reset Upstox OAuth session tokens daily. Re-authenticate via the separate 1-click popup tab to immediately resume live market quotes, option chains, and Greek calculations without losing your open cockpit state.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => openBrokerAuthPopup("upstox")}
        className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white font-black text-xs tracking-wider transition-all shadow-[0_4px_20px_rgba(168,85,247,0.4)] active:scale-95 shrink-0 flex items-center justify-center gap-2 cursor-pointer font-mono"
      >
        <LogIn className="w-4 h-4" />
        <span>Reconnect Upstox (1-Click Popup)</span>
      </button>
    </div>
  );
}
