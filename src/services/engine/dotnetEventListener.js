import http from "node:http";
import { getDb } from "../../db/connection.js";
import { closePaperTrade } from "../../repositories/paper-lab.repository.js";
import { paperTradeEngine } from "../paperTradeEngine.js";

const DOTNET_SSE_URL = process.env.DOTNET_SSE_URL || "http://127.0.0.1:5001/api/live-alerts/live-events";
let sseReq = null;
let reconnectTimer = null;
let isStarted = false;

let lastProcessedEventId = 0;

function parseSseChunk(chunkStr) {
  const lines = chunkStr.split("\n");
  let eventType = "message";
  let dataStr = "";
  let eventId = null;
  for (const line of lines) {
    if (line.startsWith("id:")) {
      const idNum = Number(line.slice(3).trim());
      if (Number.isFinite(idNum)) eventId = idNum;
    } else if (line.startsWith("event:")) {
      eventType = line.slice(6).trim();
    } else if (line.startsWith("data:")) {
      dataStr = line.slice(5).trim();
    }
  }
  return { eventId, eventType, dataStr };
}

function handleDotnetEvent(eventId, eventType, rawData) {
  if (eventId && eventId > lastProcessedEventId) {
    lastProcessedEventId = eventId;
  }
  if (!rawData || !["stop_loss_hit", "target_hit", "trade_mutation"].includes(eventType)) return;
  let parsed = null;
  try {
    parsed = JSON.parse(rawData);
  } catch {
    return;
  }

  const { tradeId, symbol, ltp, reason } = parsed;
  try {
    const db = getDb();
    // Search open paper trades by positionId in notes, or by matching symbol
    let trade = null;
    if (tradeId) {
      trade = db.prepare(`
        SELECT t.*, t.instrument_id AS symbol, j.personal_notes AS personalNotes
        FROM trades t
        LEFT JOIN trade_journal j ON t.id = j.trade_id
        WHERE t.trade_mode = 'PAPER' AND t.status = 'OPEN' AND j.personal_notes LIKE ?
        LIMIT 1
      `).get(`%${tradeId}%`);
    }
    if (!trade && symbol) {
      trade = db.prepare(`
        SELECT t.*, t.instrument_id AS symbol, j.personal_notes AS personalNotes
        FROM trades t
        LEFT JOIN trade_journal j ON t.id = j.trade_id
        WHERE t.trade_mode = 'PAPER' AND t.status = 'OPEN' AND (t.instrument_id = ? OR j.personal_notes LIKE ?)
        ORDER BY t.id DESC LIMIT 1
      `).get(symbol, `%${symbol}%`);
    }

    if (trade) {
      const exitPrice = Number(ltp || trade.last_mark_price || trade.entry_price);
      const closeReason = reason || (eventType === "target_hit" ? "TARGET_HIT" : "STOP_LOSS_HIT");
      closePaperTrade(trade.id, { price: exitPrice, reason: closeReason });
      paperTradeEngine.removeTrade(trade.id);
      paperTradeEngine.publish("trade_mutation", {
        action: "close",
        tradeId: trade.id,
        reason: closeReason,
        price: exitPrice,
        source: ".NET 8 HFT RMS",
      });
      console.log(`⚡ [.NET Bridge] Position #${trade.id} (${symbol}) closed via .NET RMS (${closeReason} @ ₹${exitPrice})`);
    }
  } catch (err) {
    console.warn(`⚠️ [.NET Bridge] Failed to process ${eventType}:`, err.message);
  }
}

export function startDotnetEventListener() {
  if (isStarted) return;
  isStarted = true;

  function connect() {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    try {
      const url = new URL(DOTNET_SSE_URL);
      if (lastProcessedEventId > 0) {
        url.searchParams.set("afterId", String(lastProcessedEventId));
      }
      sseReq = http.get(url, { headers: { Accept: "text/event-stream" } }, (res) => {
        if (res.statusCode !== 200) {
          scheduleReconnect(5000);
          return;
        }

        let buffer = "";
        res.on("data", (chunk) => {
          buffer += chunk.toString();
          const parts = buffer.split("\n\n");
          buffer = parts.pop() || "";
          for (const part of parts) {
            if (!part.trim()) continue;
            const { eventId, eventType, dataStr } = parseSseChunk(part);
            handleDotnetEvent(eventId, eventType, dataStr);
          }
        });

        res.on("end", () => scheduleReconnect(2000));
        res.on("error", () => scheduleReconnect(5000));
      });

      sseReq.on("error", () => scheduleReconnect(5000));
    } catch {
      scheduleReconnect(5000);
    }
  }

  function scheduleReconnect(delayMs) {
    if (sseReq) {
      try { sseReq.destroy(); } catch {}
      sseReq = null;
    }
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(connect, delayMs);
  }

  connect();
}
