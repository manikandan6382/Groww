import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { AlertOctagon, ShieldX, CheckCircle2, ArrowUpRight } from "lucide-react";
import clsx from "clsx";
import { useTradingStore } from "../../stores/useTradingStore";
import { useLivePriceStore } from "../../stores/useLivePriceStore";
import { resolveIndexLotSize } from "../../stores/slices/tradeHelpers";
import { panicSquareOffAllDotnet } from "../../services/dotnetTradingService";
import { soundEngine } from "../../utils/soundEngine";
import { SquareOffAllModal } from "../../views/live-alerts/SquareOffAllModal";

const HOLD_DURATION_MS = 400;

export function EmergencyPanicHud() {
  const openAlerts = useTradingStore((s) => s.openAlerts || []);
  const squareOffAll = useTradingStore((s) => s.squareOffAll);
  const ticks = useLivePriceStore((s) => s.ticks);

  const [holdProgress, setHoldProgress] = useState(0);
  const [isLiquidating, setIsLiquidating] = useState(false);
  const [justLiquidated, setJustLiquidated] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const holdStartRef = useRef(0);
  const animFrameRef = useRef(null);

  const openCount = openAlerts.length;

  const totalOpenPnl = useMemo(() => {
    return openAlerts.reduce((acc, t) => {
      const liveMark = ticks?.[t.id]?.ltp ?? t.lastMarkPrice ?? t.entryPrice ?? 0;
      const entry = Number(t.entryPrice ?? 0);
      const lot = resolveIndexLotSize(t.symbol, t.lotSize);
      const rawQty = Number(t.quantity || 1);
      const lots = (rawQty >= lot && rawQty % lot === 0) ? (rawQty / lot) : rawQty;
      const totalQty = t.totalQty ? Number(t.totalQty) : (Math.max(1, lots) * lot);
      const isShort = t.direction === "SHORT" || t.direction === "SELL";
      const isPut = t.optionType === "PUT" || t.symbol?.includes("PE");
      const diff = (isShort || isPut) ? (entry - liveMark) : (liveMark - entry);
      return acc + (diff * totalQty);
    }, 0);
  }, [openAlerts, ticks]);

  const triggerPanicLiquidation = useCallback(async () => {
    if (isLiquidating) return;
    setIsLiquidating(true);
    soundEngine?.playPanicSquareOffTone?.() || soundEngine?.playOrderReject?.();

    try {
      // 1. Trigger .NET RMS high-speed panic liquidation
      await panicSquareOffAllDotnet().catch(() => {});
      // 2. Synchronize client-side open trade alerts
      squareOffAll?.();
      setJustLiquidated(true);
      setTimeout(() => setJustLiquidated(false), 4000);
    } finally {
      setIsLiquidating(false);
      setHoldProgress(0);
    }
  }, [isLiquidating, squareOffAll]);

  const handlePointerDown = () => {
    if (openCount === 0 || isLiquidating) return;
    holdStartRef.current = Date.now();

    const updateProgress = () => {
      const elapsed = Date.now() - holdStartRef.current;
      const pct = Math.min(100, (elapsed / HOLD_DURATION_MS) * 100);
      setHoldProgress(pct);

      if (elapsed >= HOLD_DURATION_MS) {
        triggerPanicLiquidation();
      } else {
        animFrameRef.current = requestAnimationFrame(updateProgress);
      }
    };
    animFrameRef.current = requestAnimationFrame(updateProgress);
  };

  const handlePointerUp = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    setHoldProgress(0);
  };

  // ⌨️ Keyboard Accelerator: Shift + X
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.shiftKey && (e.key === "X" || e.key === "x")) {
        const target = e.target;
        const isInput = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA";
        if (!isInput && openCount > 0) {
          e.preventDefault();
          triggerPanicLiquidation();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [openCount, triggerPanicLiquidation]);

  if (openCount === 0 && !justLiquidated) return null;

  return (
    <>
      <aside
        aria-label="Unified Emergency Command Dock"
        className="fixed bottom-20 md:bottom-6 right-4 md:right-8 z-50 select-none animate-in fade-in slide-in-from-bottom-4 duration-300"
      >
        <div
          className={clsx(
            "relative overflow-hidden rounded-2xl border p-2.5 sm:p-3 shadow-2xl backdrop-blur-3xl transition-all duration-300 flex items-center gap-3",
            justLiquidated
              ? "bg-emerald-950/90 border-emerald-500/40 text-emerald-200"
              : "bg-[#0c0e17]/95 border-rose-500/30 text-slate-100 shadow-[0_16px_45px_rgba(0,0,0,0.7),0_0_25px_rgba(225,29,72,0.15)]"
          )}
        >
          {/* Progress Fill Bar during 400ms Hold */}
          {holdProgress > 0 && (
            <div
              className="absolute inset-0 bg-rose-600/35 transition-all pointer-events-none"
              style={{ width: `${holdProgress}%` }}
            />
          )}

          {/* Telemetry Block */}
          <div className="flex items-center gap-2.5 pr-1 border-r border-white/10">
            <span
              className={clsx(
                "w-2.5 h-2.5 rounded-full shrink-0",
                justLiquidated
                  ? "bg-emerald-400"
                  : totalOpenPnl >= 0
                  ? "bg-emerald-400 animate-ping"
                  : "bg-rose-500 animate-ping"
              )}
            />
            <div className="text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-mono">
                  {justLiquidated ? "Closed" : "Net MTM"}
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-white/5 border border-white/10 text-slate-300">
                  {openCount} Live
                </span>
              </div>
              <div
                className={clsx(
                  "font-mono font-black text-xs sm:text-sm tabular-nums",
                  totalOpenPnl >= 0 ? "text-emerald-400" : "text-rose-400"
                )}
              >
                {totalOpenPnl >= 0 ? "+" : ""}₹{totalOpenPnl.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Jump to Cards Shortcut */}
          {!justLiquidated && (
            <button
              type="button"
              onClick={() => {
                const activeSection =
                  document.getElementById("active-practice-trades") ||
                  document.getElementById("order-cockpit");
                activeSection?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              title="Scroll to active trade cards"
              className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-bold text-slate-300 hover:text-white transition cursor-pointer"
            >
              <span>Cards</span>
              <ArrowUpRight className="w-3 h-3 text-slate-400" />
            </button>
          )}

          {/* Exit Actions */}
          {!justLiquidated ? (
            <div className="flex items-center gap-1.5">
              {/* Graceful Modal Trigger */}
              <button
                type="button"
                onClick={() => setShowModal(true)}
                className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-rose-500/15 border border-white/10 hover:border-rose-500/30 text-[11px] font-bold text-rose-300 hover:text-rose-200 transition cursor-pointer flex items-center gap-1"
              >
                <ShieldX className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden xs:inline">Square Off</span>
              </button>

              {/* Instant Panic Kill Switch (Hold 400ms or Shift+X) */}
              <button
                type="button"
                onMouseDown={handlePointerDown}
                onMouseUp={handlePointerUp}
                onMouseLeave={handlePointerUp}
                onTouchStart={handlePointerDown}
                onTouchEnd={handlePointerUp}
                disabled={isLiquidating}
                title="Hold 400ms or press Shift+X to liquidate instantly without dialog"
                className="relative px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 active:scale-95 text-white font-black text-xs transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-rose-600/35 overflow-hidden"
              >
                <AlertOctagon className="w-3.5 h-3.5 shrink-0" />
                <span>{isLiquidating ? "Liquidating..." : "PANIC ALL"}</span>
                <kbd className="hidden sm:inline-block text-[9px] font-mono px-1 py-0.2 rounded bg-black/40 border border-white/20 text-rose-100 font-bold ml-0.5">
                  Shift+X
                </kbd>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 pr-2 text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-xs font-bold font-mono">All Positions Liquidated Cleanly</span>
            </div>
          )}
        </div>
      </aside>

      {/* Graceful Dual-Confirmation Modal */}
      <SquareOffAllModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onConfirm={() => {
          squareOffAll?.();
          setShowModal(false);
          setJustLiquidated(true);
          soundEngine?.playOrderSuccess?.();
          setTimeout(() => setJustLiquidated(false), 4000);
        }}
        openAlertsCount={openCount}
        totalOpenPnl={totalOpenPnl}
      />
    </>
  );
}
