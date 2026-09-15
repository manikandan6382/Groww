import { soundEngine } from "../../../utils/soundEngine";
import { calculateTradeDuration } from "../../../utils/dateUtils";

export async function submitJournalTrade({
  symbol,
  side,
  entry,
  exit,
  qty,
  stopLoss,
  targetPrice,
  setupTag,
  notes,
  mindsetEmotion,
  confidenceScore,
  mistakeTag,
  friction,
  logJournalTrade,
  onLogged,
}) {
  await fetch("/api/trading/trades", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tradingsymbol: symbol.toUpperCase().trim(),
      transaction_type: side,
      entry_price: entry,
      exit_price: exit,
      quantity: qty,
      stop_loss: Number(stopLoss || entry),
      target_price: Number(targetPrice || exit),
      setup_tag: setupTag,
      notes,
      gross_pnl: friction.grossPnl,
      taxes_charges: friction.totalFriction,
      net_pnl: friction.netTakeHomePnl,
    }),
  });

  const now = new Date();
  const exitTime = new Date(now.getTime() + 14 * 60000); // 14 min typical hold

  const newTrade = {
    id: Date.now(),
    symbol: symbol.toUpperCase().trim(),
    tradeType: "INTRADAY",
    direction: side === "BUY" ? "LONG" : "SHORT",
    entryPrice: entry,
    exitPrice: exit,
    quantity: Math.max(1, Math.round(qty / 25)),
    lotSize: 25,
    stopLoss: Number(stopLoss || entry),
    targetPrice: Number(targetPrice || exit),
    grossPnl: friction.grossPnl,
    taxesAndCharges: friction.totalFriction,
    netPnl: friction.netTakeHomePnl,
    points: friction.pts,
    status: "CLOSED",
    exitReason: friction.isProfit ? "🎯 Target Hit (Plan Followed)" : "🛡️ Stop-Loss Protected",
    setupTag,
    strategyTag: setupTag,
    notes,
    mindsetEmotion,
    mistakeTags: mistakeTag,
    confidenceScore,
    followedPlan: mistakeTag !== "Chased Extended Wick",
    lessonsLearned: notes || `Executed ${setupTag} plan. Captured ${friction.isProfit ? "+" : ""}${friction.pts.toFixed(2)} pts take-home after ₹${friction.totalFriction} statutory friction.`,
    entryDatetime: now.toISOString(),
    exitDatetime: exitTime.toISOString(),
    duration: calculateTradeDuration(now, exitTime),
    setupIntegrityScore: 92,
  };

  logJournalTrade(newTrade);
  soundEngine.playSuccessTone();

  if (onLogged) {
    onLogged();
  }
}
