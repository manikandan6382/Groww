import React from "react";
import { soundEngine } from "../../utils/soundEngine";
import { LiveAlertCard } from "../../components/trading/LiveAlertCard";
import { ViewErrorBoundary } from "../../components/common/ViewErrorBoundary";
import { Zap } from "lucide-react";

export function ActiveTradesList({
  openAlerts,
  activeTradesViewMode,
  onCloseTrade,
  onAutoDeploy
}) {
  if (openAlerts.length === 0) {
    return (
      <div className="empty-trades-dock py-12 px-6 rounded-2xl bg-white/[0.01] border border-dashed border-white/10 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-2xl mx-auto shadow-inner">
          🏖️
        </div>
        <div className="space-y-1">
          <div className="text-base font-bold text-white tracking-tight">No Active Practice Trades</div>
          <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
            Configure an Option Scalp in Section 2 above and click <strong className="text-cyan-300">Deploy Live Practice Trade</strong>, or auto-deploy below:
          </p>
        </div>
        <div className="flex items-center justify-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => {
              soundEngine.playOrderFillTone();
              onAutoDeploy({ underlying: "NIFTY", strikePrice: 24500, entryPrice: 85.0, stopLoss: 75.0, targetPrice: 105.0 });
            }}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-400 hover:from-cyan-400 text-black font-extrabold text-xs shadow-lg shadow-cyan-500/20 active:scale-95 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>🚀 Instant 1-Lot NIFTY Scalp</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full">
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
