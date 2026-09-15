import React from "react";
import { ShieldCheck } from "lucide-react";

export function ForeignStocksRoadmap() {
  return (
    <div className="p-6 rounded-3xl bg-[#0d0f14]/85 border border-white/[0.07] backdrop-blur-3xl shadow-[0_16px_40px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.08)] space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Indian Investor 3-Step Onboarding Roadmap
          </h3>
        </div>
        <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono">
          RBI LRS Protocol
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-xl bg-cyan-500/20 text-cyan-300 font-black font-mono flex items-center justify-center text-xs">
              1
            </span>
            <strong className="text-white font-bold">Open Direct US Brokerage Account</strong>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            Open a digital US trading account via registered platforms (Vested, INDmoney, or Interactive Brokers). Zero account opening fees.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-xl bg-indigo-500/20 text-indigo-300 font-black font-mono flex items-center justify-center text-xs">
              2
            </span>
            <strong className="text-white font-bold">Fund via Net Banking (0% TCS)</strong>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            Wire funds from your Indian bank (HDFC, ICICI, SBI) under RBI LRS. Zero Tax Collected at Source (TCS) up to ₹7,00,000 annually.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-xl bg-emerald-500/20 text-emerald-300 font-black font-mono flex items-center justify-center text-xs">
              3
            </span>
            <strong className="text-white font-bold">Execute Instant Fractional Purchases</strong>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            Buy fractional shares of NVDA, AAPL, MSFT, or QQQ from as little as $1. Hold directly in your name in the US depository (SIPC insured up to $500,000).
          </p>
        </div>
      </div>
    </div>
  );
}
