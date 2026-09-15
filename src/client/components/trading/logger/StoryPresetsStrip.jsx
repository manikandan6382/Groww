import React from "react";
import clsx from "clsx";
import { Sparkles } from "lucide-react";
import { STORY_PRESETS } from "./loggerPresetsData";

export function StoryPresetsStrip({ onApplyStory }) {
  return (
    <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
      <div className="flex items-center justify-between text-[11px]">
        <span className="font-bold text-slate-300 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>1-Click Story Presets (Zero Typing):</span>
        </span>
        <span className="text-[10px] text-slate-500 font-mono">Click any pill to auto-fill setup &amp; psychology</span>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs flex-nowrap scrollbar-none">
        {STORY_PRESETS.map((p) => (
          <button
            key={p.tag}
            type="button"
            onClick={() => onApplyStory(p.tag, p.notes, p.emotion, p.conf, p.mistake)}
            className={clsx(
              "px-2.5 py-1 rounded-xl border text-[11px] font-bold whitespace-nowrap transition flex items-center gap-1 cursor-pointer",
              p.btnClass
            )}
          >
            <span>{p.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
