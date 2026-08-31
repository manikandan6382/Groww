import React, { useState } from "react";
import { 
  Search, 
  Sparkles, 
  BookMarked, 
  Volume2, 
  VolumeX, 
  Key, 
  Radio, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  ExternalLink, 
  ShieldCheck, 
  RefreshCw, 
  Eye, 
  EyeOff,
  Zap,
  Palette,
  Lock,
  Unlock
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTradingStore } from "../../stores/useTradingStore";
import { useLivePriceStore } from "../../stores/useLivePriceStore";
import { Sparkline } from "../common/Sparkline";
import { RollingTicker } from "../common/RollingTicker";
import { soundEngine } from "../../utils/soundEngine";
import clsx from "clsx";

export function Topbar() {
  const { 
    searchQuery, 
    setSearchQuery, 
    setRosettaOpen, 
    setCommandPaletteOpen,
    activeTheme, 
    setTheme, 
    customThemeColors, 
    setCustomColor,
    brokerStatus,
    isPrivacyMode,
    togglePrivacyMode,
    isTimeframeLocked,
    toggleTimeframeLock,
    closedAlerts,
    openAlerts,
    startingCapital
  } = useTradingStore();

  const [isThemePanelOpen, setThemePanelOpen] = useState(false);
  const [showBrokerModal, setShowBrokerModal] = useState(false);
  const [tokenInput, setTokenInput] = useState("");
  const [isTokenMasked, setIsTokenMasked] = useState(true);
  const [isSubmittingToken, setIsSubmittingToken] = useState(false);
  const [tokenStatusMsg, setTokenStatusMsg] = useState(null);
  const [isMuted, setIsMuted] = useState(soundEngine.isMuted());

  const handleToggleMute = () => {
    const next = soundEngine.toggleMute();
    setIsMuted(next);
    if (!next) {
      soundEngine.playOrderFillTone();
    }
  };

  const handleSaveToken = async (e) => {
    e.preventDefault();
    const trimmed = tokenInput.trim();
    if (!trimmed) return;

    // 🛡️ Level 3 Elite Client-Side Pre-Flight JWT Shape Guard
    if (!trimmed.startsWith("eyJ") || trimmed.length < 50) {
      soundEngine.playStopHitTone();
      setTokenStatusMsg({ 
        type: "error", 
        text: "Invalid Upstox JWT token format. Must start with 'eyJ...' (50+ chars)." 
      });
      return;
    }

    setIsSubmittingToken(true);
    try {
      const res = await fetch("/api/upstox/set-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: trimmed }),
      });
      const data = await res.json();
      if (res.ok) {
        soundEngine.playTargetChime();
        setTokenStatusMsg({ type: "success", text: "Upstox token saved! Live market feed reconnected." });
        setTokenInput("");
        setTimeout(() => {
          setShowBrokerModal(false);
          setTokenStatusMsg(null);
        }, 2000);
      } else {
        soundEngine.playStopHitTone();
        setTokenStatusMsg({ type: "error", text: data.error || "Failed to update token." });
      }
    } catch (err) {
      soundEngine.playStopHitTone();
      setTokenStatusMsg({ type: "error", text: err.message });
    } finally {
      setIsSubmittingToken(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#060913]/75 backdrop-blur-3xl border-b border-white/[0.08] px-4 sm:px-6 h-16 flex items-center justify-between gap-4 shadow-[0_16px_40px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.1)] transition-all">
      {/* 🌟 Zone 1: Apple Luxury Hologram Brand Emblem (Left) */}
      <div className="flex-shrink-0 flex items-center min-w-0">
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] hover:border-cyan-500/30 transition-all duration-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] group cursor-default flex-shrink-0">
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-cyan-500 via-sky-400 to-indigo-600 p-0.5 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.4)] group-hover:scale-105 transition-transform flex-shrink-0">
            <div className="w-full h-full bg-[#070c18] rounded-full flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400/20" />
            </div>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-black uppercase tracking-widest text-white font-mono leading-none whitespace-nowrap">
              PORTFOLIO<span className="text-cyan-400">X</span>
            </span>
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-[8px] font-mono font-black text-emerald-400 tracking-wider leading-none whitespace-nowrap">
                LIVE
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 🚀 Zone 2: Unified Apple Vision Pro Control Deck (Right) */}
      <div className="flex-shrink-0 flex items-center min-w-0 gap-2.5">
        {/* Spotlight Search Capsule (⌘K) */}
        <div className="relative group">
          <button
            type="button"
            onClick={() => {
              soundEngine.playTabSwitchTone();
              setCommandPaletteOpen(true);
            }}
            className="h-9 px-3 rounded-full bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 hover:border-cyan-500/30 text-slate-300 hover:text-white transition-all text-xs active:scale-95 shadow-sm cursor-pointer flex items-center gap-2 flex-shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
          >
            <Search className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline font-bold tracking-tight text-slate-300">Spotlight</span>
            <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-white/10 text-slate-300 font-bold border border-white/10 shadow-inner">
              ⌘K
            </kbd>
          </button>
          <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-[#08101e]/95 border border-white/10 rounded-xl text-[10px] font-mono text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[60] shadow-xl backdrop-blur-md">
            Spotlight Command Palette (⌘K)
          </div>
        </div>

        {/* 60s Beginner Guide Pill */}
        <div className="relative group hidden sm:block">
          <button
            type="button"
            onClick={() => {
              soundEngine.playTabSwitchTone();
              setRosettaOpen(true);
            }}
            className="h-9 px-3 rounded-full bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-amber-300 text-xs font-bold transition active:scale-95 shadow-sm cursor-pointer flex items-center gap-1.5 flex-shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
          >
            <BookMarked className="w-3.5 h-3.5" />
            <span className="whitespace-nowrap">60s Guide</span>
          </button>
          <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-[#08101e]/95 border border-white/10 rounded-xl text-[10px] font-mono text-amber-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[60] shadow-xl backdrop-blur-md">
            Learn Trading in 60s
          </div>
        </div>

        {/* Unified Spatial Control Capsule */}
        <div className="h-9 flex items-center gap-1 p-1 rounded-full bg-white/[0.03] border border-white/10 backdrop-blur-3xl shadow-inner flex-shrink-0">
          {/* Spatial Audio Sound FX Toggle */}
          <div className="relative group">
            <button
              type="button"
              onClick={handleToggleMute}
              className={clsx(
                "w-7 h-7 rounded-full border transition-all text-xs flex items-center justify-center cursor-pointer active:scale-95",
                isMuted 
                  ? "bg-white/[0.02] border-white/5 text-slate-500 hover:text-slate-300" 
                  : "bg-cyan-500/15 border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/25 shadow-[0_0_10px_rgba(6,182,212,0.2)]"
              )}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-[#08101e]/95 border border-white/10 rounded-xl text-[10px] font-mono text-cyan-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[60] shadow-xl backdrop-blur-md">
              {isMuted ? "Sound Muted" : "Haptic Sound ON"}
            </div>
          </div>

          {/* Streamer P&L Privacy Mode Toggle */}
          <div className="relative group">
            <button
              type="button"
              onClick={() => {
                togglePrivacyMode();
                soundEngine.playTabSwitchTone();
              }}
              className={clsx(
                "w-7 h-7 rounded-full border transition-all text-xs flex items-center justify-center cursor-pointer active:scale-95",
                isPrivacyMode 
                  ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300 shadow-[0_0_12px_rgba(99,102,241,0.3)]" 
                  : "bg-white/[0.02] border-white/5 text-slate-400 hover:text-slate-200"
              )}
            >
              {isPrivacyMode ? <EyeOff className="w-3.5 h-3.5 text-indigo-300" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-[#08101e]/95 border border-white/10 rounded-xl text-[10px] font-mono text-indigo-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[60] shadow-xl backdrop-blur-md">
              {isPrivacyMode ? "Streamer Mode: ON" : "Privacy Mode (Ctrl+H)"}
            </div>
          </div>

          {/* Theme Palette Switcher */}
          <div className="relative flex items-center">
            <div className="flex items-center gap-1 px-1">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playTabSwitchTone();
                  setTheme("blue");
                }}
                className={clsx("w-3.5 h-3.5 rounded-full transition-all cursor-pointer", activeTheme === "blue" ? "bg-sky-400 ring-2 ring-sky-300 shadow-md scale-110" : "bg-sky-500/40 hover:bg-sky-500/70")}
                title="Cyber Blue"
              />
              <button
                type="button"
                onClick={() => {
                  soundEngine.playTabSwitchTone();
                  setTheme("emerald");
                }}
                className={clsx("w-3.5 h-3.5 rounded-full transition-all cursor-pointer", activeTheme === "emerald" ? "bg-emerald-400 ring-2 ring-emerald-300 shadow-md scale-110" : "bg-emerald-500/40 hover:bg-emerald-500/70")}
                title="Neon Emerald"
              />
              <button
                type="button"
                onClick={() => {
                  soundEngine.playTabSwitchTone();
                  setTheme("violet");
                }}
                className={clsx("w-3.5 h-3.5 rounded-full transition-all cursor-pointer", activeTheme === "violet" ? "bg-purple-400 ring-2 ring-purple-300 shadow-md scale-110" : "bg-purple-500/40 hover:bg-purple-500/70")}
                title="Royal Violet"
              />
              <button
                type="button"
                onClick={() => {
                  soundEngine.playTabSwitchTone();
                  setThemePanelOpen(!isThemePanelOpen);
                }}
                className={clsx("w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] transition-all cursor-pointer", activeTheme === "custom" ? "bg-cyan-400 text-black font-bold ring-2 ring-cyan-300 shadow-md scale-110" : "bg-white/15 text-slate-300 hover:bg-white/30")}
                title="Custom Theme Palette"
              >
                ✦
              </button>
            </div>

            {/* Custom Theme Color Picker Popover */}
            {isThemePanelOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 p-3.5 rounded-2xl bg-[#08101e]/95 border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-2xl z-[60] text-xs space-y-2.5">
                <div className="font-extrabold text-white mb-1 flex items-center justify-between">
                  <span>Custom Glass Palette</span>
                  <Palette className="w-3.5 h-3.5 text-cyan-400" />
                </div>
                <label className="flex items-center justify-between text-slate-300 font-bold">
                  <span>Accent Neon</span>
                  <input
                    type="color"
                    value={customThemeColors.accent}
                    onChange={(e) => setCustomColor("accent", e.target.value)}
                    className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                  />
                </label>
                <label className="flex items-center justify-between text-slate-300 font-bold">
                  <span>Canvas BG</span>
                  <input
                    type="color"
                    value={customThemeColors.bg}
                    onChange={(e) => setCustomColor("bg", e.target.value)}
                    className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                  />
                </label>
                <label className="flex items-center justify-between text-slate-300 font-bold">
                  <span>Glass Panel</span>
                  <input
                    type="color"
                    value={customThemeColors.panel}
                    onChange={(e) => setCustomColor("panel", e.target.value)}
                    className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playTabSwitchTone();
                    setThemePanelOpen(false);
                  }}
                  className="w-full py-1.5 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-extrabold hover:bg-cyan-500/30 transition text-center shadow-sm cursor-pointer"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>

        {/* User Profile Avatar with Luxury Obsidian Rim */}
        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-cyan-500 via-sky-400 to-indigo-600 p-0.5 flex items-center justify-center shadow-md cursor-pointer hover:scale-105 transition-transform flex-shrink-0" title="Manikandan (Pro Trader Desk)">
          <div className="w-full h-full bg-[#070b14] rounded-full flex items-center justify-center font-black text-white text-xs">
            M
          </div>
        </div>
      </div>

      {/* 🚀 Broker Connection & Daily Token Manager Modal */}
      {showBrokerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-2xl animate-in fade-in duration-200">
          <div className="w-full max-w-md p-6 rounded-3xl bg-[#08101e]/95 border border-cyan-500/30 shadow-[0_20px_50px_rgba(0,0,0,0.7)] space-y-4 relative text-left">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shadow-sm">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white">Broker Session Manager</h3>
                  <p className="text-[11px] text-slate-400 font-mono">Daily Zero-Stale Multi-Broker Reconnect</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => {
                  soundEngine.playTabSwitchTone();
                  setShowBrokerModal(false);
                }}
                className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-white/5 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Broker Status Cards */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                <span className="text-[10px] text-slate-400 block font-bold">UPSTOX v2 FEED</span>
                <span className={clsx("font-bold flex items-center gap-1.5 text-xs", brokerStatus?.upstoxConnected ? "text-emerald-400" : "text-amber-400")}>
                  <span className={clsx("w-1.5 h-1.5 rounded-full", brokerStatus?.upstoxConnected ? "bg-emerald-400 animate-ping" : "bg-amber-400")} />
                  {brokerStatus?.upstoxConnected ? "Live Connected" : "Expired / Reconnect"}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                <span className="text-[10px] text-slate-400 block font-bold">ZERODHA KITE</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1.5 text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Kite Ready
                </span>
              </div>
            </div>

            {/* Quick Upstox Token Input Form with Streamer Token Masking */}
            <form onSubmit={handleSaveToken} className="space-y-3.5">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                  <span>Paste Fresh Upstox Token:</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playTabSwitchTone();
                        setIsTokenMasked(!isTokenMasked);
                      }}
                      className="text-[10px] text-slate-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer transition"
                    >
                      {isTokenMasked ? <EyeOff className="w-3 h-3 text-indigo-400" /> : <Eye className="w-3 h-3 text-cyan-400" />}
                      <span>{isTokenMasked ? "Masked" : "Revealed"}</span>
                    </button>
                    <span className="text-slate-600">·</span>
                    <a 
                      href="https://service.upstox.com/index.html" 
                      target="_blank" 
                      rel="noreferrer" 
                      className="text-[10px] text-cyan-400 hover:underline flex items-center gap-0.5"
                    >
                      <span>Portal</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                </div>
                <div className="relative">
                  <textarea
                    rows={3}
                    value={tokenInput}
                    onChange={(e) => {
                      setTokenInput(e.target.value);
                      if (tokenStatusMsg) setTokenStatusMsg(null);
                    }}
                    placeholder="Paste Upstox JWT token (eyJhbGciOiJSUzI1NiIsImtpZCI...)"
                    style={isTokenMasked ? { WebkitTextSecurity: "disc" } : {}}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-black/50 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-cyan-400 transition placeholder:text-slate-600 resize-none shadow-inner"
                  />
                  {tokenInput.trim() && (
                    <div className="absolute bottom-2 right-2.5 text-[9px] font-mono font-bold text-slate-400 bg-black/70 px-1.5 py-0.5 rounded border border-white/10">
                      {tokenInput.length} chars
                    </div>
                  )}
                </div>
              </div>

              {tokenStatusMsg && (
                <div className={clsx("p-3 rounded-2xl border text-xs font-mono flex items-center gap-2 animate-in fade-in", tokenStatusMsg.type === "success" ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30" : "bg-rose-500/10 text-rose-300 border-rose-500/30")}>
                  {tokenStatusMsg.type === "success" ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
                  <span>{tokenStatusMsg.text}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmittingToken || !tokenInput.trim()}
                className={clsx(
                  "w-full py-2.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95 shadow-lg",
                  isSubmittingToken || !tokenInput.trim()
                    ? "bg-white/10 text-slate-500 border border-white/5 cursor-not-allowed"
                    : "bg-gradient-to-r from-cyan-500 to-sky-500 text-black font-extrabold shadow-cyan-500/25 hover:from-cyan-400 cursor-pointer"
                )}
              >
                {isSubmittingToken ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Validating & Connecting...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Save Token & Stream Live Data</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
