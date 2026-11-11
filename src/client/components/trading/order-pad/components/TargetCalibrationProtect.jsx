import React from "react";
import clsx from "clsx";
import { Zap, ShieldCheck, AlertCircle } from "lucide-react";
import { soundEngine } from "../../../../utils/soundEngine";
import { calculateStatutoryCharges } from "../../../../stores/slices/tradeHelpers.js";
import { useTradingStore } from "../../../../stores/useTradingStore";

export function TargetCalibrationProtect({
  entryPrice,
  stopLoss,
  setStopLoss,
  targetPrice,
  setTargetPrice,
  handleManualInputFocus,
  totalQty = 65,
  underlying = "NIFTY"
}) {
  const testingMode = useTradingStore((s) => s.testingMode);
  const qty = Number(totalQty) > 0 ? Number(totalQty) : 65;
  const numEntry = Number(entryPrice) || 0;
  const numSL = Number(stopLoss) || 0;
  const numTP = Number(targetPrice) || 0;

  const slDiff = Math.max(0, numEntry - numSL);
  const tpDiff = Math.max(0, numTP - numEntry);
  const currentRiskRupees = slDiff * qty;
  const currentRewardRupees = tpDiff * qty;

  // Canonical statutory friction calculation
  const frictionRupees = numEntry > 0
    ? calculateStatutoryCharges(numEntry, numEntry, qty, "LONG")
    : calculateStatutoryCharges(100, 100, qty, "LONG");
  const frictionPts = Number((frictionRupees / qty).toFixed(1));

  // Friction & Adverse Slippage-Absorbed Net Risk Tiers:
  // Gross loss is calibrated so Gross + 0.50pt Slippage + Friction lands strictly at ₹200, ₹250, or ₹300 Net Loss!
  const slippageAllowanceRupees = 0.50 * qty;
  const totalDeductions = frictionRupees + slippageAllowanceRupees;
  const gross200 = Math.max(50, 200 - totalDeductions);
  const gross250 = Math.max(70, 250 - totalDeductions);
  const gross300 = Math.max(90, 300 - totalDeductions);

  const ptsNet200 = Number(Math.max(0.5, gross200 / qty).toFixed(1));
  const ptsNet250 = Number(Math.max(0.5, gross250 / qty).toFixed(1));
  const ptsNet300 = Number(Math.max(0.5, gross300 / qty).toFixed(1));

  const slTiers = [
    { pts: ptsNet200, rupees: 200, label: `Net -₹200 (${ptsNet200}pt)` },
    { pts: ptsNet250, rupees: 250, label: `Net -₹250 (${ptsNet250}pt)`, isDefault: true },
    { pts: ptsNet300, rupees: 300, label: `Net -₹300 (${ptsNet300}pt)` }
  ];

  // Dynamic Target Tiers derived from current SL (or default Net 250 SL) for 1:1.5, 1:2.0, 1:2.5 Net
  const baseSlPts = slDiff > 0 ? slDiff : ptsNet250;
  const tpTiers = [
    { multiplier: 1.5, pts: Number((baseSlPts * 1.5 + frictionPts).toFixed(1)), label: `1:1.5 Net (+${(baseSlPts * 1.5 + frictionPts).toFixed(1)}pt)` },
    { multiplier: 2.0, pts: Number((baseSlPts * 2.0 + frictionPts).toFixed(1)), label: `1:2.0 Net (+${(baseSlPts * 2.0 + frictionPts).toFixed(1)}pt)`, isDefault: true },
    { multiplier: 2.5, pts: Number((baseSlPts * 2.5 + frictionPts).toFixed(1)), label: `1:2.5 Net (+${(baseSlPts * 2.5 + frictionPts).toFixed(1)}pt)` }
  ];

  // 1-Click Master Lock: Instantly snaps SL to Net ₹250 risk and Target to True Net 1:2.00 (₹500 net reward after canonical friction)
  const handleLockInvariant = () => {
    if (numEntry <= 0) return;
    handleManualInputFocus();
    const calibratedSL = Number(Math.max(0.05, numEntry - ptsNet250).toFixed(2));
    const calibratedTP = Number((numEntry + ptsNet250 * 2.0 + frictionPts).toFixed(2));
    setStopLoss(calibratedSL);
    setTargetPrice(calibratedTP);
    soundEngine.playTargetChime();
  };

  const netRiskRupees = currentRiskRupees > 0 ? currentRiskRupees + frictionRupees : 0;
  const isRiskCompliant = netRiskRupees >= 180 && netRiskRupees <= 300.00;
  const isRiskExceeded = netRiskRupees > 300.00;

  // 1-minute Brownian Micro-Noise Threshold (calibrated to preserve ₹200-₹300 risk budget on 1-lot)
  const noiseThreshold = underlying === "SENSEX" ? 8.0 : underlying === "BANKNIFTY" ? 5.0 : 3.0;
  const isMicroNoiseWick = slDiff > 0 && slDiff < noiseThreshold;
  const netRewardRupees = Math.max(0, currentRewardRupees - frictionRupees);

  return (
    <div className="space-y-2">
      {isMicroNoiseWick && !testingMode && (
        <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-[11px] font-mono leading-relaxed">
              <strong>Micro-Noise Warning:</strong> {slDiff.toFixed(1)}pt stop sits within 1-min noise floor ({noiseThreshold}pt). {underlying === "NIFTY" ? "NIFTY (65 lot) compresses stops into random wicks. Consider SENSEX (19.5pt room) or BANKNIFTY (13.0pt room) for identical ₹250 net risk." : `SENSEX allows 19.5pt room for identical ₹250 net risk.`}
            </span>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <span>3️⃣ Risk &amp; Target Protection</span>
          <span className="text-[9px] px-1.5 py-0.2 rounded font-mono font-bold bg-white/5 text-slate-400 border border-white/10">
            {qty} Qty ({underlying})
          </span>
        </div>

        {/* 1-Click Manikandan Invariant Lock Button */}
        <button
          type="button"
          onClick={handleLockInvariant}
          className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 transition active:scale-95 cursor-pointer shadow-sm"
          title="1-Click Lock: Snaps SL to Net ₹250 risk and Target to True Net ₹500 (exact 1:2.00 Risk-Reward after statutory charges)"
        >
          <Zap className="w-3 h-3 text-emerald-400 fill-current" />
          <span>⚡ Lock Net Invariant (₹250 / 1:2 Net)</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        {/* Stop Loss Stepper */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-rose-400 font-bold flex items-center gap-1">
              <span>🛑 Stop Loss</span>
              {testingMode ? (
                <span className="text-[9px] text-cyan-300 flex items-center gap-0.5 font-mono">
                  <ShieldCheck className="w-2.5 h-2.5" /> Testing Sandbox
                </span>
              ) : isRiskExceeded ? (
                <span className="text-[9px] text-rose-400 flex items-center gap-0.5 font-mono">
                  <AlertCircle className="w-2.5 h-2.5" /> &gt;₹300!
                </span>
              ) : isRiskCompliant ? (
                <span className="text-[9px] text-emerald-400 flex items-center gap-0.5 font-mono">
                  <ShieldCheck className="w-2.5 h-2.5" /> Net ₹{netRiskRupees.toFixed(0)}
                </span>
              ) : null}
            </label>
            <div className="flex items-center gap-1">
              {slTiers.map((item) => (
                <button
                  key={item.pts}
                  type="button"
                  onClick={() => {
                    handleManualInputFocus();
                    setStopLoss(Number((numEntry - item.pts).toFixed(2)));
                    soundEngine.playTabSwitchTone();
                  }}
                  className={clsx(
                    "px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition active:scale-95 cursor-pointer border",
                    Math.abs(numEntry - numSL - item.pts) < 0.15
                      ? "bg-rose-500/30 text-rose-200 border-rose-500/60 shadow-sm"
                      : "bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/20"
                  )}
                  title={`Calibrate Stop Loss to ${item.label} (₹${(numEntry - item.pts).toFixed(2)})`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <input
            type="number"
            data-testid="stop-loss-input"
            value={stopLoss}
            onFocus={handleManualInputFocus}
            onChange={(e) => {
              handleManualInputFocus();
              setStopLoss(Number(e.target.value));
            }}
            step="0.05"
            className={clsx(
              "w-full rounded-xl px-3 py-2 text-white font-mono font-bold focus:outline-none transition border",
              isRiskExceeded && !testingMode
                ? "bg-rose-950/40 border-rose-500 text-rose-200 shadow-[0_0_15px_rgba(244,63,94,0.3)]"
                : "bg-rose-500/10 border-rose-500/30 focus:border-rose-500"
            )}
          />
          {numEntry > 0 && numSL >= numEntry && (
            <div className="p-2 rounded-lg bg-rose-500/20 border border-rose-500/40 text-[10px] text-rose-200 font-mono font-bold flex items-center gap-1.5">
              <span>⚠️ Stop Loss (₹{numSL}) is higher than Entry (₹{numEntry}). On Buy/Long, SL must be lower than entry to prevent instant exit!</span>
            </div>
          )}
          <div className="text-[10px] font-mono flex items-center justify-between text-rose-400">
            <span className={clsx(isRiskExceeded && !testingMode ? "font-bold text-rose-300" : "text-slate-400")}>
              {testingMode
                ? `🧪 Testing Mode: ₹${currentRiskRupees.toFixed(0)} Gross · ₹${netRiskRupees.toFixed(0)} Net (Unrestricted)`
                : isRiskExceeded
                ? `⚠️ ₹${netRiskRupees.toFixed(0)} Net Loss (Exceeds ₹300 Cap!)`
                : `₹${currentRiskRupees.toFixed(0)} Gross · ₹${netRiskRupees.toFixed(0)} Net (Cap ₹300)`}
            </span>
            <span>
              -{slDiff.toFixed(2)} pts (-{(((slDiff) / (numEntry || 1)) * 100).toFixed(1)}%)
            </span>
          </div>
        </div>

        {/* Target Price Stepper */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-emerald-400 font-bold flex items-center gap-1">
              <span>🎯 Target Price</span>
              <span className="text-[9px] text-emerald-400 font-mono">
                +₹{currentRewardRupees.toFixed(0)} Gross (₹{netRewardRupees.toFixed(0)} Net)
              </span>
            </label>
            <div className="flex items-center gap-1">
              {tpTiers.map((tier) => (
                <button
                  key={tier.pts}
                  type="button"
                  onClick={() => {
                    handleManualInputFocus();
                    setTargetPrice(Number((numEntry + tier.pts).toFixed(2)));
                    soundEngine.playTabSwitchTone();
                  }}
                  className={clsx(
                    "px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition active:scale-95 cursor-pointer border",
                    Math.abs(numTP - numEntry - tier.pts) < 0.15
                      ? "bg-emerald-500/30 text-emerald-200 border-emerald-500/60 shadow-sm"
                      : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20"
                  )}
                  title={`Calibrate Target Price to ${tier.label} (₹${(numEntry + tier.pts).toFixed(2)})`}
                >
                  {tier.label}
                </button>
              ))}
            </div>
          </div>
          <input
            type="number"
            data-testid="target-price-input"
            value={targetPrice}
            onFocus={handleManualInputFocus}
            onChange={(e) => {
              handleManualInputFocus();
              setTargetPrice(Number(e.target.value));
            }}
            step="0.05"
            className="w-full bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-emerald-500"
          />
          {numEntry > 0 && numTP > 0 && numTP <= numEntry && (
            <div className="p-2 rounded-lg bg-amber-500/20 border border-amber-500/40 text-[10px] text-amber-200 font-mono font-bold flex items-center gap-1.5">
              <span>⚠️ Target Price (₹{numTP}) is lower than Entry (₹{numEntry}). On Buy/Long, Target must be above entry!</span>
            </div>
          )}
          <div className="text-[10px] font-mono text-emerald-400 flex items-center justify-between pt-0.5">
            <span className={clsx("text-[9px] font-mono", tpDiff < 3.5 ? "text-amber-400 font-bold" : "text-slate-400")}>
              {tpDiff < 3.5
                ? "⚠️ Target <2.5x friction (1.35 pt drag)"
                : `Aim: ₹${currentRewardRupees.toFixed(0)} (Target: ₹500)`}
            </span>
            <span className="text-right">
              +{tpDiff.toFixed(2)} pts (+{(((tpDiff) / (numEntry || 1)) * 100).toFixed(1)}%)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
