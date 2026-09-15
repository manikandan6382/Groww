import { byId, money, num, rupee, signedPct, signedRupee } from "./app-helpers.js";
import { getPalette } from "./app-theme.js";
import { drawDonut, drawHealth } from "./app-canvas.js";
import { state } from "./app-state.js";

export function renderPortfolio() {
  state.rows = enrichHoldings(state.holdings);
  const rows = state.rows;
  const totals = getTotals(rows);
  const returnPct = totals.cost ? (totals.pnl / totals.cost) * 100 : 0;
  const gold = rows.find((item) => item.tradingsymbol === "GOLDBEES");
  const maxWeight = rows.length ? Math.max(...rows.map((item) => item.weight)) : 0;
  const goldWeight = gold ? gold.weight : 0;
  const health = calculateHealth(rows, goldWeight, maxWeight);

  if (byId("totalValue")) byId("totalValue").textContent = rupee.format(totals.value);
  if (byId("investedValue")) byId("investedValue").textContent = rupee.format(totals.cost);
  if (byId("totalReturn")) byId("totalReturn").textContent = `${signedRupee(totals.pnl)} (${signedPct(returnPct)})`;
  if (byId("totalReturnPct")) byId("totalReturnPct").textContent = signedPct(returnPct);
  if (byId("holdingCount")) byId("holdingCount").textContent = String(rows.length);
  if (byId("asOf")) byId("asOf").textContent = `As of ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  if (byId("cashBuffer")) byId("cashBuffer").textContent = state.margins?.net != null ? rupee.format(state.margins.net) : "--";
  if (byId("goldWeight")) byId("goldWeight").textContent = gold ? `${gold.weight.toFixed(0)}%` : "--";

  renderFilteredHoldings();
  renderLegend(rows);
  if (byId("allocationChart")) drawDonut(byId("allocationChart"), rows.map((i) => i.weight), getPalette(), totals.value);
  if (byId("healthChart")) drawHealth(byId("healthChart"), health);
}

export function enrichHoldings(holdings) {
  const base = holdings.map((item) => {
    const value = Number(item.quantity || 0) * Number(item.last_price || 0);
    const cost = Number(item.quantity || 0) * Number(item.average_price || 0);
    const pnl = Number(item.pnl ?? value - cost);
    return { ...item, value, cost, pnl };
  });
  const total = base.reduce((sum, item) => sum + item.value, 0) || 1;
  return base.map((item) => ({
    ...item,
    weight: (item.value / total) * 100,
    returnPct: item.cost ? (item.pnl / item.cost) * 100 : 0,
  })).sort((a, b) => b.value - a.value);
}

export function getTotals(rows) {
  return rows.reduce(
    (acc, item) => {
      acc.value += item.value;
      acc.cost += item.cost;
      acc.pnl += item.pnl;
      return acc;
    },
    { value: 0, cost: 0, pnl: 0 }
  );
}

export function calculateHealth(rows, goldWeight, maxWeight) {
  if (!rows.length) return 0;
  const diversification = Math.min(32, 14 + rows.length * 3.4);
  const concentration = Math.max(12, 36 - Math.max(0, maxWeight - 30) * 0.55);
  const goldBalance = Math.max(10, 32 - Math.max(0, goldWeight - 25) * 0.45);
  return Math.round(Math.max(5, Math.min(95, diversification + concentration + goldBalance)));
}

export function renderFilteredHoldings() {
  const query = byId("searchInput")?.value.trim().toLowerCase() || "";
  const filter = state.holdingsFilter || "all";
  let rows = state.rows;
  if (query) rows = rows.filter((item) => item.tradingsymbol.toLowerCase().includes(query));
  if (filter === "gainers") rows = rows.filter((item) => item.pnl > 0);
  else if (filter === "losers") rows = rows.filter((item) => item.pnl < 0);

  const tbody = byId("holdingsBody");
  if (!tbody) return;
  tbody.innerHTML = rows.length ? rows.map((item, index) => `
    <tr>
      <td>
        <div class="instrument">
          <span class="instrument-icon" style="background:${getPalette()[index % getPalette().length]}">${item.tradingsymbol.slice(0, 1)}</span>
          <div>${item.tradingsymbol}<small>${item.exchange}</small></div>
        </div>
      </td>
      <td>${num.format(item.quantity)}</td>
      <td>${money.format(item.average_price)}</td>
      <td>${money.format(item.last_price)}</td>
      <td>${rupee.format(item.value)}</td>
      <td class="${item.pnl >= 0 ? "gain" : "loss"}"><span class="badge-subtle ${item.pnl >= 0 ? "gain" : "loss"}">${signedPct(item.returnPct)}</span></td>
      <td>${item.weight.toFixed(1)}%</td>
    </tr>
  `).join("") : '<tr><td colspan="7" style="text-align: center;">No holdings match filter.</td></tr>';
}

export function renderLegend(rows) {
  const legend = byId("allocationLegend");
  if (!legend) return;
  legend.innerHTML = rows.map((item, index) => `
    <div class="legend-row">
      <span class="dot" style="background:${getPalette()[index % getPalette().length]}"></span>
      <span>${item.tradingsymbol}</span>
      <strong>${item.weight.toFixed(1)}%</strong>
    </div>
  `).join("");
}
