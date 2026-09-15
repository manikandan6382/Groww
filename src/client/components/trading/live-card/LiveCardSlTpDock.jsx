import React from "react";
import { ShieldAlert, Target, Edit3, ShieldCheck } from "lucide-react";
import clsx from "clsx";
import { soundEngine } from "../../../utils/soundEngine";

export const LiveCardSlTpDock = ({
  id,
  entry = 100,
  target = 110,
  stopLoss = 95,
  currentLtp = 100,
  pts = 0,
  isGain = true,
  isShort = false,
  isProtected = false,
  hasAutoLockedBE = false,
  totalQty = 1,
  autoTrailBE = true,
  setAutoTrailBE,
  onAdjustSl,
  onAdjustTp,
  onUpdateSl,
  onUpdateTp,
  editingTarget,
  setEditingTarget,
  customTargetVal,
  setCustomTargetVal,
  onSaveTarget,
  editingSl,
  setEditingSl,
  customSlVal,
  setCustomSlVal,
  onSaveSl
}) => {
  const slPts = Math.abs(entry - stopLoss);
  const targetPts = Math.abs(target - entry);
  const slRupees = slPts * totalQty;
  const targetRupees = targetPts * totalQty;
  const slPct = (((slPts) / (entry || 1)) * 100).toFixed(1);
  const targetGainPct = (((targetPts) / (entry || 1)) * 100).toFixed(1);
  const rrRatio = slPts > 0 ? (targetPts / slPts).toFixed(1) : "1.8";

  const riskDistance = Math.max(0.5, isShort ? Math.abs(stopLoss - entry) : Math.abs(entry - stopLoss));
  const rewardDistance = Math.max(0.5, isShort ? Math.abs(entry - target) : Math.abs(target - entry));
  const fullSpan = Math.max(1.0, riskDistance + rewardDistance);

  const rawEntryPos = (riskDistance / fullSpan) * 100;
  const entryPos = Math.min(80, Math.max(20, Number(rawEntryPos.toFixed(1))));

  let puckPos = entryPos;
  if (pts >= 0) {
    const rewardRatio = rewardDistance > 0 ? pts / rewardDistance : 0;
    puckPos = Math.min(100, entryPos + rewardRatio * (100 - entryPos));
  } else {
    const riskRatio = riskDistance > 0 ? Math.abs(pts) / riskDistance : 0;
    puckPos = Math.max(0, entryPos - riskRatio * entryPos);
  }

  const beTriggerPos = Math.min(95, Math.max(entryPos + 5, entryPos + 0.45 * (100 - entryPos)));
  const autoBePrice = isShort
    ? Number((entry - rewardDistance * 0.45).toFixed(2))
    : Number((entry + rewardDistance * 0.45).toFixed(2));

  const stopDistance = Math.max(0, isShort ? (stopLoss - currentLtp) : (currentLtp - stopLoss));

  const rawTrail2 = isShort ? Number((currentLtp + 2.0).toFixed(2)) : Number((currentLtp - 2.0).toFixed(2));
  const isTrail2Tightening = isShort ? rawTrail2 < stopLoss : rawTrail2 > stopLoss;

  const rawTrail4 = isShort ? Number((currentLtp + 4.0).toFixed(2)) : Number((currentLtp - 4.0).toFixed(2));
  const isTrail4Tightening = isShort ? rawTrail4 < stopLoss : rawTrail4 > stopLoss;

  const rawLock50 = pts > 1.0
    ? (isShort ? Number((entry - pts * 0.5).toFixed(2)) : Number((entry + pts * 0.5).toFixed(2)))
    : (isShort ? Number((entry - 0.3).toFixed(2)) : Number((entry + 0.3).toFixed(2)));
  const isLock50Tightening = isShort ? rawLock50 < stopLoss : rawLock50 > stopLoss;

  const trailingModes = [
    { label: "Trail 2 pts", price: isTrail2Tightening ? rawTrail2 : stopLoss, isTightening: isTrail2Tightening },
    { label: "Trail 4 pts", price: isTrail4Tightening ? rawTrail4 : stopLoss, isTightening: isTrail4Tightening },
    { label: pts > 1.0 ? "Lock 50%" : "Breakeven", price: isLock50Tightening ? rawLock50 : stopLoss, isTightening: isLock50Tightening }
  ];

  const t1Pts = Math.max(3.0, Number((riskDistance * 1.2).toFixed(1)));
  const t2Pts = Math.max(t1Pts + 2.0, Number((riskDistance * 2.2).toFixed(1)));
  const targetPresets = [
    { label: "1:1.5", price: isShort ? Number((entry - riskDistance * 1.5).toFixed(2)) : Number((entry + riskDistance * 1.5).toFixed(2)) },
    { label: "1:2.0", price: isShort ? Number((entry - riskDistance * 2.0).toFixed(2)) : Number((entry + riskDistance * 2.0).toFixed(2)) },
    { label: "T1 Scalp", price: isShort ? Number((entry - t1Pts).toFixed(2)) : Number((entry + t1Pts).toFixed(2)) },
    { label: "T2 Goal", price: isShort ? Number((entry - t2Pts).toFixed(2)) : Number((entry + t2Pts).toFixed(2)) }
  ];

  return (
    <div className="p-4 sm:p-5 flex flex-col space-y-3.5 bg-black/20 border-t border-white/[0.04]">
      {/* Precision Laser Waypoint Runway */}
      <div className="flex flex-col space-y-2">
        <div className="flex items-center justify-between text-[11px] font-mono">
          <span className="flex items-center gap-1.5 text-rose-400 font-bold">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Stop ₹{stopLoss.toFixed(2)}</span>
          </span>
          <span className="text-white/50 text-xs flex items-center gap-1.5">
            <span className="text-white/90 font-bold">Entry ₹{entry.toFixed(2)}</span>
            <span className="text-white/20">·</span>
            <span className="text-white/70">{stopDistance > 0 ? `+${stopDistance.toFixed(1)} pts cushion` : "At stop"}</span>
          </span>
          <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
            <span>Target ₹{target.toFixed(2)}</span>
            <Target className="w-3.5 h-3.5" />
          </span>
        </div>

        <div className="relative w-full h-2 rounded-full bg-black/60 border border-white/5 p-0 overflow-hidden shadow-inner">
          <div className="absolute inset-0 flex rounded-full overflow-hidden pointer-events-none opacity-30">
            <div style={{ width: `${entryPos}%` }} className="h-full bg-rose-500 border-r border-rose-500/60" />
            <div style={{ width: `${100 - entryPos}%` }} className="h-full bg-emerald-500" />
          </div>

          <div className="absolute top-0 bottom-0 w-0.5 bg-white z-10 shadow-[0_0_6px_white]" style={{ left: `${entryPos}%` }} title={`Entry ₹${entry.toFixed(2)}`} />

          <div className="absolute top-0 bottom-0 w-[2px] z-15 pointer-events-none" style={{ left: `${beTriggerPos}%` }} title={`Auto-BE Gate: ₹${autoBePrice.toFixed(2)}`}>
            <div className={clsx("w-full h-full transition-all", isProtected || hasAutoLockedBE ? "bg-cyan-400 shadow-[0_0_8px_#22d3ee]" : "bg-cyan-400/75 shadow-[0_0_4px_rgba(34,211,238,0.5)] border-r border-dashed border-cyan-200/50")} />
            <div className={clsx("absolute -top-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full", isProtected || hasAutoLockedBE ? "bg-cyan-300 shadow-[0_0_6px_#22d3ee]" : "bg-cyan-400/90 shadow-[0_0_3px_rgba(34,211,238,0.6)]")} />
          </div>

          {pts >= 0 ? (
            <div className="absolute top-0 bottom-0 bg-gradient-to-r from-emerald-500 to-teal-300 rounded-full transition-all duration-150 shadow-[0_0_8px_rgba(16,185,129,0.8)]" style={{ left: `${entryPos}%`, width: `${Math.max(0, puckPos - entryPos)}%` }} />
          ) : (
            <div className="absolute top-0 bottom-0 bg-gradient-to-l from-rose-500 to-red-600 rounded-full transition-all duration-150 shadow-[0_0_8px_rgba(244,63,94,0.8)]" style={{ left: `${puckPos}%`, width: `${Math.max(0, entryPos - puckPos)}%` }} />
          )}

          <div className={clsx("absolute top-1/2 -translate-y-1/2 -ml-1.5 w-3.5 h-3.5 rounded-full bg-white border-2 z-20 pointer-events-none transition-all duration-100 shadow-md", isGain ? "border-emerald-400 shadow-[0_0_10px_#34d399]" : "border-rose-500 shadow-[0_0_10px_#f43f5e]")} style={{ left: `${puckPos}%` }} />
        </div>

        <div className="flex items-center justify-between text-[11px] text-white/40 font-mono">
          <span className="text-rose-400/90 font-medium">Risk: -₹{slRupees.toFixed(0)} ({slPct}%)</span>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/5 transition-all">
            <ShieldCheck className={clsx("w-3 h-3 shrink-0", isProtected || hasAutoLockedBE ? "text-cyan-300 animate-pulse" : "text-cyan-400/70")} />
            <span className={clsx("text-[10px] font-bold tracking-tight", isProtected || hasAutoLockedBE ? "text-cyan-300 font-extrabold" : "text-cyan-400/90")}>
              {isProtected || hasAutoLockedBE ? "Auto-BE Locked 🛡️" : `Auto-BE @ ₹${autoBePrice.toFixed(2)}`}
            </span>
          </div>
          <span className="text-emerald-400/90 font-medium">Goal: +₹{targetRupees.toFixed(0)} (+{targetGainPct}%)</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 pt-1">
        {/* Left Capsule: Stop Loss & Trailing Ratchets */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2.5">
          <div className="flex items-center justify-between text-xs font-mono font-bold">
            <span className="text-rose-400 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Safety Net (Stop Loss)</span>
            </span>
            <span className="text-white/40 text-[11px]">
              Max Risk: -₹{slRupees.toFixed(0)} ({slPct}%)
            </span>
          </div>

          <div className="p-1 rounded-xl bg-black/40 border border-white/[0.06] flex items-center gap-1">
            <button type="button" onClick={() => onAdjustSl(-5)} className="h-8 px-2.5 rounded-lg bg-white/[0.04] hover:bg-rose-500/20 text-rose-300 font-mono font-bold text-xs transition cursor-pointer active:scale-95">−5</button>
            <button type="button" onClick={() => onAdjustSl(-1)} className="h-8 px-2.5 rounded-lg bg-white/[0.04] hover:bg-rose-500/20 text-rose-300 font-mono font-bold text-xs transition cursor-pointer active:scale-95">−1</button>
            {editingSl ? (
              <input type="number" step="0.05" autoFocus value={customSlVal} onChange={(e) => setCustomSlVal(e.target.value)} onBlur={onSaveSl} className="flex-1 h-8 rounded-lg bg-black/80 border border-rose-500/60 font-mono font-bold text-rose-300 text-xs px-2 text-center outline-none" />
            ) : (
              <button type="button" onClick={() => { setCustomSlVal(stopLoss.toFixed(2)); setEditingSl(true); }} className="flex-1 h-8 rounded-lg bg-black/30 hover:bg-black/60 font-mono font-black text-rose-400 text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-text">
                <span>₹{stopLoss.toFixed(2)}</span>
                <Edit3 className="w-2.5 h-2.5 text-white/30" />
              </button>
            )}
            <button type="button" onClick={() => onAdjustSl(1)} className="h-8 px-2.5 rounded-lg bg-white/[0.04] hover:bg-emerald-500/20 text-emerald-300 font-mono font-bold text-xs transition cursor-pointer active:scale-95">+1</button>
            <button type="button" onClick={() => onAdjustSl(5)} className="h-8 px-2.5 rounded-lg bg-white/[0.04] hover:bg-emerald-500/20 text-emerald-300 font-mono font-bold text-xs transition cursor-pointer active:scale-95">+5</button>
          </div>

          <div className="space-y-1 pt-1">
            <div className="flex items-center justify-between text-[10px] font-mono text-white/40">
              <span>Trailing Ratchets:</span>
              <button type="button" onClick={() => setAutoTrailBE && setAutoTrailBE(!autoTrailBE)} className={clsx("px-2 py-0.5 rounded text-[10px] font-mono font-bold transition", autoTrailBE ? "bg-white/10 text-white border border-white/20" : "bg-white/[0.02] text-white/30")}>
                Auto-BE @ 1R: {autoTrailBE ? "ON" : "OFF"}
              </button>
            </div>
            <div className="p-1 rounded-xl bg-black/30 border border-white/[0.04] grid grid-cols-3 gap-1">
              {trailingModes.map((mode) => {
                const isSelected = Math.abs(stopLoss - mode.price) < 0.25;
                const canRatchet = mode.isTightening && !isSelected;
                return (
                  <button
                    key={`trail-${mode.label}`}
                    type="button"
                    disabled={!canRatchet && !isSelected}
                    onClick={() => {
                      if (!canRatchet) return;
                      soundEngine.playTabSwitchTone();
                      if (onUpdateSl) onUpdateSl(mode.price);
                    }}
                    className={clsx(
                      "h-7 px-1.5 rounded-lg text-[10px] font-mono font-bold transition text-center flex items-center justify-center",
                      isSelected ? "bg-white/15 text-white border border-white/25 shadow-sm" : canRatchet ? "bg-white/[0.03] hover:bg-white/[0.08] text-white/70 hover:text-white cursor-pointer active:scale-95" : "text-white/20 opacity-40 cursor-not-allowed"
                    )}
                  >
                    {mode.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Capsule: Profit Goal & Target Snaps */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2.5">
          <div className="flex items-center justify-between text-xs font-mono font-bold">
            <span className="text-emerald-400 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5" />
              <span>Profit Goal (Target)</span>
            </span>
            <span className="text-white/40 text-[11px]">
              Gain: +₹{targetRupees.toFixed(0)} (+{targetGainPct}%)
            </span>
          </div>

          <div className="p-1 rounded-xl bg-black/40 border border-white/[0.06] flex items-center gap-1">
            <button type="button" onClick={() => onAdjustTp(-5)} className="h-8 px-2.5 rounded-lg bg-white/[0.04] hover:bg-amber-500/20 text-amber-300 font-mono font-bold text-xs transition cursor-pointer active:scale-95">−5</button>
            <button type="button" onClick={() => onAdjustTp(-1)} className="h-8 px-2.5 rounded-lg bg-white/[0.04] hover:bg-amber-500/20 text-amber-300 font-mono font-bold text-xs transition cursor-pointer active:scale-95">−1</button>
            {editingTarget ? (
              <input type="number" step="0.05" autoFocus value={customTargetVal} onChange={(e) => setCustomTargetVal(e.target.value)} onBlur={onSaveTarget} className="flex-1 h-8 rounded-lg bg-black/80 border border-emerald-500/60 font-mono font-bold text-emerald-300 text-xs px-2 text-center outline-none" />
            ) : (
              <button type="button" onClick={() => { setCustomTargetVal(target.toFixed(2)); setEditingTarget(true); }} className="flex-1 h-8 rounded-lg bg-black/30 hover:bg-black/60 font-mono font-black text-emerald-400 text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-text">
                <span>₹{target.toFixed(2)}</span>
                <Edit3 className="w-2.5 h-2.5 text-white/30" />
              </button>
            )}
            <button type="button" onClick={() => onAdjustTp(1)} className="h-8 px-2.5 rounded-lg bg-white/[0.04] hover:bg-emerald-500/20 text-emerald-300 font-mono font-bold text-xs transition cursor-pointer active:scale-95">+1</button>
            <button type="button" onClick={() => onAdjustTp(5)} className="h-8 px-2.5 rounded-lg bg-white/[0.04] hover:bg-emerald-500/20 text-emerald-300 font-mono font-bold text-xs transition cursor-pointer active:scale-95">+5</button>
          </div>

          <div className="space-y-1 pt-1">
            <div className="flex items-center justify-between text-[10px] font-mono text-white/40">
              <span>Target Presets:</span>
              <span>1:{rrRatio} Edge</span>
            </div>
            <div className="p-1 rounded-xl bg-black/30 border border-white/[0.04] grid grid-cols-4 gap-1">
              {targetPresets.map((tier) => {
                const isSelected = Math.abs(target - tier.price) < 0.25;
                return (
                  <button
                    key={`target-snap-${tier.label}`}
                    type="button"
                    onClick={() => {
                      soundEngine.playTabSwitchTone();
                      if (onUpdateTp) onUpdateTp(tier.price);
                    }}
                    className={clsx(
                      "h-7 px-1 rounded-lg text-[10px] font-mono font-bold transition text-center flex items-center justify-center truncate cursor-pointer active:scale-95",
                      isSelected ? "bg-white/15 text-white border border-white/25 shadow-sm" : "bg-white/[0.03] hover:bg-white/[0.08] text-white/70 hover:text-white"
                    )}
                  >
                    {tier.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveCardSlTpDock;

