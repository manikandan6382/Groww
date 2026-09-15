import React from "react";
import clsx from "clsx";
import { soundEngine } from "../../../../utils/soundEngine";

export function TargetCalibrationProtect({
  entryPrice,
  stopLoss,
  setStopLoss,
  targetPrice,
  setTargetPrice,
  handleManualInputFocus
}) {
  const slDiff = entryPrice - stopLoss;
  const tpDiff = targetPrice - entryPrice;

  return (
    <div>
      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
        3️⃣ Risk &amp; Target Protection
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        {/* Stop Loss Stepper */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-rose-400 font-bold">🛑 Stop Loss (SL Price)</label>
            <div className="flex items-center gap-1">
              {[
                { pts: 3.5, label: "-3.5pt (₹227)" },
                { pts: 4.0, label: "-4.0pt (₹260)" },
                { pts: 4.5, label: "-4.5pt (₹292)" }
              ].map((item) => (
                <button
                  key={item.pts}
                  type="button"
                  onClick={() => {
                    handleManualInputFocus();
                    setStopLoss(Number((entryPrice - item.pts).toFixed(2)));
                    soundEngine.playTabSwitchTone();
                  }}
                  className={clsx(
                    "px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition active:scale-95 cursor-pointer border",
                    Math.abs(entryPrice - stopLoss - item.pts) < 0.25
                      ? "bg-rose-500/30 text-rose-200 border-rose-500/60 shadow-sm"
                      : "bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/20"
                  )}
                  title={`Calibrate Stop Loss to ${item.label} (₹${(entryPrice - item.pts).toFixed(2)})`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <input
            type="number"
            value={stopLoss}
            onFocus={handleManualInputFocus}
            onChange={(e) => {
              handleManualInputFocus();
              setStopLoss(Number(e.target.value));
            }}
            step="0.05"
            className="w-full bg-rose-500/10 border border-rose-500/30 rounded-xl px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-rose-500"
          />
          <div className="text-[10px] font-mono text-rose-400 text-right">
            -{slDiff.toFixed(2)} pts (-{(((slDiff) / (entryPrice || 1)) * 100).toFixed(1)}%)
          </div>
        </div>

        {/* Target Price Stepper */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-emerald-400 font-bold">🎯 Target Price (TP Price)</label>
            <div className="flex items-center gap-1">
              {[
                { pts: 6.5, label: "+6.5 (₹422)" },
                { pts: 8.0, label: "+8.0 (₹520)" },
                { pts: 9.0, label: "+9.0 (₹585)" }
              ].map((tier) => (
                <button
                  key={tier.pts}
                  type="button"
                  onClick={() => {
                    handleManualInputFocus();
                    setTargetPrice(Number((entryPrice + tier.pts).toFixed(2)));
                    soundEngine.playTabSwitchTone();
                  }}
                  className={clsx(
                    "px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition active:scale-95 cursor-pointer border",
                    Math.abs(targetPrice - entryPrice - tier.pts) < 0.25
                      ? "bg-emerald-500/30 text-emerald-200 border-emerald-500/60 shadow-sm"
                      : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20"
                  )}
                  title={`Calibrate Target Price to ${tier.label} (₹${(entryPrice + tier.pts).toFixed(2)})`}
                >
                  {tier.label}
                </button>
              ))}
            </div>
          </div>
          <input
            type="number"
            value={targetPrice}
            onFocus={handleManualInputFocus}
            onChange={(e) => {
              handleManualInputFocus();
              setTargetPrice(Number(e.target.value));
            }}
            step="0.05"
            className="w-full bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-emerald-500"
          />
          <div className="text-[10px] font-mono text-emerald-400 flex items-center justify-between pt-0.5">
            <span className={clsx("text-[9px] font-mono", tpDiff < 3.5 ? "text-amber-400 font-bold" : "text-slate-400")}>
              {tpDiff < 3.5
                ? "⚠️ Target <2.5x friction (1.35 pt drag)"
                : "🏛️ Friction Hurdle: ~1.35 pts (₹87.5)"}
            </span>
            <span className="text-right">
              +{tpDiff.toFixed(2)} pts (+{(((tpDiff) / (entryPrice || 1)) * 100).toFixed(1)}%)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
