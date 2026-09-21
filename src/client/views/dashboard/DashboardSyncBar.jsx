import React, { useState, useEffect, useMemo, useCallback } from "react";
import { 
  RefreshCw, 
  Radio, 
  AlertTriangle, 
  KeyRound, 
  ShieldCheck, 
  ShieldAlert, 
  Eye, 
  EyeOff, 
  Clock, 
  Zap, 
  Moon, 
  Bell, 
  Activity, 
  SlidersHorizontal,
  ChevronDown
} from "lucide-react";
import clsx from "clsx";
import { useTradingStore } from "../../stores/useTradingStore";
import { soundEngine } from "../../utils/soundEngine";

/**
 * 🏛️ Computes real-time Indian Exchange (NSE/BSE) trading session phase & countdown
 * Based on IST (Asia/Kolkata) clock with exact market regime thresholds
 */
function getMarketSessionInfo() {
  const now = new Date();
  const istString = now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
  const istDate = new Date(istString);

  const day = istDate.getDay(); // 0 = Sun, 6 = Sat
  const hours = istDate.getHours();
  const mins = istDate.getMinutes();
  const currentMinute = hours * 60 + mins;

  const isWeekend = day === 0 || day === 6;

  if (isWeekend) {
    return {
      status: "WEEKEND_CLOSED",
      label: "Weekend Closed",
      phase: "Exchange Closed",
      badgeColor: "indigo",
      isOpen: false,
      countdown: "Reopens Mon 09:15 AM",
      icon: Moon
    };
  }

  // Overnight Closed: 00:00 - 09:00 IST
  if (currentMinute < 9 * 60) {
    const minsUntilPreOpen = 9 * 60 - currentMinute;
    const h = Math.floor(minsUntilPreOpen / 60);
    const m = minsUntilPreOpen % 60;
    return {
      status: "PRE_OPEN_WAIT",
      label: "Pre-Market in " + (h > 0 ? `${h}h ${m}m` : `${m}m`),
      phase: "Overnight Hold",
      badgeColor: "amber",
      isOpen: false,
      countdown: `Bell in ${h > 0 ? `${h}h ` : ""}${m}m`,
      icon: Clock
    };
  }

  // Pre-Open Order Collection & Price Discovery: 09:00 - 09:15 IST
  if (currentMinute >= 9 * 60 && currentMinute < 9 * 60 + 15) {
    const minsToLive = 9 * 60 + 15 - currentMinute;
    return {
      status: "PRE_MARKET",
      label: `Pre-Market Discovery`,
      phase: "Auction Matching",
      badgeColor: "amber",
      isOpen: true,
      countdown: `Live in ${minsToLive}m`,
      icon: Bell
    };
  }

  // Live Continuous Auction: 09:15 - 15:30 IST
  if (currentMinute >= 9 * 60 + 15 && currentMinute < 15 * 60 + 30) {
    const minsRemaining = 15 * 60 + 30 - currentMinute;
    const h = Math.floor(minsRemaining / 60);
    const m = minsRemaining % 60;
    return {
      status: "LIVE_AUCTION",
      label: "NSE/BSE Live Auction",
      phase: "Continuous Trading",
      badgeColor: "emerald",
      isOpen: true,
      countdown: `${h}h ${m}m left`,
      icon: Zap
    };
  }

  // Post-Market Settlement: 15:30 - 16:00 IST
  if (currentMinute >= 15 * 60 + 30 && currentMinute < 16 * 60) {
    const minsToEnd = 16 * 60 - currentMinute;
    return {
      status: "POST_MARKET",
      label: "Post-Market Settlement",
      phase: "Closing Discovery",
      badgeColor: "blue",
      isOpen: false,
      countdown: `Closing in ${minsToEnd}m`,
      icon: Activity
    };
  }

  // Evening / Overnight Closed: 16:00 - 23:59 IST
  const minsToNextOpen = (24 * 60 - currentMinute) + (9 * 60 + 15);
  const h = Math.floor(minsToNextOpen / 60);
  const m = minsToNextOpen % 60;
  return {
    status: "CLOSED",
    label: "Market Closed",
    phase: "Settlement Snapshot",
    badgeColor: "slate",
    isOpen: false,
    countdown: `Opens in ${h}h ${m}m`,
    icon: Moon
  };
}

