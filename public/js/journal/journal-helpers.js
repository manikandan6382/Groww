export const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });
export const usdTrade = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
export const pct = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 });

export function normalizePath(pathname) {
  const clean = `/${String(pathname || "/").replace(/^\/+/, "")}`.replace(/\/+$/, "");
  return clean === "" ? "/" : clean;
}

export function setElementHidden(element, hidden) {
  if (!element) return;
  element.hidden = hidden;
  element.style.display = hidden ? "none" : "";
}

export async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || response.statusText || "Request failed");
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

export function setFormStatus(message, isError = false) {
  const statusEl = document.getElementById("formStatus");
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.className = isError ? "form-status-text error" : "form-status-text";
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
