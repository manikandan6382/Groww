import React from "react";
import { KeyRound, LogIn, Link2 } from "lucide-react";
import { PortfolioHeroBento } from "../../components/trading/PortfolioHeroBento";
import { AssetAllocationDeck } from "../../components/trading/AssetAllocationDeck";
import { HoldingsTable } from "../../components/trading/HoldingsTable";
import { WatchlistSection } from "../../components/trading/WatchlistSection";
import { MarketPulseRadarDeck } from "../../components/trading/MarketPulseRadarDeck";
import { OptionChainRadarDeck } from "../../components/trading/OptionChainRadarDeck";
import { DashboardSyncBar } from "./DashboardSyncBar";
import { useDashboardPortfolio } from "./useDashboardPortfolio";

export function DashboardView() {
  const {
    refreshing,
    lastRefreshedAt,
    fetchError,
    loadPortfolio,
    holdings,
    positions,
    openPositionsCount,
    positionsTotalM2m,
    margins,
    totalCurrentValue,
    totalInvested,
    totalPnl,
    totalPnlPct,
    dayPnl,
    dayPnlPct,
    isMarketOpen,
    isKiteOffline,
    isExpired,
    userName,
    userId,
    handleConnectKite
  } = useDashboardPortfolio();

  return (
    <div className="space-y-6 pb-20">
      <DashboardSyncBar
        isMarketOpen={isMarketOpen}
        lastRefreshedAt={lastRefreshedAt}
        fetchError={fetchError}
        refreshing={refreshing}
        onRefresh={() => loadPortfolio(true)}
        isExpired={isExpired}
        isKiteOffline={isKiteOffline}
        userId={userId}
        userName={userName}
        onConnectKite={handleConnectKite}
      />

      {/* 🔐 Sleek Apple Vision Re-Authentication Banner (Compact & Smooth) */}
      {isExpired && (
        <div className="relative overflow-hidden rounded-2xl p-4 sm:p-5 border border-amber-500/25 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[0_8px_24px_rgba(245,158,11,0.12)]">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
              <KeyRound className="w-5 h-5 animate-pulse" />
            </div>
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xs font-black text-amber-200 tracking-wide uppercase font-mono">
                  Zerodha Kite Session Expired
                </h3>
                {userId && (
                  <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    ID: {userId}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed truncate max-w-xl">
                Daily broker tokens expire every morning at 06:00 AM IST per SEBI protocol. Click to renew.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleConnectKite}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs tracking-wider transition-all shadow-md active:scale-95 shrink-0 flex items-center justify-center gap-1.5 cursor-pointer font-mono"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Renew Session (1-Click)</span>
          </button>
        </div>
      )}

      {/* 🔌 Disconnected Alert Banner */}
      {isKiteOffline && !isExpired && (
        <div className="relative overflow-hidden rounded-2xl p-4 sm:p-5 border border-cyan-500/25 bg-gradient-to-r from-cyan-500/10 via-cyan-500/5 to-transparent backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[0_8px_24px_rgba(6,182,212,0.12)]">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 shadow-inner">
              <LogIn className="w-5 h-5" />
            </div>
            <div className="space-y-0.5 min-w-0">
              <h3 className="text-xs font-black text-cyan-200 tracking-wide uppercase font-mono">
                Connect Zerodha Kite Account
              </h3>
              <p className="text-[11px] text-slate-300 leading-relaxed truncate max-w-xl">
                Connect your Zerodha trading account to sync live Demat holdings, margins, and P&amp;L streaming.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleConnectKite}
            className="px-4 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-xs tracking-wider transition-all shadow-md active:scale-95 shrink-0 flex items-center justify-center gap-1.5 cursor-pointer font-mono"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Connect Kite (1-Click)</span>
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <PortfolioHeroBento
            holdings={holdings}
            margins={margins}
            totalCurrentValue={totalCurrentValue}
            totalInvested={totalInvested}
            totalPnl={totalPnl}
            totalPnlPct={totalPnlPct}
            dayPnl={dayPnl}
            dayPnlPct={dayPnlPct}
            isExpired={isExpired}
            isKiteOffline={isKiteOffline}
          />
        </div>

        <div className="lg:col-span-4">
          <AssetAllocationDeck holdings={holdings} margins={margins} />
        </div>
      </div>

      <HoldingsTable
        holdings={holdings}
        positions={positions}
        isExpired={isExpired}
        isKiteOffline={isKiteOffline}
        userId={userId}
        onConnectKite={handleConnectKite}
      />
      <WatchlistSection holdings={holdings} />
      <MarketPulseRadarDeck />
      <OptionChainRadarDeck />
    </div>
  );
}

export default DashboardView;