export function DashboardSyncBar({
  isMarketOpen,
  lastRefreshedAt,
  fetchError,
  refreshing,
  onRefresh,
  isExpired = false,
  isKiteOffline = false,
  userId = null,
  userName = null,
  onConnectKite
}) {
  const isPrivacyMode = useTradingStore((s) => s.isPrivacyMode);
  const togglePrivacyMode = useTradingStore((s) => s.togglePrivacyMode);

  // Live session clock update every 15 seconds
  const [sessionInfo, setSessionInfo] = useState(getMarketSessionInfo);
  useEffect(() => {
    const timer = setInterval(() => {
      setSessionInfo(getMarketSessionInfo());
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  const SessionIcon = sessionInfo.icon;

  const handlePrivacyToggle = useCallback(() => {
    togglePrivacyMode();
    soundEngine.playTabSwitchTone();
  }, [togglePrivacyMode]);

  const handleManualRefresh = useCallback(() => {
    if (refreshing) return;
    onRefresh();
  }, [onRefresh, refreshing]);

  return (
    <div className="relative overflow-hidden rounded-3xl p-3.5 sm:p-4 bg-gradient-to-r from-[#080d1a]/95 via-[#060a14]/95 to-[#080d1a]/95 backdrop-blur-2xl border border-white/[0.12] shadow-[0_16px_40px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.18)] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-4 transition-all duration-300">
      
      {/* ─── 🧭 ZONE 1: BRAND & SESSION STATUS ───────────────────────── */}
      <div className="flex items-center gap-2.5 flex-wrap min-w-0">
        <div className="flex items-center gap-2 pr-2 border-r border-white/10 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.25)]">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-white font-mono flex items-center gap-1.5">
              <span>WEALTH RADAR</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <div className="text-[9px] font-mono text-slate-400">
              Institutional Terminal
            </div>
          </div>
        </div>

        {/* 🏛️ Live Exchange Session Phase Badge */}
        <div
          className={clsx(
            "text-[10px] font-bold px-3 py-1 rounded-xl border flex items-center gap-2 font-mono shadow-sm transition-all",
            sessionInfo.isOpen
              ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.15)]"
              : "bg-indigo-500/10 border-indigo-500/20 text-indigo-300"
          )}
          title={`Phase: ${sessionInfo.phase}`}
        >
          <SessionIcon className={clsx("w-3.5 h-3.5", sessionInfo.isOpen && "animate-pulse text-emerald-400")} />
          <span>{sessionInfo.label}</span>
          <span className="text-slate-400 text-[9px] border-l border-white/10 pl-2 font-mono">
            {sessionInfo.countdown}
          </span>
        </div>

        {/* 🛡️ Zerodha Demat Security Capsule with 1-Click Inline Action */}
        {isExpired ? (
          <button
            type="button"
            onClick={onConnectKite}
            className="text-[10px] font-bold px-3 py-1 rounded-xl border border-amber-500/40 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-[0_0_16px_rgba(245,158,11,0.25)] font-mono animate-pulse"
            title="Kite token expired. Click to renew session in 1 click"
          >
            <KeyRound className="w-3.5 h-3.5 text-amber-400" />
            <span>KITE EXPIRED {userId ? `(${userId})` : ""} · ⚡ RENEW NOW</span>
          </button>
        ) : isKiteOffline ? (
          <button
            type="button"
            onClick={onConnectKite}
            className="text-[10px] font-bold px-3 py-1 rounded-xl border border-rose-500/30 bg-rose-500/15 hover:bg-rose-500/25 text-rose-200 flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm font-mono"
            title="Connect your Zerodha Kite account"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            <span>CONNECT DEMAT</span>
          </button>
        ) : (
          <div className="text-[10px] font-bold px-3 py-1 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 flex items-center gap-1.5 font-mono shadow-sm">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>KITE LIVE {userId ? `(${userId})` : ""}</span>
            <span className="text-[9px] text-emerald-400/70 border-l border-emerald-500/20 pl-1.5 font-mono">
              ● 16ms
            </span>
          </div>
        )}
      </div>

      {/* ─── ⚡ ZONE 2: TELEMETRY & STREAMER PRIVACY CONTROLS ───────── */}
      <div className="flex items-center gap-2 flex-wrap justify-between md:justify-end shrink-0">
        
        {/* Sync Timestamp / Cache Pill */}
        <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/[0.03] border border-white/5">
          <Radio className={clsx("w-3 h-3 text-cyan-400", refreshing && "animate-pulse")} />
          <span>
            {lastRefreshedAt 
              ? `Synced ${lastRefreshedAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}` 
              : "Connecting..."}
          </span>
        </div>

        {fetchError && (
          <span className="text-[10px] font-bold text-amber-300 bg-amber-500/10 px-2 py-1 rounded-xl border border-amber-500/20 flex items-center gap-1 font-mono">
            <AlertTriangle className="w-3 h-3" />
            <span>Cache Fallback</span>
          </span>
        )}

        {/* 🔒 1-Click Streamer Privacy Shield Toggle */}
        <button
          type="button"
          onClick={handlePrivacyToggle}
          className={clsx(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-mono font-bold transition-all active:scale-95 cursor-pointer shadow-sm",
            isPrivacyMode
              ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
              : "bg-white/[0.04] hover:bg-white/[0.08] border-white/10 text-slate-300 hover:text-white"
          )}
          title={isPrivacyMode ? "Privacy Mode ON (Values Masked) · Click to Reveal" : "Privacy Mode OFF · Click to Mask Portfolio Numbers"}
        >
          {isPrivacyMode ? (
            <>
              <EyeOff className="w-3.5 h-3.5 text-cyan-300" />
              <span>MASKED</span>
            </>
          ) : (
            <>
              <Eye className="w-3.5 h-3.5 text-slate-400" />
              <span>SHIELD</span>
            </>
          )}
        </button>

        {/* 🔄 1-Click Hard Refresh Button */}
        <button
          type="button"
          onClick={handleManualRefresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/[0.10] hover:bg-white/[0.18] border border-white/20 text-white transition shadow-[0_2px_10px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.3)] font-mono text-[10px] font-bold disabled:opacity-50 cursor-pointer active:scale-95"
          title="Force refresh portfolio holdings, cash margin, and live tick quotes"
        >
          <RefreshCw className={clsx("w-3.5 h-3.5 text-cyan-300", refreshing && "animate-spin")} />
          <span>{refreshing ? "SYNCING..." : "SYNC QUOTES"}</span>
        </button>
      </div>

    </div>
  );
}
