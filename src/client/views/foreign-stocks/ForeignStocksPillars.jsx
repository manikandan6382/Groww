import React from "react";
import { Coins, Layers, ShieldCheck } from "lucide-react";

export function ForeignStocksPillars() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Pillar 1: Dual Compounding */}
      <div className="p-5 rounded-2xl bg-[#0d0f14]/85 border border-white/[0.07] backdrop-blur-2xl shadow-xl space-y-2 relative group hover:border-cyan-500/30 transition">
        <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
          <Coins className="w-4 h-4" />
        </div>
        <h3 className="text-sm font-bold text-white tracking-tight">1. Dual Currency Compounding</h3>
        <p className="text-xs text-slate-300 leading-relaxed">
          When you own US stocks, you profit twice: once from the company stock growth, and again as the US Dollar historically appreciates (~3.5%/year) against the Indian Rupee.
        </p>
        <div className="pt-1 text-[10px] font-mono text-cyan-300 font-bold">
          💡 15% Stock Gain + 4% USD Rise = ~19% INR Return
        </div>
      </div>

      {/* Pillar 2: Fractional Shares */}
      <div className="p-5 rounded-2xl bg-[#0d0f14]/85 border border-white/[0.07] backdrop-blur-2xl shadow-xl space-y-2 relative group hover:border-indigo-500/30 transition">
        <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
          <Layers className="w-4 h-4" />
        </div>
        <h3 className="text-sm font-bold text-white tracking-tight">2. Zero Minimum: Fractional Shares</h3>
        <p className="text-xs text-slate-300 leading-relaxed">
          Unlike Indian exchanges requiring 1 whole share, US brokerages allow fractional units. You can own a piece of Apple, Microsoft, or Nvidia starting with just <strong>$1 (~₹84)</strong>.
        </p>
        <div className="pt-1 text-[10px] font-mono text-indigo-300 font-bold">
          💡 Start with ₹500 or ₹5,00,000 anytime
        </div>
      </div>

      {/* Pillar 3: RBI LRS & Tax Safety */}
      <div className="p-5 rounded-2xl bg-[#0d0f14]/85 border border-white/[0.07] backdrop-blur-2xl shadow-xl space-y-2 relative group hover:border-emerald-500/30 transition">
        <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
          <ShieldCheck className="w-4 h-4" />
        </div>
        <h3 className="text-sm font-bold text-white tracking-tight">3. RBI LRS &amp; 0% TCS Compliance</h3>
        <p className="text-xs text-slate-300 leading-relaxed">
          RBI's Liberalised Remittance Scheme permits every Indian citizen to invest up to <strong>$250,000/year (~₹2.1 Crore)</strong> abroad. There is <strong>0% TCS</strong> on the first ₹7,00,000 sent annually.
        </p>
        <div className="pt-1 text-[10px] font-mono text-emerald-300 font-bold">
          💡 100% Legal &amp; SEBI/RBI Compliant
        </div>
      </div>
    </div>
  );
}
