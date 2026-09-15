import { 
  Target, 
  Timer, 
  Zap, 
  Activity, 
  Anchor, 
  ShieldCheck, 
  TrendingUp, 
  BrainCircuit 
} from "lucide-react";

export const MATH_AND_RISK_MODULES = [
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
