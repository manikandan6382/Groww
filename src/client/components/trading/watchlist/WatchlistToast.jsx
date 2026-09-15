import React from "react";
import { Check } from "lucide-react";

export const WatchlistToast = React.memo(function WatchlistToast({ message }) {
  if (!message) return null;

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-[100] px-4 py-2.5 rounded-2xl bg-[#121424]/95 border border-white/10 text-white text-xs font-mono font-bold shadow-[0_16px_40px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4 duration-200">
      <Check className="w-4 h-4 text-emerald-400" />
      <span>{message}</span>
    </div>
  );
});
