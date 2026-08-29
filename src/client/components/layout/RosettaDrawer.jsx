import React, { useState, useMemo } from "react";
import { useTradingStore } from "../../stores/useTradingStore";
import { 
  X, 
  Sparkles, 
  BookOpen, 
  Target, 
  TrendingUp, 
  ShieldAlert, 
  Cpu, 
  Search, 
  ShieldCheck, 
  ArrowUpRight, 
  ArrowDownRight, 
  Layers, 
  Timer, 
  Zap, 
  Activity, 
  Anchor, 
  HeartHandshake, 
  BrainCircuit, 
  Sliders, 
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Scale,
  CheckSquare,
  Square
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";

const GUIDE_MODULES = [
  {
    id: "stop_loss",
    category: "basics",
    title: "Stop Loss (SL) — The Emergency Airbag",
    icon: ShieldAlert,
    badge: "Most Critical Rule",
    badgeColor: "rose",
    kidAnalogy: "Like wearing a bicycle helmet or car seatbelt. If you take a tumble, you only get a tiny scratch (₹250 loss) instead of ending up in the hospital with a broken bone (losing your whole account).",
    proMeaning: "An automated trigger order that immediately sells and exits your position if the market moves against you to a specified price limit, cutting downside risk to a strictly predetermined rupee amount.",
    goldenRule: "Always set your Stop Loss BEFORE placing the buy order. Never widen, freeze, or remove a stop loss during active drawdown.",
    example: "Bought NIFTY 24200 CE at ₹120. Stop Loss set at ₹105. Max risk is strictly locked at ₹15 per share (₹975 per lot)."
  },
  {
    id: "target_price",
    category: "basics",
    title: "Target Price (TP / Take Profit) — The Treasure Chest",
    icon: Target,
    badge: "Profit Banking",
    badgeColor: "emerald",
    kidAnalogy: "When you collect 100 gold coins in a video game, you bank them at the safe checkpoint before a dragon comes and burns them all away.",
    proMeaning: "The predetermined price level where you automatically sell your contract to lock in realized cash profit at key technical resistance or Fibonacci extension levels.",
    goldenRule: "Never let greed turn a winning trade into a loss. Exit at your predetermined 1:2.5 or 1:3 target without second-guessing.",
    example: "Bought at ₹120 with ₹105 stop (₹15 risk). Target set at ₹165 (₹45 reward = 1:3 Risk-to-Reward ratio)."
  },
  {
    id: "square_off",
    category: "basics",
    title: "Square Off (Exit Position) — Leaving the Playground",
    icon: RefreshCw,
    badge: "Zero Risk State",
    badgeColor: "cyan",
    kidAnalogy: "Putting your toys back in your backpack and walking home. Once you are home on the couch, no one can take your toys away.",
    proMeaning: "Closing an active open position by selling what you bought (or buying back what you shorted). After squaring off, your P&L is settled and market fluctuations no longer affect your capital.",
    goldenRule: "All intraday positions must be squared off before 3:15 PM IST to avoid broker auto-liquidation penalty fees.",
    example: "Clicking 'Square Off' on an active CE position sells your 65 shares at current market bid and deposits net profit into your ledger."
  },
  {
    id: "call_option",
    category: "options",
    title: "Call Option (CE) — The UP Elevator Ticket",
    icon: ArrowUpRight,
    badge: "Bullish Bet",
    badgeColor: "emerald",
    kidAnalogy: "A magic pass that gives you ₹10 every single time the elevator goes UP one floor. If the elevator goes down, your ticket loses value.",
    proMeaning: "A derivative contract granting the buyer the right to benefit from upward index price expansion. CE option premiums surge when NIFTY or BANKNIFTY rallies.",
    goldenRule: "Only buy CE when index price is trading above VWAP and printing continuous Higher Highs with institutional volume.",
    example: "NIFTY surges from 24,150 to 24,250 (+100 pts) -> 24200 CE premium rises from ₹110 to ₹170 (+₹60 gain per share)."
  },
  {
    id: "put_option",
    category: "options",
    title: "Put Option (PE) — The Crash Umbrella",
    icon: ArrowDownRight,
    badge: "Bearish Bet",
    badgeColor: "rose",
    kidAnalogy: "Buying an umbrella before a rainstorm. If dark clouds burst and it pours rain (market drops), everyone rushes to buy your umbrella for double price!",
    proMeaning: "A contract purchased when you anticipate the market will fall. As stock prices or index values plunge, PE premiums increase in value, allowing you to profit during crashes.",
    goldenRule: "Only buy PE when price breaks below key support levels and sustains under VWAP.",
    example: "BANKNIFTY drops 350 points -> 52100 PE jumps from ₹180 to ₹340 (+₹160 gain per share)."
  },
  {
    id: "strike_moneyness",
    category: "options",
    title: "Strike & Moneyness (ITM / ATM / OTM) — The Dartboard",
    icon: Layers,
    badge: "Strike Selection",
    badgeColor: "indigo",
    kidAnalogy: "ITM is a heavy real gold coin (valuable and moves 1:1). ATM is a sports car (perfect speed and price). OTM is a cheap ₹5 lottery ticket (95% chance it turns into zero paper dust by Thursday).",
    proMeaning: "The relationship between index spot price and strike price: In-The-Money (intrinsic value), At-The-Money (highest liquidity), Out-of-The-Money (pure extrinsic time value).",
    goldenRule: "Scalpers must trade ATM (At-The-Money) or 1-strike ITM. NEVER buy cheap far-OTM options hoping for a miracle.",
    example: "If NIFTY is 24,210: 24200 is ATM (Delta ~0.50), 24100 is ITM (Delta ~0.70), 24500 is OTM (Delta ~0.10, high decay danger)."
  },
  {
    id: "lot_size",
    category: "basics",
    title: "Lot Size & Quantity — Buying in Wholesale Crates",
    icon: Scale,
    badge: "Contract Sizing",
    badgeColor: "amber",
    kidAnalogy: "You can't buy just 1 single mango at the wholesale depot; you must buy a standardized wooden crate containing 65 mangoes (NIFTY) or 35 mangoes (BANKNIFTY).",
    proMeaning: "The standardized minimum contract multiplier set by the exchange (NSE). All price moves in premium are multiplied by the lot size.",
    goldenRule: "Start with strictly 1 micro-lot until you achieve 30 verified practice executions with a Profit Factor ≥ 1.5x.",
    example: "NIFTY lot size = 65 shares. A ₹10 premium move = ₹650 P&L change (65 × ₹10)."
  },
  {
    id: "risk_reward_math",
    category: "math",
    title: "1:3 Risk-to-Reward Math — The Unbeatable Casino",
    icon: Target,
    badge: "Statistical Edge",
    badgeColor: "emerald",
    kidAnalogy: "Imagine a magic coin flip where losing costs you ₹1 candy, but winning gives you ₹3 candies. Even if you lose 6 times out of 10, you still end up with more candy!",
    proMeaning: "The ratio of potential profit to potential loss. A 1:3 R:R ensures that even with a modest 35-40% win rate, your trading account compounds exponentially.",
    goldenRule: "If a setup doesn't offer at least 1:2.5 potential reward relative to your stop distance, skip the trade.",
    example: "10 Trades: 4 Wins × +₹300 (+₹1,200) vs 6 Losses × -₹100 (-₹600) = Net +₹600 Profit with just 40% win rate!"
  },
  {
    id: "theta_decay",
    category: "math",
    title: "Theta (Time Decay) — The Melting Ice Cream",
    icon: Timer,
    badge: "Time Bleed",
    badgeColor: "amber",
    kidAnalogy: "Holding an ice cream cone on a hot summer afternoon. Every minute you stand still, a drop melts away. By Thursday 3:30 PM, it's completely melted into water (₹0).",
    proMeaning: "The rate at which an option's premium declines as time passes toward expiry, independent of underlying price movement.",
    goldenRule: "As an option buyer, capture momentum within 15–45 minutes and exit. Do not hold intraday options during sideways market chop.",
    example: "If NIFTY stays completely flat all day, your ₹100 option premium might drop to ₹80 simply because 6 hours of time expired."
  },
  {
    id: "delta_speed",
    category: "math",
    title: "Delta (Option Speedometer) — The Gas Pedal",
    icon: Zap,
    badge: "Price Velocity",
    badgeColor: "cyan",
    kidAnalogy: "If you push the pedal halfway (Delta 0.50), your go-kart travels 50 meters forward for every 100 meters the lead truck moves.",
    proMeaning: "Measures the rate of change of option premium per ₹1 change in the underlying index price. ATM options have a Delta of ~0.50.",
    goldenRule: "Trade strikes with Delta between 0.45 and 0.55 for the cleanest responsive momentum without paying excessive deep ITM premium.",
    example: "NIFTY jumps +40 points. An ATM strike with 0.50 Delta will increase by ₹20 per share (40 × 0.50)."
  },
  {
    id: "india_vix",
    category: "math",
    title: "India VIX (Volatility Index) — The Ocean Storm Gauge",
    icon: Activity,
    badge: "Market Fear",
    badgeColor: "indigo",
    kidAnalogy: "Tells you if the ocean has gentle smooth ripples (Low VIX < 12) or 20-foot giant stormy monster waves (High VIX > 18).",
    proMeaning: "Annualized expected volatility of the NIFTY index over the next 30 calendar days based on option order book bid-ask spreads.",
    goldenRule: "When India VIX is above 16-18, premiums are inflated and swings are rapid—reduce position size by 50% to maintain risk discipline.",
    example: "Low VIX (11-13) = Tight slow option ranges. High VIX (17-22) = 80-point violent swings in 2 minutes."
  },
  {
    id: "trailing_stop_loss",
    category: "risk",
    title: "Trailing Stop Loss (TSL) — The Mountain Climber's Hook",
    icon: Anchor,
    badge: "Profit Locking",
    badgeColor: "emerald",
    kidAnalogy: "As you climb higher up a tree, you clip your safety harness to higher branches. If your foot slips, you don't fall to the ground—you stay hanging safely near the top!",
    proMeaning: "A stop order that automatically adjusts upward as the market price moves favorably, locking in realized profit while allowing upside to run.",
    goldenRule: "Once your trade reaches 1:1.5 target, trail your Stop Loss to your Entry Price (Cost) for a 100% Risk-Free 'Free Roll' trade.",
    example: "Bought at ₹100, original SL ₹85. Price rallies to ₹130 -> Trail SL to ₹115. Even if price suddenly crashes, you walk away with +₹15 profit guaranteed."
  },
  {
    id: "two_loss_rule",
    category: "risk",
    title: "The 2-Loss Rule — The Red Card Circuit Breaker",
    icon: ShieldCheck,
    badge: "Account Lifesaver",
    badgeColor: "rose",
    kidAnalogy: "If a soccer referee gives you 2 yellow cards, you must sit out the rest of the match to cool off so you don't get angry and hurt your teammates.",
    proMeaning: "A strict psychological rule: if you incur 2 consecutive losses in a single trading session, you immediately close all charts and stop trading for the day.",
    goldenRule: "90% of account blowups are caused by emotional 'revenge trades' placed after 2 initial losses. The 2-loss limit prevents catastrophic drawdown.",
    example: "Lost ₹300 on Trade 1, lost ₹250 on Trade 2 -> Total day loss ₹550 (0.5% of capital). Close terminal, return tomorrow with a fresh clear mind."
  },
  {
    id: "vwap_indicator",
    category: "risk",
    title: "VWAP (Volume Weighted Avg Price) — The Big Kids' Line",
    icon: TrendingUp,
    badge: "Institutional Benchmark",
    badgeColor: "cyan",
    kidAnalogy: "The average price all the big kids at school paid for their snacks. If price is above the line, the buyers are winning. If below, sellers are pushing.",
    proMeaning: "The true average price weighted by institutional volume. Acts as dynamic support in uptrends and resistance in downtrends.",
    goldenRule: "Never buy CE when price is trapped below VWAP. Never buy PE when price is surging above VWAP.",
    example: "NIFTY pulls back to the VWAP line at 24,180, prints a bullish hammer candle, and bounces aggressively toward 24,260."
  },
  {
    id: "defined_risk_spreads",
    category: "options",
    title: "Defined Risk (Spreads) vs Naked Options — Armor vs Bare Hands",
    icon: HeartHandshake,
    badge: "Hedging Mastery",
    badgeColor: "indigo",
    kidAnalogy: "Riding a rollercoaster with the steel safety bar locked across your lap (Spread) vs riding with no seatbelt (Naked Selling).",
    proMeaning: "A multi-leg strategy (e.g. Bull Call Spread) where you buy one option and simultaneously sell a further strike, capping your maximum loss to a known number.",
    goldenRule: "During overnight holds or major earnings announcements, always use defined-risk spreads instead of naked single-leg options.",
    example: "Buy 24200 CE at ₹120 and sell 24400 CE at ₹40. Net cost is only ₹80; maximum loss is capped at ₹80 even if market gaps down 1,000 points."
  },
  {
    id: "psychology_fomo",
    category: "risk",
    title: "Trading Psychology & FOMO — Taming the Monkey Mind",
    icon: BrainCircuit,
    badge: "Mindset Alpha",
    badgeColor: "amber",
    kidAnalogy: "Feeling upset because someone else got a piece of cake at a party, so you run into the kitchen and eat burned cake from the floor. Wait for the fresh cake!",
    proMeaning: "Fear Of Missing Out (FOMO). Chasing a giant green candle after it already rallied 50 points almost always results in buying the exact market top.",
    goldenRule: "The market will open again tomorrow at 9:15 AM with 50 fresh opportunities. Never chase a missed trade.",
    example: "NIFTY jumps 80 points in 1 minute. Disciplined trader waits for the 15-minute pullback to support instead of panic-buying at the highs."
  }
];

export function RosettaDrawer() {
  const { isRosettaOpen, setRosettaOpen, rosettaActiveTopic } = useTradingStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [expandedCardId, setExpandedCardId] = useState("stop_loss");

  React.useEffect(() => {
    if (rosettaActiveTopic && isRosettaOpen) {
      setExpandedCardId(rosettaActiveTopic);
      setSelectedCategory("all");
      setSearchQuery("");
    }
  }, [rosettaActiveTopic, isRosettaOpen]);

  // R:R Calculator Simulator State
  const [calcRisk, setCalcRisk] = useState(500);
  const [calcRatio, setCalcRatio] = useState(3);
  const [calcWinRate, setCalcWinRate] = useState(40);

  // Pre-Flight Checklist State
  const [chkStopLoss, setChkStopLoss] = useState(false);
  const [chkRatio, setChkRatio] = useState(false);
  const [chkEmotion, setChkEmotion] = useState(false);

  const isPreFlightReady = chkStopLoss && chkRatio && chkEmotion;

  // Filter Modules
  const filteredModules = useMemo(() => {
    return GUIDE_MODULES.filter((m) => {
      const matchesCategory = selectedCategory === "all" || m.category === selectedCategory;
      const q = searchQuery.toLowerCase();
      const matchesSearch = 
        m.title.toLowerCase().includes(q) ||
        m.kidAnalogy.toLowerCase().includes(q) ||
        m.proMeaning.toLowerCase().includes(q) ||
        m.goldenRule.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [searchQuery, selectedCategory]);

  // Calculations for R:R simulator
  const simulatedTrades = 10;
  const winsCount = Math.round((calcWinRate / 100) * simulatedTrades);
  const lossCount = simulatedTrades - winsCount;
  const grossWins = winsCount * (calcRisk * calcRatio);
  const grossLoss = lossCount * calcRisk;
  const netExpectancy = grossWins - grossLoss;

  return (
    <AnimatePresence>
      {isRosettaOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          {/* Frosted Dark Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setRosettaOpen(false)}
            className="absolute inset-0 bg-black/75 backdrop-blur-md transition-opacity"
          />

          {/* Slide-in Luxury Spatial Panel */}
          <motion.div
            initial={{ x: "100%", opacity: 0.9 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0.9 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="relative w-full max-w-2xl h-full bg-[#060c18]/98 border-l border-white/10 p-5 sm:p-7 flex flex-col justify-between shadow-2xl backdrop-blur-3xl z-10 overflow-hidden"
          >
            {/* Top Navigation & Master Search Header */}
            <div className="space-y-4 pb-4 border-b border-white/10 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/10">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-extrabold text-white tracking-wide">
                        Options &amp; Trading Master Guide
                      </h2>
                      <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                        16 Modules
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Explained so simply a kid can understand — institutional alpha for every trader.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setRosettaOpen(false)}
                  className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search any term (e.g. Stop Loss, Theta, CE/PE, Delta, 1:3 Math)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition shadow-inner"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Category Segmented Controls */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
                {[
                  { id: "all", label: `All (${GUIDE_MODULES.length})` },
                  { id: "basics", label: "👶 Basics & Orders" },
                  { id: "options", label: "🚀 Options & Strikes" },
                  { id: "math", label: "⏳ Greeks & Math" },
                  { id: "risk", label: "🛡️ Risk & Discipline" },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={clsx(
                      "px-3 py-1 rounded-lg font-bold transition text-xs whitespace-nowrap",
                      selectedCategory === cat.id
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm"
                        : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]"
                    )}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable Curriculum Body */}
            <div className="flex-1 overflow-y-auto pr-1 py-4 space-y-4">
              {/* Interactive R:R Expectancy Simulator (Pinned Widget) */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-950/40 via-slate-900/60 to-black/80 border border-cyan-500/30 shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-cyan-400" />
                    <strong className="text-xs font-bold text-white">Interactive 1:3 R:R Expectancy Lab</strong>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
                    Live Math Simulator
                  </span>
                </div>

                <p className="text-[11px] text-slate-300 leading-relaxed">
                  See why you don&apos;t need to win every trade. Even with a <strong>{calcWinRate}% win rate</strong>, a 1:{calcRatio} ratio produces guaranteed positive compounding:
                </p>

                {/* Slider Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1 font-mono">
                      <span>Risk per Trade</span>
                      <strong className="text-white">₹{calcRisk}</strong>
                    </div>
                    <input
                      type="range"
                      min="200"
                      max="2000"
                      step="100"
                      value={calcRisk}
                      onChange={(e) => setCalcRisk(Number(e.target.value))}
                      className="w-full accent-cyan-400 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1 font-mono">
                      <span>Reward Ratio</span>
                      <strong className="text-emerald-400">1:{calcRatio}</strong>
                    </div>
                    <input
                      type="range"
                      min="1.5"
                      max="4"
                      step="0.5"
                      value={calcRatio}
                      onChange={(e) => setCalcRatio(Number(e.target.value))}
                      className="w-full accent-emerald-400 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1 font-mono">
                      <span>Win Rate</span>
                      <strong className="text-cyan-400">{calcWinRate}%</strong>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="80"
                      step="5"
                      value={calcWinRate}
                      onChange={(e) => setCalcWinRate(Number(e.target.value))}
                      className="w-full accent-cyan-400 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Net Outcome Banner */}
                <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between text-xs">
                  <div className="text-slate-300 text-[11px]">
                    10 Setups: <span className="text-emerald-400 font-bold">{winsCount} Wins (+₹{grossWins})</span> · <span className="text-rose-400 font-bold">{lossCount} Losses (-₹{grossLoss})</span>
                  </div>
                  <strong className={clsx("font-mono text-sm font-extrabold", netExpectancy >= 0 ? "text-emerald-400" : "text-rose-400")}>
                    {netExpectancy >= 0 ? "+" : ""}₹{netExpectancy.toLocaleString("en-IN")} Net
                  </strong>
                </div>
              </div>

              {/* Pre-Flight 3-Question Discipline Gate */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <strong className="text-xs font-bold text-white">Pre-Flight Scalper Discipline Check</strong>
                  </div>
                  <span className={clsx("text-[10px] font-bold px-2.5 py-0.5 rounded-full border", isPreFlightReady ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" : "bg-amber-500/15 text-amber-300 border-amber-500/30")}>
                    {isPreFlightReady ? "✅ Ready to Execute" : "⚠️ 3 Checks Required"}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setChkStopLoss(!chkStopLoss)}
                    className="w-full p-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 flex items-center gap-2.5 text-left transition"
                  >
                    {chkStopLoss ? <CheckSquare className="w-4 h-4 text-emerald-400 flex-shrink-0" /> : <Square className="w-4 h-4 text-slate-500 flex-shrink-0" />}
                    <span className={clsx(chkStopLoss ? "text-white font-medium" : "text-slate-400")}>
                      1. My Stop Loss is predetermined before entry (Max 1% of total capital at risk).
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setChkRatio(!chkRatio)}
                    className="w-full p-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 flex items-center gap-2.5 text-left transition"
                  >
                    {chkRatio ? <CheckSquare className="w-4 h-4 text-emerald-400 flex-shrink-0" /> : <Square className="w-4 h-4 text-slate-500 flex-shrink-0" />}
                    <span className={clsx(chkRatio ? "text-white font-medium" : "text-slate-400")}>
                      2. Minimum 1:2.5 Risk-to-Reward ratio verified against VWAP or key support/resistance.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setChkEmotion(!chkEmotion)}
                    className="w-full p-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 flex items-center gap-2.5 text-left transition"
                  >
                    {chkEmotion ? <CheckSquare className="w-4 h-4 text-emerald-400 flex-shrink-0" /> : <Square className="w-4 h-4 text-slate-500 flex-shrink-0" />}
                    <span className={clsx(chkEmotion ? "text-white font-medium" : "text-slate-400")}>
                      3. My mind is 100% calm with zero FOMO or urge to revenge-trade after a loss.
                    </span>
                  </button>
                </div>
              </div>

              {/* Module Cards Grid */}
              {filteredModules.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No trading guide topics found matching &quot;{searchQuery}&quot;.
                </div>
              ) : (
                filteredModules.map((item, idx) => {
                  const Icon = item.icon;
                  const isExpanded = expandedCardId === item.id;

                  const badgeColors = {
                    rose: "bg-rose-500/10 text-rose-300 border-rose-500/20",
                    emerald: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
                    cyan: "bg-cyan-500/10 text-cyan-300 border-cyan-500/20",
                    indigo: "bg-indigo-500/10 text-indigo-300 border-indigo-500/20",
                    amber: "bg-amber-500/10 text-amber-300 border-amber-500/20",
                  };

                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03, duration: 0.2 }}
                      className={clsx(
                        "rounded-2xl border transition-all duration-200 overflow-hidden cursor-pointer",
                        isExpanded
                          ? "bg-white/[0.04] border-cyan-500/40 shadow-xl shadow-cyan-500/5"
                          : "bg-white/[0.02] border-white/5 hover:border-white/15"
                      )}
                      onClick={() => setExpandedCardId(isExpanded ? null : item.id)}
                    >
                      {/* Card Summary Header */}
                      <div className="p-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-cyan-400 flex-shrink-0">
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-xs font-bold text-white">{item.title}</h3>
                              <span className={clsx("text-[9px] font-extrabold uppercase px-2 py-0.2 rounded border", badgeColors[item.badgeColor] || badgeColors.cyan)}>
                                {item.badge}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                              {item.kidAnalogy}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="p-1 text-slate-400 hover:text-white rounded-lg flex-shrink-0"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-cyan-400" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>

                      {/* Expanded Deep-Dive Content */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3"
                          >
                            {/* Kid-Friendly Analogy Box */}
                            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1">
                              <div className="flex items-center gap-1.5 text-amber-300 font-bold text-xs">
                                <span>👶 The Kid Analogy:</span>
                              </div>
                              <p className="text-xs text-amber-100/90 leading-relaxed">
                                {item.kidAnalogy}
                              </p>
                            </div>

                            {/* Pro Trading Definition */}
                            <div className="space-y-1 text-xs text-slate-300">
                              <strong className="text-white block">📈 Professional Financial Mechanism:</strong>
                              <p className="text-[11px] leading-relaxed text-slate-300">
                                {item.proMeaning}
                              </p>
                            </div>

                            {/* Golden Rule Callout */}
                            <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs space-y-1">
                              <div className="flex items-center gap-1.5 text-cyan-300 font-bold">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Actionable Rule for Consistent Profit:</span>
                              </div>
                              <p className="text-[11px] text-cyan-100 leading-relaxed font-medium">
                                {item.goldenRule}
                              </p>
                            </div>

                            {/* Real-World Concrete Example */}
                            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-[11px] font-mono text-slate-300 flex items-center gap-2">
                              <span className="text-slate-500 font-sans font-bold text-[10px] uppercase">Example:</span>
                              <span>{item.example}</span>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* Bottom Footer Action */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-3 flex-shrink-0">
              <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                Press Esc or click outside to dismiss
              </span>
              <button
                type="button"
                onClick={() => setRosettaOpen(false)}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-400 text-black font-extrabold text-xs shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-sky-300 transition"
              >
                Got It, Let&apos;s Trade with Discipline!
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
