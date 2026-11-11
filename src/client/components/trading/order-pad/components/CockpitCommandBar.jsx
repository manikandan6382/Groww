import React from "react";
import { Clock, Lock, AlertTriangle, RefreshCw, Sparkles, ShieldCheck, Zap, ShieldX, Shield } from "lucide-react";
import clsx from "clsx";
import { soundEngine } from "../../../../utils/soundEngine";
import { isIndianMarketOpenHours } from "../../../../utils/dateUtils";
import { useTradingStore } from "../../../../stores/useTradingStore";

export function CockpitCommandBar({
  copilotState,
  canonicalPlan,
  optionType,
  underlying,
  strikePrice,
  isLiveStreaming,
  activeQuotaMode,
  todayTradesCount,
  dailyQuotaLimit,
  onToggleTestingMode,
  isScanning,
  onManualScan,
  show12FilterDrawer,
  onToggle12FilterDrawer,
  isDailyCapReached,
  isValidSL,
  isValidTarget,
  isVaultRunning,
  vaultFormattedTime,
  on1ClickAutoDeploy,
  isDeploying,
  lots = 1,
  totalQty = 65,
  tiltSecondsRemaining = 0,
  strategyMode = "OUTRIGHT",
  onToggleSpreadMode,
  testingMode = false
}) {
  const isMarketHours = isIndianMarketOpenHours();
  const brokerStatus = useTradingStore((s) => s.brokerStatus);
  const testingRestrictionMode = useTradingStore((s) => s.testingRestrictionMode);
  const isUnrestricted = Boolean(testingMode && testingRestrictionMode === "UNRESTRICTED");
  const isMarketHoliday = Boolean(brokerStatus?.marketHoliday);
  const holidayName = brokerStatus?.holidayName || "Market Holiday";

  return (
    <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      {/* Left: Contract Intelligence & Live Status */}
      <div className="space-y-2 min-w-0 flex-1">
        {/* Row 1: Pick Pill + Underlying + Strike + Regime Badge + Quota Mode */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={clsx("w-2 h-2 rounded-full shadow-sm shrink-0", copilotState.pulseColor, "animate-pulse")} />

          <span className={clsx(
            "px-2 py-0.5 rounded-md text-[10px] font-black font-mono uppercase tracking-wider border shadow-sm shrink-0",
            optionType === "CALL" ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40" : "bg-rose-500/20 text-rose-300 border-rose-500/40"
          )}>
            {optionType === "CALL" ? "CALL CE" : "PUT PE"}
          </span>

          <strong className="text-white text-sm font-black font-mono tracking-tight whitespace-nowrap">
            {underlying} {strikePrice} {optionType === "CALL" ? "CE" : "PE"}
          </strong>

          {isLiveStreaming && (
            <span className={clsx(
              "text-[9px] font-mono font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm",
              isMarketHours
                ? "text-emerald-300 bg-emerald-500/15 border border-emerald-500/35 shadow-[0_0_8px_rgba(16,185,129,0.2)]"
                : "text-amber-300 bg-amber-500/15 border border-amber-500/35 shadow-[0_0_8px_rgba(245,158,11,0.2)]"
            )}>
              <span className={clsx("w-1.5 h-1.5 rounded-full", isMarketHours ? "bg-emerald-400 animate-ping" : "bg-amber-400")} />
              <span>{isMarketHours ? "LIVE CONNECTED" : "SESSION CLOSED"}</span>
            </span>
          )}

          <span className="text-slate-600 hidden sm:inline">·</span>

          <span className={clsx("text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border shadow-sm whitespace-nowrap shrink-0", copilotState.badgeBg)}>
            {copilotState.badge}
          </span>

          {/* Dynamic Quota Mode Capsule */}
          <button
            type="button"
            onClick={onToggleTestingMode}
            className={clsx(
              "text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border shadow-sm flex items-center gap-1.5 transition cursor-pointer active:scale-95 shrink-0 whitespace-nowrap",
              activeQuotaMode === "UNLIMITED_TESTING" || activeQuotaMode === "SINGLE_BYPASS"
                ? "bg-purple-500/20 text-purple-300 border-purple-500/40 hover:bg-purple-500/30"
                : todayTradesCount === 0
                  ? "bg-slate-800 text-slate-300 border-white/10 hover:border-white/20"
                  : todayTradesCount < dailyQuotaLimit
                    ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:border-emerald-500/50"
                    : "bg-amber-500/20 text-amber-300 border-amber-500/40"
            )}
            title={
              activeQuotaMode === "UNLIMITED_TESTING"
                ? "Testing Mode Active: Unlimited practice trades today. Tap to switch back to Disciplined 3/day mode."
                : `Daily Session Quota: ${todayTradesCount}/${dailyQuotaLimit} trades taken. Tap to unlock Unlimited Testing Mode.`
            }
          >
            <span>{activeQuotaMode === "UNLIMITED_TESTING" ? "🧪 Testing Mode (Unlimited ∞)" : `⚡ Quota: ${todayTradesCount}/${dailyQuotaLimit}`}</span>
            {activeQuotaMode === "CAP_REACHED" && (
              <span className="text-[9px] text-amber-200 uppercase font-extrabold">(Cap Reached)</span>
            )}
          </button>
        </div>

        {/* Row 2: Strategy Title & Telemetry Subtitle */}
        <div className="flex items-center gap-2 text-xs text-slate-300 flex-wrap">
          <span className="font-semibold text-white">{copilotState.title}</span>
          <span className="text-slate-600">·</span>
          <span className="text-slate-400 text-[11px]">{copilotState.subtitle}</span>
        </div>

        {/* Row 3: Quick Action Tools (Refresh & 12-Filter Radar) */}
        <div className="flex items-center gap-2 pt-0.5">
          <button
            type="button"
            onClick={onManualScan}
            disabled={isScanning}
            className={clsx(
              "px-2.5 py-1 rounded-lg border transition flex items-center gap-1.5 text-[10px] font-bold font-mono cursor-pointer active:scale-95 shadow-sm",
              isScanning
                ? "bg-cyan-500/30 text-cyan-200 border-cyan-400/50 cursor-wait"
                : isLiveStreaming
                  ? "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 hover:text-white border-emerald-500/30"
                  : "bg-white/[0.06] hover:bg-white/15 text-cyan-300 hover:text-white border-white/15"
            )}
            title={isLiveStreaming ? "Live tick streaming active. Click to force full 12-Filter Quantitative Gate re-scan." : "Re-scan live Upstox v2 12-Filter Quantitative Gate"}
          >
            <RefreshCw className={clsx("w-3 h-3", isScanning ? "animate-spin text-cyan-300" : isLiveStreaming ? "text-emerald-400" : "text-cyan-400")} />
            <span>{isScanning ? "Scanning Upstox..." : isLiveStreaming ? "Live Connected" : "Live Refresh"}</span>
          </button>

          <button
            type="button"
            onClick={onToggle12FilterDrawer}
            className={clsx(
              "px-2.5 py-1 rounded-lg border transition flex items-center gap-1.5 text-[10px] font-bold font-mono cursor-pointer active:scale-95 shadow-sm",
              show12FilterDrawer
                ? "bg-cyan-500/25 text-cyan-200 border-cyan-400/50 shadow-cyan-500/20"
                : "bg-white/[0.06] hover:bg-white/15 text-slate-300 hover:text-white border-white/15"
            )}
            title="Inspect how the institutional 12-filter quantitative formula evaluated this pick"
          >
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span>{show12FilterDrawer ? "Hide Formula Radar" : "Why this pick? (12-Filter Radar)"}</span>
          </button>

          {/* 1-Tap Friction Trap Mitigator Pill */}
          {copilotState.status === "FRICTION_TRAP" && (
            <button
              type="button"
              onClick={onToggleSpreadMode}
              className={clsx(
                "px-2.5 py-1 rounded-lg border transition flex items-center gap-1.5 text-[10px] font-bold font-mono cursor-pointer active:scale-95 shadow-sm",
                strategyMode === "SPREAD"
                  ? "bg-emerald-500/20 text-emerald-200 border-emerald-500/40 shadow-emerald-500/20"
                  : "bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border-amber-500/40 animate-pulse"
              )}
              title={strategyMode === "SPREAD" ? "Spread active: Theta drag eliminated" : "1-Tap Friction Remedy: Convert to hedged debit spread to eliminate theta & statutory friction drag"}
            >
              <Shield className="w-3 h-3 text-amber-400" />
              <span>{strategyMode === "SPREAD" ? "🛡️ Spread Active (Theta Protected)" : "⚡ 1-Tap Hedge: Convert to Spread"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Right: Anchored 1-Click Execution Flight Deck & Contract Spec Capsule */}
      <div className="flex flex-col items-start lg:items-end justify-center gap-2 shrink-0">
        <button
          type="button"
          onClick={on1ClickAutoDeploy}
          disabled={isDeploying || (!isUnrestricted && isMarketHoliday) || (tiltSecondsRemaining > 0 && !isUnrestricted) || (!isUnrestricted && isDailyCapReached) || !copilotState.canDeploy || (!isUnrestricted && !canonicalPlan?.isCompliant) || !canonicalPlan?.isStopLossValid || !canonicalPlan?.isTargetValid}
          className={clsx(
            "w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold font-mono transition-all flex items-center justify-center gap-2 shrink-0 active:scale-95 shadow-lg cursor-pointer",
            (isMarketHoliday && !isUnrestricted)
              ? "bg-amber-950/60 text-amber-300/90 border border-amber-500/40 cursor-not-allowed opacity-90 shadow-[0_0_20px_rgba(245,158,11,0.2)]"
              : (tiltSecondsRemaining > 0 && !isUnrestricted)
              ? "bg-rose-950/60 text-rose-300/80 border border-rose-500/40 cursor-not-allowed opacity-90 shadow-[0_0_20px_rgba(244,63,94,0.15)]"
              : isDeploying
              ? "opacity-75 cursor-wait"
              : (!canonicalPlan?.isStopLossValid || !canonicalPlan?.isTargetValid)
              ? "bg-rose-950/60 text-rose-300/90 border border-rose-500/40 cursor-not-allowed opacity-90"
              : ((isDailyCapReached || !canonicalPlan?.isCompliant) && !isUnrestricted)
              ? "bg-rose-950/60 text-rose-300/90 border border-rose-500/40 cursor-not-allowed opacity-90"
              : copilotState.buttonClass
          )}
          title={isMarketHoliday ? `Market closed for ${holidayName}` : tiltSecondsRemaining > 0 ? `Anti-Tilt cooling active (${tiltSecondsRemaining}s)` : canonicalPlan?.isCompliant ? "Instant 1-Click Execution anchored to pre-flight risk gate (Ctrl+Enter)" : "Deployment locked: Invariant check failed"}
        >
          {(isMarketHoliday && !isUnrestricted) ? (
            <>
              <ShieldX className="w-4 h-4 text-amber-400" />
              <span>Market Closed: {holidayName}</span>
            </>
          ) : (tiltSecondsRemaining > 0 && !isUnrestricted) ? (
            <>
              <ShieldX className="w-4 h-4 text-rose-400 animate-pulse" />
              <span>Anti-Tilt Shield ({tiltSecondsRemaining}s)</span>
            </>
          ) : isDeploying ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-black" />
              <span>Arming Order...</span>
            </>
          ) : isVaultRunning && !testingMode && activeQuotaMode !== "UNLIMITED_TESTING" ? (
            <>
              <Clock className="w-4 h-4 animate-spin text-cyan-300" />
              <span>Vault Active ({vaultFormattedTime})</span>
            </>
          ) : (isDailyCapReached && !isUnrestricted) ? (
            <>
              <Lock className="w-4 h-4 text-amber-400" />
              <span>Daily Quota Reached</span>
            </>
          ) : !canonicalPlan?.isStopLossValid ? (
            <>
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>Inverted Stop Loss</span>
            </>
          ) : !canonicalPlan?.isTargetValid ? (
            <>
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>Inverted Target</span>
            </>
          ) : (!canonicalPlan?.isRiskCeilingSatisfied && !isUnrestricted) ? (
            <>
              <ShieldX className="w-4 h-4 text-rose-400" />
              <span>Risk ₹{canonicalPlan?.modelledNetRisk.toFixed(0)} &gt; ₹300 Cap</span>
            </>
          ) : (!canonicalPlan?.isRewardToRiskSatisfied && !isUnrestricted) ? (
            <>
              <ShieldX className="w-4 h-4 text-rose-400" />
              <span>R:R 1:{canonicalPlan?.netRewardToRiskRatio.toFixed(2)} &lt; 2:1 Min</span>
            </>
          ) : (
            <>
              <span>{copilotState.buttonText || (testingMode ? "⚡ DEPLOY TESTING TRADE" : "⚡ DEPLOY TRADE")}</span>
              <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.5 text-[9px] font-mono rounded bg-black/25 border border-black/20 text-black font-extrabold tracking-tight">
                ⌘↵
              </kbd>
            </>
          )}
        </button>

        <div className="flex items-center gap-2 font-mono text-[10px] text-slate-400 text-right">
          {canonicalPlan?.isCompliant ? (
            <>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="text-slate-300 font-semibold">{lots} Lot ({totalQty} Qty) · Net Risk ₹{canonicalPlan.modelledNetRisk.toFixed(0)}</span>
              <span>·</span>
              <span className="text-emerald-300 font-medium">1:{canonicalPlan.netRewardToRiskRatio.toFixed(2)} Net Validated</span>
            </>
          ) : (
            <>
              <ShieldX className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span className="text-rose-300 font-semibold">
                {canonicalPlan ? `Net Risk ₹${canonicalPlan.modelledNetRisk.toFixed(0)} (${canonicalPlan.isRiskCeilingSatisfied ? "OK" : "> ₹300"})` : `${lots} Lot`}
              </span>
              <span>·</span>
              <span className="text-rose-300 font-medium">
                {canonicalPlan ? `1:${canonicalPlan.netRewardToRiskRatio.toFixed(2)} Net (${canonicalPlan.isRewardToRiskSatisfied ? "OK" : "< 2:1"})` : "Non-Compliant"}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
