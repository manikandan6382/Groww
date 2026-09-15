import { fetchJson, setFormStatus } from "./journal-helpers.js";
import { formatDateTime } from "./journal-cards.js";
import { recalculateTradePlan, setDefaultEntryTime, splitTags } from "./journal-plan.js";
import { syncChannel, tradeState } from "./journal-state.js";

let isSubmittingTrade = false;

export async function saveTrade(event, tradeForm, loadTradingJournal) {
  event.preventDefault();
  if (isSubmittingTrade) return;

  const submitBtn = tradeForm.querySelector('button[type="submit"]');
  try {
    isSubmittingTrade = true;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "⏳ Saving...";
    }
    setFormStatus("Saving trade...");

    const payload = await buildTradePayload(tradeForm);
    await fetchJson("/api/trades", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    tradeForm.reset();
    setDefaultEntryTime();
    recalculateTradePlan();
    setFormStatus("Saved to SQLite ✅");

    if (syncChannel) {
      syncChannel.postMessage({ type: "TRADE_MUTATION", timestamp: Date.now() });
    }

    await loadTradingJournal();
  } catch (error) {
    setFormStatus(error.message, true);
  } finally {
    isSubmittingTrade = false;
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "💾 Save Trade to Journal";
    }
  }
}

export async function buildTradePayload(tradeForm) {
  const data = new FormData(tradeForm);
  const payload = Object.fromEntries(data.entries());
  payload.followedPlan = data.get("followedPlan") === "on";
  payload.strategyTags = splitTags(payload.strategyTags);
  payload.mistakeTags = splitTags(payload.mistakeTags);
  payload.lotSize = Number(payload.lotSize || 65);
  payload.quantity = Number(payload.quantity || 1);
  payload.positionSize = payload.quantity * payload.lotSize;
  payload.entryPrice = Number(payload.entryPrice || 0);
  payload.exitPrice = payload.exitPrice ? Number(payload.exitPrice) : null;
  payload.stopLoss = payload.stopLoss ? Number(payload.stopLoss) : null;
  payload.targetPrice = payload.targetPrice ? Number(payload.targetPrice) : null;
  payload.charges = Number(payload.charges || 56);
  payload.status = payload.exitPrice ? "CLOSED" : "OPEN";
  return payload;
}

export function exportTaxAuditCsv() {
  const trades = tradeState.trades || [];
  if (!trades.length) {
    alert("No trade records available to export.");
    return;
  }

  const headers = [
    "Trade ID", "Date & Time (IST)", "Symbol", "Type", "Lots", "Total Quantity",
    "Entry Price (₹)", "Exit Price (₹)", "Gross P&L (₹)", "Taxes & Brokerage (₹)",
    "Net Take-Home P&L (₹)", "R:R Ratio", "Close Reason", "Strategy Tag", "Plan Compliance"
  ];

  const rows = trades.map((t) => {
    const net = Number(t.netPnl || 0);
    const charges = Number(t.charges || 56);
    const gross = Number(t.grossPnl || t.pnl || (net + charges));
    const totalUnits = (t.quantity || 1) * (t.lotSize || 1);
    const direction = t.direction === "LONG" || String(t.symbol).toUpperCase().includes("CE") ? "CALL (CE)" : "PUT (PE)";
    const plan = t.followedPlan !== false ? "YES" : "NO";

    return [
      `"${t.id || ""}"`, `"${formatDateTime(t.entryDatetime)}"`, `"${t.symbol || ""}"`, `"${direction}"`,
      t.quantity || 1, totalUnits, Number(t.entryPrice || 0).toFixed(2), Number(t.exitPrice || 0).toFixed(2),
      gross.toFixed(2), charges.toFixed(2), net.toFixed(2), Number(t.riskRewardRatio || 2).toFixed(2),
      `"${t.closeReason || "MANUAL_EXIT"}"`, `"${(t.strategyTags || [])[0] || "0DTE Scalp"}"`, `"${plan}"`
    ].join(",");
  });

  const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `PortfolioX_Tax_Audit_Report_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function deleteJournalTrade(tradeId, loadTradingJournal) {
  const id = Number(tradeId);
  if (!id) return;
  if (!confirm(`Are you sure you want to permanently delete Trade #${id}?`)) return;

  const card = document.querySelector(`[data-story-trade-id="${id}"]`);
  if (card) {
    card.style.transition = "opacity 0.2s ease, transform 0.2s ease";
    card.style.opacity = "0";
    card.style.transform = "scale(0.96)";
    setTimeout(() => { try { card.remove(); } catch (_) {} }, 200);
  }

  document.dispatchEvent(new CustomEvent("portfoliox:trade-deleted", { detail: { tradeId: id } }));
  try {
    await fetchJson(`/api/trades/${id}/delete`, { method: "POST" });
    if (typeof loadTradingJournal === "function") await loadTradingJournal();
  } catch (err) {
    alert(`Delete Error: ${err.message}`);
    if (typeof loadTradingJournal === "function") await loadTradingJournal();
  }
}
if (typeof window !== "undefined") {
  window.deleteJournalTrade = (id) => deleteJournalTrade(id, window.loadTradingJournal);
}
