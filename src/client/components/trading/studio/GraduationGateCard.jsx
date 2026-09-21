import React from "react";
import { motion } from "framer-motion";
import { Award, Info, HelpCircle, ShieldCheck, Scale, Activity } from "lucide-react";
import clsx from "clsx";
import { GraduationMilestoneBanner } from "./GraduationMilestoneBanner";

export const GraduationGateCard = React.memo(function GraduationGateCard({
  practiceCompleted = 0,
  distinctSessionsCount = 0,
  sessionsTarget = 8,
  gateProfitFactor = "0.00",
  isPureWins = false,
  gateDisciplinePct = 100,
  sampleSizeProgress = 0,
  profitFactor = "0.00",
  totalFriction = 0,
  frictionDragPct = 0,
  expectancyPerTrade = 0,
  consistencyScorePct = 0,
  isConsistencyPassed = true,
  syntheticSlippageTotal = 0,
  stressedProfitFactor = "0.00",
  stressedExpectancy = 0,
  isSlippageImmune = true
}) {
  const isSampleConfident = practiceCompleted >= 5;
  const isCertified = practiceCompleted >= 30 &&
    distinctSessionsCount >= sessionsTarget &&
    (Number(gateProfitFactor) >= 1.5 || (isPureWins && isSampleConfident)) &&
    gateDisciplinePct >= 90 &&
    isConsistencyPassed &&
    isSlippageImmune;

  return (
    <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
      <GraduationMilestoneBanner
        isCertified={isCertified}
        isPureWins={isPureWins}
        gateProfitFactor={gateProfitFactor}
        gateDisciplinePct={gateDisciplinePct}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-400" />
          <div>
            <strong className="text-xs font-bold text-white">Live Capital Readiness &amp; Micro-Lot Graduation Gate</strong>
            <span className="text-[10px] text-slate-400 block sm:inline sm:ml-2">
              Requires 30 trades across 8 sessions with &ge;1.50x PF, &le;45% consistency ratio, and &ge;90% invariant discipline
            </span>
          </div>
        </div>
        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 self-start sm:self-auto font-mono">
          Progress: {practiceCompleted}/30 Trades ({distinctSessionsCount}/{sessionsTarget} Sessions)
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
        {/* Pillar 1: Sample Size & Regime Diversity */}
        <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-2 relative group/gate hover:border-cyan-500/40 transition cursor-help">
          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-64 p-3 rounded-2xl bg-[#121424]/95 border border-cyan-500/30 shadow-2xl backdrop-blur-xl opacity-0 group-hover/gate:opacity-100 transition-all duration-200 pointer-events-none z-30 scale-95 group-hover/gate:scale-100 transform space-y-1.5">
            <div className="flex items-center gap-1.5 text-cyan-300 font-bold text-xs pb-1 border-b border-white/10">
              <Info className="w-3.5 h-3.5" />
              <span>Sample &amp; Regime Diversity</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Requires at least 30 executions across 8 distinct market sessions to ensure execution holds up across morning gap-ups, mid-day chop, and expiry spikes.
            </p>
            <div className="text-[10px] font-mono text-cyan-400 pt-0.5">
              {Math.max(0, 30 - practiceCompleted)} trades &amp; {Math.max(0, sessionsTarget - distinctSessionsCount)} sessions needed.
            </div>
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2.5 h-2.5 bg-[#121424] border-r border-b border-cyan-500/30 rotate-45" />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-300 text-[11px] font-bold flex items-center gap-1">
              1. Regime Diversity
              <HelpCircle className="w-3 h-3 text-slate-500" />
            </span>
            <strong className="font-mono text-white font-bold">{practiceCompleted}/30 ({distinctSessionsCount}/{sessionsTarget}d)</strong>
          </div>
          <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${sampleSizeProgress}%` }}
              className="h-full bg-cyan-500 rounded-full"
            />
          </div>
          <span className="text-[10px] text-slate-400 block truncate">
            {practiceCompleted >= 30 && distinctSessionsCount >= sessionsTarget
              ? "✅ Multi-regime sample cleared"
              : `${Math.max(0, 30 - practiceCompleted)} trades / ${Math.max(0, sessionsTarget - distinctSessionsCount)} sessions left`}
          </span>
        </div>

        {/* Pillar 2: Profit Factor */}
        <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-2 relative group/gate hover:border-emerald-500/40 transition cursor-help">
          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-64 p-3 rounded-2xl bg-[#121424]/95 border border-emerald-500/30 shadow-2xl backdrop-blur-xl opacity-0 group-hover/gate:opacity-100 transition-all duration-200 pointer-events-none z-30 scale-95 group-hover/gate:scale-100 transform space-y-1.5">
            <div className="flex items-center gap-1.5 text-emerald-300 font-bold text-xs pb-1 border-b border-white/10">
              <Info className="w-3.5 h-3.5" />
              <span>Profit Factor &ge; 1.50x Target</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Profit Factor = <strong>Gross Wins &divide; Gross Losses</strong>. Measures statistical positive expectancy. Target is &ge; 1.50x.
            </p>
            <div className="text-[10px] font-mono text-emerald-400 pt-0.5">
              Current status: {isPureWins ? "100% Win Rate" : `${gateProfitFactor}x`}.
            </div>
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2.5 h-2.5 bg-[#121424] border-r border-b border-emerald-500/30 rotate-45" />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-300 text-[11px] font-bold flex items-center gap-1">
              2. Profit Factor (&ge; 1.5)
              <HelpCircle className="w-3 h-3 text-slate-500" />
            </span>
            <strong className={clsx("font-mono font-bold", isSampleConfident ? "text-emerald-400" : "text-amber-400")}>
              {!isSampleConfident
                ? practiceCompleted === 0
                  ? "0.00x"
                  : `Developing (${practiceCompleted}/5)`
                : isPureWins
                  ? "∞ (Zero Losses)"
                  : `${gateProfitFactor}x`}
            </strong>
          </div>
          <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className={clsx("h-full rounded-full transition-all duration-300", isSampleConfident ? "bg-emerald-500" : "bg-amber-400")}
              style={{
                width: !isSampleConfident
                  ? `${Math.min(100, (practiceCompleted / 5) * 100)}%`
                  : `${Math.min(100, isPureWins ? 100 : (Number(gateProfitFactor) / 2.0) * 100)}%`
              }}
            />
          </div>
          <span className={clsx("text-[10px] block truncate", isSampleConfident ? "text-emerald-400" : "text-amber-300/80")}>
            {practiceCompleted === 0
              ? "No practice trades recorded yet"
              : !isSampleConfident
                ? `Sample developing: ${Math.max(0, 5 - practiceCompleted)} more trades needed for PF confidence`
                : Number(gateProfitFactor) >= 1.5 || isPureWins
                  ? `✅ Exceeds 1.5 minimum (${isPureWins ? "100% Win Rate" : `${gateProfitFactor}x PF`})`
                  : `⚠️ Current PF: ${gateProfitFactor}x (Target: ≥ 1.50x)`}
          </span>
        </div>

        {/* Pillar 3: Strict RMS Invariant Discipline */}
        <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-2 relative group/gate hover:border-emerald-500/40 transition cursor-help">
          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-64 p-3 rounded-2xl bg-[#121424]/95 border border-emerald-500/30 shadow-2xl backdrop-blur-xl opacity-0 group-hover/gate:opacity-100 transition-all duration-200 pointer-events-none z-30 scale-95 group-hover/gate:scale-100 transform space-y-1.5">
            <div className="flex items-center gap-1.5 text-emerald-300 font-bold text-xs pb-1 border-b border-white/10">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Strict RMS Invariant Discipline</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Audits adherence to Manikandan&apos;s strict invariants: 3-trade daily quota, ₹300 daily loss cap, and ₹300 per-trade risk limit. Penalties apply for revenge trades or moved stops.
            </p>
            <div className="text-[10px] font-mono text-emerald-400 pt-0.5">
              Current discipline rating: {gateDisciplinePct}%.
            </div>
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2.5 h-2.5 bg-[#121424] border-r border-b border-emerald-500/30 rotate-45" />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-300 text-[11px] font-bold flex items-center gap-1">
              3. RMS Discipline (&ge; 90%)
              <HelpCircle className="w-3 h-3 text-slate-500" />
            </span>
            <strong className="font-mono text-emerald-400 font-bold">{gateDisciplinePct}% Adherence</strong>
          </div>
          <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${gateDisciplinePct}%` }}
            />
          </div>
          <span className="text-[10px] text-emerald-400 block truncate">
            {gateDisciplinePct >= 90 ? "✅ ₹300 loss cap & 3/day quota respected" : "⚠️ Penalties deducted for quota/loss breaches"}
          </span>
        </div>

        {/* Pillar 4: Prop-Grade Consistency Score */}
        <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-2 relative group/gate hover:border-amber-500/40 transition cursor-help">
          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-64 p-3 rounded-2xl bg-[#121424]/95 border border-amber-500/30 shadow-2xl backdrop-blur-xl opacity-0 group-hover/gate:opacity-100 transition-all duration-200 pointer-events-none z-30 scale-95 group-hover/gate:scale-100 transform space-y-1.5">
            <div className="flex items-center gap-1.5 text-amber-300 font-bold text-xs pb-1 border-b border-white/10">
              <Activity className="w-3.5 h-3.5" />
              <span>Prop-Grade Consistency Score</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Institutional benchmark: no single session can exceed <strong>45% of total winning profits</strong>. Guarantees profit came from repeatable statistical edge, not 1 lucky expiry lottery ticket.
            </p>
            <div className="text-[10px] font-mono text-amber-400 pt-0.5">
              Top Session: {consistencyScorePct}% of total gains (Target: &le;45%).
            </div>
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2.5 h-2.5 bg-[#121424] border-r border-b border-amber-500/30 rotate-45" />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-300 text-[11px] font-bold flex items-center gap-1">
              4. Consistency (&le; 45%)
              <HelpCircle className="w-3 h-3 text-slate-500" />
            </span>
            <strong className={clsx("font-mono font-bold", isConsistencyPassed ? "text-emerald-400" : "text-amber-400")}>
              {consistencyScorePct}% Top Day
            </strong>
          </div>
          <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className={clsx("h-full rounded-full transition-all duration-300", isConsistencyPassed ? "bg-emerald-500" : "bg-amber-400")}
              style={{ width: `${Math.min(100, Math.max(10, consistencyScorePct))}%` }}
            />
          </div>
          <span className={clsx("text-[10px] block truncate", isConsistencyPassed ? "text-emerald-400" : "text-amber-300/80")}>
            {practiceCompleted < 5
              ? "Sample developing (N < 5)"
              : isConsistencyPassed
                ? "✅ Edge smoothly distributed (≤45%)"
                : `⚠️ Outlier dependent (${consistencyScorePct}% > 45%)`}
          </span>
        </div>

        {/* Pillar 5: Statutory Friction & Expectancy */}
        <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-2 relative group/gate hover:border-cyan-500/40 transition cursor-help">
          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-64 p-3 rounded-2xl bg-[#121424]/95 border border-cyan-500/30 shadow-2xl backdrop-blur-xl opacity-0 group-hover/gate:opacity-100 transition-all duration-200 pointer-events-none z-30 scale-95 group-hover/gate:scale-100 transform space-y-1.5">
            <div className="flex items-center gap-1.5 text-cyan-300 font-bold text-xs pb-1 border-b border-white/10">
              <Scale className="w-3.5 h-3.5" />
              <span>Friction Drag &amp; Expectancy</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Deducts ~₹55.20 STT and brokerage per trade. Mathematical Expectancy (E = Pw&times;W - Pl&times;L) proves whether edge survives transaction friction.
            </p>
            <div className="text-[10px] font-mono text-cyan-400 pt-0.5">
              Net Edge: {expectancyPerTrade >= 0 ? "+" : ""}₹{expectancyPerTrade}/trade.
            </div>
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2.5 h-2.5 bg-[#121424] border-r border-b border-cyan-500/30 rotate-45" />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-300 text-[11px] font-bold flex items-center gap-1">
              5. Expectancy (E)
              <HelpCircle className="w-3 h-3 text-slate-500" />
            </span>
            <strong className="font-mono text-cyan-300 font-bold">
              {expectancyPerTrade >= 0 ? "+" : ""}₹{expectancyPerTrade}/trade
            </strong>
          </div>
          <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-cyan-500 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(10, 100 - Number(frictionDragPct || 0)))}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-400 block truncate">
            {practiceCompleted === 0
              ? "0 practice trades"
              : `~₹${Math.round(totalFriction)} taxes (${frictionDragPct}% drag)`}
          </span>
        </div>
      </div>

      {/* 🛡️ Synthetic Slippage Stress-Test & Live Execution Guard */}
      <div className="p-3.5 rounded-2xl bg-[#090b10]/90 border border-white/10 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className={clsx(
            "w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm shadow-sm border flex-shrink-0",
            isSlippageImmune
              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
              : "bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse"
          )}>
            🧪
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <strong className="text-white text-xs font-bold">
                Live Synthetic Slippage Stress-Test (-1.0 pt / -₹65 on Stops)
              </strong>
              <span className={clsx(
                "text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border",
                isSlippageImmune
                  ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                  : "bg-rose-500/20 text-rose-300 border-rose-500/40"
              )}>
                {isSlippageImmune ? "🛡️ Slippage Resilient" : "⚠️ Slippage Vulnerable"}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Simulates adverse live fills on fast market breakdowns: applied -₹{syntheticSlippageTotal} synthetic drag to stop exits.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end md:self-auto font-mono text-[11px]">
          <div className="text-right">
            <span className="text-[9px] text-slate-500 block uppercase">Stressed PF</span>
            <strong className={clsx("font-bold text-xs", Number(stressedProfitFactor) >= 1.30 ? "text-emerald-400" : "text-amber-400")}>
              {stressedProfitFactor}x
            </strong>
          </div>
          <div className="text-right border-l border-white/10 pl-3">
            <span className="text-[9px] text-slate-500 block uppercase">Stressed Exp</span>
            <strong className={clsx("font-bold text-xs", stressedExpectancy >= 0 ? "text-cyan-300" : "text-rose-400")}>
              {stressedExpectancy >= 0 ? "+" : ""}₹{stressedExpectancy}/t
            </strong>
          </div>
          <div className="bg-white/5 border border-white/10 px-2.5 py-1 rounded-xl text-[10px] text-slate-300 font-sans hidden sm:block">
            📌 Live Rule: Use <strong className="text-amber-300 font-mono">STOP_LIMIT</strong> (Trig - 1.5pt)
          </div>
        </div>
      </div>
    </div>
  );
});

