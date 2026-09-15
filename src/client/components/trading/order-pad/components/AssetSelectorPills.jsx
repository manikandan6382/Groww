import React from "react";
import { INDEX_ASSETS } from "../constants";

export function AssetSelectorPills({ activeAssetKey, onSelectAsset }) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
      {INDEX_ASSETS.map((asset) => {
        const isSelected = asset.key === activeAssetKey;
        return (
          <button
            key={asset.key}
            onClick={() => onSelectAsset(asset)}
            className={`px-3 py-2 rounded-xl border text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
              isSelected
                ? "border-indigo-500/50 bg-indigo-500/15 text-indigo-200 shadow-[0_0_12px_rgba(99,102,241,0.25)]"
                : "border-white/5 bg-white/[0.02] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.05]"
            }`}
          >
            <span>{asset.name}</span>
            <span className={`text-[10px] font-mono ${asset.positive ? "text-emerald-400" : "text-rose-400"}`}>
              {asset.change}
            </span>
          </button>
        );
      })}
    </div>
  );
}
