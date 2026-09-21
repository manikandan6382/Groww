import React, { useState } from "react";
import clsx from "clsx";
import { Maximize2, Minimize2, ShieldCheck, Zap, DollarSign, Clock, Hourglass } from "lucide-react";
import { useLiveAlertCardState } from "./useLiveAlertCardState";
import { LiveCardHeader } from "./LiveCardHeader";
import { LiveCardHeroMetrics } from "./LiveCardHeroMetrics";
import { DedicatedTVTapeBox } from "./DedicatedTVTapeBox";
import { LiveCardSlTpDock } from "./LiveCardSlTpDock";
import { LiveCardActionFooter } from "./LiveCardActionFooter";
import { LiveCardInfoModal } from "./LiveCardInfoModal";
import { getContextualSteppers } from "./liveCardHelpers";
import { soundEngine } from "../../../utils/soundEngine";

export function LiveAlertCard({ trade, alert, onClose, viewMode = "deck" }) {
  const item = trade || alert || {};
  const state = useLiveAlertCardState({ item, onClose });
  const steppers = getContextualSteppers(state.entry);
  const [isExpandedLocally, setIsExpandedLocally] = useState(false);

  const handleSquareOff = () => {
    if (state.isClosing || state.isExecutingRef.current) return;
    state.setIsClosing(true);
    state.isExecutingRef.current = true;
    soundEngine.playStopLossTone();
    setTimeout(() => {
      state.squareOffTrade(state.id, state.currentLtp, "MANUAL_SQUARE_OFF");
    }, 120);
  };

  const handlePayMyself = () => {
    state.setIsScaling(true);
    state.payMyself(state.id, state.currentLtp);
    setTimeout(() => state.setIsScaling(false), 500);
  };

  const handleSaveTarget = () => {
    const val = Number(state.customTargetVal);
    if (val > 0) {
      state.updateTargetPrice(state.id, val, state.currentLtp);
      state.setEditingTarget(false);
    }
  };

  const handleSaveSl = () => {
    const val = Number(state.customSlVal);
    if (val > 0) {
      state.updateStopLossPrice(state.id, val, state.currentLtp);
      state.setEditingSl(false);
    }
  };

  const handleLaunchSimulator = () => {
    soundEngine.playTabSwitchTone();
    state.setSimulatorActiveTradeId(state.id);
    const simEl = document.getElementById("option-outcome-simulator");
    if (simEl) {
      simEl.scrollIntoView({ behavior: "smooth", block: "center" });
      simEl.classList.add("ring-2", "ring-purple-400", "shadow-[0_0_40px_rgba(192,132,252,0.35)]");
      setTimeout(() => {
        simEl.classList.remove("ring-2", "ring-purple-400", "shadow-[0_0_40px_rgba(192,132,252,0.35)]");
      }, 2500);
    }
  };

  const isProtected = state.hasAutoLockedBE || (state.isShort ? state.stopLoss <= state.entry : state.stopLoss >= state.entry) || Boolean(item.isTrueBeLocked);
  const isCE = state.symbol.includes("CE");
  const isCompact = viewMode === "compact" && !isExpandedLocally;

  const mm = Math.floor((state.elapsedSeconds || 0) / 60).toString().padStart(2, "0");
  const ss = ((state.elapsedSeconds || 0) % 60).toString().padStart(2, "0");
  const durationStr = `${mm}:${ss}`;

  // Mini progress calculation for compact view
  const riskDist = Math.max(0.5, Math.abs(state.entry - state.stopLoss));
  const rewardDist = Math.max(0.5, Math.abs(state.target - state.entry));
  const fullSpan = Math.max(1.0, riskDist + rewardDist);
  const entryPos = Math.min(80, Math.max(20, (riskDist / fullSpan) * 100));
  let puckPos = entryPos;
  if (state.pts >= 0) {
    puckPos = Math.min(100, entryPos + (state.pts / rewardDist) * (100 - entryPos));
  } else {
    puckPos = Math.max(0, entryPos - (Math.abs(state.pts) / riskDist) * entryPos);
  }

  if (isCompact) {
    return (
      <div className={clsx(
        "p-3.5 px-4 sm:px-5 rounded-2xl border backdrop-blur-xl transition-all duration-300 flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap font-mono shadow-lg relative overflow-hidden",
        isProtected
          ? "border-emerald-500/40 bg-[#051117]/95 shadow-[0_0_25px_rgba(16,185,129,0.12)]"
          : "border-white/10 bg-[#070d18]/90 hover:border-white/20"
      )}>
        {/* Left: Contract, Symbol & Chronometer */}
        <div className="flex items-center gap-2.5 min-w-[210px]">
          <span className={clsx(
            "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border shrink-0",
            isCE ? "bg-cyan-500/20 text-cyan-200 border-cyan-400/40" : "bg-rose-500/20 text-rose-200 border-rose-400/40"
          )}>
            {isCE ? "CALL" : "PUT"}
          </span>
          <div>
            <div className="text-xs font-black text-white flex items-center gap-1.5">
              <span>{state.symbol}</span>
              {isProtected && (
                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  SAFE
                </span>
              )}
            </div>
            <div className="text-[10px] text-slate-400 font-sans flex items-center gap-1 mt-0.5">
              <span>{state.quantity} Lots ({state.totalQty} Qty)</span>
              <span>·</span>
              <span className="flex items-center gap-0.5 text-cyan-300/80 font-mono">
                <Clock className="w-2.5 h-2.5" />
                <span>{durationStr}</span>
              </span>
              {state.isThetaStagnant && (
                <span className="text-amber-400 text-[9px] font-bold">⚠️ Theta</span>
              )}
            </div>
          </div>
        </div>

        {/* Center-Left: Entry -> LTP Price with tick beacon */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 text-[11px]">₹{state.entry.toFixed(2)}</span>
          <span className="text-white/30">➔</span>
          <span className={clsx(
            "font-black text-sm tabular-nums transition-colors",
            state.tickDirection === "UP" ? "text-emerald-400" : state.tickDirection === "DOWN" ? "text-rose-400" : "text-white"
          )}>
            ₹{state.currentLtp.toFixed(2)}
          </span>
          <span className={clsx("text-[11px] font-bold tabular-nums", state.isGain ? "text-emerald-400" : "text-rose-400")}>
            ({state.isGain ? "+" : ""}{state.pts.toFixed(1)} pts)
          </span>
        </div>

        {/* Center: Mini SL/TP Waypoint Progress Track */}
        <div className="hidden md:flex flex-col w-44 space-y-1">
          <div className="flex items-center justify-between text-[9px] font-mono text-slate-400">
            <span className="text-rose-400">SL ₹{state.stopLoss.toFixed(1)}</span>
            <span className="text-emerald-400">TP ₹{state.target.toFixed(1)}</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden relative">
            <div
              style={{ width: `${Math.min(100, Math.max(0, puckPos))}%` }}
              className={clsx("h-full transition-all duration-300 rounded-full", state.isGain ? "bg-emerald-500" : "bg-rose-500")}
            />
          </div>
        </div>

        {/* Center-Right: Net P&L (Points vs Cash toggle) */}
        <div className="text-right min-w-[110px]">
          <div className={clsx("text-sm sm:text-base font-black tracking-tight tabular-nums", state.netRupees >= 0 ? "text-emerald-400" : "text-rose-400")}>
            {state.focusMode === "points" ? `${state.pts >= 0 ? "+" : ""}${state.pts.toFixed(1)} pts` : `${state.netRupees >= 0 ? "+" : ""}₹${state.netRupees.toFixed(2)}`}
          </div>
          <div className="text-[10px] text-slate-400 font-sans">
            {state.focusMode === "points" ? `Net ₹${Math.round(state.netRupees)}` : `${state.pts >= 0 ? "+" : ""}${state.pts.toFixed(1)} pts`}
          </div>
        </div>

        {/* Right: Quick Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              soundEngine.playTabSwitchTone();
              state.setFocusMode(state.focusMode === "cash" ? "points" : "cash");
            }}
            className="px-2 py-1 rounded-lg text-[9px] font-mono font-bold bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition cursor-pointer"
            title="Toggle Points vs Cash"
          >
            {state.focusMode === "points" ? "⚑ PTS" : "₹ CASH"}
          </button>

          {state.isGain && Number(state.pts) >= 1.0 && (
            <button
              type="button"
              onClick={handlePayMyself}
              disabled={state.isScaling}
              className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition cursor-pointer"
              title="Bank partial profit & trail stop"
            >
              PAY
            </button>
          )}

          {!isProtected && state.isGain && Number(state.pts) >= 1.0 && (
            <button
              type="button"
              onClick={() => state.setBreakevenSL(state.id, state.currentLtp)}
              className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 transition cursor-pointer"
              title="Lock Stop Loss to True Breakeven"
            >
              BE
            </button>
          )}

          <button
            type="button"
            onClick={handleSquareOff}
            disabled={state.isClosing}
            className={clsx(
              "px-3 py-1 rounded-lg text-xs font-bold font-mono tracking-tight transition cursor-pointer active:scale-95 disabled:opacity-50",
              state.netRupees >= 0 ? "bg-emerald-600 hover:bg-emerald-500 text-white" : "bg-rose-600 hover:bg-rose-500 text-white"
            )}
            title="Instant Square Off"
          >
            {state.isClosing ? "..." : "EXIT"}
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playTabSwitchTone();
              setIsExpandedLocally(true);
            }}
            className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
            title="Expand to Full Pro Deck"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={clsx(
      "rounded-2xl border backdrop-blur-xl shadow-2xl overflow-hidden relative flex flex-col transition-all duration-300",
      isProtected
        ? "border-emerald-500/40 bg-[#051117]/95 shadow-[0_0_35px_rgba(16,185,129,0.12)] hover:border-emerald-500/60"
        : "border-white/10 bg-[#070d18]/90 hover:border-white/20"
    )}>
      {isProtected && (
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-emerald-500/[0.04] blur-3xl pointer-events-none -mr-20 -mt-20" />
      )}

      {/* When expanded locally from compact mode, show a collapse header bar */}
      {viewMode === "compact" && isExpandedLocally && (
        <div className="p-2 px-4 bg-white/[0.03] border-b border-white/5 flex items-center justify-between text-xs font-mono text-slate-400">
          <span>Expanded Pro Deck View</span>
          <button
            type="button"
            onClick={() => {
              soundEngine.playTabSwitchTone();
              setIsExpandedLocally(false);
            }}
            className="px-2 py-0.5 rounded bg-white/10 text-white text-[10px] font-bold flex items-center gap-1 hover:bg-white/20 transition cursor-pointer"
          >
            <Minimize2 className="w-3 h-3" />
            <span>Collapse to Compact</span>
          </button>
        </div>
      )}

      <LiveCardHeader
        symbol={state.symbol}
        isShort={state.isShort}
        quantity={state.quantity}
        lotSize={state.lotSize}
        strategyTag={item.strategyTag || item.strategyTags || "Practice Scalp"}
        latencyMs={state.latencyMs}
        isFeedStalled={state.isFeedStalled}
        soundMuted={state.soundMuted}
        setSoundMuted={state.setSoundMuted}
        setShowInfoSheet={state.setShowInfoSheet}
        onSquareOff={handleSquareOff}
        isClosing={state.isClosing}
        isProtected={isProtected}
        isLiveBroker={Boolean(item.isLiveBroker || item.broker === "ZERODHA")}
        focusMode={state.focusMode}
        onToggleFocusMode={() => state.setFocusMode(state.focusMode === "cash" ? "points" : "cash")}
        elapsedSeconds={state.elapsedSeconds}
        isThetaStagnant={state.isThetaStagnant}
      />

      <LiveCardHeroMetrics
        entry={state.entry}
        currentLtp={state.currentLtp}
        tickDirection={state.tickDirection}
        tickHistory={state.tickHistory}
        isGain={state.isGain}
        pts={state.pts}
        grossRupees={state.grossRupees}
        netRupees={state.netRupees}
        roiPct={state.roiPct}
        copilotNarrative={null}
        estimatedCharges={state.estimatedCharges}
        stopLoss={state.stopLoss}
        target={state.target}
        quantity={state.totalQty || state.quantity}
        totalQty={state.totalQty}
        lotSize={state.lotSize}
        focusMode={state.focusMode}
      />

      <DedicatedTVTapeBox
        history={state.tickHistory}
        isGain={state.isGain}
        ltp={state.currentLtp}
        entry={state.entry}
      />

      <LiveCardSlTpDock
        id={state.id}
        symbol={state.symbol}
        entry={state.entry}
        target={state.target}
        stopLoss={state.stopLoss}
        currentLtp={state.currentLtp}
        pts={state.pts}
        isGain={state.isGain}
        isShort={state.isShort}
        isProtected={isProtected}
        hasAutoLockedBE={state.hasAutoLockedBE}
        totalQty={state.totalQty}
        autoTrailBE={state.autoTrailBE}
        setAutoTrailBE={state.setAutoTrailBE}
        onAdjustSl={(d) => state.adjustStopLoss(state.id, d, state.currentLtp)}
        onAdjustTp={(d) => state.adjustTargetPrice(state.id, d, state.currentLtp)}
        onUpdateSl={(val) => state.updateStopLossPrice(state.id, val, state.currentLtp)}
        onUpdateTp={(val) => state.updateTargetPrice(state.id, val, state.currentLtp)}
        editingTarget={state.editingTarget}
        setEditingTarget={state.setEditingTarget}
        customTargetVal={state.customTargetVal}
        setCustomTargetVal={state.setCustomTargetVal}
        onSaveTarget={handleSaveTarget}
        editingSl={state.editingSl}
        setEditingSl={state.setEditingSl}
        customSlVal={state.customSlVal}
        setCustomSlVal={state.setCustomSlVal}
        onSaveSl={handleSaveSl}
      />

      <LiveCardActionFooter
        onPayMyself={handlePayMyself}
        onLockTrueBe={() => state.setBreakevenSL(state.id, state.currentLtp)}
        onLaunchSimulator={handleLaunchSimulator}
        onSquareOff={handleSquareOff}
        isScaling={state.isScaling}
        isClosing={state.isClosing}
        isProtected={isProtected}
        isGain={state.isGain}
        pts={state.pts}
        noiseBufferPts={1.8}
        quantity={state.quantity}
        netRupees={state.netRupees}
        focusMode={state.focusMode}
      />

      <LiveCardInfoModal
        isOpen={state.showInfoSheet}
        onClose={() => state.setShowInfoSheet(false)}
        symbol={state.symbol}
        entry={state.entry}
        currentLtp={state.currentLtp}
        quantity={state.quantity}
        lotSize={state.lotSize}
        strategyTag={item.strategyTag || item.strategyTags || "Practice Scalp"}
        estimatedCharges={state.estimatedCharges}
        id={state.id}
      />
    </div>
  );
}

export default LiveAlertCard;
