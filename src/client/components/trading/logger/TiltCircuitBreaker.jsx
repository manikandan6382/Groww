import React from "react";
import { AlertCircle } from "lucide-react";

export function TiltCircuitBreaker({ consecutiveLosses, overrideTiltBreaker, setOverrideTiltBreaker }) {
  if (!consecutiveLosses) return null;

  return (
    <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent border border-amber-500/30 text-xs space-y-2 animate-fadeIn">
      <div className="flex items-center justify-between text-amber-300 font-bold">
        <span className="flex items-center gap-1.5">
          <AlertCircle className="w-4 h-4 text-amber-400" />
          <span>🛡️ Psychological Cooldown Active: 2 Consecutive Stops Hit</span>
        </span>
        <span className="text-[10px] font-mono bg-amber-500/20 px-2 py-0.5 rounded-md border border-amber-500/40">
          Tilt Defense Protocol
        </span>
      </div>
      <p className="text-slate-300 text-[11px] leading-relaxed">
        Taking back-to-back losses elevates cortisol and impulsive revenge-trading risk by 4x. Take a 15-minute breather away from the screen before logging another execution.
      </p>
      <label className="flex items-center gap-2 pt-1 text-[11px] text-amber-200 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={overrideTiltBreaker}
          onChange={(e) => setOverrideTiltBreaker(e.target.checked)}
          className="rounded border-amber-500/40 text-amber-400 focus:ring-0"
        />
        <span>I have completed my trade autopsy and am calm, centered &amp; following my written plan.</span>
      </label>
    </div>
  );
}
