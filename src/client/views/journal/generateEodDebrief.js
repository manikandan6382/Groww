import { getLocalDateKey } from "../../utils/dateUtils";
import { diagnoseTradeBiases } from "../../components/trading/journal-story/behavioralBiasEngine";

/**
 * Generates an institutional End-of-Day (EOD) Trading Debrief in GitHub-flavored Markdown
 * adhering to /eod-report standards and Manikandan's strict capital risk invariants.
 */
export function generateEodDebrief(trades = [], sessionDateKey = null, vixLtp = 13.2) {
  const targetDate = sessionDateKey || getLocalDateKey();

  const sessionTrades = (trades || []).filter((t) => {
    const d = getLocalDateKey(t.exitDatetime || t.entryDatetime || t.createdAt);
    return d === targetDate;
  });

  const totalTrades = sessionTrades.length;
  const wins = sessionTrades.filter((t) => Number(t.netPnl || 0) > 0);
  const losses = sessionTrades.filter((t) => Number(t.netPnl || 0) < 0);
  const winRate = totalTrades > 0 ? Math.round((wins.length / totalTrades) * 100) : 0;

  const grossPnl = Math.round(sessionTrades.reduce((acc, t) => acc + Number(t.grossPnl || t.netPnl || 0), 0));
  const totalFriction = Math.round(sessionTrades.reduce((acc, t) => acc + Number(t.taxesAndCharges || t.statutoryCharges || 55.20), 0));
  const netPnl = Math.round(sessionTrades.reduce((acc, t) => acc + Number(t.netPnl || 0), 0));

  const totalLossRupees = Math.abs(losses.reduce((acc, t) => acc + Number(t.netPnl || 0), 0));
  const lossRunway = Math.max(0, 750 - totalLossRupees);
  const stopsRemaining = Math.max(0, Math.floor(lossRunway / 250));
  const maxSingleLoss = Math.abs(Math.min(0, ...sessionTrades.map((t) => Number(t.netPnl || 0))));

  const isQuotaRespected = totalTrades <= 3;
  const isLossCapRespected = totalLossRupees <= 750;
  const isPerTradeRespected = maxSingleLoss <= 300;

  // Behavioral leakage audit
  let sessionLeakageRupees = 0;
  const biasList = [];
  for (let i = 0; i < sessionTrades.length; i++) {
    const prior = i > 0 ? sessionTrades[i - 1] : null;
    const { biases, leakedRupees } = diagnoseTradeBiases(sessionTrades[i], prior);
    sessionLeakageRupees += leakedRupees;
    biases.forEach((b) => biasList.push(`- **${sessionTrades[i].symbol}**: ${b.name} (${b.badge})`));
  }

  // Format Trade Table
  let tableRows = "";
  if (sessionTrades.length > 0) {
    tableRows = sessionTrades.map((t, idx) => {
      const net = Number(t.netPnl || 0);
      const pnlStr = `${net >= 0 ? "+" : ""}₹${net.toLocaleString("en-IN")}`;
      const side = t.direction || (t.transaction_type === "SELL" ? "SHORT" : "LONG");
      const strat = t.strategyTag || t.setupTag || "Scalp";
      const notes = (t.lessonsLearned || t.notes || "Executed as per plan").replace(/[\r\n]+/g, " ");
      return `| ${idx + 1} | ${t.symbol} | ${side} | ₹${t.entryPrice} | ₹${t.exitPrice} | ${t.quantity} | ${pnlStr} | ${strat} | ${notes} |`;
    }).join("\n");
  } else {
    tableRows = "| - | No trades logged for this session | - | - | - | - | - | - | - |";
  }

  const markdown = `# 📈 End of Day (EOD) Trading Debrief — ${targetDate}

**Trader**: Manikandan Murugan  
**Strategy**: NIFTY & BANKNIFTY Intraday Options Scalping  
**Session Date**: ${targetDate} (IST Active Market Session)  
**India VIX**: ${Number(vixLtp).toFixed(2)}  
**Discipline Status**: ${isQuotaRespected && isLossCapRespected && isPerTradeRespected ? "🏆 100% Invariant Compliant" : "⚠️ Disciplinary Alert Triggered"}

---

## 1. Executive Performance Summary
* **Net Take-Home P&L**: **${netPnl >= 0 ? "+" : ""}₹${netPnl.toLocaleString("en-IN")}**
* **Gross Scalp P&L**: ₹${grossPnl.toLocaleString("en-IN")}
* **Total Statutory Intermediary Friction**: ₹${totalFriction.toLocaleString("en-IN")} (Brokerage + STT + Turnover + GST + Stamp Duty)
* **Session Win Rate**: ${winRate}% (${wins.length} Wins · ${losses.length} Losses · ${totalTrades} Executions)
* **Daily Quota Compliance**: ${totalTrades}/3 Allowed Trades (${isQuotaRespected ? "✅ Respected" : "🛑 Overtraded"})

---

## 2. Risk Invariant & Capital Protection Audit
* **Daily Risk Budget**: ₹750 Maximum Daily Risk Runway ($3 \\text{ stops} \\times ₹250$)
* **Daily Runway Remaining**: **₹${lossRunway.toLocaleString("en-IN")}** (${stopsRemaining} Risk Stops Remaining)
* **Maximum Single Scalp Loss**: ₹${maxSingleLoss} (Target: ≤ ₹250, Hard Cap: ₹300)
* **Risk Discipline Verdict**: ${isPerTradeRespected ? "✅ Zero per-trade stop violations" : "🛑 Per-trade ₹300 cap breached"}

---

## 3. Session Execution Log
| # | Symbol | Side | Entry | Exit | Qty | Net P&L | Strategy | Key Takeaway |
|:---:|:---|:---:|:---:|:---:|:---:|:---:|:---|:---|
${tableRows}

---

## 4. Behavioral & Psychological Audit
* **Total Preventable Capital Leakage**: **₹${sessionLeakageRupees.toLocaleString("en-IN")}**
${biasList.length > 0 ? biasList.join("\n") : "✅ **Zero Cognitive Leaks**: Clean disciplined execution with zero FOMO, premature exits, or revenge trades."}

---

## 5. Tomorrow's Opening Bell Gameplan
* **Opening Drive (09:15–10:30 IST)**: Focus exclusively on high-conviction A+ breakout/reversal setups with VWAP alignment.
* **Capital Risk Rule**: Dynamic slippage risk pegging — maintain strict ₹250 stop loss points relative to filled entry price ($SL = 250 / \\text{qty}$).
* **Daily Cap**: Cease trading immediately if cumulative loss touches ₹750 or 3 trades are filled.
`;

  return {
    markdown,
    targetDate,
    totalTrades,
    netPnl,
    grossPnl,
    totalFriction,
    winRate,
    lossRunway,
    stopsRemaining,
    sessionLeakageRupees,
    isDisciplined: isQuotaRespected && isLossCapRespected && isPerTradeRespected
  };
}
