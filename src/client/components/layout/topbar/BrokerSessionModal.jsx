import React from "react";
import clsx from "clsx";
import { Key, X } from "lucide-react";
import { useTradingStore } from "../../../stores/useTradingStore";
import { soundEngine } from "../../../utils/soundEngine";
import { BrokerTokenForm } from "./BrokerTokenForm";
import { openBrokerAuthPopup } from "../../../utils/brokerPopupAuth";

export function BrokerSessionModal({ isOpen, onClose }) {
  const { brokerStatus } = useTradingStore();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-2xl animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md p-5 sm:p-6 rounded-t-3xl sm:rounded-3xl bg-[#121424]/95 border-t sm:border border-cyan-500/30 shadow-[0_20px_50px_rgba(0,0,0,0.7)] space-y-4 relative text-left"
        style={{ paddingBottom: "max(24px, env(safe-area-inset-bottom))" }}
      >
        {/* iOS Drag Grabber on Mobile */}
        <div className="sm:hidden -mt-2 mb-2 flex justify-center cursor-grab active:cursor-grabbing">
          <div className="w-12 h-1.5 rounded-full bg-white/25 shadow-sm" />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shadow-sm">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white">Broker Session Manager</h3>
              <p className="text-[11px] text-slate-400 font-mono">Daily Zero-Stale Multi-Broker Reconnect</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={() => {
              soundEngine.playTabSwitchTone();
              onClose();
            }}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-white/5 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Broker Status Cards */}
        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          <button
            type="button"
            onClick={() => openBrokerAuthPopup("upstox")}
            className="p-3.5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 hover:border-purple-500/30 transition-all space-y-1 block text-left group cursor-pointer active:scale-95 w-full"
            title="Upstox v2 Login — Click to Re-authenticate (Separate Tab)"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-bold group-hover:text-purple-300">UPSTOX v2 FEED</span>
              <span className="text-[9px] text-purple-400 underline">Popup ↗</span>
            </div>
            {(() => {
              const isUpstoxLive = Boolean(brokerStatus?.upstoxConnected && !brokerStatus?.upstoxExpired);
              const isUpstoxExpired = Boolean(brokerStatus?.upstoxExpired);
              return (
                <span className={clsx("font-bold flex items-center gap-1.5 text-xs", isUpstoxLive ? "text-emerald-400" : isUpstoxExpired ? "text-rose-400 font-bold" : "text-amber-400")}>
                  <span className={clsx("w-1.5 h-1.5 rounded-full", isUpstoxLive ? "bg-emerald-400 animate-ping" : isUpstoxExpired ? "bg-rose-400 animate-ping" : "bg-amber-400")} />
                  {isUpstoxLive ? "Live Connected" : isUpstoxExpired ? "Expired / Reconnect" : "OAuth Ready"}
                </span>
              );
            })()}
          </button>
          <button
            type="button"
            onClick={() => openBrokerAuthPopup("kite")}
            className="p-3.5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 hover:border-orange-500/30 transition-all space-y-1 block text-left group cursor-pointer active:scale-95 w-full"
            title="Zerodha Kite Login — Click to Re-authenticate (Separate Tab)"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-bold group-hover:text-orange-300">ZERODHA KITE</span>
              <span className="text-[9px] text-orange-400 underline">Popup ↗</span>
            </div>
            {(() => {
              const isKiteLive = Boolean(brokerStatus?.kiteConnected && !brokerStatus?.kiteExpired);
              const isKiteExpired = Boolean(brokerStatus?.kiteExpired);
              return (
                <span className={clsx(
                  "font-bold flex items-center gap-1.5 text-xs",
                  isKiteLive ? "text-emerald-400" : isKiteExpired ? "text-amber-400 font-bold" : "text-orange-400"
                )}>
                  <span className={clsx(
                    "w-1.5 h-1.5 rounded-full",
                    isKiteLive ? "bg-emerald-400 animate-ping" : isKiteExpired ? "bg-amber-400 animate-ping" : "bg-orange-400"
                  )} />
                  {isKiteLive ? (brokerStatus?.kiteUserName || "Live Connected") : isKiteExpired ? "Expired / Reconnect" : "OAuth Ready"}
                </span>
              );
            })()}
          </button>
        </div>

        {/* Quick Upstox Token Input Form */}
        <BrokerTokenForm onTokenSaved={onClose} />
      </div>
    </div>
  );
}
