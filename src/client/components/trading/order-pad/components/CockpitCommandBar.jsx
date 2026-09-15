import React from "react";
import { Clock, Lock, AlertTriangle, RefreshCw, Sparkles } from "lucide-react";
import clsx from "clsx";
import { soundEngine } from "../../../../utils/soundEngine";
import { isIndianMarketOpenHours } from "../../../../utils/dateUtils";

export function CockpitCommandBar({
  copilotState,
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
  on1ClickAutoDeploy
}) {
  const isMarketHours = isIndianMarketOpenHours();

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
        </div>
      </div>

      {/* Right: Anchored Execution CTA Flight Deck */}
      <div className="flex flex-col items-start lg:items-end justify-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={on1ClickAutoDeploy}
          disabled={isDailyCapReached || !copilotState.canDeploy || !isValidSL || !isValidTarget}
          className={clsx(
            "w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold font-mono transition-all flex items-center justify-center gap-2 shrink-0 active:scale-95 shadow-lg",
            isDailyCapReached || !isValidSL || !isValidTarget
              ? "bg-amber-950/60 text-amber-300/80 border border-amber-500/30 cursor-not-allowed opacity-80"
              : copilotState.buttonClass
          )}
        >
          {isVaultRunning ? (
            <>
              <Clock className="w-4 h-4 animate-spin text-cyan-300" />
              <span>Vault Active ({vaultFormattedTime})</span>
            </>
          ) : isDailyCapReached ? (
            <>
              <Lock className="w-4 h-4 text-amber-400" />
              <span>Daily Quota Reached</span>
            </>
          ) : !isValidSL ? (
            <>
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Inverted Stop Loss</span>
            </>
          ) : !isValidTarget ? (
            <>
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Inverted Target</span>
            </>
          ) : (
            copilotState.buttonText
          )}
        </button>
        <span className="text-[10px] text-slate-400 font-mono text-right hidden lg:block">
          {copilotState.canDeploy ? "Hardware Mutex Protected" : "Requires Regime Override"}
        </span>
      </div>
    </div>
  );
}
