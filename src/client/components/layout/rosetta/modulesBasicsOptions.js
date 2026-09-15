import { 
  ShieldAlert, 
  Target, 
  RefreshCw, 
  ArrowUpRight, 
  ArrowDownRight, 
  Layers, 
  Scale, 
  HeartHandshake 
} from "lucide-react";

export const BASICS_AND_OPTIONS_MODULES = [
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
  }
];
