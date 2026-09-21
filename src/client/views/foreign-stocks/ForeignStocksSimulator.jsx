import React from "react";
import clsx from "clsx";
import { 
  Calculator, 
  TrendingUp, 
  Sparkles, 
  Sliders, 
  ShieldCheck, 
  ShieldAlert, 
  AlertCircle, 
  Calendar, 
  Repeat, 
  DollarSign, 
  Flame, 
  Target, 
  Award, 
  Layers, 
  TrendingDown,
  ArrowRight,
  Coins
} from "lucide-react";
import { soundEngine } from "../../utils/soundEngine";
import { USD_INR_RATE, USD_ANNUAL_ALPHA, DEFAULT_US_STOCKS } from "./foreignStocksData";
import { CompoundingTrajectoryChart } from "./CompoundingTrajectoryChart";

export function ForeignStocksSimulator({
  simRupees,
  setSimRupees,
  simStockSymbol,
  setSimStockSymbol,
  simStock,
  simUsdCapital,
  simSharesOwned,
  simProjectedInrValue,
  simTotalInrRoiPct,
  simNetInrProfit,
  totalInvestedRupees,
  activeSimCagr,
  setCustomCagr,
  simYears,
  setSimYears,
  simMode,
  setSimMode,
  adjustInflation,
  setAdjustInflation,
  priorRemittancesInr = 0,
  setPriorRemittancesInr,
  remainingTcsExemption = 700000,
  fxScenario = "mean",
  setFxScenario,
  activeFxAlpha = 3.5,
  simDirection = "forward",
  setSimDirection,
  goalTargetRupees = 1000000,
  setGoalTargetRupees,
  seedCapitalRupees = 0,
  setSeedCapitalRupees,
  requiredMonthlySip = 0,
  goalTotalOutPocket = 0,
  goalMarketWealth = 0,
  simulatePullback = false,
  setSimulatePullback,
  trajectoryData = [],
  benchmarkFdValue = 0,
  benchmarkFdGain = 0,
  benchmarkNiftyValue = 0,
  benchmarkNiftyGain = 0,
  benchmarkUsValue = 0,
  benchmarkUsGain = 0,
  alphaOverNifty = 0,
  alphaOverFd = 0,
  isTcsExempt,
  tcsTaxableExcess,
  tcsAmount
}) {
  const stockHistoricalCagr = simStock.cagr3Y || 15;
  const cleanRupees = Math.max(0, Number(simRupees) || 0);
  const cleanGoal = Math.max(0, Number(goalTargetRupees) || 0);
  const cleanSeed = Math.max(0, Number(seedCapitalRupees) || 0);
  const stockBeta = simStock.beta || (simStock.symbol === "VOO" ? 1.0 : simStock.symbol === "NVDA" ? 1.65 : simStock.symbol === "TSLA" ? 2.05 : simStock.symbol === "AAPL" ? 1.10 : 1.25);
  const goalBearValue = Math.round(cleanGoal * Math.max(0.4, 1 - (0.18 * stockBeta)));
  const goalBullValue = Math.round(cleanGoal * (1 + (0.22 * stockBeta)));

  const handleInputChange = (e) => {
    const val = e.target.value.replace(/\D/g, "");
    setSimRupees(val === "" ? "" : Number(val));
  };

  const handleGoalChange = (e) => {
    const val = e.target.value.replace(/\D/g, "");
    setGoalTargetRupees?.(val === "" ? "" : Number(val));
  };

  const handleCagrSlider = (e) => {
    setCustomCagr(Number(e.target.value));
  };

  return (
    <div 
      id="foreign-simulator"
      className="p-5 sm:p-7 rounded-3xl bg-gradient-to-br from-[#121424]/95 via-[#0d0f14]/95 to-[#060709]/95 border border-cyan-500/25 backdrop-blur-3xl shadow-[0_20px_50px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.12)] space-y-6 scroll-mt-24 transition-all"
    >
      {/* ── Top Bar: Direction Selector (Forward vs Goal) & Toggles ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/35 flex items-center justify-center text-cyan-300 shadow-sm">
              <Calculator className="w-4 h-4" />
            </div>
            <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wider">
              {simDirection === "goal" ? "Reverse Wealth Goal Solver" : "Multi-Year Compounding & SIP Engine"}
            </h2>
          </div>
          <p className="text-xs text-slate-300">
            {simDirection === "goal" 
              ? "Specify your target wealth corpus in INR — solve the exact monthly SIP required in US equities."
              : "Simulate one-time lump sums or monthly dollar-cost averaging with dual currency compounding and tax compliance."}
          </p>
        </div>

        {/* Global Controls: Direction Switcher + Mode & Inflation */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Forward vs Goal Mode Switcher */}
          <div className="flex items-center gap-1 p-0.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs font-mono font-bold">
            <button
              type="button"
              onClick={() => {
                setSimDirection?.("forward");
                soundEngine.playTabSwitchTone();
              }}
              className={clsx(
                "px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5",
                simDirection === "forward"
                  ? "bg-cyan-500/25 text-cyan-200 border border-cyan-500/40 shadow-sm"
                  : "text-slate-400 hover:text-white"
              )}
            >
              <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
              <span>Forward Growth</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSimDirection?.("goal");
                soundEngine.playTabSwitchTone();
              }}
              className={clsx(
                "px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5",
                simDirection === "goal"
                  ? "bg-emerald-500/25 text-emerald-200 border border-emerald-500/40 shadow-sm"
                  : "text-slate-400 hover:text-white"
              )}
            >
              <Target className="w-3.5 h-3.5 text-emerald-400" />
              <span>Target Goal</span>
            </button>
          </div>

          {/* Lump Sum vs SIP Switcher (in Forward mode) */}
          {simDirection === "forward" && (
            <div className="flex items-center gap-1 p-0.5 rounded-xl bg-white/[0.03] border border-white/10 text-xs font-mono font-bold">
              <button
                type="button"
                onClick={() => {
                  setSimMode("lumpsum");
                  soundEngine.playTabSwitchTone();
                }}
                className={clsx(
                  "px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5",
                  simMode === "lumpsum"
                    ? "bg-indigo-500/25 text-indigo-200 border border-indigo-500/40 shadow-sm"
                    : "text-slate-400 hover:text-white"
                )}
              >
                <DollarSign className="w-3.5 h-3.5 text-indigo-400" />
                <span>Lump Sum</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSimMode("sip");
                  soundEngine.playTabSwitchTone();
                }}
                className={clsx(
                  "px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5",
                  simMode === "sip"
                    ? "bg-indigo-500/25 text-indigo-200 border border-indigo-500/40 shadow-sm"
                    : "text-slate-400 hover:text-white"
                )}
              >
                <Repeat className="w-3.5 h-3.5 text-indigo-400" />
                <span>Monthly SIP</span>
              </button>
            </div>
          )}

          {/* Inflation Toggle */}
          <button
            type="button"
            onClick={() => {
              setAdjustInflation(!adjustInflation);
              soundEngine.playTabSwitchTone();
            }}
            className={clsx(
              "px-3 py-1.5 rounded-xl text-xs font-mono font-bold border transition cursor-pointer flex items-center gap-1.5",
              adjustInflation
                ? "bg-amber-500/20 border-amber-500/40 text-amber-200 shadow-sm"
                : "bg-white/[0.03] border-white/10 text-slate-400 hover:text-white"
            )}
            title="Discount future value by ~5.2% Indian annual inflation"
          >
            <Flame className={clsx("w-3.5 h-3.5", adjustInflation ? "text-amber-400" : "text-slate-500")} />
            <span>{adjustInflation ? "Real (CPI)" : "Nominal"}</span>
          </button>
        </div>
      </div>

      {/* ── Main Grid Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Controls (Col 6) */}
        <div className="lg:col-span-6 space-y-4">
          
          {/* 1. Target Goal Input (if Goal mode) OR Rupee Input (if Forward mode) */}
          {simDirection === "goal" ? (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-white/[0.02] to-transparent border border-emerald-500/25 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Target Wealth Corpus in INR (₹)</span>
                </label>
                <span className="text-[10px] font-mono text-emerald-300 font-bold">
                  {cleanGoal >= 10000000 ? `₹${(cleanGoal / 10000000).toFixed(2)} Crore` : `₹${(cleanGoal / 100000).toFixed(1)} Lakhs`}
                </span>
              </div>

              {/* Goal Presets */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                {[
                  { label: "₹5 Lakhs", val: 500000 },
                  { label: "₹10 Lakhs", val: 1000000 },
                  { label: "₹25 Lakhs", val: 2500000 },
                  { label: "₹50 Lakhs", val: 5000000 },
                  { label: "₹1 Crore ($120K)", val: 10000000, highlight: true },
                ].map((preset) => (
                  <button
                    key={preset.val}
                    type="button"
                    onClick={() => {
                      setGoalTargetRupees?.(preset.val);
                      soundEngine.playTabSwitchTone();
                    }}
                    className={clsx(
                      "px-2.5 py-1 rounded-xl text-xs font-mono font-bold border transition cursor-pointer whitespace-nowrap",
                      Number(goalTargetRupees) === preset.val
                        ? "bg-emerald-500/25 border-emerald-500/50 text-emerald-200 shadow-sm"
                        : preset.highlight
                        ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                        : "bg-white/[0.03] border-white/10 text-slate-300 hover:bg-white/[0.06]"
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <div className="relative mt-1">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold text-sm">
                  ₹
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={goalTargetRupees}
                  onChange={handleGoalChange}
                  className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm font-mono font-bold text-white focus:outline-none focus:border-emerald-500/50"
                  placeholder="Enter target wealth (e.g. 2000000)"
                />
              </div>

              {/* Hybrid Starting Seed Capital (Initial Lump Sum) Selector */}
              <div className="pt-2.5 border-t border-white/[0.06] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-bold flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5 text-amber-400" />
                    <span>Initial Seed Capital (Optional Lump Sum)</span>
                  </span>
                  <span className="text-[10px] font-mono text-amber-300 font-bold">
                    {cleanSeed > 0 ? `₹${cleanSeed.toLocaleString("en-IN")}` : "Pure Monthly SIP (₹0)"}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                  {[
                    { label: "₹0 (Pure SIP)", val: 0 },
                    { label: "₹50K Seed", val: 50000 },
                    { label: "₹1L Seed", val: 100000 },
                    { label: "₹2.5L Seed", val: 250000 },
                    { label: "₹5L Seed", val: 500000 },
                  ].map((seed) => (
                    <button
                      key={seed.val}
                      type="button"
                      onClick={() => {
                        setSeedCapitalRupees?.(seed.val);
                        soundEngine.playTabSwitchTone();
                      }}
                      className={clsx(
                        "px-2.5 py-1 rounded-xl text-xs font-mono font-bold border transition cursor-pointer whitespace-nowrap active:scale-95",
                        cleanSeed === seed.val
                          ? "bg-amber-500/25 border-amber-500/50 text-amber-200 shadow-sm"
                          : "bg-white/[0.03] border-white/10 text-slate-300 hover:bg-white/[0.06]"
                      )}
                    >
                      {seed.label}
                    </button>
                  ))}
                </div>

                <div className="relative mt-1">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold text-sm">
                    ₹
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={seedCapitalRupees || ""}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      setSeedCapitalRupees?.(val === "" ? 0 : Number(val));
                    }}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-500/50"
                    placeholder="Custom starting lump sum (e.g. 100000)"
                  />
                </div>
              </div>

              {/* Reverse SIP Solver Card */}
              <div className="p-3 rounded-xl bg-black/50 border border-white/5 flex items-center justify-between gap-3 text-xs font-mono">
                <div>
                  <span className="text-slate-400 text-[10px] block">Required Monthly SIP:</span>
                  <strong className="text-base font-black text-emerald-400 tabular-nums">
                    ₹{requiredMonthlySip.toLocaleString("en-IN")}/mo
                  </strong>
                  {cleanSeed > 0 && (
                    <span className="text-[9px] text-amber-300 block">
                      With ₹{cleanSeed.toLocaleString("en-IN")} initial seed
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-slate-400 text-[10px] block">Market Wealth Surplus:</span>
                  <strong className="text-cyan-300 font-bold tabular-nums">
                    +₹{goalMarketWealth.toLocaleString("en-IN")}
                  </strong>
                </div>
              </div>

              {/* 🎯 Probabilistic Volatility Tolerance Envelope */}
              {cleanGoal > 0 && (
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between pb-1.5 border-b border-white/[0.06]">
                    <div className="flex items-center gap-1.5 text-slate-200 font-bold">
                      <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Stochastic Volatility Envelope ({simYears}-Yr Horizon)</span>
                    </div>
                    <span className="font-mono text-[10px] text-slate-400">
                      {simStock.symbol} Beta: <strong className="text-cyan-300 font-bold">{stockBeta.toFixed(2)}</strong>
                    </span>
                  </div>

                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    Single equities oscillate in cyclical market swings. Rather than an unrealistic fixed point, your terminal corpus will distribute within this range:
                  </p>

                  <div className="grid grid-cols-3 gap-2 text-center font-mono">
                    {/* Bear Trough */}
                    <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/25 space-y-0.5">
                      <span className="text-[9px] text-rose-300 block font-sans">Bear Trough (-1σ)</span>
                      <strong className="text-xs font-bold text-rose-200 block">
                        ₹{goalBearValue.toLocaleString("en-IN")}
                      </strong>
                      <span className="text-[8px] text-rose-400 block">-{(0.18 * stockBeta * 100).toFixed(0)}% Cycle Dip</span>
                    </div>

                    {/* Expected Base Target */}
                    <div className="p-2 rounded-lg bg-emerald-500/15 border border-emerald-500/40 space-y-0.5 shadow-sm">
                      <span className="text-[9px] text-emerald-300 block font-sans font-bold">Expected Target</span>
                      <strong className="text-xs font-black text-emerald-300 block">
                        ₹{cleanGoal.toLocaleString("en-IN")}
                      </strong>
                      <span className="text-[8px] text-emerald-400/90 block">Base Goal</span>
                    </div>

                    {/* Bull Rally */}
                    <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/25 space-y-0.5">
                      <span className="text-[9px] text-cyan-300 block font-sans">Bull Rally (+1σ)</span>
                      <strong className="text-xs font-bold text-cyan-200 block">
                        ₹{goalBullValue.toLocaleString("en-IN")}
                      </strong>
                      <span className="text-[8px] text-cyan-400 block">+{(0.22 * stockBeta * 100).toFixed(0)}% Expansion</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-200 block">
                  1. {simMode === "sip" ? "Monthly SIP Amount (₹/month)" : "Investment Capital in INR (₹)"}
                </label>
                <span className="text-[10px] font-mono text-slate-400">
                  LRS Quota: $250K (~₹2.1 Cr/yr)
                </span>
              </div>

              {/* Presets */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                {(simMode === "sip"
                  ? [
                      { label: "₹5K/mo", val: 5000 },
                      { label: "₹10K/mo", val: 10000 },
                      { label: "₹25K/mo", val: 25000 },
                      { label: "₹50K/mo", val: 50000 },
                    ]
                  : [
                      { label: "₹25K", val: 25000 },
                      { label: "₹50K", val: 50000 },
                      { label: "₹1L", val: 100000 },
                      { label: "₹7L (TCS Cap)", val: 700000, highlight: true },
                      { label: "₹10L", val: 1000000 },
                    ]
                ).map((preset) => (
                  <button
                    key={preset.val}
                    type="button"
                    onClick={() => {
                      setSimRupees(preset.val);
                      soundEngine.playTabSwitchTone();
                    }}
                    className={clsx(
                      "px-3 py-1.5 rounded-xl text-xs font-mono font-bold border transition cursor-pointer active:scale-95 whitespace-nowrap",
                      Number(simRupees) === preset.val
                        ? "bg-cyan-500/20 border-cyan-500/45 text-cyan-200 shadow-md"
                        : preset.highlight
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20"
                        : "bg-white/[0.03] border-white/10 text-slate-300 hover:bg-white/[0.06]"
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <div className="relative mt-2">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold text-sm">
                  ₹
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={simRupees}
                  onChange={handleInputChange}
                  className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm font-mono font-bold text-white focus:outline-none focus:border-cyan-500/50"
                  placeholder={simMode === "sip" ? "Enter monthly SIP (e.g. 15000)" : "Enter custom amount (e.g. 75000)"}
                />
              </div>
            </div>
          )}

          {/* 2. Target US Stock Selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 block">
                2. Target US Asset ({DEFAULT_US_STOCKS.length} Leaders)
              </label>
              <span className="text-[10px] font-mono text-cyan-300">
                Selected: {simStock.symbol} (${simStock.price})
              </span>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
              {DEFAULT_US_STOCKS.map((stock) => (
                <button
                  key={stock.symbol}
                  type="button"
                  onClick={() => setSimStockSymbol(stock.symbol)}
                  className={clsx(
                    "py-2 px-1 rounded-xl text-xs font-mono font-bold border transition text-center cursor-pointer active:scale-95",
                    simStockSymbol === stock.symbol
                      ? "bg-indigo-500/25 border-indigo-500/50 text-indigo-200 shadow-md"
                      : "bg-white/[0.03] border-white/10 text-slate-400 hover:text-white"
                  )}
                  title={`${stock.name} (${stock.tag})`}
                >
                  {stock.symbol}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Time Horizon Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-cyan-400" />
              <span>3. Compounding Horizon</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { years: 1, label: "1 Year" },
                { years: 3, label: "3 Years" },
                { years: 5, label: "5 Years" },
                { years: 10, label: "10 Years" },
              ].map((h) => (
                <button
                  key={h.years}
                  type="button"
                  onClick={() => {
                    setSimYears(h.years);
                    soundEngine.playTabSwitchTone();
                  }}
                  className={clsx(
                    "py-2 rounded-xl text-xs font-mono font-bold border transition cursor-pointer active:scale-95",
                    simYears === h.years
                      ? "bg-cyan-500/25 border-cyan-500/40 text-cyan-200 shadow-md"
                      : "bg-white/[0.03] border-white/10 text-slate-400 hover:text-white"
                  )}
                >
                  {h.label}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Expected Annual Return (CAGR) Slider */}
          <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-slate-200 font-bold">
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                <span>4. Annual Stock Growth (CAGR)</span>
              </div>
              <span className="font-mono font-extrabold text-cyan-300 bg-cyan-500/15 px-2 py-0.5 rounded-lg border border-cyan-500/30">
                +{activeSimCagr}%
              </span>
            </div>

            <input
              type="range"
              min="5"
              max="50"
              step="1"
              value={activeSimCagr}
              onChange={handleCagrSlider}
              className="w-full accent-cyan-400 cursor-pointer"
            />

            <div className="flex items-center justify-between gap-2 pt-1 text-[10px] font-mono">
              <button
                type="button"
                onClick={() => setCustomCagr(12)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                Conservative (12%)
              </button>
              <button
                type="button"
                onClick={() => setCustomCagr(stockHistoricalCagr)}
                className="text-cyan-300 font-bold hover:underline cursor-pointer"
              >
                3-Yr Hist. ({stockHistoricalCagr}%)
              </button>
              <button
                type="button"
                onClick={() => setCustomCagr(30)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                Aggressive (30%)
              </button>
            </div>
          </div>

          {/* 5. USD/INR Currency Alpha Scenario Stress-Tester */}
          <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-slate-200 font-bold">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                <span>5. USD Currency Alpha Scenario</span>
              </div>
              <span className="font-mono font-extrabold text-emerald-300 bg-emerald-500/15 px-2 py-0.5 rounded-lg border border-emerald-500/30">
                +{activeFxAlpha}% / yr
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "stagnant", label: "0% Stagnant", desc: "Rupee Defense" },
                { id: "mean", label: "3.5% Historical", desc: "10-Yr Mean Baseline" },
                { id: "shock", label: "6.0% Macro Shock", desc: "High CAD Stress" },
              ].map((sc) => (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() => {
                    setFxScenario?.(sc.id);
                    soundEngine.playTabSwitchTone();
                  }}
                  className={clsx(
                    "p-2 rounded-xl border text-center transition cursor-pointer active:scale-95 flex flex-col items-center justify-center",
                    fxScenario === sc.id
                      ? "bg-emerald-500/20 border-emerald-500/45 text-emerald-200 shadow-sm"
                      : "bg-white/[0.02] border-white/5 text-slate-400 hover:text-white"
                  )}
                >
                  <strong className="text-xs font-mono font-bold block">{sc.label}</strong>
                  <span className="text-[9px] text-slate-500 truncate">{sc.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 6. Market Dip & DCA Pullback Shocker Toggle */}
          <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <TrendingDown className={clsx("w-4 h-4", simulatePullback ? "text-amber-400" : "text-slate-500")} />
              <div>
                <span className="font-bold text-white block text-[11px]">
                  DCA Pullback Stress-Test (-20% Year 1)
                </span>
                <span className="text-[10px] text-slate-400 block">
                  Simulates buying the dip: accumulates 25% more units during correction.
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setSimulatePullback?.(!simulatePullback);
                soundEngine.playTabSwitchTone();
              }}
              className={clsx(
                "px-3 py-1.5 rounded-xl font-mono text-[10px] font-bold border transition cursor-pointer",
                simulatePullback
                  ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                  : "bg-white/[0.03] border-white/10 text-slate-400 hover:text-white"
              )}
            >
              {simulatePullback ? "✓ Dip Simulated" : "+ Simulate Dip"}
            </button>
          </div>

          {/* 7. Real-World RBI LRS & TCS Tax Engine Capsule (in Lump Sum Mode) */}
          {simMode === "lumpsum" && simDirection === "forward" && (
            <div className="space-y-3">
              {/* Prior Remittance Headroom Selector */}
              <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-slate-200 font-bold">
                    <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Prior FY Remittances (FY 2024-25)</span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-400">
                    Remaining 0% Cap: <strong className={remainingTcsExemption > 0 ? "text-emerald-300" : "text-rose-300"}>
                      ₹{remainingTcsExemption.toLocaleString("en-IN")}
                    </strong>
                  </span>
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                  {[
                    { label: "₹0 (Fresh FY)", val: 0 },
                    { label: "₹2.5L Prior", val: 250000 },
                    { label: "₹5L Prior", val: 500000 },
                    { label: "₹7L (Maxed)", val: 700000 },
                  ].map((p) => (
                    <button
                      key={p.val}
                      type="button"
                      onClick={() => {
                        setPriorRemittancesInr?.(p.val);
                        soundEngine.playTabSwitchTone();
                      }}
                      className={clsx(
                        "px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold border transition cursor-pointer whitespace-nowrap",
                        priorRemittancesInr === p.val
                          ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-200"
                          : "bg-white/[0.02] border-white/5 text-slate-400 hover:text-white"
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status Banner */}
              {isTcsExempt ? (
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div className="space-y-0.5 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-300">
                      <span>0% TCS Exemption Applied</span>
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-200">
                        ₹{remainingTcsExemption.toLocaleString("en-IN")} Headroom Remaining
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      Under Section 206C(1G), cumulative remittances up to ₹7,00,000/year attract <strong>₹0 TCS</strong>. 100% of your ₹{cleanRupees.toLocaleString("en-IN")} converts into USD without tax deduction.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                      <ShieldAlert className="w-4 h-4 text-amber-400" />
                      <span>20% TCS on Cumulative Excess</span>
                    </div>
                    <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/35">
                      TCS Outflow: ₹{tcsAmount.toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono p-2 rounded-lg bg-black/40 border border-white/5">
                    <div>
                      <span className="text-slate-400 block">Exempt Headroom Used:</span>
                      <strong className="text-white">₹{Math.min(cleanRupees, remainingTcsExemption).toLocaleString("en-IN")}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Taxable Excess (20% TCS):</span>
                      <strong className="text-amber-300">₹{tcsTaxableExcess.toLocaleString("en-IN")}</strong>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-300 leading-relaxed">
                    💡 <strong>TCS is 100% Recoverable:</strong> Bank debits ₹{tcsAmount.toLocaleString("en-IN")} as advance tax, which is fully offset against your annual income tax liability or refunded via ITR filing.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 8. Friction Telemetry & Efficiency Guards */}
          {((simMode === "sip" && cleanRupees > 0 && cleanRupees < 15000) || (simDirection === "goal" && requiredMonthlySip > 0 && requiredMonthlySip < 15000)) && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs">
                <strong className="text-amber-300 font-bold block">
                  Micro-SIP Remittance Advisory (&lt; ₹15,000/mo)
                </strong>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Traditional bank outward SWIFT wires impose fixed charges (~₹750–₹1,500 + 18% GST). On monthly deposits under ₹15,000, fixed wire fees dilute <strong>5%–20% of your capital</strong> upfront.
                </p>
                <div className="pt-0.5 text-[10px] text-amber-200/90 font-mono">
                  💡 <strong>Execution Advice:</strong> Accumulate in an Indian liquid fund and remit quarterly in batches &ge; ₹25,000, or route via zero-wire partner brokers (e.g. INDmoney Federal Bank virtual account).
                </div>
              </div>
            </div>
          )}

          {cleanRupees >= 15000 && cleanRupees < 50000 && simDirection === "forward" && simMode === "lumpsum" && (
            <div className="p-3 rounded-2xl bg-white/[0.02] border border-amber-500/20 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-slate-300 leading-relaxed">
                <strong className="text-amber-300 font-bold">Small-Ticket Wire Drag:</strong> Standard bank outward SWIFT fees (~₹1,500) create a 3%–15% upfront hurdle on amounts below ₹50,000. Recommend using integrated zero-wire broker accounts or remitting in quarterly batches &ge; ₹50,000.
              </p>
            </div>
          )}

          {simYears === 1 && (
            <div className="p-3 rounded-2xl bg-white/[0.02] border border-cyan-500/20 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-slate-300 leading-relaxed">
                <strong className="text-cyan-300 font-bold">Round-Trip Repatriation Note:</strong> On short 1-year horizons, two-way FX spreads (buying USD at ~₹84.50, selling back to INR at ~₹83.20) plus inward remittance fees create ~1.5%–2.5% round-trip friction. Compounding across &ge; 3–5 years absorbs this friction completely.
              </p>
            </div>
          )}

        </div>

        {/* Right Output: Compounding Trajectory Chart, Benchmark Showdown & Return Engine (Col 6) */}
        <div className="lg:col-span-6 space-y-4">
          
          {/* 🌟 1. Interactive SVG Compounding Trajectory Chart */}
          <CompoundingTrajectoryChart
            trajectoryData={trajectoryData}
            simYears={simYears}
            stockSymbol={simStock.symbol}
            activeSimCagr={activeSimCagr}
            activeFxAlpha={activeFxAlpha}
            isPullback={simulatePullback}
          />

          {/* 🌟 2. 3-Way Benchmark Showdown Terminal Card */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-xl space-y-3">
            <div className="flex items-center justify-between text-xs pb-2 border-b border-white/[0.06]">
              <div className="flex items-center gap-1.5 font-bold text-white">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>3-Way Benchmark Showdown ({simYears}-Yr Terminal Value)</span>
              </div>
              {alphaOverNifty > 0 && (
                <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <Award className="w-2.5 h-2.5" />
                  +₹{alphaOverNifty.toLocaleString("en-IN", { maximumFractionDigits: 0 })} Alpha Over NIFTY
                </span>
              )}
            </div>

            {(() => {
              const maxShowdownValue = Math.max(benchmarkUsValue, benchmarkNiftyValue, benchmarkFdValue, 1);
              const fdBarPct = Math.max(6, Math.min(100, Math.round((benchmarkFdValue / maxShowdownValue) * 100)));
              const niftyBarPct = Math.max(6, Math.min(100, Math.round((benchmarkNiftyValue / maxShowdownValue) * 100)));
              const usBarPct = Math.max(6, Math.min(100, Math.round((benchmarkUsValue / maxShowdownValue) * 100)));

              return (
                <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                  {/* Bank FD */}
                  <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5 flex flex-col justify-between">
                    <div>
                      <span className="text-[9px] text-slate-400 block font-sans">Bank Fixed Deposit (6.5%)</span>
                      <strong className="text-sm font-bold text-slate-300 block">
                        ₹{benchmarkFdValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                      </strong>
                      <span className="text-[9px] text-slate-500 block">
                        +₹{benchmarkFdGain.toLocaleString("en-IN", { maximumFractionDigits: 0 })} gain
                      </span>
                    </div>
                    {/* Proportional visual comparison bar */}
                    <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden mt-1">
                      <div 
                        className="bg-slate-500 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${fdBarPct}%` }} 
                      />
                    </div>
                  </div>

                  {/* NIFTY 50 */}
                  <div className="p-2.5 rounded-xl bg-cyan-500/5 border border-cyan-500/20 space-y-1.5 flex flex-col justify-between">
                    <div>
                      <span className="text-[9px] text-cyan-300 block font-sans">NIFTY 50 Index (12.5%)</span>
                      <strong className="text-sm font-bold text-cyan-200 block">
                        ₹{benchmarkNiftyValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                      </strong>
                      <span className="text-[9px] text-cyan-400/80 block">
                        +₹{benchmarkNiftyGain.toLocaleString("en-IN", { maximumFractionDigits: 0 })} gain
                      </span>
                    </div>
                    {/* Proportional visual comparison bar */}
                    <div className="w-full bg-cyan-950/40 h-1.5 rounded-full overflow-hidden mt-1">
                      <div 
                        className="bg-cyan-400 h-full rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(6,182,212,0.8)]" 
                        style={{ width: `${niftyBarPct}%` }} 
                      />
                    </div>
                  </div>

                  {/* US Titan + FX */}
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-1.5 flex flex-col justify-between shadow-sm">
                    <div>
                      <span className="text-[9px] text-emerald-300 block font-sans font-bold">{simStock.symbol} + USD Alpha</span>
                      <strong className="text-sm font-black text-emerald-400 block">
                        ₹{benchmarkUsValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                      </strong>
                      <span className="text-[9px] text-emerald-300 block font-bold">
                        +₹{benchmarkUsGain.toLocaleString("en-IN", { maximumFractionDigits: 0 })} gain
                      </span>
                    </div>
                    {/* Proportional visual comparison bar */}
                    <div className="w-full bg-emerald-950/40 h-1.5 rounded-full overflow-hidden mt-1">
                      <div 
                        className="bg-emerald-400 h-full rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(52,211,153,0.9)]" 
                        style={{ width: `${usBarPct}%` }} 
                      />
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* 3. Output Metrics Panel (Fully Synchronized across Forward & Goal Modes) */}
          <div className="p-5 rounded-2xl bg-black/45 border border-white/10 backdrop-blur-2xl space-y-4">
            
            <div className="grid grid-cols-2 gap-4 pb-4 border-b border-white/[0.08]">
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">
                  {simDirection === "goal"
                    ? "Required Monthly USD"
                    : simMode === "sip" ? "Monthly USD Deposit" : "Total USD Allocation"}
                </span>
                <div className="text-xl sm:text-2xl font-mono font-black text-white tabular-nums">
                  ${simUsdCapital.toFixed(2)}
                  {simDirection === "goal" && <span className="text-xs text-slate-400 font-normal"> / mo</span>}
                </div>
                <small className="text-[9px] text-slate-400 block font-mono">
                  @ ₹{USD_INR_RATE.toFixed(2)} / USD
                </small>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">
                  {simDirection === "goal"
                    ? "Monthly Accumulation"
                    : simMode === "sip" ? "Monthly Share Units" : "Fractional Units Owned"}
                </span>
                <div className="text-xl sm:text-2xl font-mono font-black text-cyan-300 tabular-nums">
                  {simSharesOwned.toFixed(3)}
                  {simDirection === "goal" && <span className="text-xs text-cyan-400/80 font-normal"> / mo</span>}
                </div>
                <small className="text-[9px] text-slate-400 block font-mono">
                  {simStock.symbol} Units
                </small>
              </div>
            </div>

            {/* Capital In vs Capital Out Matrix */}
            <div className="grid grid-cols-2 gap-3 text-xs font-mono p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <div>
                <span className="text-slate-400 text-[10px] block">
                  {simDirection === "goal" ? "Total Out-of-Pocket:" : "Total Capital Invested:"}
                </span>
                <strong className="text-white text-sm font-bold">
                  ₹{totalInvestedRupees.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </strong>
                {simDirection === "goal" ? (
                  <span className="text-[9px] text-slate-400 block">
                    {cleanSeed > 0 ? `₹${cleanSeed.toLocaleString("en-IN")} seed + ` : ""}
                    {simYears * 12} mo @ ₹{requiredMonthlySip.toLocaleString("en-IN")}/mo
                  </span>
                ) : simMode === "sip" ? (
                  <span className="text-[9px] text-slate-500 block">{simYears * 12} Monthly Installments</span>
                ) : null}
              </div>

              <div>
                <span className="text-slate-400 text-[10px] block">Compounding Horizon:</span>
                <strong className="text-cyan-300 text-sm font-bold">
                  {simYears} {simYears === 1 ? "Year" : "Years"}
                </strong>
                <span className="text-[9px] text-slate-500 block">
                  {adjustInflation ? "Real (CPI Discounted)" : "Nominal Compounding"}
                </span>
              </div>
            </div>

            {/* Compounding Return Hero */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 via-cyan-500/5 to-transparent border border-emerald-500/25 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-emerald-300 uppercase font-bold">
                  {simDirection === "goal"
                    ? `Target ${simYears}-Year Portfolio Corpus`
                    : `Projected ${simYears}-Year Portfolio Value`}
                </span>
                <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/35">
                  +{simTotalInrRoiPct}% Total ROI
                </span>
              </div>

              <div className="text-2xl sm:text-3xl font-mono font-black text-emerald-400 tabular-nums">
                ₹{simProjectedInrValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </div>

              <div className="pt-2 border-t border-emerald-500/15 flex items-center justify-between text-[10px] font-mono text-slate-300">
                <span>{simDirection === "goal" ? "Market Wealth Multiplier:" : "Net Wealth Created:"}</span>
                <strong className="text-emerald-300 font-bold">
                  +₹{simNetInrProfit.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </strong>
              </div>
            </div>

            {/* Dual Currency Compounding Breakdown */}
            <div className="space-y-2 text-xs">
              <div className="text-[10px] font-mono text-slate-400 uppercase font-bold">
                Return Engine Breakdown ({simYears}-Year)
              </div>
              <div className="flex items-center justify-between text-[11px] p-2 rounded-lg bg-white/[0.02] border border-white/5">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <TrendingUp className="w-3 h-3 text-cyan-400" />
                  {simStock.symbol} Annual Stock CAGR:
                </span>
                <strong className="font-mono text-cyan-300 font-bold">+{activeSimCagr}% / yr</strong>
              </div>
              <div className="flex items-center justify-between text-[11px] p-2 rounded-lg bg-white/[0.02] border border-white/5">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <TrendingUp className="w-3 h-3 text-emerald-400" />
                  USD Currency Alpha ({fxScenario === "stagnant" ? "Stagnant" : fxScenario === "shock" ? "Macro Shock" : "10-Yr Mean"}):
                </span>
                <strong className="font-mono text-emerald-300 font-bold">+{activeFxAlpha}% / yr</strong>
              </div>
              {adjustInflation && (
                <div className="flex items-center justify-between text-[11px] p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <span className="text-amber-200 flex items-center gap-1.5">
                    <Flame className="w-3 h-3 text-amber-400" />
                    Indian Inflation Drag (CPI):
                  </span>
                  <strong className="font-mono text-amber-300 font-bold">-5.2% / yr</strong>
                </div>
              )}
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}

export default ForeignStocksSimulator;
