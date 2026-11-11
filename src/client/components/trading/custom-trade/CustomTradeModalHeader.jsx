import React from "react";
import clsx from "clsx";
import { Plus, X } from "lucide-react";
import { soundEngine } from "../../../utils/soundEngine";

const MODAL_TABS = [
  { id: "manual", label: "✍️ Manual Custom Entry" },
  { id: "presets", label: "⚡ 1-Click Sample Templates" },
  { id: "bulk", label: "📋 Bulk JSON Paste" },
  { id: "backup", label: "💾 Backup & Restore Brain" }
];

export function CustomTradeModalHeader({
  activeTab,
  setActiveTab,
  onClose
}) {
  return (
    <>
      {/* iOS Tactile Drag Grabber (Mobile only) */}
      <div className="sm:hidden pt-2.5 pb-0.5 flex justify-center cursor-grab active:cursor-grabbing bg-white/[0.02]">
        <div className="w-12 h-1.5 rounded-full bg-white/25 shadow-sm" />
      </div>

      {/* Modal Header */}
      <div className="p-4 sm:p-5 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center font-bold">
            <Plus className="w-4 h-4 stroke-[3]" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Add Custom Trade &amp; Data</h2>
            <p className="text-[11px] text-slate-400">Log custom stock, option, or future trades with full forensic story analytics.</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Modal Navigation Tabs */}
      <div className="flex items-center gap-2 px-5 pt-3 border-b border-white/5 bg-white/[0.01] overflow-x-auto">
        {MODAL_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              soundEngine.playTabSwitchTone();
              setActiveTab(tab.id);
            }}
            className={clsx(
              "px-3 py-2 text-xs font-bold border-b-2 transition whitespace-nowrap cursor-pointer",
              activeTab === tab.id
                ? "border-cyan-400 text-cyan-300 bg-cyan-500/5"
                : "border-transparent text-slate-400 hover:text-slate-200"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </>
  );
}
