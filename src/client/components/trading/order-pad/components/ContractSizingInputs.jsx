import React, { useRef, useEffect } from "react";
import { ChevronDown, Sparkles } from "lucide-react";
import clsx from "clsx";
import { IndexDropdownPopover } from "./IndexDropdownPopover";

export function ContractSizingInputs({
  optionType,
  underlying,
  strikePrice,
  setStrikePrice,
  entryPrice,
  setEntryPrice,
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

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-1.5">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          2️⃣ Contract Parameters &amp; Sizing
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => {
              const slDist = underlying === "SENSEX" ? 12.5 : underlying === "BANKNIFTY" ? 8.5 : 4.0;
              const tpDist = underlying === "SENSEX" ? 25.0 : underlying === "BANKNIFTY" ? 17.0 : 8.0;
              setStopLoss(Number((entryPrice - slDist).toFixed(2)));
              setTargetPrice(Number((entryPrice + tpDist).toFixed(2)));
            }}
            className="px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-[10px] font-mono font-bold transition flex items-center gap-1 shadow-sm cursor-pointer"
            title="Calibrate exact ₹250 SL / ₹500 TP for ₹10k account"
          >
            <Sparkles className="w-3 h-3 text-cyan-300" />
            <span>🏛️ ₹10k Greeks Rule</span>
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
            <label className="text-slate-400 font-medium">Entry Price (₹)</label>
            <span className="text-[10px] font-mono text-cyan-400 font-bold">{underlying} {strikePrice}</span>
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
            <div className="flex items-center gap-1">
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
