export const paperMoney = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });
export const paperNum = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });

export function byId(id) {
  return document.getElementById(id);
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function signedMoney(value) {
  const amount = Number(value || 0);
  return `${amount >= 0 ? "+" : "-"}${paperMoney.format(Math.abs(amount))}`;
}

export function compactMoney(value) {
  return `₹${paperNum.format(Number(value || 0))}`;
}

export function signedCompactMoney(value) {
  const amount = Number(value || 0);
  return `${amount >= 0 ? "+" : "-"}${compactMoney(Math.abs(amount))}`;
}

export function signedNumber(value) {
  const amount = Number(value || 0);
  return `${amount >= 0 ? "+" : ""}${paperNum.format(amount)}`;
}

export function formatCloseReason(reason) {
  const labels = {
    TARGET_HIT: "Target hit",
    STOP_LOSS_HIT: "Stop loss hit",
    MANUAL_EXIT: "Manual exit",
  };
  return labels[reason] || "Open";
}

export function parseTradeDate(value) {
  const cleanValue = typeof value === "string" ? value.replace(" ", "T") : value;
  const date = cleanValue ? new Date(cleanValue) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

export function formatShortDate(value) {
  const date = parseTradeDate(value);
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

export function formatTime(value) {
  const date = parseTradeDate(value);
  return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

export function percentMove(entryPrice, markPrice) {
  const entry = Number(entryPrice || 0);
  const mark = Number(markPrice || 0);
  return entry ? ((mark - entry) / entry) * 100 : 0;
}

export function timeInTrade(entryDatetime) {
  const start = parseTradeDate(entryDatetime);
  const diff = Math.max(0, Date.now() - start.getTime());
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
}

export async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    cache: "no-store",
    ...options,
  });
  const data = await response.json();
  if (!response.ok || data.error) throw new Error(data.error || response.statusText);
  return data;
}

export function setPaperStatus(text, isError = false) {
  const target = byId("paperFormStatus");
  if (target) {
    target.textContent = text;
    target.classList.toggle("warn", isError);
  }
}
