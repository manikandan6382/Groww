import { getTradeOutcome } from "../../../utils/tradeNormalizer";

export function resolveUnderlying(trade) {
  const sym = String(trade.underlyingSymbol || trade.symbol || "").toUpperCase();
  if (sym.includes("BANK")) return "BANKNIFTY";
  if (sym.includes("SENSEX")) return "SENSEX";
  if (sym.includes("NIFTY")) return "NIFTY";
  return "OTHER";
}

export function computeAssetCounts(closedAlerts = []) {
  let nifty = 0, bank = 0, sensex = 0;
  for (const t of closedAlerts) {
    const u = resolveUnderlying(t);
    if (u === "NIFTY") nifty++;
    else if (u === "BANKNIFTY") bank++;
    else if (u === "SENSEX") sensex++;
  }
  return { allCount: closedAlerts.length, niftyCount: nifty, bankCount: bank, sensexCount: sensex };
}

export function filterAlerts(closedAlerts = [], { assetFilter, paperLedgerFilter, dateRangeFilter, customStart, customEnd }) {
  const todayStr = new Date().toISOString().split("T")[0];
  return closedAlerts.filter((trade) => {
    if (assetFilter !== "ALL" && resolveUnderlying(trade) !== assetFilter) return false;
    const outcome = getTradeOutcome(trade);
    if (paperLedgerFilter === "win" && !outcome.isNetGain) return false;
    if (paperLedgerFilter === "loss" && outcome.isNetGain) return false;
    if (paperLedgerFilter === "friction" && !outcome.isBreakeven) return false;

    const tradeDate = (trade.exitDatetime || trade.entryDatetime || "").split("T")[0];
    if (dateRangeFilter === "today" && tradeDate !== todayStr) return false;
    if (dateRangeFilter === "custom" && customStart && customEnd) {
      if (tradeDate < customStart || tradeDate > customEnd) return false;
    }
    return true;
  });
}

export function computeRealizedMetrics(filteredAlerts = []) {
  let realized = 0, gross = 0, charges = 0, wins = 0, losses = 0;
  for (const t of filteredAlerts) {
    const net = Number(t.netPnl || 0);
    realized += net;
    charges += Number(t.charges || 55.20);
    gross += Number(t.grossPnl ?? (net + 55.20));
    if (net > 0) wins++; else losses++;
  }
  return { totalRealizedPnl: realized, totalGrossPnl: gross, totalCharges: charges, winCount: wins, lossCount: losses };
}
