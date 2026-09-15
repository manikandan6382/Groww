import React from "react";

export function QuickScalpActions({ onAction, deployPracticeTrade, setActiveView }) {
  return (
    <div>
      <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
        ⚡ Quick Scalp Actions
      </div>
      <div className="space-y-1 mt-1">
        <button
          type="button"
          onClick={() => onAction(() => {
            deployPracticeTrade({
              symbol: "NIFTY 24300 CE",
              underlyingSymbol: "NIFTY",
              strikePrice: 24300,
              optionType: "CALL",
              entryPrice: 83.0,
              targetPrice: 91.0,
              stopLoss: 79.0,
              quantity: 1,
              lotSize: 65,
              entryReason: "Cmd+K Quick Scalp",
              strategyMode: "NAKED"
            });
            setActiveView("paper");
          })}
          className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-white/[0.06] text-left transition group cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <span className="text-cyan-400 font-bold">🎯</span>
            <div>
              <div className="text-sm font-bold text-white group-hover:text-cyan-300">
                Scalp NIFTY Call (24300 CE)
              </div>
              <div className="text-xs text-slate-400">Auto-fill 1 Lot · ₹83.00 Entry · 4 pt SL (₹260 Risk) · 8 pt Target (₹520 Aim)</div>
            </div>
          </div>
          <kbd className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-slate-300">1</kbd>
        </button>

        <button
          type="button"
          onClick={() => onAction(() => {
            deployPracticeTrade({
              symbol: "BANKNIFTY 52200 PE",
              underlyingSymbol: "BANKNIFTY",
              strikePrice: 52200,
              optionType: "PUT",
              entryPrice: 145.0,
              targetPrice: 162.0,
              stopLoss: 136.5,
              quantity: 1,
              lotSize: 30,
              entryReason: "Cmd+K Quick Scalp",
              strategyMode: "NAKED"
            });
            setActiveView("paper");
          })}
          className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-white/[0.06] text-left transition group cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <span className="text-rose-400 font-bold">🛡️</span>
            <div>
              <div className="text-sm font-bold text-white group-hover:text-rose-300">
                Scalp BANKNIFTY Put (52200 PE)
              </div>
              <div className="text-xs text-slate-400">Auto-fill 1 Lot · ₹145.00 Entry · +40 pt Target</div>
            </div>
          </div>
          <kbd className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-slate-300">2</kbd>
        </button>
      </div>
    </div>
  );
}
