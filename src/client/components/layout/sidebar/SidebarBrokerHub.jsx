import React from "react";
import clsx from "clsx";
import { ExternalLink, Loader2 } from "lucide-react";
import { openBrokerAuthPopup } from "../../../utils/brokerPopupAuth";
import { useTradingStore } from "../../../stores/useTradingStore";

export function SidebarBrokerHub({ brokerStatus }) {
  const authenticatingBroker = useTradingStore((s) => s.authenticatingBroker);

  const isKiteLive = Boolean(brokerStatus?.kiteConnected && !brokerStatus?.kiteExpired);
  const isUpstoxLive = Boolean(brokerStatus?.upstoxConnected && !brokerStatus?.upstoxExpired);
  const isKiteExpired = Boolean(brokerStatus?.kiteExpired);
  const isUpstoxExpired = Boolean(brokerStatus?.upstoxExpired);
  const isAllLive = isKiteLive && isUpstoxLive;
  const isAnyLive = isKiteLive || isUpstoxLive;
  const isAnyExpired = isKiteExpired || isUpstoxExpired;

  return (
    <div className="p-2.5 rounded-2xl bg-[var(--card)] border border-[var(--line)] space-y-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
      <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={clsx(
            "w-1.5 h-1.5 rounded-full shrink-0",
            isAllLive ? "bg-emerald-400 animate-ping" :
            isAnyLive ? "bg-amber-400 animate-pulse" :
            isAnyExpired ? "bg-amber-400 animate-pulse" :
            "bg-slate-500"
          )} />
          <span className="truncate whitespace-nowrap font-mono text-[10.5px]">Live Broker Hub</span>
        </div>
        <span className={clsx(
          "text-[8px] font-mono uppercase shrink-0 whitespace-nowrap px-1.5 py-0.2 rounded border transition-colors",
          isAllLive ? "text-emerald-300 bg-emerald-500/10 border-emerald-500/20" :
          isAnyLive && isAnyExpired ? "text-amber-300 bg-amber-500/10 border-amber-500/20 font-bold" :
          isAnyExpired ? "text-amber-300 bg-amber-500/10 border-amber-500/20 font-bold" :
          "text-slate-400 bg-white/5 border-white/5"
        )}>
          {isAllLive ? "2/2 Live" : isAnyLive ? "1/2 Live" : isAnyExpired ? "Renew Needed" : "OAuth Sync"}
        </span>
      </div>

      <div className="space-y-1.5">
        {/* Zerodha Kite */}
        {(() => {
          const isConnecting = authenticatingBroker === "kite";
          return (
            <div className="px-2.5 py-2 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-2 min-w-0">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="w-5 h-5 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center font-black text-[10px] shrink-0">
                  K
                </span>
                <div className="flex flex-col min-w-0 flex-1 leading-tight">
                  <span className="text-xs font-semibold text-slate-200 truncate whitespace-nowrap">Zerodha Kite</span>
                  <span className={clsx(
                    "text-[9px] font-medium flex items-center gap-1 whitespace-nowrap truncate",
                    isConnecting ? "text-sky-400 font-bold" :
                    isKiteLive ? "text-emerald-400" : isKiteExpired ? "text-amber-400 font-bold" : "text-orange-400"
                  )}>
                    <span className={clsx(
                      "w-1.5 h-1.5 rounded-full shrink-0",
                      isConnecting ? "bg-sky-400 animate-ping" :
                      isKiteLive ? "bg-emerald-400 animate-pulse" : isKiteExpired ? "bg-amber-400 animate-ping" : "bg-orange-400"
                    )} />
                    <span className="truncate whitespace-nowrap">
                      {isConnecting ? "Authorizing..." : isKiteLive ? (brokerStatus?.kiteUserName ? brokerStatus.kiteUserName.split(" ")[0] : "Active") : isKiteExpired ? "Session Expired" : "OAuth Ready"}
                    </span>
                  </span>
                </div>
              </div>
              <button
                type="button"
                disabled={isConnecting}
                onClick={() => openBrokerAuthPopup("kite")}
                className={clsx(
                  "text-[9.5px] px-2 py-1 rounded-lg border flex items-center gap-1 transition font-mono whitespace-nowrap shrink-0",
                  isConnecting
                    ? "bg-sky-500/15 text-sky-300 border-sky-500/30 cursor-wait animate-pulse"
                    : isKiteLive
                      ? "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/20 cursor-pointer active:scale-95"
                      : isKiteExpired
                        ? "bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/30 font-bold animate-pulse cursor-pointer active:scale-95"
                        : "bg-orange-500/10 hover:bg-orange-500/20 text-orange-300 border-orange-500/20 cursor-pointer active:scale-95"
                )}
                title={isConnecting ? "Authorization in progress in popup window..." : isKiteLive ? "Zerodha Session Active — Click to Re-authenticate (Separate Tab)" : isKiteExpired ? "Zerodha Session Expired (Daily 06:00 AM SEBI Reset) — Click to Reconnect in 1-Click (Separate Tab)" : "Connect Zerodha Demat (Separate Tab)"}
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-2.5 h-2.5 animate-spin shrink-0" />
                    <span className="whitespace-nowrap">Connecting...</span>
                  </>
                ) : (
                  <>
                    <span className="whitespace-nowrap">{isKiteLive ? "Active" : isKiteExpired ? "Reconnect" : "Login"}</span>
                    <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                  </>
                )}
              </button>
            </div>
          );
        })()}

        {/* Upstox Pro */}
        {(() => {
          const isConnecting = authenticatingBroker === "upstox";
          return (
            <div className="px-2.5 py-2 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-2 min-w-0">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="w-5 h-5 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center font-black text-[10px] shrink-0">
                  U
                </span>
                <div className="flex flex-col min-w-0 flex-1 leading-tight">
                  <span className="text-xs font-semibold text-slate-200 truncate whitespace-nowrap">Upstox Pro</span>
                  <span className={clsx(
                    "text-[9px] font-medium flex items-center gap-1 whitespace-nowrap truncate",
                    isConnecting ? "text-sky-400 font-bold" :
                    isUpstoxLive ? "text-emerald-400" : isUpstoxExpired ? "text-rose-400 font-bold" : "text-amber-400"
                  )}>
                    <span className={clsx(
                      "w-1.5 h-1.5 rounded-full shrink-0",
                      isConnecting ? "bg-sky-400 animate-ping" :
                      isUpstoxLive ? "bg-emerald-400 animate-pulse" : isUpstoxExpired ? "bg-rose-400 animate-ping" : "bg-amber-400"
                    )} />
                    <span className="truncate whitespace-nowrap">
                      {isConnecting ? "Authorizing..." : isUpstoxLive ? "Feed Active" : isUpstoxExpired ? "Token Expired" : "OAuth Ready"}
                    </span>
                  </span>
                </div>
              </div>
              <button
                type="button"
                disabled={isConnecting}
                onClick={() => openBrokerAuthPopup("upstox")}
                className={clsx(
                  "text-[9.5px] px-2 py-1 rounded-lg border flex items-center gap-1 transition font-mono whitespace-nowrap shrink-0",
                  isConnecting
                    ? "bg-sky-500/15 text-sky-300 border-sky-500/30 cursor-wait animate-pulse"
                    : isUpstoxLive
                      ? "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/20 cursor-pointer active:scale-95"
                      : isUpstoxExpired
                        ? "bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border-rose-500/30 font-bold animate-pulse cursor-pointer active:scale-95"
                        : "bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border-purple-500/20 cursor-pointer active:scale-95"
                )}
                title={isConnecting ? "Authorization in progress in popup window..." : isUpstoxLive ? "Upstox Feed Active — Click to Re-authenticate (Separate Tab)" : isUpstoxExpired ? "Upstox Session Expired (Daily Reset) — Click to Re-authenticate in 1-Click (Separate Tab)" : "Connect Upstox Demat (Separate Tab)"}
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-2.5 h-2.5 animate-spin shrink-0" />
                    <span className="whitespace-nowrap">Connecting...</span>
                  </>
                ) : (
                  <>
                    <span className="whitespace-nowrap">{isUpstoxLive ? "Active" : isUpstoxExpired ? "Reconnect" : "Login"}</span>
                    <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                  </>
                )}
              </button>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
