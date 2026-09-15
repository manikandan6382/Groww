import React from "react";
import clsx from "clsx";
import { RotateCcw } from "lucide-react";
import { soundEngine } from "../../../utils/soundEngine";
import { PRESET_TRADE_TEMPLATES } from "./presetTradeTemplates";

export function PresetTemplatesTab({ onLogTrade, onResetTrades, onClose }) {
  const handleAddPreset = (template) => {
    const now = new Date();
    const trade = {
      id: Date.now(),
      entryDatetime: now.toISOString(),
      exitDatetime: new Date(now.getTime() + 18 * 60000).toISOString(),
      ...template.trade
    };
    onLogTrade(trade);
    soundEngine.playSuccessTone();
    onClose();
  };

  return (
    <div className="space-y-3">
      <p className="text-slate-400 text-xs">
        Instantly populate your journal with realistic, high-conviction institutional trade templates:
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {PRESET_TRADE_TEMPLATES.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => handleAddPreset(item)}
            className={clsx(
              "p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-left transition group space-y-2 cursor-pointer",
              item.cardHover
            )}
          >
            <div className="flex items-center justify-between">
              <strong className="text-white font-mono font-bold">{item.title}</strong>
              <span className={clsx("text-xs font-mono font-bold", item.isWin ? "text-emerald-400" : "text-rose-400")}>
                {item.pnlBadge}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">{item.desc}</p>
            <span className={clsx("text-[10px] font-bold group-hover:underline block", item.btnColor)}>
              {item.btnLabel}
            </span>
          </button>
        ))}
      </div>

      {/* Reset to Model Data Button */}
      <div className="pt-3 border-t border-white/5 flex items-center justify-between">
        <span className="text-[11px] text-slate-500">Want to restore initial sample model trades?</span>
        <button
          type="button"
          onClick={() => { onResetTrades(); onClose(); }}
          className="px-3 py-1.5 rounded-xl bg-white/[0.03] hover:bg-rose-500/10 border border-white/10 hover:border-rose-500/30 text-slate-400 hover:text-rose-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset to Initial Model Seed</span>
        </button>
      </div>
    </div>
  );
}
