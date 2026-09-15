import React from "react";
import { Zap, ShieldCheck } from "lucide-react";

export function ExecutionButtonBar({
  isExecuting,
  isDisabled,
  disabledReason,
  onExecute,
  strike,
  optionType
}) {
  return (
    <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
      {/* Unified HFT Gateway Telemetry Pill */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-indigo-500/20 bg-indigo-950/20 backdrop-blur-md text-xs w-full sm:w-auto">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
        <span className="font-semibold text-zinc-200">Unified HFT Gateway</span>
        <span className="text-[10px] font-mono text-indigo-300 bg-indigo-500/20 px-1.5 py-0.5 rounded">.NET 8 RMS</span>
      </div>

      {/* Main Deploy Order Button */}
      <button
        type="button"
        disabled={isDisabled || isExecuting}
        onClick={onExecute}
        className={`w-full sm:flex-1 py-3 px-4 rounded-xl font-bold text-sm tracking-wide transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
          isDisabled
            ? "bg-zinc-800 text-zinc-500 cursor-not-allowed border border-white/5"
            : optionType === "CALL"
              ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:scale-[1.01]"
              : "bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.3)] hover:scale-[1.01]"
        }`}
      >
        {isExecuting ? (
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
            Deploying via Unified Gateway...
          </span>
        ) : isDisabled ? (
          <span>{disabledReason || "Execution Locked"}</span>
        ) : (
          <>
            <Zap className="w-4 h-4 fill-current" />
            <span>
              BUY {strike} {optionType} · FAST ROUTE
            </span>
          </>
        )}
      </button>
    </div>
  );
}
