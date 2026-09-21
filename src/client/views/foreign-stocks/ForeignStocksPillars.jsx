import React, { useState } from "react";
import clsx from "clsx";
import { Coins, Layers, ShieldCheck, TrendingUp, Sparkles, CheckCircle2 } from "lucide-react";
import { soundEngine } from "../../utils/soundEngine";
import { USD_INR_RATE } from "./foreignStocksData";

/**
 * 🍏 Master Apple Vision Pro Interactive Rosetta Proof Engine: Why Invest in US Equities?
 */
export function ForeignStocksPillars() {
  // Card 1 State: Formula vs 10-Year Case Study
  const [pillar1View, setPillar1View] = useState("proof"); // "proof" | "formula"

  // Card 2 State: Fractional Capital Chips
  const [fractionalAmt, setFractionalAmt] = useState(1000); // ₹500, ₹1000, ₹5000

  // Card 3 State: LRS vs SIPC Safety Focus
  const [safetyFocus, setSafetyFocus] = useState("lrs"); // "lrs" | "sipc"

  // Fractional calculations
  const usdFractional = fractionalAmt / USD_INR_RATE;
  const nvdaShares = (usdFractional / 128.50).toFixed(3);
  const aaplShares = (usdFractional / 224.30).toFixed(3);
  const msftShares = (usdFractional / 418.60).toFixed(3);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      
      {/* ── Pillar 1: Dual Compounding & 10-Year Wealth Race ── */}
      <div className="p-5 sm:p-6 rounded-3xl bg-[#0d0f14]/85 border border-white/[0.08] backdrop-blur-3xl shadow-[0_16px_40px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.08)] flex flex-col justify-between space-y-4 group hover:border-cyan-500/40 transition-all duration-300">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-300 shadow-sm">
              <Coins className="w-5 h-5" />
            </div>

            {/* Micro Toggle */}
            <div className="flex items-center gap-1 p-0.5 rounded-xl bg-white/[0.03] border border-white/10 text-[10px] font-mono">
              <button
                type="button"
                onClick={() => {
                  setPillar1View("proof");
                  soundEngine.playTabSwitchTone();
                }}
                className={clsx(
                  "px-2.5 py-1 rounded-lg transition cursor-pointer font-bold",
                  pillar1View === "proof"
                    ? "bg-cyan-500/25 text-cyan-200 border border-cyan-500/40 shadow-sm"
                    : "text-slate-400 hover:text-white"
                )}
              >
                10-Yr Proof
              </button>
              <button
                type="button"
                onClick={() => {
                  setPillar1View("formula");
                  soundEngine.playTabSwitchTone();
                }}
                className={clsx(
                  "px-2.5 py-1 rounded-lg transition cursor-pointer font-bold",
                  pillar1View === "formula"
                    ? "bg-cyan-500/25 text-cyan-200 border border-cyan-500/40 shadow-sm"
                    : "text-slate-400 hover:text-white"
                )}
              >
                Formula
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-base font-black text-white tracking-tight">
              1. Dual Currency Compounding
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed mt-1">
              Profit twice simultaneously: from underlying equity growth + steady annual US Dollar appreciation against the Rupee (~3.5%/yr).
            </p>
          </div>

          {/* Interactive Content: Proof vs Formula */}
          {pillar1View === "proof" ? (
            <div className="p-3.5 rounded-2xl bg-black/45 border border-white/[0.06] space-y-2.5">
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 font-bold">
                <span>10-Yr Wealth Race (₹1L in 2014)</span>
                <span className="text-cyan-300">2014 ➔ 2024</span>
              </div>

              {/* Progress Bars */}
              <div className="space-y-2 text-[11px] font-mono">
                <div>
                  <div className="flex justify-between text-slate-400 text-[10px]">
                    <span>Bank FD (6.5%)</span>
                    <span>₹1.87 Lakhs</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-white/5 mt-0.5 overflow-hidden">
                    <div className="h-full bg-slate-500 rounded-full w-[40%]" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-300 text-[10px]">
                    <span>NIFTY 50 (12.5%)</span>
                    <span>₹3.24 Lakhs</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-white/5 mt-0.5 overflow-hidden">
                    <div className="h-full bg-indigo-400 rounded-full w-[68%]" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-emerald-300 text-[10px] font-bold">
                    <span>US Tech + USD Alpha (16.8%)</span>
                    <span className="text-emerald-400 font-black">₹4.72 Lakhs</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-white/5 mt-0.5 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 rounded-full w-[100%] shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
                  </div>
                </div>
              </div>

              <div className="pt-1.5 border-t border-white/5 text-[9px] font-mono text-emerald-300 font-bold flex items-center justify-between">
                <span>Currency Bonus vs Nifty:</span>
                <span>+₹1,48,000 purely from USD rise</span>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-black/45 border border-white/[0.06] space-y-2">
              <span className="text-[10px] font-mono text-cyan-300 uppercase font-bold block">
                The Exact Compounding Math
              </span>
              <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 font-mono text-xs text-cyan-200">
                Total INR Return = (1 + Stock Gain%) × (1 + USD/INR Rise%) - 1
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Even in flat US market years, the historical currency delta protects Indian wealth from domestic rupee purchasing power erosion.
              </p>
            </div>
          )}
        </div>

        <div className="text-[10px] font-mono text-cyan-300/90 font-bold flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-cyan-400" />
          <span>Historical average: +3.8% annual FX tailwind</span>
        </div>
      </div>

      {/* ── Pillar 2: Fractional Shares & Zero Minimums ── */}
      <div className="p-5 sm:p-6 rounded-3xl bg-[#0d0f14]/85 border border-white/[0.08] backdrop-blur-3xl shadow-[0_16px_40px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.08)] flex flex-col justify-between space-y-4 group hover:border-indigo-500/40 transition-all duration-300">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-300 shadow-sm">
              <Layers className="w-5 h-5" />
            </div>

            {/* Interactive Chip Selector */}
            <div className="flex items-center gap-1">
              {[500, 1000, 5000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => {
                    setFractionalAmt(amt);
                    soundEngine.playTabSwitchTone();
                  }}
                  className={clsx(
                    "px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold transition cursor-pointer border",
                    fractionalAmt === amt
                      ? "bg-indigo-500/25 border-indigo-500/40 text-indigo-200 shadow-sm"
                      : "bg-white/[0.03] border-white/5 text-slate-400 hover:text-white"
                  )}
                >
                  ₹{amt}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-base font-black text-white tracking-tight">
              2. Zero Minimum: Fractional Units
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed mt-1">
              Unlike Indian exchanges requiring full shares, US brokerages allow fractional purchases starting at <strong>$1 (~₹84)</strong> with full dividend rights.
            </p>
          </div>

          {/* Dynamic Fractional Ownership Card */}
          <div className="p-3.5 rounded-2xl bg-black/45 border border-white/[0.06] space-y-2">
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
              <span>What ₹{fractionalAmt} ($ {usdFractional.toFixed(2)}) buys:</span>
              <span className="text-indigo-300 font-bold">Direct SEC Custody</span>
            </div>

            <div className="space-y-1.5 text-xs font-mono">
              <div className="flex items-center justify-between p-1.5 rounded-lg bg-white/[0.02] border border-white/5">
                <span className="text-white font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  NVDA (Nvidia):
                </span>
                <strong className="text-cyan-300 font-bold">{nvdaShares} shares</strong>
              </div>

              <div className="flex items-center justify-between p-1.5 rounded-lg bg-white/[0.02] border border-white/5">
                <span className="text-white font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                  AAPL (Apple):
                </span>
                <strong className="text-indigo-300 font-bold">{aaplShares} shares</strong>
              </div>

              <div className="flex items-center justify-between p-1.5 rounded-lg bg-white/[0.02] border border-white/5">
                <span className="text-white font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                  MSFT (Microsoft):
                </span>
                <strong className="text-purple-300 font-bold">{msftShares} shares</strong>
              </div>
            </div>
          </div>
        </div>

        <div className="text-[10px] font-mono text-indigo-300/90 font-bold flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3 text-indigo-400" />
          <span>Proportional dividends deposited directly into cash balance</span>
        </div>
      </div>

      {/* ── Pillar 3: RBI LRS & Legal Safety Architecture ── */}
      <div className="p-5 sm:p-6 rounded-3xl bg-[#0d0f14]/85 border border-white/[0.08] backdrop-blur-3xl shadow-[0_16px_40px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.08)] flex flex-col justify-between space-y-4 group hover:border-emerald-500/40 transition-all duration-300">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>

            <div className="flex items-center gap-1 p-0.5 rounded-xl bg-white/[0.03] border border-white/10 text-[10px] font-mono">
              <button
                type="button"
                onClick={() => {
                  setSafetyFocus("lrs");
                  soundEngine.playTabSwitchTone();
                }}
                className={clsx(
                  "px-2.5 py-1 rounded-lg transition cursor-pointer font-bold",
                  safetyFocus === "lrs"
                    ? "bg-emerald-500/25 text-emerald-200 border border-emerald-500/40 shadow-sm"
                    : "text-slate-400 hover:text-white"
                )}
              >
                RBI LRS
              </button>
              <button
                type="button"
                onClick={() => {
                  setSafetyFocus("sipc");
                  soundEngine.playTabSwitchTone();
                }}
                className={clsx(
                  "px-2.5 py-1 rounded-lg transition cursor-pointer font-bold",
                  safetyFocus === "sipc"
                    ? "bg-emerald-500/25 text-emerald-200 border border-emerald-500/40 shadow-sm"
                    : "text-slate-400 hover:text-white"
                )}
              >
                SIPC Cover
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-base font-black text-white tracking-tight">
              3. RBI LRS &amp; \$500K SIPC Shield
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed mt-1">
              Fully approved by Reserve Bank of India with zero prior permission needed. Accounts protected by US federal depository insurance.
            </p>
          </div>

          {safetyFocus === "lrs" ? (
            <div className="p-3.5 rounded-2xl bg-black/45 border border-white/[0.06] space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between pb-1.5 border-b border-white/5">
                <span className="text-slate-400 text-[10px]">RBI LRS Annual Cap:</span>
                <strong className="text-white">$250,000 / Year (~₹2.1 Cr)</strong>
              </div>
              <div className="flex items-center justify-between pb-1.5 border-b border-white/5">
                <span className="text-slate-400 text-[10px]">TCS Threshold:</span>
                <strong className="text-emerald-300">0% TCS &lt; ₹7,00,000</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[10px]">Regulatory Status:</span>
                <strong className="text-cyan-300">Automatic AD-Bank Route</strong>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-black/45 border border-white/[0.06] space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between pb-1.5 border-b border-white/5">
                <span className="text-slate-400 text-[10px]">Depository Insurance:</span>
                <strong className="text-emerald-300">$500,000 (~₹4.2 Cr)</strong>
              </div>
              <div className="flex items-center justify-between pb-1.5 border-b border-white/5">
                <span className="text-slate-400 text-[10px]">Cash Sub-Limit:</span>
                <strong className="text-white">$250,000 Protection</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[10px]">Overseen By:</span>
                <strong className="text-indigo-300">US SEC &amp; FINRA</strong>
              </div>
            </div>
          )}
        </div>

        <div className="text-[10px] font-mono text-emerald-300/90 font-bold flex items-center gap-1">
          <ShieldCheck className="w-3 h-3 text-emerald-400" />
          <span>100% legal, regulated, and tax-documented for Indian PAN holders</span>
        </div>
      </div>

    </div>
  );
}

export default ForeignStocksPillars;
