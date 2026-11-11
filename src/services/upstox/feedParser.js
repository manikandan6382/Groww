/**
 * Upstox Market Data Feed V3 Protocol Buffer Decoder
 * Schema-backed parser using official com.upstox.marketdatafeederv3udapi.rpc.proto.FeedResponse
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import protobuf from "protobufjs";
import { extractLtp, normalizeInstrumentKey } from "./upstoxUtils.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROTO_PATH = path.resolve(__dirname, "schema", "MarketDataFeed.proto");

let feedResponseDecoder = null;

export function getFeedResponseDecoder() {
  if (!feedResponseDecoder) {
    try {
      const root = protobuf.loadSync(PROTO_PATH);
      feedResponseDecoder = root.lookupType("com.upstox.marketdatafeederv3udapi.rpc.proto.FeedResponse");
    } catch (err) {
      console.error("[feedParser] Failed to load MarketDataFeed.proto schema:", err.message);
      throw err;
    }
  }
  return feedResponseDecoder;
}

/**
 * Decode a binary buffer into a schema-validated V3 FeedResponse object.
 * Returns null if buffer is empty or invalid without throwing.
 */
export function decodeV3ProtobufBuffer(raw) {
  if (!raw) return null;
  const buf = Buffer.isBuffer(raw) ? raw : (raw instanceof Uint8Array ? Buffer.from(raw) : null);
  if (!buf || buf.length < 2) return null;

  try {
    const decoder = getFeedResponseDecoder();
    const message = decoder.decode(buf);
    const obj = decoder.toObject(message, {
      longs: Number,
      enums: String,
      bytes: String,
      defaults: false,
    });
    if (obj.type === undefined) {
      obj.type = message.type === 1 ? "live_feed" : message.type === 2 ? "market_info" : "initial_feed";
    }
    return obj;
  } catch (err) {
    // Return null on malformed protobuf frames rather than crashing
    return null;
  }
}

/**
 * Normalise a decoded V3 Feed object into an authoritative tick structure.
 */
export function normaliseV3FeedEntry(instrumentKey, feed, currentTs = null) {
  if (!instrumentKey || !feed || typeof feed !== "object") return null;

  let ltp = 0;
  let rawLtt = null;
  let close = null;
  let open = null;
  let high = null;
  let low = null;
  let volume = 0;
  let oi = 0;
  let iv = 0;
  let greeks = null;
  let depth = null;

  // 1. LTPC Mode
  if (feed.ltpc) {
    ltp = Number(feed.ltpc.ltp || 0);
    if (feed.ltpc.ltt !== undefined && feed.ltpc.ltt !== null) {
      rawLtt = feed.ltpc.ltt;
    }
    close = Number(feed.ltpc.cp || 0) || null;
  }

  // 2. FullFeed Mode (marketFF or indexFF)
  if (feed.fullFeed) {
    const ff = feed.fullFeed;
    if (ff.marketFF) {
      const m = ff.marketFF;
      if (m.ltpc) {
        ltp = Number(m.ltpc.ltp || 0);
        if (m.ltpc.ltt !== undefined && m.ltpc.ltt !== null) {
          rawLtt = m.ltpc.ltt;
        }
        close = Number(m.ltpc.cp || 0) || null;
      }
      volume = Number(m.vtt || 0);
      oi = Number(m.oi || 0);
      iv = Number(m.iv || 0);
      if (m.optionGreeks) {
        greeks = {
          iv: Number(m.iv || m.optionGreeks.iv || 0),
          delta: Number(m.optionGreeks.delta || 0),
          theta: Number(m.optionGreeks.theta || 0),
          gamma: Number(m.optionGreeks.gamma || 0),
          vega: Number(m.optionGreeks.vega || 0),
          rho: Number(m.optionGreeks.rho || 0),
        };
      }
      if (m.marketLevel?.bidAskQuote?.length) {
        const bids = [];
        const asks = [];
        for (const q of m.marketLevel.bidAskQuote) {
          const bp = Number(q.bidP ?? q.bP ?? 0);
          const bq = Number(q.bidQ ?? q.bQ ?? 0);
          const ap = Number(q.askP ?? q.aP ?? 0);
          const aq = Number(q.askQ ?? q.aQ ?? 0);
          if (bp > 0 || bq > 0) bids.push({ quantity: bq, price: bp });
          if (ap > 0 || aq > 0) asks.push({ quantity: aq, price: ap });
        }
        depth = { bids, asks, raw: m.marketLevel.bidAskQuote };
      }
      if (m.marketOHLC?.ohlc?.length) {
        const ohlc = m.marketOHLC.ohlc[0];
        open = Number(ohlc.open || 0) || null;
        high = Number(ohlc.high || 0) || null;
        low = Number(ohlc.low || 0) || null;
      }
    } else if (ff.indexFF) {
      const idx = ff.indexFF;
      if (idx.ltpc) {
        ltp = Number(idx.ltpc.ltp || 0);
        if (idx.ltpc.ltt !== undefined && idx.ltpc.ltt !== null) {
          rawLtt = idx.ltpc.ltt;
        }
        close = Number(idx.ltpc.cp || 0) || null;
      }
      if (idx.marketOHLC?.ohlc?.length) {
        const ohlc = idx.marketOHLC.ohlc[0];
        open = Number(ohlc.open || 0) || null;
        high = Number(ohlc.high || 0) || null;
        low = Number(ohlc.low || 0) || null;
      }
    }
  }

  // 3. FirstLevelWithGreeks Mode
  if (feed.firstLevelWithGreeks) {
    const fl = feed.firstLevelWithGreeks;
    if (fl.ltpc) {
      ltp = Number(fl.ltpc.ltp || 0);
      if (fl.ltpc.ltt !== undefined && fl.ltpc.ltt !== null) {
        rawLtt = fl.ltpc.ltt;
      }
      close = Number(fl.ltpc.cp || 0) || null;
    }
    oi = Number(fl.oi || 0);
    iv = Number(fl.iv || 0);
    volume = Number(fl.vtt || 0);
    if (fl.optionGreeks) {
      greeks = {
        delta: Number(fl.optionGreeks.delta || 0),
        theta: Number(fl.optionGreeks.theta || 0),
        gamma: Number(fl.optionGreeks.gamma || 0),
        vega: Number(fl.optionGreeks.vega || 0),
        rho: Number(fl.optionGreeks.rho || 0),
      };
    }
  }

  // Strict Validation: Never accept NaN, zero, or absurd values as valid quotes
  if (!Number.isFinite(ltp) || ltp <= 0 || ltp >= 1_000_000) {
    return null;
  }

  // Parse exchange LTT strictly. DO NOT infer or fallback to currentTs or Date.now()!
  let ltt = null;
  if (rawLtt !== null && rawLtt !== undefined) {
    const numLtt = Number(rawLtt);
    if (Number.isFinite(numLtt) && numLtt > 0) {
      ltt = numLtt;
    }
  }
  const lttIso = ltt ? new Date(ltt).toISOString() : null;

  // Feed timestamp: broadcast time by Upstox feed server
  let feedTs = null;
  if (currentTs !== null && currentTs !== undefined) {
    const numFeedTs = Number(currentTs);
    if (Number.isFinite(numFeedTs) && numFeedTs > 0) {
      feedTs = numFeedTs;
    }
  }
  const feedTsIso = feedTs ? new Date(feedTs).toISOString() : null;

  // Local reception timestamp: when PORTFOLIOX received the frame
  const receivedAtMs = Date.now();
  const receivedAt = new Date(receivedAtMs).toISOString();

  const exchange = instrumentKey.split("|")[0] || "NSE";
  const roundedLtp = Math.round(ltp * 100) / 100;
  const change = close && close > 0 ? Number((roundedLtp - close).toFixed(2)) : 0;
  const changePct = close && close > 0 ? Number(((change / close) * 100).toFixed(2)) : 0;

  return {
    exchange,
    token: instrumentKey,
    key: instrumentKey,
    ltp: roundedLtp,
    ltt,
    lttIso,
    feedTs,
    feedTsIso,
    close,
    open,
    high,
    low,
    change,
    changePct,
    volume,
    oi,
    iv,
    greeks,
    depth,
    source: "WEBSOCKET_V3",
    isFresh: true,
    receivedAt,
    receivedAtMs,
  };
}

