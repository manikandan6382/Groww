import React from "react";
import { Lock, Unlock, Clock, AlertTriangle } from "lucide-react";

export function PsychologicalVaultBanner({
  isVaultRunning,
  isVaultReadyToClaim,
  vaultFormattedTime,
  onClaim,
  onCancel
}) {
  if (!isVaultRunning && !isVaultReadyToClaim) return null;

  return (
    <div className="mb-4 p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 backdrop-blur-md flex items-center justify-between gap-3 text-xs text-amber-200">
      <div className="flex items-center gap-2">
        {isVaultRunning ? (
          <Lock className="w-4 h-4 text-amber-400 animate-pulse" />
        ) : (
          <Unlock className="w-4 h-4 text-emerald-400" />
        )}
        <span>
          {isVaultRunning ? (
            <>
              <strong>Psychological Cooling Vault Active:</strong> Paused for{" "}
              <span className="font-mono font-bold text-amber-300">{vaultFormattedTime}</span>
            </>
          ) : (
            <span className="text-emerald-300 font-semibold">
              Cooling period complete. Ready to resume trading.
            </span>
          )}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {isVaultReadyToClaim ? (
          <button
            onClick={onClaim}
            className="px-3 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-semibold transition"
          >
            Claim Unlock
          </button>
        ) : (
          <button
            onClick={onCancel}
            className="px-2 py-1 text-zinc-400 hover:text-zinc-200 transition text-[11px]"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
