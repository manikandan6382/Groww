import { uniqueSymbols } from "./app-helpers.js";

export const WATCHLIST_KEY = "portfolio-watchlist";
export const MAX_WATCHLIST = 30;
export const DEFAULT_WATCHLIST = [
  "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS",
  "ICICIBANK.NS", "SBIN.NS", "ITC.NS", "GOLDBEES.NS"
];

export function loadWatchlistSymbols() {
  try {
    const raw = localStorage.getItem(WATCHLIST_KEY) || sessionStorage.getItem(WATCHLIST_KEY) || "null";
    const saved = JSON.parse(raw);
    if (Array.isArray(saved) && saved.length > 0) {
      return uniqueSymbols(saved).slice(0, MAX_WATCHLIST);
    }
    return [...DEFAULT_WATCHLIST];
  } catch {
    return [...DEFAULT_WATCHLIST];
  }
}

export function saveWatchlistSymbols(symbols) {
  try {
    const data = JSON.stringify(symbols);
    localStorage.setItem(WATCHLIST_KEY, data);
    sessionStorage.setItem(WATCHLIST_KEY, data);
  } catch {
    // Non-fatal
  }
}

export async function checkBrokerStatuses() {
  try {
    const res = await fetch("/api/broker/status").then((r) => r.ok ? r.json() : {});
    const kitePill = document.getElementById("kiteStatusPill");
    if (kitePill && res.kite) {
      kitePill.className = `apple-pill-badge ${res.kite.connected ? "badge-success" : "badge-neutral"}`;
      kitePill.textContent = res.kite.connected ? "🟢 Kite Connected" : "⚪ Kite Idle";
    }
    const upstoxPill = document.getElementById("upstoxStatusPill");
    if (upstoxPill && res.upstox) {
      upstoxPill.className = `apple-pill-badge ${res.upstox.connected ? "badge-success" : "badge-neutral"}`;
      upstoxPill.textContent = res.upstox.connected ? "🟢 Upstox Connected" : "⚪ Upstox Idle";
    }
  } catch (_) {}
}

export const state = {
  holdings: [],
  rows: [],
  margins: null,
  yahooResults: [],
  watchlistSymbols: loadWatchlistSymbols(),
  watchlistQuoteItems: [],
  foreignResults: [],
  chartValues: [],
  holdingsFilter: "all",
  watchlistFilter: "all",
  tvTerminal: null,
};
