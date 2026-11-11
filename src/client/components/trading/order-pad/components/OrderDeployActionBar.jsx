import React from "react";
import { AlertTriangle, RefreshCw, Clock, Lock, Zap, ShieldX } from "lucide-react";
import clsx from "clsx";
import { RollingTicker } from "../../../common/RollingTicker";
import { useTradingStore } from "../../../../stores/useTradingStore";

export function OrderDeployActionBar({
  capitalOutlay,
  riskAmount,
  rewardAmount,
  rrRatio,
  isDailyCapReached,
  isValidSL,
  isValidTarget,
  isDeploying,
  isVaultRunning,
  vaultFormattedTime,
  copilotState,
  entryPrice,
  frictionMetrics,
  canonicalPlan,
  testingMode: propTestingMode,
  onDeploy
}) {
  const tiltLockoutUntil = useTradingStore((s) => s.tiltLockoutUntil || 0);
  const brokerStatus = useTradingStore((s) => s.brokerStatus);
  const storeTestingMode = useTradingStore((s) => s.testingMode);
  const testingRestrictionMode = useTradingStore((s) => s.testingRestrictionMode);
  const isMarketHoliday = Boolean(brokerStatus?.marketHoliday);
  const holidayName = brokerStatus?.holidayName || "Market Holiday";
  const [secondsRemaining, setSecondsRemaining] = React.useState(0);

  React.useEffect(() => {
    if (!tiltLockoutUntil) {
      setSecondsRemaining(0);
      return;
    }

    const update = () => {
      const remaining = Math.max(0, Math.ceil((tiltLockoutUntil - Date.now()) / 1000));
      setSecondsRemaining(remaining);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [tiltLockoutUntil]);

  const testingMode = Boolean(propTestingMode ?? storeTestingMode);
  const isUnrestricted = Boolean(testingMode && testingRestrictionMode === "UNRESTRICTED");
  const isUpstoxLive = Boolean(brokerStatus?.upstoxConnected && !brokerStatus?.upstoxExpired);
  const estimatedFriction = Number(frictionMetrics?.estimatedFriction || 55.20);
  const plannedNetRisk = canonicalPlan ? canonicalPlan.modelledNetRisk : (riskAmount > 0 ? Number((riskAmount + estimatedFriction).toFixed(2)) : 0);
  const isRiskExceeded = canonicalPlan ? !canonicalPlan.isRiskCeilingSatisfied : (riskAmount > 300.50 || plannedNetRisk > 300.00);

  return (
    <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
      {/* Cockpit Execution Environment Strip */}
      <div className="flex items-center justify-between px-1 pb-1 border-b border-white/5 text-[11px]">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-medium">Execution Gateway:</span>
          {isUpstoxLive ? (
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-300">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              LIVE BROKER MARGIN (UPSTOX API)
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              PAPER LAB SIMULATION • VIRTUAL MARGIN
            </span>
          )}
        </div>
        <span className="font-mono text-[10px] text-slate-500 hidden sm:inline-block">
          .NET 8 RMS • LATENCY &lt;1ms
        </span>
      </div>

      {/* Institutional Pre-Trade Telemetry Safeguard */}
      <div className="flex items-center justify-between px-1 text-[11px]">
        <span className="text-slate-400 font-medium">Pre-Trade Risk Engine:</span>
        {testingMode ? (
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold bg-cyan-500/15 border border-cyan-500/40 text-cyan-300">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            TESTING MODE UNRESTRICTED • ₹{plannedNetRisk > 0 ? plannedNetRisk.toFixed(0) : "250"} Net (SL/TP Unlocked)
          </span>
        ) : isRiskExceeded ? (
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold bg-rose-500/15 border border-rose-500/40 text-rose-300 animate-pulse">
            <ShieldX className="w-3 h-3 text-rose-400" />
            RISK CEILING BREACH: ₹{plannedNetRisk.toFixed(0)} Net (&gt; ₹300 Max Cap)
          </span>
        ) : !canonicalPlan?.isRewardToRiskSatisfied ? (
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold bg-amber-500/15 border border-amber-500/40 text-amber-300">
            <ShieldX className="w-3 h-3 text-amber-400" />
            R:R DEFICIT: 1:{canonicalPlan?.netRewardToRiskRatio.toFixed(2)} Net (&lt; 2:1 Min)
          </span>
        ) : (
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            RMS INVARIANT PASS • ₹{plannedNetRisk > 0 ? plannedNetRisk.toFixed(0) : "250"} Net (Target ₹250 / Cap ₹300)
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div>
          <span className="text-slate-400 text-[10px] block">
            {testingMode ? "Capital Outlay" : "Capital Outlay (₹10k Budget)"}
          </span>
          <div className={clsx("font-mono tabular-nums font-bold text-sm flex items-baseline gap-1", !testingMode && capitalOutlay > 10000 ? "text-amber-400" : "text-white")}>
            <RollingTicker value={capitalOutlay} prefix="₹" decimalPlaces={2} />
            {!testingMode && (
              <span className={clsx("text-[9px] px-1 py-0.5 rounded font-mono tabular-nums font-bold", capitalOutlay > 10000 ? "bg-amber-500/20 text-amber-300 border border-amber-500/40" : "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30")}>
                {((capitalOutlay / 10000) * 100).toFixed(0)}%
              </span>
            )}
          </div>
        </div>

        <div>
          <span className="text-slate-400 text-[10px] block">Planned Net Risk</span>
          <div className={clsx("font-mono tabular-nums font-bold text-sm flex items-center gap-1", isRiskExceeded ? "text-rose-400 animate-pulse" : "text-rose-400")}>
            <RollingTicker value={plannedNetRisk > 0 ? plannedNetRisk : riskAmount} prefix="₹" decimalPlaces={2} className="text-rose-400" />
            <span className="text-[9px] px-1 py-0.2 rounded bg-white/10 text-slate-300 font-mono" title={`Base SL: ₹${canonicalPlan ? canonicalPlan.grossRiskRupees.toFixed(0) : riskAmount.toFixed(0)} + Slippage & Taxes: ~₹${canonicalPlan ? (canonicalPlan.modelledNetRisk - canonicalPlan.grossRiskRupees).toFixed(0) : estimatedFriction.toFixed(0)}`}>
              Net
            </span>
            {isRiskExceeded && <span className="text-[9px] px-1 rounded bg-rose-500/20 border border-rose-500/40 text-rose-300 font-bold">&gt;₹300 Net</span>}
          </div>
        </div>

        <div>
          <span className="text-slate-400 text-[10px] block">Target Profit</span>
          <div className="text-emerald-400 font-mono tabular-nums font-bold text-sm">
            <RollingTicker value={rewardAmount} prefix="+₹" decimalPlaces={2} className="text-emerald-400" />
          </div>
        </div>

        <div>
          <span className="text-slate-400 text-[10px] block">Risk : Reward</span>
          <strong className="text-cyan-400 font-mono tabular-nums text-sm">1 : {rrRatio}</strong>
        </div>
      </div>

      {/* Institutional Friction Drag & True Break-Even Insight */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-[11px] text-slate-400 font-mono tabular-nums">
        <span className="flex items-center gap-1.5">
          <span className="text-slate-400">Brokerage + STT:</span>
          <strong className="text-slate-200">~₹55.20</strong>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-slate-400">Net Take-Home Target:</span>
          <strong className="text-emerald-400 font-bold">
            +₹{Math.max(0, rewardAmount - 55.2).toFixed(0)} ({riskAmount > 0 ? `1:${((rewardAmount - 55.2) / Math.max(1, riskAmount + 55.2)).toFixed(2)} Net` : "1:2.0"})
          </strong>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-slate-400">Friction Hurdle:</span>
          <strong className="text-amber-300">+{Number(entryPrice) > 0 ? (55.2 / Math.max(1, capitalOutlay / Math.max(0.1, Number(entryPrice)))).toFixed(1) : "0.9"} pts to green</strong>
        </span>
      </div>

      {!testingMode && capitalOutlay > 10000 && (
        <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            <strong>₹10k Budget Guard:</strong> Capital outlay (₹{capitalOutlay.toFixed(0)}) exceeds your ₹10,000 target budget. Dan Passarelli rules recommend 1 Lot for ₹10k bankroll.
          </span>
        </div>
      )}

      <button
        type="button"
        data-testid="order-deploy-btn"
        onClick={(e) => { e.preventDefault(); onDeploy?.(); }}
        disabled={isDeploying || (!isUnrestricted && isMarketHoliday) || (!isUnrestricted && isDailyCapReached) || !canonicalPlan?.isCompliant || (!isValidSL || !isValidTarget) || (secondsRemaining > 0 && !isUnrestricted)}
        className={clsx(
          "w-full py-3.5 rounded-xl font-black text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-lg",
          (isMarketHoliday && !isUnrestricted)
            ? "bg-amber-950/70 text-amber-300 border border-amber-500/50 cursor-not-allowed opacity-90 shadow-[0_0_25px_rgba(245,158,11,0.2)]"
            : (secondsRemaining > 0 && !isUnrestricted)
            ? "bg-rose-950/60 text-rose-300/80 border border-rose-500/40 cursor-not-allowed opacity-90 shadow-[0_0_20px_rgba(244,63,94,0.15)]"
            : (!isValidSL || !isValidTarget)
            ? "bg-rose-950/70 text-rose-300 border border-rose-500/50 cursor-not-allowed opacity-90 shadow-[0_0_25px_rgba(244,63,94,0.25)]"
            : (!canonicalPlan?.isCompliant && !isUnrestricted)
            ? "bg-rose-950/70 text-rose-300 border border-rose-500/50 cursor-not-allowed opacity-90 shadow-[0_0_25px_rgba(244,63,94,0.25)]"
            : (isDailyCapReached && !isUnrestricted)
            ? "bg-amber-950/60 text-amber-300/80 border border-amber-500/30 cursor-not-allowed opacity-80"
            : copilotState.ctaClass,
          isDeploying && "opacity-75 cursor-wait"
        )}
      >
        {(isMarketHoliday && !isUnrestricted) ? (
          <>
            <ShieldX className="w-4 h-4 text-amber-400" />
            <span>Market Closed: {holidayName} (Trading Disabled)</span>
          </>
        ) : (secondsRemaining > 0 && !isUnrestricted) ? (
          <>
            <ShieldX className="w-4 h-4 text-rose-400 animate-pulse" />
            <span>Anti-Tilt Shield Active ({secondsRemaining}s) — Take a Breather</span>
          </>
        ) : (!isValidSL || !isValidTarget) ? (
          <>
            <ShieldX className="w-4 h-4 text-rose-400" />
            <span>Invalid Order: {!isValidSL ? "Stop Loss must be BELOW entry" : "Target must be ABOVE entry"}</span>
          </>
        ) : (!canonicalPlan?.isRiskCeilingSatisfied && !isUnrestricted) ? (
          <>
            <ShieldX className="w-4 h-4 text-rose-400" />
            <span>Capital Risk Breached: ₹{canonicalPlan?.modelledNetRisk.toFixed(0)} Net (&gt; ₹300 Cap)</span>
          </>
        ) : (!canonicalPlan?.isRewardToRiskSatisfied && !isUnrestricted) ? (
          <>
            <ShieldX className="w-4 h-4 text-rose-400" />
            <span>Reward-to-Risk Rejected: 1:{canonicalPlan?.netRewardToRiskRatio.toFixed(2)} Net (&lt; 2:1 Min)</span>
          </>
        ) : (!canonicalPlan?.isStopLossValid || !canonicalPlan?.isTargetValid) ? (
          <>
            <ShieldX className="w-4 h-4 text-rose-400" />
            <span>Invalid Order Parameters (Stop Loss or Target Inverted)</span>
          </>
        ) : isDeploying ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin text-black" />
            <span>Arming Order...</span>
          </>
        ) : isVaultRunning && !testingMode ? (
          <>
            <Clock className="w-4 h-4 text-cyan-300 animate-spin" />
            <span>Cooling Vault Active ({vaultFormattedTime}) — Take a Breather</span>
          </>
        ) : (isDailyCapReached && !isUnrestricted) ? (
          <>
            <Lock className="w-4 h-4 text-amber-400" />
            <span>Daily 3-Trade Quota Locked (Start 15m Vault to Unlock)</span>
          </>
        ) : (
          <>
            <Zap className="w-4 h-4 fill-current" />
            <span>{copilotState.ctaText}</span>
            <kbd className="hidden sm:inline-block ml-2 px-1.5 py-0.5 rounded bg-black/25 text-[10px] font-mono border border-black/20 font-extrabold tracking-widest">
              ⌘↵
            </kbd>
          </>
        )}
      </button>
    </div>
  );
}
