import React from "react";
import { Zap, AlertTriangle } from "lucide-react";
import { useTradingStore } from "../../../stores/useTradingStore";

export function TopbarBrand({ onOpenBrokerModal }) {
  const brokerStatus = useTradingStore((s) => s.brokerStatus);
  const isUpstoxLive = Boolean(brokerStatus?.upstoxConnected && !brokerStatus?.upstoxExpired);
  const isHoliday = Boolean(brokerStatus?.marketHoliday);
  const holidayName = brokerStatus?.holidayName || "Market Holiday";
  const isTradingDay = brokerStatus?.isTradingDay !== false;

  return (
    <div className="flex-shrink-0 flex items-center min-w-0">
      <div 
        onClick={onOpenBrokerModal}
        className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] hover:border-cyan-500/30 transition-all duration-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] group cursor-pointer flex-shrink-0"
        title="Open Broker Session Manager"
      >
        <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-cyan-500 via-sky-400 to-indigo-600 p-0.5 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.4)] group-hover:scale-105 transition-transform flex-shrink-0">
          <div className="w-full h-full bg-[var(--bg)] rounded-full flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400/20" />
          </div>
        </div>
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-black uppercase tracking-widest text-white font-mono leading-none whitespace-nowrap">
            PORTFOLIO<span className="text-cyan-400">X</span>
          </span>
          {isHoliday ? (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span className="text-[8px] font-mono font-black text-amber-300 tracking-wider leading-none whitespace-nowrap">
                MARKET CLOSED ({holidayName.toUpperCase()})
              </span>
            </div>
          ) : !isTradingDay ? (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span className="text-[8px] font-mono font-black text-amber-300 tracking-wider leading-none whitespace-nowrap">
                MARKET CLOSED (WEEKEND)
              </span>
            </div>
          ) : isUpstoxLive ? (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-[8px] font-mono font-black text-emerald-400 tracking-wider leading-none whitespace-nowrap">
                UPSTOX LIVE
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 animate-pulse">
              <AlertTriangle className="w-2.5 h-2.5 text-rose-400" />
              <span className="text-[8px] font-mono font-black text-rose-300 tracking-wider leading-none whitespace-nowrap">
                UPSTOX EXPIRED
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
