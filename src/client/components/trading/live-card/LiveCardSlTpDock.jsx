import React from "react";
import { ShieldAlert, Target, Edit3, ShieldCheck } from "lucide-react";
import clsx from "clsx";
import { soundEngine } from "../../../utils/soundEngine";

export const LiveCardSlTpDock = ({
  id,
  symbol = "",
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

  // Asset-Calibrated Trailing Stop Distance based on Index Volatility & Micro-Noise
  const sym = String(symbol || "").toUpperCase();
  const isSensex = sym.includes("SENSEX");
  const isBank = sym.includes("BANK");
  const tightTrailPts = isSensex ? 6.0 : (isBank ? 4.0 : 2.5);
  const wideTrailPts = isSensex ? 12.0 : (isBank ? 7.0 : 4.5);

  const rawTrailTight = isShort ? Number((currentLtp + tightTrailPts).toFixed(2)) : Number((currentLtp - tightTrailPts).toFixed(2));
  const isTrailTightTightening = isShort ? rawTrailTight < stopLoss : rawTrailTight > stopLoss;

  const rawTrailWide = isShort ? Number((currentLtp + wideTrailPts).toFixed(2)) : Number((currentLtp - wideTrailPts).toFixed(2));
  const isTrailWideTightening = isShort ? rawTrailWide < stopLoss : rawTrailWide > stopLoss;

  // Invariant Profit Snaps: Lock +1R (₹250 Net after ~₹55.20 friction)
  const frictionPerUnit = totalQty > 0 ? 55.20 / totalQty : 0.85;
  const net250Pts = (250 / totalQty) + frictionPerUnit;
  const rawLock1R = isShort ? Number((entry - net250Pts).toFixed(2)) : Number((entry + net250Pts).toFixed(2));
  const isLock1RTightening = isShort ? rawLock1R < stopLoss : rawLock1R > stopLoss;

  const rawLock50 = pts > 1.0
    ? (isShort ? Number((entry - pts * 0.5).toFixed(2)) : Number((entry + pts * 0.5).toFixed(2)))
    : (isShort ? Number((entry - 0.3).toFixed(2)) : Number((entry + 0.3).toFixed(2)));
  const isLock50Tightening = isShort ? rawLock50 < stopLoss : rawLock50 > stopLoss;

  const trailingModes = [
    {
      label: `Trail ${tightTrailPts} pts`,
      price: isTrailTightTightening ? rawTrailTight : stopLoss,
      isTightening: isTrailTightTightening,
      tooltip: isTrailTightTightening
        ? `Trail Stop Loss ${tightTrailPts} pts behind current LTP to ₹${rawTrailTight.toFixed(2)} (locks in tight scalp)`
        : `Trail ${tightTrailPts} pts (₹${rawTrailTight.toFixed(2)}): Inactive until price moves far enough to tighten risk above current SL`
    },
    {
      label: `Trail ${wideTrailPts} pts`,
      price: isTrailWideTightening ? rawTrailWide : stopLoss,
      isTightening: isTrailWideTightening,
      tooltip: isTrailWideTightening
        ? `Trail Stop Loss ${wideTrailPts} pts behind current LTP to ₹${rawTrailWide.toFixed(2)} (gives trade breathing room beyond spread noise)`
        : `Trail ${wideTrailPts} pts (₹${rawTrailWide.toFixed(2)}): Inactive until price moves far enough to tighten risk above current SL`
    },
    {
      label: pts >= net250Pts ? "Lock +1R (₹250)" : (pts > 1.0 ? "Lock 50%" : "Breakeven"),
      price: pts >= net250Pts ? (isLock1RTightening ? rawLock1R : stopLoss) : (isLock50Tightening ? rawLock50 : stopLoss),
      isTightening: pts >= net250Pts ? isLock1RTightening : isLock50Tightening,
      tooltip: pts >= net250Pts
        ? `Lock +1R (₹250 Net): Moves Stop Loss to ₹${rawLock1R.toFixed(2)} to guarantee Manikandan's ₹250 1R target net of fees`
        : pts > 1.0
        ? `Lock 50% Profit: Moves Stop Loss to ₹${rawLock50.toFixed(2)} to protect half of current gains`
        : `Move Stop Loss to Entry + friction charges (₹${rawLock50.toFixed(2)}) for a 100% risk-free trade`
    }
  ];

  const t1Pts = Math.max(3.0, Number((riskDistance * 1.2).toFixed(1)));
  const t2Pts = Math.max(t1Pts + 2.0, Number((riskDistance * 2.2).toFixed(1)));
  const targetPresets = [
    {
      label: "1:1.5",
      price: isShort ? Number((entry - riskDistance * 1.5).toFixed(2)) : Number((entry + riskDistance * 1.5).toFixed(2)),
      tooltip: `Snap Target to 1:1.50 Risk-Reward (₹${(isShort ? entry - riskDistance * 1.5 : entry + riskDistance * 1.5).toFixed(2)}) · Expected gain: +₹${((riskDistance * 1.5) * totalQty).toFixed(0)}`
    },
    {
      label: "1:2.0",
      price: isShort ? Number((entry - riskDistance * 2.0).toFixed(2)) : Number((entry + riskDistance * 2.0).toFixed(2)),
      tooltip: `Snap Target to 1:2.00 Risk-Reward — Manikandan Invariant (₹${(isShort ? entry - riskDistance * 2.0 : entry + riskDistance * 2.0).toFixed(2)}) · Expected gain: +₹${((riskDistance * 2.0) * totalQty).toFixed(0)}`
    },
    {
      label: "T1 Scalp",
      price: isShort ? Number((entry - t1Pts).toFixed(2)) : Number((entry + t1Pts).toFixed(2)),
      tooltip: `Snap Target to Quick Scalp T1 at ₹${(isShort ? entry - t1Pts : entry + t1Pts).toFixed(2)} (+${t1Pts.toFixed(1)} pts) · Fast momentum exit`
    },
    {
      label: "T2 Goal",
      price: isShort ? Number((entry - t2Pts).toFixed(2)) : Number((entry + t2Pts).toFixed(2)),
      tooltip: `Snap Target to Extended Goal T2 at ₹${(isShort ? entry - t2Pts : entry + t2Pts).toFixed(2)} (+${t2Pts.toFixed(1)} pts) · High-conviction runner`
    }
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
              {isProtected || hasAutoLockedBE ? "True BE Locked (Taxes Covered) 🛡️" : `Auto-BE Trigger @ ₹${autoBePrice.toFixed(2)}`}
            </span>
          </div>
          <span className="text-emerald-400/90 font-medium">Goal: +₹{targetRupees.toFixed(0)} (+{targetGainPct}%)</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 pt-1">
        {/* Left Capsule: Stop Loss & Trailing Ratchets */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2.5">
          <div className="flex items-center justify-between text-xs font-mono font-bold">
            <span className="text-rose-400 flex items-center gap-1.5" title="Protective Stop Loss: If the market drops to this price, the position exits automatically to preserve your capital.">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Safety Net (Stop Loss)</span>
            </span>
            <span className="text-white/40 text-[11px]" title="Maximum rupee loss and percentage drawdown if this Stop Loss is hit">
              Max Risk: -₹{slRupees.toFixed(0)} ({slPct}%)
            </span>
          </div>

          <div className="p-1 rounded-xl bg-black/40 border border-white/[0.06] flex items-center gap-1">
            <button
              type="button"
              onClick={() => onAdjustSl(-5)}
              title="Lower Stop Loss by 5 points (Widens allowable loss by ₹5/qty)"
              className="h-8 px-2.5 rounded-lg bg-white/[0.04] hover:bg-rose-500/20 text-rose-300 font-mono font-bold text-xs transition cursor-pointer active:scale-95"
            >
              −5
            </button>
            <button
              type="button"
              onClick={() => onAdjustSl(-1)}
              title="Lower Stop Loss by 1 point (Widens allowable loss by ₹1/qty)"
              className="h-8 px-2.5 rounded-lg bg-white/[0.04] hover:bg-rose-500/20 text-rose-300 font-mono font-bold text-xs transition cursor-pointer active:scale-95"
            >
              −1
            </button>
            {editingSl ? (
              <input
                type="number"
                step="0.05"
                autoFocus
                value={customSlVal}
                onChange={(e) => setCustomSlVal(e.target.value)}
                onBlur={onSaveSl}
                title="Enter custom Stop Loss price and click away or press Enter"
                className="flex-1 h-8 rounded-lg bg-black/80 border border-rose-500/60 font-mono font-bold text-rose-300 text-xs px-2 text-center outline-none"
              />
            ) : (
              <button
                type="button"
                onClick={() => { setCustomSlVal(stopLoss.toFixed(2)); setEditingSl(true); }}
                title="Click to directly type and edit your Stop Loss price"
                className="flex-1 h-8 rounded-lg bg-black/30 hover:bg-black/60 font-mono font-black text-rose-400 text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-text"
              >
                <span>₹{stopLoss.toFixed(2)}</span>
                <Edit3 className="w-2.5 h-2.5 text-white/30" />
              </button>
            )}
            <button
              type="button"
              onClick={() => onAdjustSl(1)}
              title="Raise Stop Loss by 1 point (Tightens risk by ₹1/qty to protect capital)"
              className="h-8 px-2.5 rounded-lg bg-white/[0.04] hover:bg-emerald-500/20 text-emerald-300 font-mono font-bold text-xs transition cursor-pointer active:scale-95"
            >
              +1
            </button>
            <button
              type="button"
              onClick={() => onAdjustSl(5)}
              title="Raise Stop Loss by 5 points (Tightens risk by ₹5/qty to lock in gains)"
              className="h-8 px-2.5 rounded-lg bg-white/[0.04] hover:bg-emerald-500/20 text-emerald-300 font-mono font-bold text-xs transition cursor-pointer active:scale-95"
            >
              +5
            </button>
          </div>

          <div className="space-y-1 pt-1">
            <div className="flex items-center justify-between text-[10px] font-mono text-white/40">
              <span title="Trailing Ratchets: 1-click buttons to ratchet your Stop Loss upward and protect profits as price rises">
                Trailing Ratchets:
              </span>
              <button
                type="button"
                onClick={() => setAutoTrailBE && setAutoTrailBE(!autoTrailBE)}
                title={autoTrailBE
                  ? "Auto-BE @ 1R is ON: Once the trade moves 1R into profit (45% toward target), the system automatically ratchets Stop Loss to Breakeven (+ friction charges) to guarantee a risk-free trade. Click to turn OFF."
                  : "Auto-BE @ 1R is OFF: Click to turn ON. Automatically locks Breakeven (+ friction charges) once price gains 1R."}
                className={clsx(
                  "px-2 py-0.5 rounded text-[10px] font-mono font-bold transition cursor-pointer",
                  autoTrailBE ? "bg-white/10 text-white border border-white/20" : "bg-white/[0.02] text-white/30"
                )}
              >
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
                    title={mode.tooltip}
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
            <span className="text-emerald-400 flex items-center gap-1.5" title="Profit Goal (Target Price): If the market rises to this price, the position automatically closes in full profit.">
              <Target className="w-3.5 h-3.5" />
              <span>Profit Goal (Target)</span>
            </span>
            <span className="text-white/40 text-[11px]" title="Expected rupee profit and percentage gain if this Target is hit">
              Gain: +₹{targetRupees.toFixed(0)} (+{targetGainPct}%)
            </span>
          </div>

          <div className="p-1 rounded-xl bg-black/40 border border-white/[0.06] flex items-center gap-1">
            <button
              type="button"
              onClick={() => onAdjustTp(-5)}
              title="Lower Profit Target by 5 points (Brings target closer to entry for an easier/quicker exit)"
              className="h-8 px-2.5 rounded-lg bg-white/[0.04] hover:bg-amber-500/20 text-amber-300 font-mono font-bold text-xs transition cursor-pointer active:scale-95"
            >
              −5
            </button>
            <button
              type="button"
              onClick={() => onAdjustTp(-1)}
              title="Lower Profit Target by 1 point (Brings target closer to entry for an easier/quicker exit)"
              className="h-8 px-2.5 rounded-lg bg-white/[0.04] hover:bg-amber-500/20 text-amber-300 font-mono font-bold text-xs transition cursor-pointer active:scale-95"
            >
              −1
            </button>
            {editingTarget ? (
              <input
                type="number"
                step="0.05"
                autoFocus
                value={customTargetVal}
                onChange={(e) => setCustomTargetVal(e.target.value)}
                onBlur={onSaveTarget}
                title="Enter custom Profit Target price and click away or press Enter"
                className="flex-1 h-8 rounded-lg bg-black/80 border border-emerald-500/60 font-mono font-bold text-emerald-300 text-xs px-2 text-center outline-none"
              />
            ) : (
              <button
                type="button"
                onClick={() => { setCustomTargetVal(target.toFixed(2)); setEditingTarget(true); }}
                title="Click to directly type and edit your Profit Target price"
                className="flex-1 h-8 rounded-lg bg-black/30 hover:bg-black/60 font-mono font-black text-emerald-400 text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-text"
              >
                <span>₹{target.toFixed(2)}</span>
                <Edit3 className="w-2.5 h-2.5 text-white/30" />
              </button>
            )}
            <button
              type="button"
              onClick={() => onAdjustTp(1)}
              title="Raise Profit Target by 1 point (Demands ₹1/qty more profit from the trade)"
              className="h-8 px-2.5 rounded-lg bg-white/[0.04] hover:bg-emerald-500/20 text-emerald-300 font-mono font-bold text-xs transition cursor-pointer active:scale-95"
            >
              +1
            </button>
            <button
              type="button"
              onClick={() => onAdjustTp(5)}
              title="Raise Profit Target by 5 points (Demands ₹5/qty more profit from the trade)"
              className="h-8 px-2.5 rounded-lg bg-white/[0.04] hover:bg-emerald-500/20 text-emerald-300 font-mono font-bold text-xs transition cursor-pointer active:scale-95"
            >
              +5
            </button>
          </div>

          <div className="space-y-1 pt-1">
            <div className="flex items-center justify-between text-[10px] font-mono text-white/40">
              <span title="Target Presets: 1-click buttons to instantly snap your Profit Target to standard Risk-to-Reward multiples">
                Target Presets:
              </span>
              <span title={`Current Risk-to-Reward Ratio: 1:${rrRatio}. For every ₹1 risked (₹${slRupees.toFixed(0)}), you aim to make ₹${rrRatio} (₹${targetRupees.toFixed(0)}).`}>
                1:{rrRatio} Edge
              </span>
            </div>
            <div className="p-1 rounded-xl bg-black/30 border border-white/[0.04] grid grid-cols-4 gap-1">
              {targetPresets.map((tier) => {
                const isSelected = Math.abs(target - tier.price) < 0.25;
                return (
                  <button
                    key={`target-snap-${tier.label}`}
                    type="button"
                    title={tier.tooltip}
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

