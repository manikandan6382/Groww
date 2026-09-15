import { extractLtp, normalizeInstrumentKey } from "./upstoxUtils.js";

export function emitTicksFromLtpData(client, data, keys) {
  if (!data || typeof data !== "object") return;
  const entries = Object.entries(data);
  const usedKeys = new Set();

  for (const key of keys) {
    const candidates = [
      data[key],
      data[key.replace("|", ":")],
      data[key.replace("NSE_FO|", "NSE_FO:")],
    ].filter(Boolean);

    const fallback = entries.find(([entryKey, item]) => {
      const token = String(item?.instrument_token || item?.instrument_key || entryKey || "").toUpperCase();
      return token === key || token === key.replace("|", ":") || entryKey.toUpperCase() === key;
    });
    if (fallback) candidates.push(fallback[1]);

    const item = candidates[0];
    const ltp = extractLtp(item);
    if (ltp > 0) {
      usedKeys.add(key);
      client.emit("tick", {
        exchange: key.split("|")[0] || "NSE",
        token: key,
        key,
        ltp,
        raw: item,
        receivedAt: new Date().toISOString(),
      });
    }
  }

  for (const [entryKey, item] of entries) {
    const ltp = extractLtp(item);
    const key = normalizeInstrumentKey(item?.instrument_token || item?.instrument_key || entryKey);
    if (ltp > 0 && key && client.activeSubscriptions.has(key) && !usedKeys.has(key)) {
      client.emit("tick", {
        exchange: key.split("|")[0] || "NSE",
        token: key,
        key,
        ltp,
        raw: item,
        receivedAt: new Date().toISOString(),
      });
    }
  }
}

export function parseRawMessage(client, raw) {
  try {
    let message;
    if (typeof raw === "string") {
      message = JSON.parse(raw);
    } else {
      const text = Buffer.isBuffer(raw) ? raw.toString("utf8") : String(raw);
      try {
        message = JSON.parse(text);
      } catch {
        parseBinaryFeed(client, raw);
        return;
      }
    }
    parseJsonFeedMessage(client, message);
  } catch {
    // ignore parse errors
  }
}

export function parseJsonFeedMessage(client, message) {
  if (message.type === "error" || message.status === "error") {
    const msg = message.message || message.error || "Upstox WS error";
    if (/token|expired|unauthorized|invalid/i.test(msg)) {
      client.emit("session_expired", { message: msg });
    }
    client.emit("error", new Error(msg));
    return;
  }

  if (message.type === "live_feed" || message.feeds) {
    const feeds = message.feeds || {};
    for (const [instrumentKey, feedData] of Object.entries(feeds)) {
      const ltp = Number(
        feedData?.ltpc?.ltp ||
        feedData?.ff?.marketFF?.ltpc?.ltp ||
        feedData?.ltp ||
        0
      );
      if (ltp > 0) {
        client.emit("tick", {
          exchange: instrumentKey.split("|")[0] || "NSE",
          token: instrumentKey,
          key: instrumentKey,
          ltp,
          raw: feedData,
          receivedAt: new Date().toISOString(),
        });
      }
    }
  }
}

export function parseBinaryFeed(client, raw) {
  try {
    const buf = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
    const text = buf.toString("binary");

    for (const key of client.activeSubscriptions) {
      if (text.includes(key.replace("|", ""))) {
        const keyIdx = buf.indexOf(key.split("|")[1] || key);
        if (keyIdx === -1) continue;
        for (let offset = keyIdx + 4; offset < Math.min(keyIdx + 64, buf.length - 4); offset += 4) {
          const val = buf.readFloatBE(offset);
          if (val > 0.01 && val < 1000000) {
            client.emit("tick", {
              exchange: key.split("|")[0] || "NSE",
              token: key,
              key,
              ltp: Math.round(val * 100) / 100,
              raw: null,
              receivedAt: new Date().toISOString(),
            });
            break;
          }
        }
      }
    }
  } catch {
    // ignore binary parsing errors
  }
}
