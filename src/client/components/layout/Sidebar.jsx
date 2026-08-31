import React from "react";
import { LayoutDashboard, Zap, BookOpen, Globe2, ShieldCheck, ExternalLink, Activity } from "lucide-react";
import { useTradingStore } from "../../stores/useTradingStore";
import { RollingTicker } from "../common/RollingTicker";
import clsx from "clsx";

export function Sidebar() {
  const { activeView, setActiveView, brokerStatus, journalTrades } = useTradingStore();

  // Compute Today's Session Metrics
  const todayStr = new Date().toISOString().split("T")[0];
  const todayTrades = (journalTrades || []).filter(
    (t) => (t.exitDatetime?.split("T")[0] || t.entryDatetime?.split("T")[0]) === todayStr
  );
  const todayNetPnl = todayTrades.reduce((acc, t) => acc + Number(t.netPnl || 0), 0);
  const todayWins = todayTrades.filter((t) => Number(t.netPnl || 0) > 0).length;
  const todayLosses = todayTrades.filter((t) => Number(t.netPnl || 0) <= 0).length;
  const isTodayProfitable = todayNetPnl >= 0;

  const navItems = [
    { id: "dashboard", label: "My Stocks & Wealth", sub: "Net Worth & Holdings", key: "1", icon: LayoutDashboard },
    { id: "paper", label: "Live Signals & Practice", sub: "Zero-Risk Paper Trading", key: "2", icon: Zap, live: true },
    { id: "journal", label: "Trading Journal", sub: "Take-Home Profit Stories", key: "3", icon: BookOpen },
    { id: "foreign", label: "Foreign Stocks", sub: "US Tech Giants (Alpha)", key: "4", icon: Globe2 },
  ];

  return (
    <aside className="hidden md:flex w-64 bg-[#060913]/85 backdrop-blur-3xl border-r border-white/[0.08] flex-col justify-between p-4 flex-shrink-0 h-screen sticky top-0 shadow-[0_16px_40px_rgba(0,0,0,0.6)]">
      <div className="space-y-4">
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-2">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-cyan-500 via-sky-400 to-indigo-600 p-0.5 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.4)] flex-shrink-0">
            <div className="w-full h-full bg-[#070c18] rounded-xl flex items-center justify-center">
              <Zap className="w-4 h-4 text-cyan-400 fill-cyan-400/20" />
            </div>
          </div>
          <div>
            <div className="font-extrabold tracking-tight text-white text-base leading-none font-mono">
              PORTFOLIO<span className="text-cyan-400">X</span>
            </div>
            <div className="text-[9px] font-extrabold text-cyan-400/90 tracking-widest mt-1 uppercase font-mono">
              SPATIAL DESK
            </div>
          </div>
        </div>

        {/* User Profile Pill */}
        <div className="p-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center font-bold text-white text-xs shadow-sm">
            M
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-white truncate font-mono">Manikandan</div>
            <div className="text-[10px] text-slate-400 truncate">@zerodha · Pro Scalper</div>
          </div>
          <span className="px-2 py-0.5 text-[9px] font-black bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 rounded-full font-mono">
            PRO
          </span>
        </div>

        {/* 🌟 Live Odometer Telemetry Deck */}
        <div className="p-3 rounded-2xl bg-[#080d1a]/80 border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] space-y-2">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span>Session Take-Home</span>
            </span>
            <span className="font-mono text-slate-400">
              {todayTrades.length > 0 ? `${todayWins}W · ${todayLosses}L` : "0 Trades"}
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <div className={clsx("font-mono text-sm font-black tracking-tight", isTodayProfitable ? "text-emerald-400" : "text-rose-400")}>
              <RollingTicker
                value={todayNetPnl}
                prefix="₹"
                showSign={true}
                decimalPlaces={2}
                className={isTodayProfitable ? "text-emerald-400 font-black" : "text-rose-400 font-black"}
              />
            </div>
            <span className={clsx("text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full", todayTrades.length > 0 ? (isTodayProfitable ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30" : "bg-rose-500/15 text-rose-300 border border-rose-500/30") : "bg-white/5 text-slate-400 border border-white/10")}>
              {todayTrades.length > 0 ? (isTodayProfitable ? "PROFIT" : "LOSS") : "FLAT"}
            </span>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="space-y-1.5" aria-label="Main Navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={clsx(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left transition-all duration-300 group relative cursor-pointer active:scale-95",
                  isActive
                    ? "bg-cyan-500/15 border border-cyan-500/30 text-white shadow-[0_4px_20px_rgba(6,182,212,0.2),inset_0_1px_0_rgba(255,255,255,0.2)]"
                    : "text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent"
                )}
              >
                <Icon className={clsx("w-4 h-4 flex-shrink-0 transition-transform group-hover:scale-110", isActive ? "text-cyan-400" : "text-slate-400 group-hover:text-white")} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold truncate">{item.label}</div>
                  <div className="text-[9px] text-slate-400 truncate">{item.sub}</div>
                </div>
                {item.live && <span className="pulse-beacon" />}
                <kbd className="apple-kbd">{item.key}</kbd>
              </button>
            );
          })}
        </nav>

        {/* Dual Broker Hub */}
        <div className="p-3 rounded-2xl bg-[#080d1a]/80 border border-white/[0.08] space-y-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>Live Broker Hub</span>
            </div>
            <span className="text-[8px] text-slate-400 font-mono uppercase">OAuth Sync</span>
          </div>

          <div className="space-y-2">
            {/* Zerodha Kite */}
            <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center font-black text-[10px]">
                  K
                </span>
                <span className="text-xs font-semibold text-slate-200">Zerodha</span>
              </div>
              <a
                href="https://kite.zerodha.com/connect/login?v=3&api_key=3fm9odz8emxrymjo"
                target="_blank"
                rel="noreferrer"
                className="text-[10px] px-2 py-1 bg-orange-500/10 hover:bg-orange-500/20 text-orange-300 rounded-lg border border-orange-500/20 flex items-center gap-1 transition font-mono"
              >
                <span>Login</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>

            {/* Upstox Pro */}
            <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center font-black text-[10px]">
                  U
                </span>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-slate-200">Upstox Pro</span>
                  <span className="text-[9px] text-emerald-400 font-medium">
                    {brokerStatus.upstoxConnected ? "Feed Active" : "OAuth Ready"}
                  </span>
                </div>
              </div>
              <a
                href="https://api.upstox.com/v2/login/authorization/dialog?response_type=code&client_id=61557114-951e-4b68-af88-e5121939f2e4&redirect_uri=http://127.0.0.1:3003/upstox/callback"
                target="_blank"
                rel="noreferrer"
                className="text-[10px] px-2 py-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 rounded-lg border border-purple-500/20 flex items-center gap-1 transition font-mono"
              >
                <span>Login</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-3 border-t border-white/5 text-[10px] text-slate-400 flex items-center justify-between px-2 font-mono">
        <span>Spatial Atmosphere</span>
        <span className="px-2 py-0.5 bg-white/5 rounded-full text-[9px] font-mono text-cyan-400 border border-white/10">
          Vision Pro
        </span>
      </div>
    </aside>
  );
}
