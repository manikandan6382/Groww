import React from "react";
import clsx from "clsx";
import { 
  Compass, 
  CheckCircle2, 
  ShieldAlert, 
  Activity, 
  Clock, 
  ChevronUp, 
  ChevronDown 
} from "lucide-react";
import { formatTimeShort } from "../../../utils/tradeNormalizer";
import { LifecycleTelemetryHud } from "./LifecycleTelemetryHud";

export function LifecycleHeader({
  closeReason,
  source,
  underlying,
  showBenchmark,
  setShowBenchmark,
  scrubTelemetry,
  netZeroPrice,
  entryPrice,
  targetPrice,
  stopLoss,
  entryTime,
  exitTime,
  isExpanded,
  setIsExpanded
}) {
  const isTargetHit = (closeReason || "").includes("TARGET");
  const isStopHit = (closeReason || "").includes("STOP");

  return (
    <div className="px-3.5 sm:px-5 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-white/5">
      <div className="flex items-center gap-2 flex-wrap min-w-0">
        <div className="w-6 h-6 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
          <Compass className="w-3.5 h-3.5" />
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[9.5px] font-black uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
              TRADE LIFECYCLE TRAJECTORY
            </span>

            <span className={clsx(
              "text-[9.5px] font-mono font-bold px-2 py-0.5 rounded-full border shadow-sm flex items-center gap-1",
              isTargetHit ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300" :
              isStopHit ? "bg-rose-500/15 border-rose-500/30 text-rose-300" :
              "bg-amber-500/15 border-amber-500/30 text-amber-300"
            )}>
              {isTargetHit ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <ShieldAlert className="w-3 h-3" />}
              <span>{(closeReason || "").replace(/_/g, " ")}</span>
            </span>

            <span className={clsx(
              "px-2 py-0.5 rounded-full border text-[9px] uppercase font-mono font-bold",
              source === "upstox" || source === "upstox-micro"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" 
                : "bg-cyan-500/10 border-cyan-500/20 text-cyan-300"
            )}>
              {source === "upstox" ? "● Upstox 1m Ticks" : source === "upstox-micro" ? "● Upstox Sub-Minute" : "● Precision Path"}
            </span>

            {/* Underlying Benchmark Correlation Toggle */}
            {underlying && (
              <button
                type="button"
                onClick={() => setShowBenchmark(!showBenchmark)}
                className={clsx(
                  "px-2 py-0.5 rounded-full border text-[9px] uppercase font-mono font-bold flex items-center gap-1 transition cursor-pointer",
                  showBenchmark 
                    ? "bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.2)]" 
                    : "bg-white/5 border-white/10 text-slate-400 hover:text-slate-200"
                )}
                title="Toggle Underlying Benchmark Hairline to reveal IV crush or delta divergence"
              >
                <Activity className="w-2.5 h-2.5 text-amber-400" />
                <span>{underlying.name}: {underlying.changePts >= 0 ? "+" : ""}{underlying.changePts} ({underlying.changePct >= 0 ? "+" : ""}{underlying.changePct}%)</span>
                <span className="text-[8px] opacity-70">[{showBenchmark ? "HIDE" : "SHOW"}]</span>
              </button>
            )}
          </div>

          <LifecycleTelemetryHud
            scrubTelemetry={scrubTelemetry}
            netZeroPrice={netZeroPrice}
            entryPrice={entryPrice}
            targetPrice={targetPrice}
            stopLoss={stopLoss}
          />
        </div>
      </div>

      {/* Right Status Tags */}
      <div className="flex items-center gap-2 font-mono text-[10.5px] self-start sm:self-auto shrink-0">
        <span className="px-2.5 py-1 rounded-xl bg-white/[0.03] border border-white/10 text-slate-300 flex items-center gap-1.5 shadow-sm">
          <Clock className="w-3 h-3 text-cyan-400" />
          <span>{formatTimeShort(entryTime)} ➔ {formatTimeShort(exitTime)}</span>
        </span>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-[10.5px] transition cursor-pointer flex items-center gap-1"
          title={isExpanded ? "Collapse View" : "Expand View"}
        >
          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          <span className="hidden sm:inline">{isExpanded ? "Collapse" : "Expand"}</span>
        </button>
      </div>
    </div>
  );
}
