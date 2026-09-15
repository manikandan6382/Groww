import React from "react";
import { RefreshCw, Radio, AlertTriangle, KeyRound, ShieldCheck, ShieldAlert } from "lucide-react";
import clsx from "clsx";

export function DashboardSyncBar({
  isMarketOpen,
  lastRefreshedAt,
  fetchError,
  refreshing,
  onRefresh,
  isExpired = false,
  isKiteOffline = false,
  userId = null,
  userName = null,
  onConnectKite
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs px-1 flex-wrap">
      <div className="flex items-center gap-2.5 flex-wrap">
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20 shadow-sm">
          PORTFOLIO RADAR
        </span>

        {/* 🛡️ Zerodha Broker Telemetry Capsule */}
        {isExpired ? (
          <button
            type="button"
            onClick={onConnectKite}
            className="text-[10px] font-bold px-3 py-1 rounded-full border border-amber-500/30 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm font-mono"
            title="Kite token expired. Click to renew in 1 click"
          >
            <KeyRound className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>🟡 KITE EXPIRED {userId ? `(${userId})` : ""} · 1-CLICK RENEW</span>
          </button>
        ) : isKiteOffline ? (
          <button
            type="button"
            onClick={onConnectKite}
            className="text-[10px] font-bold px-3 py-1 rounded-full border border-rose-500/30 bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm font-mono"
            title="Connect Zerodha Kite"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            <span>🔴 KITE DISCONNECTED · CONNECT</span>
          </button>
        ) : (
          <span className="text-[10px] font-bold px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/15 text-emerald-300 flex items-center gap-1.5 font-mono shadow-sm">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>🟢 KITE LIVE {userId ? `(${userId})` : ""}</span>
          </span>
        )}

        <span
          className={clsx(
            "text-[10px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 font-mono shadow-sm",
            isMarketOpen
              ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-300"
              : "bg-indigo-500/10 border-indigo-500/25 text-indigo-300"
          )}
        >
          <span className={clsx("w-1.5 h-1.5 rounded-full", isMarketOpen ? "bg-emerald-400 animate-ping" : "bg-indigo-400")} />
          <span>{isMarketOpen ? "🟢 NSE Live Session" : "🌙 Market Closed · Settlement Snapshot"}</span>
        </span>

        <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
          <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
          <span>Synced: {lastRefreshedAt ? lastRefreshedAt.toLocaleTimeString("en-IN") : "--:--:--"}</span>
        </span>

        {fetchError && (
          <span className="text-[10px] font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            <span>Offline Cache Active</span>
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={onRefresh}
        disabled={refreshing}
        className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-slate-300 hover:text-white transition shadow-sm font-mono text-xs disabled:opacity-50 cursor-pointer"
        title="Refresh portfolio holdings and margin quotes"
      >
        <RefreshCw className={clsx("w-3.5 h-3.5 text-cyan-400", refreshing && "animate-spin")} />
        <span>{refreshing ? "Refreshing..." : "Refresh Quotes"}</span>
      </button>
    </div>
  );
}
