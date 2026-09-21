import React, { useState, useEffect } from "react";
import clsx from "clsx";
import { 
  BarChart2, 
  LineChart, 
  Target, 
  Zap, 
  BookOpen, 
  Award,
  ChevronDown, 
  ChevronUp, 
  Compass,
  Microscope
} from "lucide-react";

const NAV_ITEMS = [
  { id: "journal-hero", label: "Overview", icon: BarChart2 },
  { id: "equity-curve-deck", label: "Equity Curve", icon: LineChart },
  { id: "journal-playbook-deck", label: "Playbook", icon: Target },
  { id: "trade-logger-form", label: "Logger", icon: Zap },
  { id: "journal-story-deck", label: "Stories", icon: BookOpen },
  { id: "performance-crucible-deck", label: "Crucible", icon: Award },
  { id: "quant-edge-deck", label: "Quant Lab", icon: Microscope },
];

export function CockpitFloatingDock() {
  const [activeSection, setActiveSection] = useState("journal-hero");
  const [isMinimized, setIsMinimized] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);

  // Ergonomic focus detection (auto-dims dock when typing in forms)
  useEffect(() => {
    const handleFocusIn = (e) => {
      const tag = e.target?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") {
        setIsInputFocused(true);
      }
    };
    const handleFocusOut = () => {
      setIsInputFocused(false);
    };

    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("focusout", handleFocusOut);
    return () => {
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("focusout", handleFocusOut);
    };
  }, []);

  // Scroll-spy to detect active viewport section
  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY + 260;
      for (let i = NAV_ITEMS.length - 1; i >= 0; i--) {
        const item = NAV_ITEMS[i];
        const el = document.getElementById(item.id);
        if (el) {
          const top = el.offsetTop;
          if (scrollPos >= top) {
            setActiveSection(item.id);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id) => {
    setActiveSection(id);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-5 right-5 z-40">
        <button
          type="button"
          onClick={() => setIsMinimized(false)}
          className="p-3 rounded-full bg-[#090d16]/95 border border-cyan-500/40 text-cyan-300 shadow-[0_12px_30px_rgba(0,0,0,0.8)] backdrop-blur-2xl hover:scale-105 transition-all flex items-center gap-2 text-xs font-bold font-mono cursor-pointer"
          title="Expand Cockpit HUD Navigation Dock"
        >
          <Compass className="w-4 h-4 text-cyan-400 animate-spin-slow" />
          <span>HUD</span>
          <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
        </button>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        "fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-[94vw] transition-all duration-300",
        isInputFocused && "opacity-20 hover:opacity-100 pointer-events-none hover:pointer-events-auto scale-95"
      )}
    >
      <div className="flex items-center gap-1.5 p-1.5 rounded-full bg-[#090d16]/92 border border-white/[0.12] backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.12)]">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => scrollToSection(item.id)}
              className={clsx(
                "px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap",
                isActive
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.3)] scale-[1.03]"
                  : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
              )}
            >
              <Icon className={clsx("w-3.5 h-3.5", isActive ? "text-cyan-400" : "text-slate-400")} />
              <span className="hidden sm:inline font-sans text-[11px]">{item.label}</span>
            </button>
          );
        })}

        <div className="w-px h-4 bg-white/10 mx-0.5" />

        <button
          type="button"
          onClick={() => setIsMinimized(true)}
          className="p-1.5 rounded-full text-slate-500 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title="Minimize HUD Dock"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export default CockpitFloatingDock;
