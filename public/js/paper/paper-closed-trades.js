import { byId, paperMoney } from "./paper-helpers.js";
import { showDeskToast } from "./paper-audio-fx.js";
import { paperState } from "./paper-state.js";
import { renderClosedTradeRow } from "./paper-closed-row.js";

export function renderClosedPaperTrades(trades) {
  const visibleTrades = Array.isArray(trades) ? trades : [];
  const filter = paperState.ledgerFilter || "all";
  
  const winTrades = visibleTrades.filter((t) => Number(t.netPnl || 0) >= 0);
  const lossTrades = visibleTrades.filter((t) => Number(t.netPnl || 0) < 0);
  const totalRealized = visibleTrades.reduce((sum, t) => sum + Number(t.netPnl || 0), 0);
  const winRate = visibleTrades.length ? Math.round((winTrades.length / visibleTrades.length) * 100) : 0;

  const countBadge = byId("ledgerTradeCountBadge");
  if (countBadge) countBadge.textContent = `${visibleTrades.length} Closed Trades`;

  const netRealizedEl = byId("ledgerNetRealizedVal");
  if (netRealizedEl) {
    netRealizedEl.textContent = `${totalRealized >= 0 ? "+" : ""}${paperMoney.format(totalRealized)}`;
    netRealizedEl.className = `kpi-micro-val ${totalRealized >= 0 ? "text-gain" : "text-loss"}`;
  }

  const winRatioEl = byId("ledgerWinRatioVal");
  if (winRatioEl) {
    winRatioEl.textContent = `${winTrades.length}W · ${lossTrades.length}L (${winRate}%)`;
    winRatioEl.className = `kpi-micro-pill ${winRate >= 50 ? "badge-green" : "badge-loss"}`;
  }

  if (byId("filterCountAll")) byId("filterCountAll").textContent = visibleTrades.length;
  if (byId("filterCountWin")) byId("filterCountWin").textContent = winTrades.length;
  if (byId("filterCountLoss")) byId("filterCountLoss").textContent = lossTrades.length;

  let filtered = visibleTrades;
  if (filter === "win") filtered = winTrades;
  else if (filter === "loss") filtered = lossTrades;

  const targetTbody = byId("paperClosedTrades");
  if (!targetTbody) return;

  targetTbody.innerHTML = filtered.length
    ? filtered.slice(0, 30).map((trade) => renderClosedTradeRow(trade)).join("")
    : `<tr><td colspan="7" class="empty-table-cell" style="text-align:center; padding: 32px 16px; color: #94a3b8;"><div class="empty-trades-dock"><span class="empty-icon">📂</span><strong>No trade records found for this filter</strong><small>Executed practice positions will populate here with full millisecond audit details.</small></div></td></tr>`;
}

export function exportClosedTradesToCsv() {
  const trades = paperState.lab?.closedTrades || [];
  if (!trades.length) {
    showDeskToast("Export Notice", "No closed practice trades available to export.", "ℹ️");
    return;
  }
  const headers = ["ID", "Time", "Symbol", "Direction", "Option Type", "Quantity", "Entry Price", "Exit Price", "Gross PnL", "Charges", "Net Realized PnL", "Close Reason"];
  const rows = trades.map((t) => [
    t.id,
    `"${t.exitDatetime || t.entryDatetime || ''}"`,
    `"${t.symbol || ''}"`,
    `"${t.direction || 'LONG'}"`,
    `"${t.optionType || 'CALL'}"`,
    t.quantity || 1,
    Number(t.entryPrice || 0).toFixed(2),
    Number(t.exitPrice || 0).toFixed(2),
    Number(t.realizedPnl || 0).toFixed(2),
    Number(t.charges || 0).toFixed(2),
    Number(t.netPnl || 0).toFixed(2),
    `"${t.closeReason || 'TARGET_HIT'}"`
  ]);
  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `paper_trades_ledger_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showDeskToast("Export Successful 📥", `Exported ${trades.length} trades to CSV spreadsheet!`, "📊");
}
