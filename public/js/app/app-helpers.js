export const rupee = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
export const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });
export const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
export const num = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });

export const byId = (id) => document.getElementById(id);

export function signedRupee(val) {
  const n = Number(val || 0);
  return `${n >= 0 ? "+" : ""}${money.format(n)}`;
}

export function signedPct(val) {
  const n = Number(val || 0);
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

export function setSync(status) {
  const el = byId("syncStatus");
  if (el) el.textContent = status;
}

export function clearError() {
  const el = byId("globalError");
  if (el) { el.textContent = ""; el.hidden = true; }
}

export function showError(msg) {
  const el = byId("globalError");
  if (el) { el.textContent = msg; el.hidden = false; }
}

export function setRiskTone(el, tone) {
  if (!el) return;
  el.classList.remove("text-loss", "text-warn", "text-gain");
  if (tone === "bad") el.classList.add("text-loss");
  else if (tone === "warn") el.classList.add("text-warn");
  else if (tone === "good") el.classList.add("text-gain");
}

export async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.error) throw new Error(data.error || response.statusText);
  return data;
}

export function uniqueSymbols(symbols) {
  return Array.from(new Set(symbols.map((s) => s.trim().toUpperCase()))).filter(Boolean);
}

export function toYahooSymbol(item) {
  if (!item?.tradingsymbol) return "";
  const ex = (item.exchange || "NSE").toUpperCase();
  return `${item.tradingsymbol}.${ex === "BSE" ? "BO" : "NS"}`;
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
