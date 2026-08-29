import React from "react";
import { LayoutDashboard, Zap, BookOpen, Globe2, ShieldCheck, ExternalLink } from "lucide-react";
import { useTradingStore } from "../../stores/useTradingStore";
import clsx from "clsx";

export function Sidebar() {
  const { activeView, setActiveView, brokerStatus } = useTradingStore();

  const navItems = [
    { id: "dashboard", label: "My Stocks & Wealth", sub: "Net Worth & Holdings", key: "1", icon: LayoutDashboard },
    { id: "paper", label: "Live Signals & Practice", sub: "Zero-Risk Paper Trading", key: "2", icon: Zap, live: true },
    { id: "journal", label: "Trading Journal", sub: "Take-Home Profit Stories", key: "3", icon: BookOpen },
    { id: "foreign", label: "Foreign Stocks", sub: "US Tech Giants (Alpha)", key: "4", icon: Globe2 },
  ];

  return (
    <aside className="hidden md:flex w-64 bg-app-sidebar border-r border-white/5 flex-col justify-between p-4 flex-shrink-0 h-screen sticky top-0">
      <div className="space-y-6">
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <div>
            <div className="font-extrabold tracking-tight text-white text-base leading-none">PortfolioX</div>
            <div className="text-[10px] font-bold text-cyan-400 tracking-wider mt-1 uppercase">Pro Command</div>
          </div>
        </div>

        {/* User Profile Pill */}
        <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white text-sm">
            M
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-white truncate">Manikandan</div>
            <div className="text-[10px] text-slate-400 truncate">@zerodha · Scalper</div>
          </div>
          <span className="px-1.5 py-0.5 text-[9px] font-extrabold bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded-md">
            PRO
          </span>
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
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all group relative",
                  isActive
                    ? "bg-cyan-500/10 border border-cyan-500/30 text-white shadow-sm"
                    : "text-slate-400 hover:text-white hover:bg-white/[0.03] border border-transparent"
                )}
              >
                <Icon className={clsx("w-4 h-4 flex-shrink-0", isActive ? "text-cyan-400" : "text-slate-400 group-hover:text-white")} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold truncate">{item.label}</div>
                  <div className="text-[10px] text-slate-400 truncate">{item.sub}</div>
                </div>
                {item.live && <span className="pulse-beacon" />}
                <kbd className="apple-kbd">{item.key}</kbd>
              </button>
            );
          })}
        </nav>

        {/* Dual Broker Hub */}
        <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
            <div className="flex items-center gap-1.5">
              <span className="pulse-beacon" />
              <span>Live Broker Hub</span>
            </div>
            <span className="text-[9px] text-slate-400 font-medium uppercase">Daily OAuth</span>
          </div>

          <div className="space-y-2">
            {/* Zerodha Kite */}
            <div className="p-2 rounded-xl bg-slate-900/60 border border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-orange-500/20 text-orange-400 flex items-center justify-center font-black text-[10px]">
                  K
                </span>
                <span className="text-xs font-semibold text-slate-200">Zerodha</span>
              </div>
              <a
                href="https://kite.zerodha.com/connect/login?v=3&api_key=3fm9odz8emxrymjo"
                target="_blank"
                rel="noreferrer"
                className="text-[10px] px-2 py-1 bg-orange-500/10 hover:bg-orange-500/20 text-orange-300 rounded-md border border-orange-500/20 flex items-center gap-1 transition"
              >
                <span>Login</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>

            {/* Upstox Pro */}
            <div className="p-2 rounded-xl bg-slate-900/60 border border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-purple-500/20 text-purple-400 flex items-center justify-center font-black text-[10px]">
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
                className="text-[10px] px-2 py-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 rounded-md border border-purple-500/20 flex items-center gap-1 transition"
              >
                <span>Login</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-4 border-t border-white/5 text-[11px] text-slate-400 flex items-center justify-between px-2">
        <span>Spatial Atmosphere</span>
        <span className="px-2 py-0.5 bg-white/5 rounded text-[10px] font-mono text-cyan-400 border border-white/5">
          Obsidian
        </span>
      </div>
    </aside>
  );
}
