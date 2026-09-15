import fs from "node:fs";

export function getManualToken(trade) {
  const notes = `${trade.personalNotes || ""} ${trade.entryReason || ""}`;
  const match = notes.match(/(?:UPSTOX_TOKEN|TOKEN)\s*[:=]\s*([A-Z_]+\|)?([A-Z0-9_]+)/i);
  if (!match) return null;
  const exchange = match[1] ? match[1].replace("|", "").toUpperCase() : "NSE_FO";
  return `${exchange}|${match[2].toUpperCase()}`;
}

export function toUpstoxSide(optionType) {
  const v = String(optionType || "").toUpperCase();
  if (v === "CALL" || v === "CE") return "CE";
  if (v === "PUT" || v === "PE") return "PE";
  return "";
}

export function normalizeExpiry(value) {
  if (!value) return "";
  const text = String(value).toUpperCase();
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return text.replace(/[^A-Z0-9]/g, "");
  const [, year, month, day] = match;
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  return `${day}${months[Number(month) - 1]}${year.slice(2)}`;
}

export function readSavedAccessToken(sessionFile) {
  try {
    if (!fs.existsSync(sessionFile)) return "";
    const session = JSON.parse(fs.readFileSync(sessionFile, "utf8"));
    return String(session.access_token || session.accessToken || "");
  } catch {
    return "";
  }
}

export function watchSessionFile(client) {
  try {
    if (fs.existsSync(client.sessionFile)) {
      fs.watchFile(client.sessionFile, { interval: 2000 }, (curr, prev) => {
        if (curr.mtime !== prev.mtime) {
          const newToken = client.refreshAccessToken();
          if (newToken) {
            client.lastError = "";
            client.emit("status", { state: "token_refreshed", message: "Upstox session token refreshed from file." });
            if (client.shouldRun) client.startPolling();
          }
        }
      });
    }
  } catch {}
}

export function extractLtp(item) {
  return Number(
    item?.last_price ||
    item?.ltp ||
    item?.lastTradedPrice ||
    item?.last_traded_price ||
    item?.close ||
    0
  );
}

export function normalizeInstrumentKey(value) {
  const text = String(value || "").trim().toUpperCase();
  if (!text) return "";
  return text.replace("NFO|", "NSE_FO|").replace("NFO:", "NSE_FO|").replace("NSE_FO:", "NSE_FO|");
}

export function expiryKeys(value) {
  if (!value) return [];
  const raw = String(value).trim().toUpperCase();
  if (!raw) return [];

  const keys = new Set([raw.replace(/[^A-Z0-9]/g, "")]);
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const [, year, month, day] = iso;
    keys.add(`${year}${month}${day}`);
    keys.add(normalizeExpiry(`${year}-${month}-${day}`));
  }

  const digits = raw.replace(/\D/g, "");
  if (digits.length === 8) keys.add(digits);
  if (digits.length >= 12) {
    const date = new Date(Number(digits));
    if (!Number.isNaN(date.getTime())) {
      const yyyy = date.getUTCFullYear();
      const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
      const dd = String(date.getUTCDate()).padStart(2, "0");
      keys.add(`${yyyy}${mm}${dd}`);
      keys.add(normalizeExpiry(`${yyyy}-${mm}-${dd}`));
    }
  }

  return Array.from(keys).filter(Boolean);
}
