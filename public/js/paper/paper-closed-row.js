import { compactMoney, escapeHtml, formatTime, paperMoney } from "./paper-helpers.js";

export function renderClosedTradeRow(trade) {
  const net = Number(trade.netPnl || 0);
  const gross = Number(trade.realizedPnl || net);
  const charges = Number(trade.charges || (gross - net) || 0);
  const isWin = net >= 0;
  const entry = Number(trade.entryPrice || 0);
  const exitP = Number(trade.exitPrice || trade.lastMarkPrice || entry);
  const target = Number(trade.targetPrice || 0);
  const stop = Number(trade.stopLoss || 0);
  const lots = Number(trade.quantity || 1);
  const lotSize = Math.max(1, Number(trade.lotSize || 65));
  const units = lots * lotSize;
  const side = trade.optionType === "PUT" ? "PUT" : "CALL";
  const isCall = side === "CALL";

  const entryDate = trade.entryDatetime ? new Date(trade.entryDatetime) : null;
  const exitDate = trade.exitDatetime ? new Date(trade.exitDatetime) : null;
  const entryTime = formatTime(trade.entryDatetime);
  const exitTime = formatTime(trade.exitDatetime || trade.entryDatetime);
  let durationStr = "";
  if (entryDate && exitDate && !isNaN(entryDate.getTime()) && !isNaN(exitDate.getTime())) {
    const diffMins = Math.max(0, Math.round((exitDate.getTime() - entryDate.getTime()) / 60000));
    durationStr = diffMins >= 60 ? `${Math.floor(diffMins / 60)}h ${diffMins % 60}m` : `${diffMins}m`;
  }

  const priceDiff = exitP - entry;
  const movePct = entry > 0 ? ((priceDiff / entry) * 100).toFixed(1) : "0.0";
  const rr = Number(trade.riskRewardRatio || 2).toFixed(1);
  const closeReason = trade.closeReason || (isWin ? "TARGET_HIT" : "STOP_LOSS_HIT");
  const outcomeLabel = closeReason === "TARGET_HIT" ? "🎯 Target Hit" : closeReason === "STOP_LOSS_HIT" ? "🛡️ Stop Cut" : "⚡ Closed";

  return `
    <tr class="luxury-ledger-row ${isWin ? "row-win" : "row-loss"}" data-closed-trade-id="${trade.id}">
      <td class="col-timing">
        <div class="timing-time-row"><span class="timing-entry">${entryTime}</span><span class="timing-arrow">➔</span><span class="timing-exit font-bold">${exitTime}</span></div>
        ${durationStr ? `<span class="badge-duration-held">⏱️ ${durationStr} held</span>` : `<span class="badge-duration-held">⏱️ Intraday</span>`}
      </td>
      <td class="col-contract">
        <div class="contract-flex">
          <strong class="contract-symbol">${escapeHtml(trade.symbol)}</strong>
          <div class="contract-sub-tags"><span class="pos-type-pill ${side.toLowerCase()} mini">${isCall ? "▲ CE" : "▼ PE"}</span><span class="contract-units-badge">${lots} Lot (${units} Qty)</span></div>
        </div>
      </td>
      <td class="col-journey">
        <div class="journey-execution-box">
          <div class="journey-prices"><span>₹${entry.toFixed(2)}</span><span class="text-slate-500">➔</span><strong class="text-white">₹${exitP.toFixed(2)}</strong></div>
          <span class="journey-move-pill ${priceDiff >= 0 ? "gain" : "loss"}">${priceDiff >= 0 ? "▲ +" : "▼ "}${priceDiff.toFixed(2)} pts (${movePct}%)</span>
        </div>
      </td>
      <td class="col-plan">
        <div class="plan-bracket">
          <div class="plan-levels"><span class="text-gain" title="Target Price">TP ₹${target.toFixed(1)}</span><span class="text-slate-600">/</span><span class="text-loss" title="Stop Loss Price">SL ₹${stop.toFixed(1)}</span></div>
          <span class="rr-tag">1:${rr} R:R</span>
        </div>
      </td>
      <td class="col-outcome"><span class="ledger-outcome-badge ${isWin ? "gain" : "loss"}">${outcomeLabel}</span></td>
      <td class="col-pnl" style="text-align: right;">
        <div class="pnl-stack">
          <strong class="ledger-pnl-num ${isWin ? "text-gain" : "text-loss"} apple-numeral">${net >= 0 ? "+" : ""}${paperMoney.format(net)}</strong>
          <span class="friction-sub">Gross: ${gross >= 0 ? "+" : ""}${compactMoney(gross)} · Fees: ₹${charges.toFixed(0)}</span>
        </div>
      </td>
      <td class="col-actions" style="text-align: center;">
        <div class="ledger-action-cluster">
          <button type="button" class="btn-ledger-action btn-ticket" title="Copy exact broker order ticket (Groww / Zerodha)" onclick="window.copyBrokerPayload(${trade.id})">📋</button>
          <button type="button" class="btn-ledger-action btn-journal" title="Export this trade to story Journal" onclick="window.exportPracticeTradeToJournal('${escapeHtml(trade.symbol)}', ${entry}, ${exitP}, ${stop}, ${target}, ${lots}, ${lotSize}, ${net})">📝</button>
          <button type="button" class="btn-ledger-action btn-delete" title="Delete this record" onclick="event.stopPropagation(); window.deletePaperTradeFromUi(${trade.id}, this)">🗑️</button>
        </div>
      </td>
    </tr>
  `;
}
