import React from "react";
import { Zap, SlidersHorizontal, FlaskConical, ShieldCheck } from "lucide-react";
import clsx from "clsx";
import { useTradingStore } from "../../../../stores/useTradingStore";
import { soundEngine } from "../../../../utils/soundEngine";

export function OrderPadHeader({ copilotRegime, onSetCopilotRegime }) {
  const testingMode = useTradingStore((s) => s.testingMode);
  const testingRestrictionMode = useTradingStore((s) => s.testingRestrictionMode);
  const toggleTestingMode = useTradingStore((s) => s.toggleTestingMode);

  const handleToggleTesting = () => {
    soundEngine?.playTabSwitchTone?.();
    toggleTestingMode();
  };

  return (
    <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/20 shadow-sm whitespace-nowrap">
          ⚡ OPTIONS ORDER DESK
        </span>
        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 shadow-sm flex items-center gap-1.5 whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          Live Upstox Market Ticks
        </span>

        {/* 🧪 High-Visibility Testing Mode Toggle Pill */}
        <button
          type="button"
          onClick={handleToggleTesting}
          className={clsx(
            "px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-sm border",
            testingMode
              ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-[0_0_12px_rgba(6,182,212,0.3)] animate-pulse"
              : "bg-white/5 hover:bg-white/10 text-slate-400 border-white/10"
          )}
          title={
            testingMode
              ? (testingRestrictionMode === "UNRESTRICTED"
                  ? "Testing Mode (Unrestricted Sandbox): Zero restrictions! Free to deploy any SL/TP/Lots."
                  : "Testing Mode (Like Real): Strict ₹300 ceiling and 2:1 R:R enforced for practice.")
              : "Click to enable Testing Mode for sandbox practice."
          }
        >
          {testingMode ? (
            <>
              <FlaskConical className={clsx("w-3 h-3", testingRestrictionMode === "UNRESTRICTED" ? "text-purple-400" : "text-cyan-400")} />
              <span>{testingRestrictionMode === "UNRESTRICTED" ? "🧪 SANDBOX (UNRESTRICTED)" : "🛡️ PRACTICE (LIKE REAL)"}</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>🛡️ LIVE DISCIPLINE (₹250/₹300 CAP)</span>
            </>
          )}
        </button>
      </div>

      {/* Dynamic Copilot Regime Simulator Pills */}
      <div className="flex items-center gap-1.5 text-xs flex-wrap">
        <span className="text-slate-400 text-[10px] font-medium mr-1 flex items-center gap-1 shrink-0">
          <SlidersHorizontal className="w-3 h-3 text-cyan-400" />
          <span>Copilot Gate:</span>
        </span>
        <button
          type="button"
          onClick={() => onSetCopilotRegime("AUTO")}
          className={clsx(
            "px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono transition flex items-center gap-1.5 shrink-0 whitespace-nowrap",
            copilotRegime === "AUTO"
              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
              : "bg-white/5 text-slate-400 hover:text-white border border-white/5"
          )}
        >
          <Zap className="w-2.5 h-2.5 text-cyan-400" />
          <span>Auto IST</span>
        </button>
        <button
          type="button"
          onClick={() => onSetCopilotRegime("PRIME")}
          className={clsx(
            "px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono transition flex items-center gap-1.5 shrink-0 whitespace-nowrap",
            copilotRegime === "PRIME"
              ? "bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 shadow-sm"
              : "bg-white/5 text-slate-400 hover:text-emerald-300 border border-white/5"
          )}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
          <span>Prime</span>
        </button>
        <button
          type="button"
          onClick={() => onSetCopilotRegime("WARNING")}
          className={clsx(
            "px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono transition flex items-center gap-1.5 shrink-0 whitespace-nowrap",
            copilotRegime === "WARNING"
              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
              : "bg-white/5 text-slate-400 hover:text-amber-300 border border-white/5"
          )}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.6)]" />
          <span>Caution</span>
        </button>
        <button
          type="button"
          onClick={() => onSetCopilotRegime("BLOCKED")}
          className={clsx(
            "px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono transition flex items-center gap-1.5 shrink-0 whitespace-nowrap",
            copilotRegime === "BLOCKED"
              ? "bg-rose-500/25 text-rose-300 border border-rose-500/40 shadow-sm"
              : "bg-white/5 text-slate-400 hover:text-rose-300 border border-white/5"
          )}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shadow-[0_0_6px_rgba(251,113,133,0.6)]" />
          <span>Blocked</span>
        </button>
      </div>
    </div>
  );
}
