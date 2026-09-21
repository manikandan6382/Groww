import React, { useState } from "react";
import clsx from "clsx";
import { Compass, Pin, Check, AlertTriangle, ShieldCheck, Zap, ArrowRight } from "lucide-react";
import { useTradingStore } from "../../../stores/useTradingStore";
import { soundEngine } from "../../../utils/soundEngine";

export function HeadTraderPrescriptionCard({ prescriptions = [] }) {
  const [pinnedId, setPinnedId] = useState(null);
  const setSafetyGuardModalOpen = useTradingStore((s) => s.setSafetyGuardModalOpen);

  const handlePin = (p) => {
    soundEngine?.playSuccessTone?.();
    setPinnedId(p.id);
    setTimeout(() => {
      setPinnedId(null);
      setSafetyGuardModalOpen(true);
    }, 1200);
  };

  return (
    <div className="p-5 sm:p-6 rounded-3xl bg-[#0d111a]/85 backdrop-blur-2xl border border-white/[0.08] shadow-[0_24px_60px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.08)] space-y-4 relative overflow-hidden transition-all duration-300 hover:border-white/[0.14]">
      {/* Ambient Radial Spotlight */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-500/[0.05] rounded-full blur-[80px] pointer-events-none" />

      {/* Card Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/[0.07]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shadow-sm shadow-emerald-500/10">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white tracking-tight flex items-center gap-2">
              <span>Head-Trader Mandates &amp; Directives</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-semibold">
                3 Orders
              </span>
            </h3>
            <p className="text-xs text-slate-400 leading-none pt-0.5">
              Empirically derived trading directives to lock into tomorrow's pre-session circuit breaker.
            </p>
          </div>
        </div>

        <span className="text-[10px] font-mono text-slate-400">
          Syncs with Act 1 Circuit Breaker
        </span>
      </div>

      {/* 3 Algorithmic Directives Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {prescriptions.map((p) => {
          const isPinned = pinnedId === p.id;
          const isDanger = p.badgeColor === "rose";
          const isAmber = p.badgeColor === "amber";
          const isEmerald = p.badgeColor === "emerald";
          const isCyan = p.badgeColor === "cyan";

          return (
            <div
              key={p.id}
              className={clsx(
                "p-4 rounded-2xl border flex flex-col justify-between space-y-3 transition-all duration-200 relative overflow-hidden group",
                isDanger
                  ? "bg-rose-500/[0.04] border-rose-500/25 hover:border-rose-500/40"
                  : isAmber
                  ? "bg-amber-500/[0.04] border-amber-500/25 hover:border-amber-500/40"
                  : isEmerald
                  ? "bg-emerald-500/[0.04] border-emerald-500/25 hover:border-emerald-500/40"
                  : isCyan
                  ? "bg-cyan-500/[0.04] border-cyan-500/25 hover:border-cyan-500/40"
                  : "bg-purple-500/[0.04] border-purple-500/25 hover:border-purple-500/40"
              )}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className={clsx(
                    "text-[9px] font-mono font-bold px-2 py-0.5 rounded-md uppercase tracking-wider",
                    isDanger
                      ? "bg-rose-500/20 text-rose-300"
                      : isAmber
                      ? "bg-amber-500/20 text-amber-300"
                      : isEmerald
                      ? "bg-emerald-500/20 text-emerald-300"
                      : isCyan
                      ? "bg-cyan-500/20 text-cyan-300"
                      : "bg-purple-500/20 text-purple-300"
                  )}>
                    {p.actionPill}
                  </span>

                  <span className="text-slate-500 text-[10px] font-mono">
                    {p.type.replace(/_/g, " ")}
                  </span>
                </div>

                <h4 className="text-xs font-black text-white leading-snug group-hover:text-cyan-300 transition-colors">
                  {p.title}
                </h4>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {p.subtitle}
                </p>
              </div>

              {/* Pin Action Button */}
              <button
                type="button"
                onClick={() => handlePin(p)}
                className={clsx(
                  "w-full py-1.5 px-3 rounded-xl border text-[10px] font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95",
                  isPinned
                    ? "bg-emerald-500 text-black border-emerald-400 shadow-md shadow-emerald-500/20"
                    : "bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 hover:text-white border-white/10 hover:border-white/20"
                )}
              >
                {isPinned ? (
                  <>
                    <Check className="w-3 h-3 stroke-[3]" />
                    <span>Pinned to Pre-Session Guard</span>
                  </>
                ) : (
                  <>
                    <Pin className="w-3 h-3 text-cyan-400" />
                    <span>Pin to Circuit Breaker HUD</span>
                    <ArrowRight className="w-3 h-3 opacity-60 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default HeadTraderPrescriptionCard;
