import React from "react";
import clsx from "clsx";
import { LiveAlertCard } from "../../components/trading/LiveAlertCard";
import { ViewErrorBoundary } from "../../components/common/ViewErrorBoundary";
import { useTradingStore } from "../../stores/useTradingStore";

export function ActiveTradesList({
  openAlerts,
  activeTradesViewMode,
  onCloseTrade
}) {
  const tiltLockoutUntil = useTradingStore((s) => s.tiltLockoutUntil || 0);
  const tiltReason = useTradingStore((s) => s.tiltReason);
  const [secondsRemaining, setSecondsRemaining] = React.useState(0);

  React.useEffect(() => {
    if (!tiltLockoutUntil) {
      setSecondsRemaining(0);
      return;
    }

    const update = () => {
      const remaining = Math.max(0, Math.ceil((tiltLockoutUntil - Date.now()) / 1000));
      setSecondsRemaining(remaining);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [tiltLockoutUntil]);

  const renderTiltBanner = () => {
    if (secondsRemaining <= 0) return null;
    return (
      <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[0_0_25px_rgba(244,63,94,0.15)] animate-in fade-in duration-300">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center font-bold text-lg shrink-0">
            🛡️
          </div>
          <div>
            <div className="text-xs font-black uppercase tracking-wider text-rose-200 flex items-center gap-2">
              <span>Anti-Tilt Psych Shield Active</span>
              <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-200 font-mono text-[10px] font-bold border border-rose-500/30">
                {secondsRemaining}s COOLING LOCKOUT
              </span>
            </div>
            <p className="text-[11px] text-rose-300/80 mt-0.5">
              {tiltReason || "Stop Loss hit. Take 30 seconds to breathe and analyze structure before re-entering."}
            </p>
          </div>
        </div>
        <div className="w-full sm:w-32 bg-white/10 h-2 rounded-full overflow-hidden self-center border border-white/5 shrink-0">
          <div 
            className="bg-gradient-to-r from-rose-500 to-amber-400 h-full transition-all duration-1000 ease-linear rounded-full"
            style={{ width: `${Math.min(100, (secondsRemaining / 30) * 100)}%` }}
          />
        </div>
      </div>
    );
  };

  if (openAlerts.length === 0) {
    return (
      <div className="space-y-4">
        {renderTiltBanner()}
        <div className="empty-trades-dock py-14 px-6 rounded-3xl bg-white/[0.01] border border-dashed border-white/10 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-3xl mx-auto shadow-inner">
            🏖️
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <div className="text-base font-bold text-white tracking-tight">No Active Practice Trades</div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Your trading desk is flat. Configure your strike, quantity, and risk budget in the <strong className="text-cyan-300">Order Pad</strong> above and click <strong className="text-cyan-300">Deploy Live Practice Trade</strong> when your technical setup confirms.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={clsx("flex flex-col w-full", activeTradesViewMode === "compact" ? "gap-2.5" : "gap-6")}>
      {renderTiltBanner()}
      {openAlerts.map((trade) => (
        <ViewErrorBoundary key={trade.id} fallbackTitle="Active Practice Trade Card Unavailable">
          <LiveAlertCard 
            alert={trade}
            viewMode={activeTradesViewMode}
            onClose={(tradeId, exitPrice) => onCloseTrade(tradeId, exitPrice)} 
          />
        </ViewErrorBoundary>
      ))}
    </div>
  );
}
