import React from "react";
import clsx from "clsx";
import { ExternalLink } from "lucide-react";
import { openBrokerAuthPopup } from "../../../utils/brokerPopupAuth";

export function SidebarBrokerHub({ brokerStatus }) {
  return (
    <div className="p-3 rounded-2xl bg-[var(--card)] border border-[var(--line)] space-y-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
      <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          <span>Live Broker Hub</span>
        </div>
        <span className="text-[8px] text-slate-400 font-mono uppercase">OAuth Sync</span>
      </div>

      <div className="space-y-2">
        {/* Zerodha Kite */}
        <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center font-black text-[10px]">
              K
            </span>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-slate-200">Zerodha Kite</span>
              <span className={clsx("text-[9px] font-medium flex items-center gap-1", brokerStatus?.kiteConnected ? "text-emerald-400" : "text-amber-400")}>
                <span className={clsx("w-1.5 h-1.5 rounded-full", brokerStatus?.kiteConnected ? "bg-emerald-400 animate-pulse" : "bg-amber-400")} />
                {brokerStatus?.kiteConnected ? (brokerStatus.kiteUserName ? brokerStatus.kiteUserName.split(" ")[0] : "Active") : "OAuth Ready"}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => openBrokerAuthPopup("kite")}
            className={clsx(
              "text-[10px] px-2 py-1 rounded-lg border flex items-center gap-1 transition font-mono cursor-pointer active:scale-95",
              brokerStatus?.kiteConnected
                ? "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/20"
                : "bg-orange-500/10 hover:bg-orange-500/20 text-orange-300 border-orange-500/20"
            )}
            title={brokerStatus?.kiteConnected ? "Zerodha Session Active — Click to Re-authenticate (Separate Tab)" : "Connect Zerodha Demat (Separate Tab)"}
          >
            <span>{brokerStatus?.kiteConnected ? "Active" : "Login"}</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </button>
        </div>

        {/* Upstox Pro */}
        {(() => {
          const isUpstoxLive = Boolean(brokerStatus?.upstoxConnected && !brokerStatus?.upstoxExpired);
          const isUpstoxExpired = Boolean(brokerStatus?.upstoxExpired);
          return (
            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center font-black text-[10px]">
                  U
                </span>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-slate-200">Upstox Pro</span>
                  <span className={clsx(
                    "text-[9px] font-medium flex items-center gap-1",
                    isUpstoxLive ? "text-emerald-400" : isUpstoxExpired ? "text-rose-400 font-bold" : "text-amber-400"
                  )}>
                    <span className={clsx(
                      "w-1.5 h-1.5 rounded-full",
                      isUpstoxLive ? "bg-emerald-400 animate-pulse" : isUpstoxExpired ? "bg-rose-400 animate-ping" : "bg-amber-400"
                    )} />
                    {isUpstoxLive ? "Feed Active" : isUpstoxExpired ? "Token Expired" : "OAuth Ready"}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => openBrokerAuthPopup("upstox")}
                className={clsx(
                  "text-[10px] px-2 py-1 rounded-lg border flex items-center gap-1 transition font-mono cursor-pointer active:scale-95",
                  isUpstoxLive
                    ? "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/20"
                    : isUpstoxExpired
                      ? "bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border-rose-500/30 font-bold animate-pulse"
                      : "bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border-purple-500/20"
                )}
                title={isUpstoxLive ? "Upstox Feed Active — Click to Re-authenticate (Separate Tab)" : isUpstoxExpired ? "Upstox Session Expired (Daily Reset) — Click to Re-authenticate in 1-Click (Separate Tab)" : "Connect Upstox Demat (Separate Tab)"}
              >
                <span>{isUpstoxLive ? "Active" : isUpstoxExpired ? "Reconnect" : "Login"}</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </button>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
