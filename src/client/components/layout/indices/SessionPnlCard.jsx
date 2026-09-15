import React from "react";
import clsx from "clsx";
import { Wallet } from "lucide-react";
import { RollingTicker } from "../../common/RollingTicker";
import { LuxuryAreaSparkline } from "./LuxuryAreaSparkline";

export function SessionPnlCard({
  isPrivacyMode,
  sessionNetPnl,
  sessionPnlPct,
  isSessionPnlPositive
}) {
  return (
    <div className="p-3.5 rounded-2xl bg-[var(--card)] hover:bg-[var(--card-elevated)] border border-[var(--line)] hover:border-emerald-500/40 transition-all duration-300 backdrop-blur-3xl shadow-[0_12px_36px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.10)] group cursor-default relative overflow-hidden">
      {/* Subtle Ambient Radial Highlight */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/10 transition-colors" />

      <div className="space-y-2 relative z-10">
        {/* Header Tag */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Wallet className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px] font-black text-white font-mono tracking-wider">SESSION NET P&L</span>
          </div>
          <span className="text-[8px] font-mono text-emerald-300 font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            ACTIVE DESK
          </span>
        </div>

        {/* Metric & Trend */}
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className={clsx(
              "text-lg font-black font-mono tabular-nums tracking-tight transition-all",
              isPrivacyMode ? "blur-[5px] select-none text-slate-300" : isSessionPnlPositive ? "text-emerald-400" : "text-rose-400"
            )}>
              <RollingTicker 
                value={Math.abs(sessionNetPnl)} 
                prefix={sessionNetPnl >= 0 ? "+₹" : "-₹"} 
                decimalPlaces={2} 
                className={isSessionPnlPositive ? "text-emerald-400 font-black" : "text-rose-400 font-black"} 
              />
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <span className={clsx(
                "text-[9px] font-mono font-extrabold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shadow-sm",
                isSessionPnlPositive 
                  ? "text-emerald-300 bg-emerald-500/15 border border-emerald-500/30" 
                  : "text-rose-300 bg-rose-500/15 border border-rose-500/30"
              )}>
                {isSessionPnlPositive ? "+" : ""}{sessionPnlPct}% ROI
              </span>
            </div>
          </div>

          {/* Compounding Curve */}
          <LuxuryAreaSparkline 
            data={[100000, 103200, 102800, 106500, 110200, 114850]} 
            isGain={isSessionPnlPositive} 
            width={72} 
            height={26} 
          />
        </div>

        {/* Win Rate Bar */}
        <div className="space-y-1 w-full pt-1">
          <div className="flex items-center justify-between text-[8px] font-mono text-slate-400 font-bold leading-none">
            <span>Win Rate: 78%</span>
            <span className="text-emerald-400 font-bold">4/5 Closed Positive</span>
          </div>
          <div className="relative w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden border border-white/5">
            <div className="absolute top-0 bottom-0 left-0 bg-emerald-400 rounded-full w-[78%]" />
          </div>
        </div>
      </div>
    </div>
  );
}
