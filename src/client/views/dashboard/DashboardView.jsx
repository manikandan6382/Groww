import React from "react";
import { KeyRound, LogIn, Link2 } from "lucide-react";
import { PortfolioHeroBento } from "../../components/trading/PortfolioHeroBento";
import { AssetAllocationDeck } from "../../components/trading/AssetAllocationDeck";
import { HoldingsTable } from "../../components/trading/HoldingsTable";
import { WatchlistSection } from "../../components/trading/WatchlistSection";
import { DashboardSyncBar } from "./DashboardSyncBar";
import { useDashboardPortfolio } from "./useDashboardPortfolio";

export function DashboardView() {
  const {
    refreshing,
    lastRefreshedAt,
    fetchError,
    loadPortfolio,
    holdings,
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
    <div className="space-y-6">
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

      {/* 🔐 Apple Vision Frosted Glass Re-Authentication Alert Banner */}
      {isExpired && (
        <div className="relative overflow-hidden rounded-3xl p-5 sm:p-6 border border-amber-500/30 bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent backdrop-blur-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_12px_36px_rgba(245,158,11,0.15)]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-[0_0_16px_rgba(245,158,11,0.25)]">
              <KeyRound className="w-6 h-6 animate-pulse" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-black text-amber-200 tracking-wide uppercase font-mono">
                  Zerodha Kite Session Expired
                </h3>
                {userId && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {userId}
                  </span>
                )}
                {userName && (
                  <span className="text-[10px] text-slate-400 font-medium">
                    ({userName})
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                SEBI regulations reset Zerodha Kite access tokens daily at 06:00 AM IST. Click below to re-authenticate with Kite in 1 click and immediately stream your live holdings, intraday P&amp;L, and cash margins.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleConnectKite}
            className="px-5 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs tracking-wider transition-all shadow-[0_4px_20px_rgba(245,158,11,0.35)] active:scale-95 shrink-0 flex items-center justify-center gap-2 cursor-pointer font-mono"
          >
            <LogIn className="w-4 h-4" />
            <span>Renew Kite Session (1-Click)</span>
          </button>
        </div>
      )}

      {isKiteOffline && !isExpired && (
        <div className="relative overflow-hidden rounded-3xl p-5 sm:p-6 border border-cyan-500/30 bg-gradient-to-r from-cyan-500/15 via-cyan-500/5 to-transparent backdrop-blur-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_12px_36px_rgba(6,182,212,0.15)]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 shadow-[0_0_16px_rgba(6,182,212,0.25)]">
              <Link2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-black text-cyan-200 tracking-wide uppercase font-mono">
                Connect Zerodha Kite Broker
              </h3>
              <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                Link your Zerodha Kite broker account to sync your real Demat equity portfolio, live stock valuations, and trade execution.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleConnectKite}
            className="px-5 py-2.5 rounded-2xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-xs tracking-wider transition-all shadow-[0_4px_20px_rgba(6,182,212,0.35)] active:scale-95 shrink-0 flex items-center justify-center gap-2 cursor-pointer font-mono"
          >
            <LogIn className="w-4 h-4" />
            <span>Connect Kite (1-Click)</span>
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 xl:col-span-8">
          <PortfolioHeroBento
            holdings={holdings}
            margins={margins}
            totalCurrentValue={totalCurrentValue}
            totalInvested={totalInvested}
            totalPnl={totalPnl}
            totalPnlPct={totalPnlPct}
            dayPnl={dayPnl}
            dayPnlPct={dayPnlPct}
          />
        </div>

        <div className="lg:col-span-5 xl:col-span-4">
          <AssetAllocationDeck holdings={holdings} margins={margins} />
        </div>
      </div>

      <HoldingsTable
        holdings={holdings}
        isExpired={isExpired}
        isKiteOffline={isKiteOffline}
        userId={userId}
        onConnectKite={handleConnectKite}
      />
      <WatchlistSection />
    </div>
  );
}

export default DashboardView;
