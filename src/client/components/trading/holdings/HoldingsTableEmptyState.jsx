import React from "react";
import { Search, KeyRound, ShieldAlert, LogIn } from "lucide-react";
import { soundEngine } from "../../../utils/soundEngine";

export function HoldingsTableEmptyState({
  search,
  onReset,
  isExpired = false,
  isKiteOffline = false,
  userId = null,
  onConnectKite
}) {
  // 1. Zerodha daily token expired (SEBI 6 AM reset)
  if (isExpired && !search) {
    return (
      <tr>
        <td colSpan={7} className="py-16 text-center">
          <div className="flex flex-col items-center justify-center space-y-3.5 max-w-md mx-auto px-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
              <KeyRound className="w-6 h-6 animate-pulse" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-white font-mono">
                Zerodha Kite Daily Session Expired {userId ? `(${userId})` : ""}
              </p>
              <p className="text-xs text-slate-400 font-sans leading-relaxed">
                SEBI mandates daily token renewal at 06:00 AM IST. Re-authenticate once to stream your real Demat holdings, live quotes, and margins.
              </p>
            </div>
            {onConnectKite && (
              <button
                type="button"
                onClick={onConnectKite}
                className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs font-mono transition-all active:scale-95 shadow-[0_4px_16px_rgba(245,158,11,0.3)] cursor-pointer flex items-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                <span>Renew Kite Session (1-Click)</span>
              </button>
            )}
          </div>
        </td>
      </tr>
    );
  }

  // 2. Zerodha account offline / disconnected
  if (isKiteOffline && !search) {
    return (
      <tr>
        <td colSpan={7} className="py-16 text-center">
          <div className="flex flex-col items-center justify-center space-y-3.5 max-w-md mx-auto px-4">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-white font-mono">Zerodha Kite Disconnected</p>
              <p className="text-xs text-slate-400 font-sans leading-relaxed">
                Connect your Zerodha Kite broker account to sync and manage your actual Demat equity portfolio and real-time capital margins.
              </p>
            </div>
            {onConnectKite && (
              <button
                type="button"
                onClick={onConnectKite}
                className="px-5 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-extrabold text-xs font-mono transition-all active:scale-95 shadow-[0_4px_16px_rgba(6,182,212,0.3)] cursor-pointer flex items-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                <span>Connect Zerodha Account</span>
              </button>
            )}
          </div>
        </td>
      </tr>
    );
  }

  // 3. Standard empty filter/search state
  return (
    <tr>
      <td colSpan={7} className="py-14 text-center">
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-slate-400 shadow-inner">
            <Search className="w-5 h-5 text-slate-400" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-bold text-white">No active holdings match your filter</p>
            <p className="text-xs text-slate-400 font-mono">
              {search ? `No results found for "${search}"` : "No assets in this selected category"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              onReset();
              soundEngine.playSuccessTone();
            }}
            className="px-4 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-xs font-mono font-bold text-cyan-300 transition-all active:scale-95 shadow-sm cursor-pointer"
          >
            Reset All Filters
          </button>
        </div>
      </td>
    </tr>
  );
}