/**
 * Primary dispatch entrypoint for raw incoming WebSocket messages.
 */
export function parseRawMessage(client, raw) {
  if (!raw) return;

  // 1. Text Message (JSON errors or status messages)
  if (typeof raw === "string") {
    try {
      const json = JSON.parse(raw);
      parseJsonFeedMessage(client, json);
    } catch {
      // Ignored malformed text frame
    }
    return;
  }

  // 2. Binary Buffer Message (V3 Protobuf)
  const decoded = decodeV3ProtobufBuffer(raw);
  if (!decoded) {
    // If not valid Protobuf, do not guess binary offsets or fabricate ticks!
    return;
  }

  // Handle Market Info Messages
  if (decoded.type === "market_info" || decoded.type === 2) {
    client.emit("market_info", {
      marketInfo: decoded.marketInfo,
      currentTs: decoded.currentTs,
      receivedAt: new Date().toISOString(),
    });
    return;
  }

  // Handle Live and Initial Feeds
  if (decoded.feeds && typeof decoded.feeds === "object") {
    const currentTs = decoded.currentTs ? Number(decoded.currentTs) : null;
    for (const [instrumentKey, feed] of Object.entries(decoded.feeds)) {
      const tick = normaliseV3FeedEntry(instrumentKey, feed, currentTs);
      if (tick) {
        client.emit("tick", tick);
      }
    }
  }
}

/**
 * Handle JSON-encoded error or status frames.
 */
export function parseJsonFeedMessage(client, message) {
  if (!message || typeof message !== "object") return;

  if (message.type === "error" || message.status === "error") {
    const msg = message.message || message.error || "Upstox WS error";
    if (/token|expired|unauthorized|invalid/i.test(msg)) {
      client.emit("session_expired", { message: msg });
    }
    client.emit("error", new Error(msg));
    return;
  }
}

/**
 * REST polling fallback normaliser. Clearly tagged with source: REST_RECOVERY.
 */
export function emitTicksFromLtpData(client, data, keys) {
  if (!data || typeof data !== "object") return;
  const entries = Object.entries(data);

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
    if (Number.isFinite(ltp) && ltp > 0) {
      const rawLtt = item?.last_trade_time || item?.ltt;
      let ltt = null;
      if (rawLtt !== undefined && rawLtt !== null) {
        const numLtt = Number(rawLtt);
        if (Number.isFinite(numLtt) && numLtt > 0) {
          ltt = numLtt;
        }
      }
      const lttIso = ltt ? new Date(ltt).toISOString() : null;
      const receivedAtMs = Date.now();
      const receivedAt = new Date(receivedAtMs).toISOString();

      client.emit("tick", {
        exchange: key.split("|")[0] || "NSE",
        token: key,
        key,
        ltp: Math.round(ltp * 100) / 100,
        ltt,
        lttIso,
        feedTs: null,
        feedTsIso: null,
        close: Number(item?.close || item?.cp || 0) || null,
        source: "REST_RECOVERY",
        isFresh: false, // REST fallback is strictly recovery, not live stream!
        raw: item,
        receivedAt,
        receivedAtMs,
      });
    }
  }
}
