import { escapeHtml, inr } from "./journal-helpers.js";
import { tradeState } from "./journal-state.js";

export function formatDateTime(value) {
  if (!value) return "--";
  return value.replace("T", " ").slice(0, 16);
}

export function formatShortDate(dateStr) {
  if (!dateStr) return "--";
  const parts = dateStr.split("-");
  if (parts.length < 3) return dateStr;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const mIndex = parseInt(parts[1], 10) - 1;
  return `${parts[2]} ${months[mIndex] || parts[1]}`;
}

export function renderTradeHistory(trades) {
  const target = document.getElementById("tradeHistory");
  if (!target) return;

  let filtered = [...trades];
  if (tradeState.historyFilter === "WIN") {
    filtered = filtered.filter((t) => Number(t.netPnl || 0) > 0);
  } else if (tradeState.historyFilter === "LOSS") {
    filtered = filtered.filter((t) => Number(t.netPnl || 0) < 0);
  } else if (tradeState.historyFilter === "BREAKEVEN") {
    filtered = filtered.filter((t) => Number(t.netPnl || 0) === 0 || t.closeReason === "BREAKEVEN_LOCKED");
  }

  const countLabelEl = document.getElementById("tradeCountLabel");
  if (countLabelEl) {
    countLabelEl.textContent = `${filtered.length} Displayed (${trades.length} Total Stored)`;
  }

  if (!filtered.length) {
    target.innerHTML = `
      <div class="apple-empty-state">
        <h3 class="apple-empty-title">No Trade Records in This Filter</h3>
        <p class="apple-empty-desc">Your verified trades will appear here in real-time as you trade or log setups.</p>
        <div class="apple-empty-actions">
          <button type="button" class="apple-btn-secondary" onclick="document.getElementById('tradeForm').scrollIntoView({behavior: 'smooth', block: 'center'})">➕ Log a Trade</button>
        </div>
      </div>
    `;
    return;
  }

  target.innerHTML = filtered.map((trade) => {
    try {
      return renderStoryTradeCard(trade);
    } catch {
      return "";
    }
  }).join("");
}

