import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Radio, X, Check, Clock, RotateCcw } from "lucide-react";
import clsx from "clsx";
import { useTradingStore } from "../../../../stores/useTradingStore";
import { soundEngine } from "../../../../utils/soundEngine";

export function CopilotSignalBeacon({
  onApplySignal,
  currentStrike,
  currentOptionType,
  currentSl,
  currentTp
}) {
  const signal = useTradingStore((state) => state.copilotSignal);
  const setCopilotSignal = useTradingStore((state) => state.setCopilotSignal);
  const clearCopilotSignal = useTradingStore((state) => state.clearCopilotSignal);

  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [hasApplied, setHasApplied] = useState(false);
  const [lastSignalId, setLastSignalId] = useState(null);

  // Single initial cold-start hydration if store is empty on mount (Level 3 zero-polling)
  useEffect(() => {
    let isMounted = true;
    if (!signal) {
      fetch("/api/copilot/signal")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (isMounted && data?.signal && data.signal.expiresAt > Date.now()) {
            setCopilotSignal(data.signal);
          }
        })
        .catch(() => {});
    }
    return () => {
      isMounted = false;
    };
  }, [signal, setCopilotSignal]);

  // When a fresh signal arrives via SSE, notify user with chime and reset application state
  useEffect(() => {
    if (signal?.id && signal.id !== lastSignalId) {
      setLastSignalId(signal.id);
      setHasApplied(false);
      soundEngine?.playTargetChime?.();
    }
  }, [signal?.id, lastSignalId]);

  // Countdown timer effect
  useEffect(() => {
    if (!signal?.expiresAt) {
      setSecondsRemaining(0);
      return;
    }

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((signal.expiresAt - Date.now()) / 1000));
      setSecondsRemaining(remaining);
      if (remaining <= 0) {
        clearCopilotSignal();
        setHasApplied(false);
      }
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [signal?.expiresAt, clearCopilotSignal]);

  // Detect whether current form parameters have diverged from the applied signal
  const isCustomized = useMemo(() => {
    if (!hasApplied || !signal) return false;
    const strikeMatch = currentStrike == null || Number(currentStrike) === Number(signal.strikePrice);
    const optionMatch = !currentOptionType || String(currentOptionType).toUpperCase() === String(signal.optionType).toUpperCase();
    const slMatch = currentSl == null || Math.abs(Number(currentSl) - Number(signal.stopLoss)) < 0.1;
    const tpMatch = currentTp == null || Math.abs(Number(currentTp) - Number(signal.targetPrice)) < 0.1;
    return !(strikeMatch && optionMatch && slMatch && tpMatch);
  }, [hasApplied, signal, currentStrike, currentOptionType, currentSl, currentTp]);

  const handleApply = useCallback(() => {
    if (!signal) return;
    setHasApplied(true);
    if (typeof onApplySignal === "function") {
      onApplySignal(signal);
    }
  }, [signal, onApplySignal]);

  const handleDismiss = useCallback(async () => {
    clearCopilotSignal();
    setHasApplied(false);
    try {
      await fetch("/api/copilot/signal", { method: "DELETE" });
    } catch {}
  }, [clearCopilotSignal]);

  const isVisible = Boolean(signal && secondsRemaining > 0);
  const isCall = signal?.optionType === "CALL";
  const mins = Math.floor(secondsRemaining / 60);
  const secs = secondsRemaining % 60;
  const timeFormatted = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key={signal.id || "copilot-beacon"}
          initial={{ opacity: 0, height: 0, scale: 0.98 }}
          animate={{ opacity: 1, height: "auto", scale: 1 }}
          exit={{ opacity: 0, height: 0, scale: 0.98 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="overflow-hidden"
        >
          <div
            className={clsx(
              "relative overflow-hidden p-3.5 sm:p-4 rounded-2xl border transition-all duration-300 shadow-xl backdrop-blur-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3",
              isCall
                ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-100 shadow-emerald-950/20"
                : "bg-rose-950/40 border-rose-500/40 text-rose-100 shadow-rose-950/20"
            )}
          >
            {/* Background ambient pulse */}
            <div
              className={clsx(
                "absolute -top-12 -right-12 w-48 h-48 rounded-full blur-2xl pointer-events-none opacity-20",
                isCall ? "bg-emerald-400" : "bg-rose-400"
              )}
            />

            {/* Left: Signal metadata */}
            <div className="flex items-start sm:items-center gap-3 min-w-0">
              <div
                className={clsx(
                  "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border shadow-inner",
                  isCall
                    ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                    : "bg-rose-500/20 border-rose-500/40 text-rose-300"
                )}
              >
                <Radio className="w-4 h-4 animate-pulse" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] uppercase font-black tracking-widest px-2 py-0.5 rounded-full bg-white/10 border border-white/10">
                    Copilot Signal Beacon
                  </span>
                  <strong className="text-white text-xs font-mono font-black">
                    {signal.symbol}
                  </strong>
                  <span className="text-slate-400 text-xs">@ ₹{Number(signal.entryPrice || 0).toFixed(2)}</span>
                  <span
                    className={clsx(
                      "text-[10px] font-mono font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border",
                      secondsRemaining < 60
                        ? "bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse"
                        : "bg-white/5 text-slate-300 border-white/10"
                    )}
                  >
                    <Clock className="w-2.5 h-2.5" />
                    <span>Expires {timeFormatted}</span>
                  </span>
                </div>

                <div className="text-[11px] text-slate-300 flex items-center gap-2 mt-0.5 font-mono tabular-nums flex-wrap">
                  <span className="text-rose-400 font-semibold">SL: ₹{Number(signal.stopLoss || 0).toFixed(2)}</span>
                  <span>·</span>
                  <span className="text-emerald-400 font-semibold">TP: ₹{Number(signal.targetPrice || 0).toFixed(2)}</span>
                  {signal.reason && (
                    <>
                      <span>·</span>
                      <span className="text-slate-400 italic truncate max-w-xs">{signal.reason}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              {hasApplied && !isCustomized ? (
                <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold font-mono flex items-center gap-1.5 shadow-sm">
                  <Check className="w-3.5 h-3.5" />
                  <span>Setup Loaded</span>
                </span>
              ) : hasApplied && isCustomized ? (
                <button
                  type="button"
                  onClick={handleApply}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold font-mono flex items-center gap-1.5 shadow-sm cursor-pointer transition active:scale-95"
                  title="Form values diverged from signal. Click to re-align."
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Setup Customized (Reset)</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleApply}
                  className={clsx(
                    "px-4 py-2 rounded-xl text-xs font-black font-mono transition-all flex items-center gap-1.5 shadow-lg cursor-pointer active:scale-95",
                    isCall
                      ? "bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 text-black shadow-emerald-500/25"
                      : "bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-400 text-black shadow-rose-500/25"
                  )}
                >
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  <span>1-Click Load Setup</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleDismiss}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 transition cursor-pointer"
                title="Dismiss signal"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
