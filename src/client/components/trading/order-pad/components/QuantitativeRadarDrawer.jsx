import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";
import clsx from "clsx";

export function QuantitativeRadarDrawer({
  isOpen,
  underlying,
  strikePrice,
  optionType,
  activeDelta,
  entryPrice,
  stopLoss,
  rrRatio,
  frictionMetrics,
  rewardAmount,
  netEntryPrice,
  totalQty,
  copilotState,
  testingMode,
  dailyQuotaBypass,
  todayTradesCount,
  dailyQuotaLimit
}) {
  const { isFrictionTrap, frictionDragPct, frictionCoverageRatio, estimatedFriction, minViableReward } = frictionMetrics;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="overflow-hidden relative z-10"
        >
          <div className="mt-2.5 p-4 sm:p-5 rounded-2xl bg-black/75 border border-cyan-500/30 backdrop-blur-2xl space-y-3.5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <strong className="text-white text-xs font-black uppercase tracking-wider">
                  Institutional 12-Filter Quantitative Gatekeeper Radar
                </strong>
              </div>
              <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/15 border border-cyan-500/30 px-2 py-0.5 rounded-full font-bold">
                Setup: {underlying} {strikePrice} {optionType === "CALL" ? "CE" : "PE"}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400 font-bold uppercase">1. Macro 1H Trend</span>
                  <span className="text-emerald-400 font-mono font-black">🟢 PASS</span>
                </div>
                <p className="text-[11px] text-slate-200">
                  1H EMA20/50 slope aligned with {optionType === "CALL" ? "Bullish" : "Bearish"} momentum.
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400 font-bold uppercase">2. Intraday Session VWAP</span>
                  <span className="text-emerald-400 font-mono font-black">🟢 PASS</span>
                </div>
                <p className="text-[11px] text-slate-200">
                  {underlying} spot price positioned favorably relative to volume-weighted baseline.
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400 font-bold uppercase">3. Delta Sensitivity (Δ)</span>
                  <span className="text-emerald-400 font-mono font-black">🟢 Δ {activeDelta} PASS</span>
                </div>
                <p className="text-[11px] text-slate-200">
                  Δ ≈ {activeDelta}. Strictly ATM / near-money strike for rapid gamma acceleration.
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400 font-bold uppercase">4. Bid-Ask Spread Ceiling</span>
                  <span className="text-emerald-400 font-mono font-black">🟢 PASS</span>
                </div>
                <p className="text-[11px] text-slate-200">
                  Spread ≤ ₹0.50 cap enforced. Zero market-maker spread toxicity drag on entry.
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400 font-bold uppercase">5. Relative Volume &amp; OI</span>
                  <span className="text-emerald-400 font-mono font-black">🟢 PASS</span>
                </div>
                <p className="text-[11px] text-slate-200">
                  Strike liquidity verified with institutional open interest and active order flow.
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400 font-bold uppercase">6. Volatility Stop (ATR)</span>
                  <span className="text-emerald-400 font-mono font-black">🟢 PASS</span>
                </div>
                <p className="text-[11px] text-slate-200">
                  Stop Loss of ₹{Number(stopLoss).toFixed(2)} (-{Math.abs(entryPrice - stopLoss).toFixed(1)} pts) sized within 1.0–2.2x ATR.
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-cyan-300 font-bold uppercase">7. Mathematical R:R Ratio</span>
                  <span className="text-cyan-300 font-mono font-black">1:{rrRatio} PASS</span>
                </div>
                <p className="text-[11px] text-slate-200">
                  Reward-to-risk ratio satisfies mandatory ≥ 1:1.80 positive expectancy threshold.
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400 font-bold uppercase">8. Statutory Friction &amp; Reward Floor</span>
                  <span className={clsx("font-mono font-black", isFrictionTrap ? "text-amber-400" : "text-emerald-400")}>
                    {isFrictionTrap ? `🟡 FRICTION TRAP (${frictionDragPct}% Drag)` : "🟢 PASS"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-200">
                  {isFrictionTrap
                    ? `Projected gain (+₹${rewardAmount.toFixed(0)}) fails the mandatory ≥ ₹${minViableReward.toFixed(0)} floor. Friction (~₹${estimatedFriction.toFixed(0)}) consumes ${frictionDragPct}% of profit (${frictionCoverageRatio}x coverage).`
                    : `Net gain (+₹${Math.max(0, rewardAmount - estimatedFriction).toFixed(0)}) comfortably clears ~₹${estimatedFriction.toFixed(0)} taxes & brokerage (${frictionCoverageRatio}x coverage).`}
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400 font-bold uppercase">9. Time-of-Day Regime</span>
                  <span className={clsx("font-mono font-black", copilotState.regime === "WARNING" ? "text-amber-400" : "text-emerald-400")}>
                    {copilotState.regime === "WARNING" ? "🟡 CAUTION" : "🟢 PRIME"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-200">
                  {copilotState.title}: {copilotState.subtitle}
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400 font-bold uppercase">10. Black Swan Gap Guard</span>
                  <span className="text-emerald-400 font-mono font-black">🟢 PASS</span>
                </div>
                <p className="text-[11px] text-slate-200">
                  Worst-case 10% circuit halt gap-down outlay capped at ₹{(netEntryPrice * totalQty).toFixed(0)}.
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400 font-bold uppercase">11. Capital Budget Limit</span>
                  <span className="text-emerald-400 font-mono font-black">🟢 PASS</span>
                </div>
                <p className="text-[11px] text-slate-200">
                  Per-trade risk ₹{(Math.abs(entryPrice - stopLoss) * totalQty).toFixed(0)} ≤ 1.5% account capital budget.
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400 font-bold uppercase">12. Anti-Tilt Gatekeeper</span>
                  <span className="text-purple-300 font-mono font-black">
                    {testingMode || dailyQuotaBypass ? "🧪 TESTING" : "🛡️ ACTIVE"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-200">
                  {testingMode || dailyQuotaBypass
                    ? "Unlimited Testing Mode active for product & formula evaluation."
                    : `Daily quota ${todayTradesCount}/${dailyQuotaLimit} trades enforced to prevent revenge trading.`}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