export function renderStoryTradeCard(trade) {
  const net = Number(trade.netPnl || 0);
  const gross = Number(trade.grossPnl || trade.pnl || (net + Number(trade.charges || 56)));
  const charges = Number(trade.charges || 56);
  const isWin = net > 0;
  const isLoss = net < 0;
  const statusCls = isWin ? "story-card-win" : isLoss ? "story-card-loss" : "story-card-neutral";

  let outcomeBadge = '<span class="apple-status-pill gain"><span class="pulse-beacon win"></span> 🎯 Target Hit</span>';
  let outcomeTitle = "Full Target Profit Banked";
  if (trade.closeReason === "STOP_LOSS_HIT") {
    outcomeBadge = '<span class="apple-status-pill loss"><span class="pulse-beacon loss"></span> 🛑 Stop Loss Protected</span>';
    outcomeTitle = "Capital Shield Auto-Triggered";
  } else if (trade.closeReason === "BREAKEVEN_LOCKED") {
    outcomeBadge = '<span class="apple-status-pill be"><span class="pulse-beacon cyan"></span> 🔒 Breakeven Locked</span>';
    outcomeTitle = "Risk Eliminated · Zero Net Loss";
  }

  const buyPrice = Number(trade.entryPrice || 0).toFixed(2);
  const sellPrice = Number(trade.exitPrice || 0).toFixed(2);
  const priceDiff = Number(sellPrice) - Number(buyPrice);
  const priceChangePct = Number(buyPrice) > 0 && Number(sellPrice) > 0 ? ((priceDiff / Number(buyPrice)) * 100).toFixed(1) : "0.0";
  const totalUnits = (trade.quantity || 1) * (trade.lotSize || 1);
  const rr = Number(trade.riskRewardRatio || 2).toFixed(2);
  const rBadge = isWin ? `+${rr}x Reward` : isLoss ? "-1.0x Risk" : "0.0x BE";
  const rawStrat = (trade.strategyTags || [])[0] || "Same-Day Expiry Scalp";
  const stratTag = rawStrat === "0DTE Scalp" ? "Same-Day Expiry Scalp" : rawStrat;
  const isCall = trade.direction === "LONG" || String(trade.symbol).toUpperCase().includes("CE");

  const entryDate = trade.entryDatetime ? new Date(trade.entryDatetime) : null;
  const exitDate = trade.exitDatetime ? new Date(trade.exitDatetime) : null;
  const entryStr = formatDateTime(trade.entryDatetime);
  const exitStr = trade.exitDatetime ? formatDateTime(trade.exitDatetime) : null;
  const entryTimeOnly = entryDate && !isNaN(entryDate.getTime()) ? entryDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false }) : (entryStr.split(" ")[1] || entryStr);
  const exitTimeOnly = exitDate && !isNaN(exitDate.getTime()) ? exitDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false }) : (exitStr ? (exitStr.split(" ")[1] || exitStr) : null);

  let elapsedDuration = "";
  if (entryDate && exitDate && !isNaN(entryDate.getTime()) && !isNaN(exitDate.getTime())) {
    const diffMins = Math.max(0, Math.round((exitDate.getTime() - entryDate.getTime()) / 60000));
    elapsedDuration = diffMins >= 60 ? `(${Math.floor(diffMins / 60)}h ${diffMins % 60}m held)` : `(${diffMins}m held)`;
  }

  const timingMeta = exitTimeOnly ? `<span>🗓️ ${escapeHtml(entryStr)} ➔ ⏱️ Exit ${escapeHtml(exitTimeOnly)} <small class="text-cyan font-bold">${elapsedDuration}</small></span>` : `<span>🗓️ ${escapeHtml(entryStr)}</span>`;

  return `
    <article class="story-trade-card panel apple-ceramic-card ${statusCls} ios-touch-item" data-story-trade-id="${trade.id}">
      <div class="story-card-top-row">
        <div class="story-identity-group">
          <div class="story-type-badge ${isCall ? 'call' : 'put'}">${isCall ? '🟢 CALL' : '🔴 PUT'}</div>
          <div class="story-name-meta">
            <div class="story-title-line">
              <strong class="story-symbol-name">${escapeHtml(trade.symbol)}</strong>
              ${outcomeBadge}
              <span class="apple-pill-badge ${isWin ? 'text-gain' : isLoss ? 'text-loss' : ''}">${rBadge}</span>
            </div>
            <div class="story-subtitle-meta">
              ${timingMeta}
              <span class="meta-dot">·</span>
              <span>📦 ${trade.quantity || 1} Lot (${totalUnits} Qty)</span>
              <span class="meta-dot">·</span>
              <span>🏷️ ${escapeHtml(stratTag)}</span>
            </div>
          </div>
        </div>
        <div class="story-financial-group">
          <div class="flex items-center justify-end gap-2">
            <div class="story-net-pnl ${isWin ? 'text-gain' : isLoss ? 'text-loss' : 'text-neutral'} apple-numeral">${net >= 0 ? "+" : ""}${inr.format(net)}</div>
            <button type="button" class="btn-story-delete" title="Delete trade record" onclick="event.stopPropagation(); window.deleteJournalTrade(${trade.id})">🗑️</button>
          </div>
          <div class="story-sub-breakdown">
            <span>Gross: ${gross >= 0 ? "+" : ""}${inr.format(gross)}</span>
            <span class="meta-dot">·</span>
            <span>Taxes & Fees: ₹${charges.toFixed(0)}</span>
          </div>
        </div>
      </div>
      <div class="story-journey-capsule">
        <div class="journey-node start"><span class="node-label">Bought Entry</span><strong class="node-price">₹${buyPrice}</strong><small class="node-time">⏱️ ${escapeHtml(entryTimeOnly)}</small></div>
        <div class="journey-vector-track ${isWin ? 'gain' : isLoss ? 'loss' : 'neutral'}">
          <div class="vector-line"><div class="vector-fill"></div></div>
          <div class="vector-pill">
            <span class="pill-change ${Number(priceChangePct) >= 0 ? 'gain' : 'loss'}">${Number(priceChangePct) >= 0 ? '▲ +' : '▼ '}${priceChangePct}% (${priceDiff >= 0 ? '+' : ''}${priceDiff.toFixed(2)} pts)</span>
            <span class="pill-context">${outcomeTitle}</span>
          </div>
        </div>
        <div class="journey-node end ${isWin ? 'target' : 'stop'}"><span class="node-label">${isWin ? 'Target Sold' : 'Stop Cut'}</span><strong class="node-price">₹${sellPrice}</strong><small class="node-time">⏱️ ${escapeHtml(exitTimeOnly || '--')}</small></div>
      </div>
    </article>
  `;
}
