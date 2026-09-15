import React from 'react';
import { Radio, Clock } from 'lucide-react';
import { LiveFeedClock } from './LiveFeedClock';

export function LiveAlertsHeroBanner() {
  return (
    <div className="p-6 sm:p-7 rounded-3xl bg-app-card/75 backdrop-blur-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.4)] relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-5">
      {/* Ambient Lighting */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/[0.04] rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/[0.03] rounded-full blur-3xl pointer-events-none -ml-16 -mb-16" />

      <div className="relative space-y-1.5">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/20 shadow-sm whitespace-nowrap">
            PRACTICE TERMINAL
          </span>
          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 shadow-sm flex items-center gap-1.5 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            Zero-Risk Simulation Active
          </span>
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
          Live Practice Terminal &amp; Options Desk
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1 leading-relaxed max-w-2xl">
          Practice real-time NIFTY &amp; BANKNIFTY option setups with simulated cash. Zero financial risk, verified Upstox live market ticks.
        </p>
      </div>

      <div className="relative flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl text-xs font-mono text-slate-300 self-start md:self-auto shadow-sm flex-shrink-0">
        <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
        <span className="font-extrabold text-cyan-400 tracking-wide">UPSTOX LIVE FEED</span>
        <span className="text-white/20">|</span>
        <Clock className="w-3.5 h-3.5 text-slate-400" />
        <LiveFeedClock />
      </div>
    </div>
  );
}
