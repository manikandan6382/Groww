import React, { useRef, useEffect } from "react";
import { ChevronDown, Sparkles, ShieldCheck, ShieldAlert, Zap } from "lucide-react";
import clsx from "clsx";
import { IndexDropdownPopover } from "./IndexDropdownPopover";
import { soundEngine } from "../../../../utils/soundEngine";

export function ContractSizingInputs({
  optionType,
  setOptionType,
  handleQuickFlipOptionType,
  underlying,
  strikePrice,
  setStrikePrice,
  entryPrice,
  setEntryPrice,
  liveMarkPrice,
  isLiveStreaming,
  onSyncToLive,
  lots,
  setLots,
  lotSize,
  currentAsset,
  dynamicAssets,
  handleSelectAsset,
  handleManualInputFocus,
  strategyMode,
  hedgeStrike,
  setHedgeStrike,
  hedgePrice,
  setHedgePrice,
  isIndexDropdownOpen,
  setIsIndexDropdownOpen,
  setStopLoss,
  setTargetPrice
}) {
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsIndexDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [setIsIndexDropdownOpen]);

  const step = underlying === "BANKNIFTY" || underlying === "SENSEX" ? 100 : 50;
  const spot = Number(currentAsset?.spot || 24000);
  const atm = Math.round(spot / step) * step;
  const strikesLadder = [
    atm - 2 * step,
    atm - step,
    atm,
    atm + step,
    atm + 2 * step
  ];

  return (
    <div className="space-y-3">
      {/* 1-Click Institutional ATM Strike Ladder & Quick Reversal Deck */}
      <div className="p-3 rounded-2xl bg-black/40 border border-white/10 space-y-2 shadow-inner">
        <div className="flex items-center justify-between text-[11px] font-mono flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-white font-extrabold uppercase tracking-wider flex items-center gap-1.5">
              <span>🎯</span>
              <span>1-CLICK ATM STRIKE LADDER</span>
            </span>
            <span className="text-[10px] text-cyan-300 bg-cyan-500/15 border border-cyan-500/30 px-2 py-0.5 rounded-full font-bold">
              Spot: ₹{spot.toLocaleString("en-IN", { maximumFractionDigits: 1 })}
            </span>
          </div>

          {handleQuickFlipOptionType && (
            <button
              type="button"
              onClick={handleQuickFlipOptionType}
              className="px-2.5 py-1 rounded-lg font-mono font-bold text-[10px] bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 border border-indigo-500/40 flex items-center gap-1.5 transition cursor-pointer active:scale-95 shadow-sm"
              title="1-Tap Quick Flip: Inverts market sentiment (CE ⇄ PE), resets strike to ATM, and auto-calibrates ₹250 stop loss."
            >
              <Zap className="w-3 h-3 text-indigo-300 fill-current" />
              <span>⚡ Quick Flip ({optionType === "CALL" ? "CE ➔ PE" : "PE ➔ CE"})</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
          {strikesLadder.map((k) => {
            const isSelected = strikePrice === k;
            const isAtm = k === atm;
            let moneyness = isAtm ? "★ ATM" : "";
            let isItm = false;
            if (!isAtm) {
              if (optionType === "CALL") {
                isItm = k < atm;
                moneyness = isItm ? `ITM ${Math.abs(k - atm) / step}` : `OTM ${Math.abs(k - atm) / step}`;
              } else {
                isItm = k > atm;
                moneyness = isItm ? `ITM ${Math.abs(k - atm) / step}` : `OTM ${Math.abs(k - atm) / step}`;
              }
            }

            return (
              <button
                key={k}
                type="button"
                onClick={() => {
                  soundEngine?.playTabSwitchTone?.();
                  setStrikePrice(k);
                }}
                className={clsx(
                  "p-2 sm:p-2.5 rounded-xl text-center border transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 active:scale-95",
                  isSelected
                    ? "bg-cyan-500/25 border-cyan-400 text-white shadow-[0_0_12px_rgba(6,182,212,0.4)] ring-1 ring-cyan-400/50"
                    : isAtm
                      ? "bg-white/[0.05] border-white/20 text-cyan-200 hover:bg-white/[0.08]"
                      : "bg-white/[0.02] border-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]"
                )}
              >
                <span className="font-mono text-xs sm:text-sm font-black">{k}</span>
                <span className={clsx(
                  "text-[8.5px] font-mono uppercase px-1.5 py-0.2 rounded font-extrabold tracking-tight",
                  isSelected
                    ? "bg-cyan-400 text-slate-950 font-black"
                    : isAtm
                      ? "bg-cyan-500/20 text-cyan-300"
                      : isItm
                        ? "bg-emerald-500/15 text-emerald-300"
                        : "bg-slate-800 text-slate-400"
                )}>
                  {moneyness}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-1.5">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          2️⃣ Contract Parameters &amp; Sizing
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {underlying === "SENSEX" ? (
            <button
              type="button"
              onClick={() => {
                setStopLoss(Number(Math.max(0.05, entryPrice - 12.5).toFixed(2)));
                setTargetPrice(Number((entryPrice + 25.0).toFixed(2)));
              }}
              className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono font-bold transition flex items-center gap-1 shadow-sm cursor-pointer"
              title="SENSEX Lot Size 20: Allows 12.5 pt stop with exact ₹250 risk (3x breathing room vs NIFTY)"
            >
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>🛡️ SENSEX 12.5pt (₹250 Risk)</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                const slDist = underlying === "BANKNIFTY" ? 8.5 : 4.0;
                const tpDist = underlying === "BANKNIFTY" ? 17.0 : 8.0;
                setStopLoss(Number(Math.max(0.05, entryPrice - slDist).toFixed(2)));
                setTargetPrice(Number((entryPrice + tpDist).toFixed(2)));
              }}
              className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-[10px] font-mono font-bold transition flex items-center gap-1 shadow-sm cursor-pointer"
              title={`${underlying} Lot Size ${lotSize}: ₹250 risk limits stop to ${underlying === "BANKNIFTY" ? "8.5" : "4.0"} pts (High Friction Drag)`}
            >
              <ShieldAlert className="w-3 h-3 text-amber-400" />
              <span>⚠️ Micro-Stop ({underlying === "BANKNIFTY" ? "8.5pt" : "4.0pt"} · ₹250)</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              const slDist = underlying === "SENSEX" ? 25.0 : underlying === "BANKNIFTY" ? 18.0 : 10.0;
              const tpDist = underlying === "SENSEX" ? 50.0 : underlying === "BANKNIFTY" ? 36.0 : 20.0;
              setStopLoss(Number(Math.max(0.05, entryPrice - slDist).toFixed(2)));
              setTargetPrice(Number((entryPrice + tpDist).toFixed(2)));
            }}
            className="px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-[10px] font-mono font-bold transition flex items-center gap-1 shadow-sm cursor-pointer"
            title="15m Multi-Candle Structure Setup (Friction < 8%)"
          >
            <Sparkles className="w-3 h-3 text-cyan-300" />
            <span>🏛️ 15m Structure Setup</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        {/* Underlying Index Custom Selector */}
        <div className="space-y-1 relative" ref={dropdownRef}>
          <div className="flex items-center justify-between">
            <label className="text-slate-400 font-medium">Underlying Index</label>
            <span className="text-[10px] font-mono text-cyan-400 font-bold">{lotSize}/lot</span>
          </div>
          <button
            type="button"
            onClick={() => setIsIndexDropdownOpen(!isIndexDropdownOpen)}
            className="w-full bg-[#0a1122]/90 hover:bg-[#0e172e] border border-white/15 hover:border-cyan-500/50 rounded-xl px-3 py-2 text-white font-bold transition-all flex items-center justify-between shadow-sm cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
              <span className="font-mono text-xs text-white font-extrabold">{currentAsset.name}</span>
            </div>
            <div className="flex items-center gap-1.5 font-mono">
              <span className="text-[11px] text-white font-bold">₹{Number(currentAsset.spot).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
              <ChevronDown className={clsx("w-3.5 h-3.5 text-slate-400 transition-transform duration-200", isIndexDropdownOpen && "rotate-180 text-cyan-400")} />
            </div>
          </button>

          <IndexDropdownPopover
            isOpen={isIndexDropdownOpen}
            dynamicAssets={dynamicAssets}
            underlying={underlying}
            onSelectAsset={handleSelectAsset}
            onClose={() => setIsIndexDropdownOpen(false)}
          />
        </div>

        {/* Strike Stepper */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-slate-400 font-medium">Strike Price</label>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  const step = underlying === "BANKNIFTY" || underlying === "SENSEX" ? 100 : 50;
                  const atm = Math.round(Number(currentAsset.spot || 24000) / step) * step;
                  const itmStrike = optionType === "CALL" ? atm - step : atm + step;
                  setStrikePrice(itmStrike);
                }}
                className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 transition cursor-pointer"
                title="Select 1-Strike In-The-Money (Delta ~0.65) to minimize micro-noise chop"
              >
                ITM (Δ 0.65)
              </button>
              <button
                type="button"
                onClick={() => {
                  const step = underlying === "BANKNIFTY" || underlying === "SENSEX" ? 100 : 50;
                  const atm = Math.round(Number(currentAsset.spot || 24000) / step) * step;
                  setStrikePrice(atm);
                }}
                className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-white/10 text-slate-300 hover:bg-white/20 transition cursor-pointer"
                title="Select At-The-Money strike"
              >
                ATM
              </button>
            </div>
          </div>
          <div className="flex items-center rounded-xl bg-white/[0.03] border border-white/10 overflow-hidden">
            <button
              type="button"
              onClick={() => {
                const step = underlying === "BANKNIFTY" || underlying === "SENSEX" ? 100 : 50;
                setStrikePrice((s) => s - step);
              }}
              className="px-3 py-2 text-slate-400 hover:text-white font-bold cursor-pointer"
            >
              −
            </button>
            <input
              type="number"
              value={strikePrice}
              onChange={(e) => setStrikePrice(Number(e.target.value))}
              step={underlying === "BANKNIFTY" || underlying === "SENSEX" ? "100" : "50"}
              className="w-full bg-transparent text-center text-white font-mono font-bold focus:outline-none"
            />
            <button
              type="button"
              onClick={() => {
                const step = underlying === "BANKNIFTY" || underlying === "SENSEX" ? 100 : 50;
                setStrikePrice((s) => s + step);
              }}
              className="px-3 py-2 text-slate-400 hover:text-white font-bold cursor-pointer"
            >
              +
            </button>
          </div>
        </div>

        {/* Entry Price */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <label className="text-slate-400 font-medium">Entry Price (₹)</label>
              {Number(liveMarkPrice) > 0 && Math.abs(Number(liveMarkPrice) - Number(entryPrice)) >= 0.05 && (
                <button
                  type="button"
                  onClick={() => onSyncToLive?.()}
                  className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 transition flex items-center gap-1 cursor-pointer animate-pulse"
                  title="Snap entry price to live Upstox market tick and resume streaming"
                >
                  <span>⚡ Sync LTP (₹{Number(liveMarkPrice).toFixed(2)})</span>
                </button>
              )}
            </div>
            <span
              className="text-[10px] font-mono text-cyan-400 font-bold"
              title={`Total Trade Capital: ₹${Number(entryPrice || 0).toFixed(2)} × ${lots * lotSize} Qty = ₹${(Number(entryPrice || 0) * lots * lotSize).toFixed(2)}`}
            >
              Total: ₹{Math.round(Number(entryPrice || 0) * lots * lotSize).toLocaleString("en-IN")} ({Number(entryPrice || 0)} × {lots * lotSize})
            </span>
          </div>
          <input
            type="number"
            value={entryPrice}
            onFocus={handleManualInputFocus}
            onChange={(e) => {
              handleManualInputFocus();
              setEntryPrice(Number(e.target.value));
            }}
            step="0.05"
            className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-cyan-500/50"
          />
        </div>

        {/* Lots Count */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-slate-400 font-medium">Lots (Count)</label>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono text-slate-300 font-semibold" title={`1 Lot = ${lotSize} Shares/Contracts`}>
                {lots * lotSize} Qty ({lotSize}/lot)
              </span>
              {[1, 2, 5].map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLots(l)}
                  className={clsx("px-1.5 py-0.5 rounded text-[10px] font-mono cursor-pointer", lots === l ? "bg-cyan-500 text-black font-bold" : "bg-white/10 text-slate-300")}
                >
                  {l}L
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center rounded-xl bg-white/[0.03] border border-white/10 overflow-hidden">
            <button type="button" onClick={() => setLots((l) => Math.max(1, l - 1))} className="px-3 py-2 text-slate-400 hover:text-white font-bold cursor-pointer">−</button>
            <input type="number" value={lots} onChange={(e) => setLots(Math.max(1, Number(e.target.value)))} className="w-full bg-transparent text-center text-white font-mono font-bold focus:outline-none" />
            <button type="button" onClick={() => setLots((l) => l + 1)} className="px-3 py-2 text-slate-400 hover:text-white font-bold cursor-pointer">+</button>
          </div>
        </div>
      </div>

      {/* Step 2b: Hedge Leg (If Spread Mode is Active) */}
      {strategyMode === "SPREAD" && (
        <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-2 text-xs mt-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-purple-300">🛡️ Leg 2: Hedge Short Leg (Sell OTM Option)</span>
            <span className="text-[10px] font-mono bg-purple-500/20 text-purple-200 px-2 py-0.5 rounded">
              Sell {underlying} {hedgeStrike} {optionType === "CALL" ? "CE" : "PE"}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 block mb-1">Hedge Strike (Short)</label>
              <input
                type="number"
                value={hedgeStrike}
                onFocus={handleManualInputFocus}
                onChange={(e) => {
                  handleManualInputFocus();
                  setHedgeStrike(Number(e.target.value));
                }}
                step="50"
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-white font-mono font-bold"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Hedge Premium Received (₹)</label>
              <input
                type="number"
                value={hedgePrice}
                onFocus={handleManualInputFocus}
                onChange={(e) => {
                  handleManualInputFocus();
                  setHedgePrice(Number(e.target.value));
                }}
                step="0.05"
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-white font-mono font-bold"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
