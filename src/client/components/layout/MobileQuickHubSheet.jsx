import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import { 
  X, 
  LayoutDashboard, 
  Zap, 
  BookOpen, 
  Globe2, 
  Volume2, 
  VolumeX, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  Key, 
  BookMarked, 
  Search,
  Sparkles,
  Shield
} from "lucide-react";
import { useTradingStore } from "../../stores/useTradingStore";
import { soundEngine } from "../../utils/soundEngine";
import { ThemeVibeSwitcher } from "./topbar/ThemeVibeSwitcher";

const QUICK_VIEWS = [
  { id: "dashboard", label: "Wealth", sub: "Net Worth & Holdings", icon: LayoutDashboard },
  { id: "paper", label: "Signals", sub: "Live Paper Ticks", icon: Zap, live: true },
  { id: "journal", label: "Journal", sub: "Profit Stories & P&L", icon: BookOpen },
  { id: "foreign", label: "US Tech", sub: "Nasdaq Giants (Alpha)", icon: Globe2 },
];

export function MobileQuickHubSheet() {
  const {
    isMobileQuickHubOpen,
    setMobileQuickHubOpen,
    activeView,
    setActiveView,
    brokerStatus,
    setSafetyGuardModalOpen,
    setCommandPaletteOpen,
    setRosettaOpen,
    activeTheme,
    setTheme,
    customThemeColors,
    setCustomColor,
    isPrivacyMode,
    togglePrivacyMode
  } = useTradingStore();

  const [isMuted, setIsMuted] = useState(soundEngine.isMuted());

  if (!isMobileQuickHubOpen) return null;

  const handleClose = () => {
    soundEngine.playTabSwitchTone();
    setMobileQuickHubOpen(false);
  };

  const handleToggleMute = () => {
    const next = soundEngine.toggleMute();
    setIsMuted(next);
    if (!next) {
      soundEngine.playOrderFillTone();
    }
  };

  const isUpstoxLive = Boolean(brokerStatus?.upstoxConnected && !brokerStatus?.upstoxExpired);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-md md:hidden">
        {/* Backdrop Tap to Close */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="absolute inset-0 bg-transparent"
        />

        {/* Apple iOS Bottom Sheet */}
        <motion.div
          initial={{ y: "100%", opacity: 0.5 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
          drag="y"
          dragConstraints={{ top: 0 }}
          dragElastic={0.2}
          onDragEnd={(_e, info) => {
            if (info.offset.y > 80) {
              handleClose();
            }
          }}
          className="relative z-10 w-full max-h-[90vh] bg-[#101322]/98 backdrop-blur-3xl border-t border-white/10 rounded-t-3xl shadow-[0_-20px_50px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden"
          style={{ paddingBottom: "max(24px, env(safe-area-inset-bottom))" }}
        >
          {/* iOS Tactile Drag Grabber */}
          <div className="pt-3 pb-1 flex justify-center cursor-grab active:cursor-grabbing">
            <div className="w-12 h-1.5 rounded-full bg-white/25 shadow-sm" />
          </div>

          {/* Sheet Header: Profile & Identity */}
          <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-500 via-sky-400 to-indigo-600 p-0.5 shadow-md flex-shrink-0">
                <div className="w-full h-full bg-[var(--bg)] rounded-full flex items-center justify-center font-black text-white text-sm">
                  M
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-extrabold text-white tracking-tight">Manikandan</h3>
                  <span className="px-1.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-[9px] font-mono font-bold text-cyan-300">
                    PRO DESK
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                  <Shield className="w-3 h-3 text-cyan-400" />
                  <span>RMS: Max ₹250 SL Protected</span>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="p-2 rounded-2xl text-slate-400 hover:text-white hover:bg-white/10 active:scale-95 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Sheet Body: Scrollable Controls & Shortcuts */}
          <div className="p-5 space-y-5 overflow-y-auto max-h-[75vh] scrollbar-none">
            {/* 1. Primary Navigation Tiles */}
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block mb-2">
                Terminal Navigation
              </span>
              <div className="grid grid-cols-2 gap-2.5">
                {QUICK_VIEWS.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeView === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        soundEngine.playTabSwitchTone();
                        setActiveView(tab.id);
                        handleClose();
                      }}
                      className={clsx(
                        "p-3 rounded-2xl border text-left transition-all active:scale-95 flex items-center gap-3 relative cursor-pointer",
                        isActive
                          ? "bg-cyan-500/15 border-cyan-500/40 text-white shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                          : "bg-white/[0.02] border-white/5 text-slate-300 hover:bg-white/[0.05]"
                      )}
                    >
                      <div className={clsx(
                        "w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0",
                        isActive ? "bg-cyan-500/20 text-cyan-300" : "bg-white/5 text-slate-400"
                      )}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold truncate flex items-center gap-1.5">
                          {tab.label}
                          {tab.live && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono truncate">{tab.sub}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Audio, Streamer Privacy & Ambient Vibes */}
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block mb-2">
                Trading Experience &amp; Aesthetics
              </span>
              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-xl bg-cyan-500/15 text-cyan-300 flex items-center justify-center">
                      {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Haptic Audio &amp; Fill FX</div>
                      <div className="text-[10px] text-slate-400">Order fill &amp; navigation audio</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleMute}
                    className={clsx(
                      "px-3 py-1 rounded-full text-xs font-mono font-bold transition active:scale-95 cursor-pointer border",
                      isMuted
                        ? "bg-white/5 text-slate-400 border-white/10"
                        : "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                    )}
                  >
                    {isMuted ? "MUTED" : "ACTIVE"}
                  </button>
                </div>

                <div className="h-px bg-white/5" />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-xl bg-indigo-500/15 text-indigo-300 flex items-center justify-center">
                      {isPrivacyMode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Streamer P&amp;L Privacy</div>
                      <div className="text-[10px] text-slate-400">Obfuscate ₹ numbers in public</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playTabSwitchTone();
                      togglePrivacyMode();
                    }}
                    className={clsx(
                      "px-3 py-1 rounded-full text-xs font-mono font-bold transition active:scale-95 cursor-pointer border",
                      isPrivacyMode
                        ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/40"
                        : "bg-white/5 text-slate-400 border-white/10"
                    )}
                  >
                    {isPrivacyMode ? "HIDDEN" : "VISIBLE"}
                  </button>
                </div>

                <div className="h-px bg-white/5" />

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-xs font-bold text-white">Ambient Gradient Vibe</span>
                    </div>
                    <span className="text-[10px] font-mono text-cyan-400 uppercase font-bold">
                      {activeTheme}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <ThemeVibeSwitcher
                      activeTheme={activeTheme}
                      setTheme={setTheme}
                      customThemeColors={customThemeColors}
                      setCustomColor={setCustomColor}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Mission-Critical Operational Shortcuts */}
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block mb-2">
                Operational Shortcuts
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {/* Broker Reconnect */}
                <button
                  type="button"
                  onClick={() => {
                    handleClose();
                    const trigger = document.querySelector('[title="Open Broker Session Manager"]');
                    if (trigger) trigger.click();
                  }}
                  className="p-3 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 active:scale-95 text-left space-y-1 cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <Key className="w-4 h-4 text-purple-400" />
                    <span className={clsx(
                      "w-2 h-2 rounded-full",
                      isUpstoxLive ? "bg-emerald-400 animate-ping" : "bg-rose-400 animate-pulse"
                    )} />
                  </div>
                  <div className="font-bold text-white">Broker Session</div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {isUpstoxLive ? "Upstox Live" : "Reconnect Required"}
                  </div>
                </button>

                {/* Daily Risk Guard */}
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playTabSwitchTone();
                    handleClose();
                    setSafetyGuardModalOpen(true);
                  }}
                  className="p-3 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 active:scale-95 text-left space-y-1 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  <div className="font-bold text-white">Risk Guardrails</div>
                  <div className="text-[10px] text-slate-400 font-mono">Max ₹750 Day Cap</div>
                </button>

                {/* Spotlight Search */}
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playTabSwitchTone();
                    handleClose();
                    setCommandPaletteOpen(true);
                  }}
                  className="p-3 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 active:scale-95 text-left space-y-1 cursor-pointer"
                >
                  <Search className="w-4 h-4 text-cyan-400" />
                  <div className="font-bold text-white">Spotlight ⌘K</div>
                  <div className="text-[10px] text-slate-400 font-mono">Instant Search</div>
                </button>

                {/* 60s Beginner Guide */}
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playTabSwitchTone();
                    handleClose();
                    setRosettaOpen(true);
                  }}
                  className="p-3 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 active:scale-95 text-left space-y-1 cursor-pointer"
                >
                  <BookMarked className="w-4 h-4 text-amber-400" />
                  <div className="font-bold text-white">60s Guide</div>
                  <div className="text-[10px] text-slate-400 font-mono">Trading Concepts</div>
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default MobileQuickHubSheet;
