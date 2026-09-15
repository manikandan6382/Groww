import React from "react";
import { Sparkles, Clock, CheckCircle2, Unlock, ShieldAlert } from "lucide-react";
import { soundEngine } from "../../../../utils/soundEngine";

export function QuotaVaultAlertBar({
  activeQuotaMode,
  todayTradesCount,
  dailyQuotaLimit,
  vaultFormattedTime,
  vaultMsRemaining,
  onToggleTestingMode,
  onSetDailyQuotaBypass,
  onRequestCoolingVaultUnlock,
  onCancelCoolingVault,
  onClaimCoolingVaultUnlock
}) {
  return (
    <>
      {activeQuotaMode === "UNLIMITED_TESTING" && (
        <div className="relative z-10 p-2.5 px-3.5 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-between gap-3 text-xs text-purple-200">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="w-4 h-4 text-purple-300 shrink-0" />
            <span className="truncate">
              <strong>Simulation Sandbox Active:</strong> Daily 3-trade bankroll quota bypassed. Deploy sandbox scalps to evaluate edge without real risk.
            </span>
          </div>
          <button
            type="button"
            onClick={onToggleTestingMode}
            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 text-[10px] font-bold font-mono transition active:scale-95 shrink-0 cursor-pointer"
            title="Switch back to strict 3-trade daily discipline"
          >
            Return to 3/Day Quota
          </button>
        </div>
      )}

      {activeQuotaMode === "SINGLE_BYPASS" && (
        <div className="relative z-10 p-2.5 px-3.5 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-between gap-3 text-xs text-purple-200">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="w-4 h-4 text-purple-300 shrink-0" />
            <span className="truncate">
              <strong>Single-Trade Quota Active:</strong> 1 extra disciplined execution unlocked post-vault. Locks automatically on deployment.
            </span>
          </div>
          <button
            type="button"
            onClick={() => onSetDailyQuotaBypass(false)}
            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-purple-200 border border-purple-400/30 text-[10px] font-bold font-mono transition active:scale-95 shrink-0 cursor-pointer"
          >
            Lock Quota
          </button>
        </div>
      )}

      {activeQuotaMode === "VAULT_RUNNING" && (
        <div className="relative z-10 p-3.5 rounded-xl bg-gradient-to-r from-cyan-950/50 via-[#041d30]/60 to-blue-950/50 border border-cyan-400/40 shadow-[0_0_25px_rgba(6,182,212,0.15)] flex flex-col gap-2.5 text-xs">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 flex-shrink-0">
                <Clock className="w-4 h-4 animate-spin" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <strong className="text-cyan-200 font-bold tracking-wide uppercase text-[11px]">
                    🧠 Psychological Cooling Vault Active
                  </strong>
                  <span className="px-1.5 py-0.5 rounded bg-cyan-500/25 text-cyan-300 font-mono text-[9px]">
                    Anti-Tilt Gate
                  </span>
                </div>
                <span className="text-slate-300 text-[11px] block mt-0.5">
                  Cortisol reset in progress. Step away from screens. Reflect before execution #4.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="px-3 py-1 rounded-lg bg-black/60 border border-cyan-400/50 text-cyan-300 font-mono font-black text-base tabular-nums shadow-inner tracking-wider">
                {vaultFormattedTime}
              </div>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playTabSwitchTone();
                  onCancelCoolingVault();
                }}
                className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 text-[10px] font-bold transition cursor-pointer"
                title="Abort vault and remain disciplined"
              >
                ✕ Abort
              </button>
            </div>
          </div>
          <div className="w-full h-1.5 rounded-full bg-black/50 overflow-hidden border border-white/5">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 via-sky-400 to-indigo-500 transition-all duration-1000"
              style={{ width: `${Math.max(0, Math.min(100, ((15 * 60 * 1000 - vaultMsRemaining) / (15 * 60 * 1000)) * 100))}%` }}
            />
          </div>
        </div>
      )}

      {activeQuotaMode === "VAULT_READY" && (
        <div className="relative z-10 p-3 rounded-xl bg-gradient-to-r from-emerald-950/50 to-teal-950/50 border border-emerald-400/40 shadow-[0_0_25px_rgba(16,185,129,0.15)] flex items-center justify-between gap-3 text-xs flex-wrap">
          <div className="flex items-center gap-2.5 text-emerald-200">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <div>
              <strong className="block text-emerald-300 font-bold">
                15-Min Cooling Vault Complete
              </strong>
              <span className="text-[11px] text-slate-300">
                Cortisol normalized. Confirm this trade strictly satisfies your quantitative edge.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              soundEngine.playSuccessTone();
              onClaimCoolingVaultUnlock();
            }}
            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black font-extrabold text-[11px] shadow-lg shadow-emerald-500/25 transition active:scale-95 flex items-center gap-1.5 flex-shrink-0 cursor-pointer"
          >
            <Unlock className="w-3.5 h-3.5" />
            <span>Unlock Disciplined Trade (+1)</span>
          </button>
        </div>
      )}

      {activeQuotaMode === "CAP_REACHED" && (
        <div className="relative z-10 p-3 sm:p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-purple-500/10 to-amber-500/10 border border-amber-500/40 flex items-center justify-between gap-3 text-xs flex-wrap shadow-lg">
          <div className="flex items-center gap-2.5 text-amber-200 min-w-0">
            <ShieldAlert className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <strong className="text-amber-300 font-bold">
                  Daily 3-Trade Quota Reached ({todayTradesCount}/{dailyQuotaLimit})
                </strong>
                <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[9px] font-bold">
                  Anti-Tilt Protocol
                </span>
              </div>
              <span className="text-[11px] text-slate-300 block mt-0.5">
                Disciplined limit reached. Start a 15-minute cooling vault to reset cortisol before next execution, or switch to the simulation sandbox to test setups risk-free.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => {
                soundEngine.playTabSwitchTone();
                onRequestCoolingVaultUnlock();
              }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-black font-black text-xs shadow-lg shadow-cyan-500/25 transition active:scale-95 flex items-center gap-1.5 flex-shrink-0 cursor-pointer"
              title="Start 15-minute anti-tilt cooling timer to reset cortisol before next trade"
            >
              <Clock className="w-4 h-4" />
              <span>Start 15-Min Cooling Vault</span>
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playSuccessTone();
                onToggleTestingMode();
              }}
              className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/15 text-xs font-semibold transition active:scale-95 flex items-center gap-1.5 flex-shrink-0 cursor-pointer"
              title="Switch to Simulation Sandbox to practice formula setups without real bankroll risk"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Switch to Simulation Sandbox</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
