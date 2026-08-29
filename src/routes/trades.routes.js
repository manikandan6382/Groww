import fs from "node:fs";
import path from "node:path";
import { getDb, getProjectRoot } from "../db/connection.js";
import { buildReviewReports, buildTradeAnalytics } from "../services/analytics/performance-engine.js";
import { getRangeWindow, rangeLabel } from "../services/trading/trade-calculator.js";
import { closePaperTrade, createPaperTrade, deletePaperTrade, getPaperLab, markPaperTrade } from "../repositories/paper-lab.repository.js";
import { createTrade, getTradeById, getTradingBootstrap, listTrades } from "../repositories/trades.repository.js";
import { paperTradeEngine } from "../services/paperTradeEngine.js";
import { computeGexProfile } from "../services/greeksEngine.js";

const evidenceRoot = path.join(getProjectRoot(), "data", "uploads", "trades");

export async function handleTradingRequest(req, res, url) {
  if (req.method === "GET" && url.pathname === "/api/trading/bootstrap") {
    sendJson(res, getTradingBootstrap());
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/market/gex-profile") {
    const symbol = (url.searchParams.get("symbol") || "NIFTY").toUpperCase();
    const spot = Number(url.searchParams.get("spot") || (symbol === "BANKNIFTY" ? 52000 : 24500));
    const dte = Number(url.searchParams.get("dte") || 1);
    const profile = computeGexProfile(symbol, spot, [], dte);
    sendJson(res, profile);
    return true;
  }

  if (req.method === "GET" && ["/api/paper-lab", "/api/live-alerts"].includes(url.pathname)) {
    ensurePaperEngineStarted();
    sendJson(res, getPaperLab({
      range: getRange(url),
      from: url.searchParams.get("from"),
      to: url.searchParams.get("to"),
    }));
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/upstox/token-status") {
    ensurePaperEngineStarted();
    const client = paperTradeEngine.client;
    client.refreshAccessToken();
    const token = client.accessToken || "";
    let sessionAgeMinutes = null;
    let fileExists = false;
    try {
      if (fs.existsSync(client.sessionFile)) {
        fileExists = true;
        const stat = fs.statSync(client.sessionFile);
        sessionAgeMinutes = Math.round((Date.now() - stat.mtimeMs) / 60000);
      }
    } catch { /* ignore */ }

    const isPreMarketReady = Boolean(token && token.length > 20);
    sendJson(res, {
      configured: client.isConfigured(),
      hasToken: Boolean(token),
      tokenLength: token.length,
      sessionFile: path.basename(client.sessionFile),
      sessionFileExists: fileExists,
      sessionAgeMinutes,
      isPreMarketReady,
      websocketConnected: client.connected,
      polling: Boolean(client.pollTimer),
      lastError: client.lastError,
      status: isPreMarketReady ? "Token Active · Feed Ready" : "Token Required · OAuth Expired",
    });
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/upstox/set-token") {
    const body = await readJsonBody(req);
    const token = String(body.accessToken || body.token || "").trim();
    if (!token) {
      sendJson(res, { error: "accessToken is required" }, 422);
      return true;
    }
    const client = paperTradeEngine.client;
    try {
      fs.mkdirSync(path.dirname(client.sessionFile), { recursive: true });
      fs.writeFileSync(client.sessionFile, JSON.stringify({
        access_token: token,
        updated_at: new Date().toISOString(),
      }, null, 2));
      client.refreshAccessToken();
      client.lastError = "";
      if (paperTradeEngine.started) {
        client.start();
      }
      sendJson(res, { success: true, message: "Upstox token saved and client reloaded successfully." });
    } catch (error) {
      sendJson(res, { error: `Failed to save session: ${error.message}` }, 500);
    }
    return true;
  }

  if (req.method === "GET" && ["/api/paper-lab/live-status", "/api/live-alerts/live-status"].includes(url.pathname)) {
    ensurePaperEngineStarted();
    sendJson(res, paperTradeEngine.getStatus());
    return true;
  }

  if (req.method === "GET" && ["/api/paper-lab/live-events", "/api/live-alerts/live-events"].includes(url.pathname)) {
    ensurePaperEngineStarted();
    streamPaperEvents(req, res, url);
    return true;
  }

  if (req.method === "POST" && ["/api/paper-lab/trades", "/api/live-alerts/trades"].includes(url.pathname)) {
    const body = await readJsonBody(req);
    const feedMode = String(body.feedMode || (body.isManual ? "MANUAL" : "LIVE")).toUpperCase();
    const isManual = feedMode === "MANUAL";
    const modeTag = isManual ? "[MANUAL_ONLY]" : "[LIVE_FEED]";
    const cleanNotes = (body.personalNotes || "").replace(/\[(?:SANDBOX_MANUAL|MANUAL_ONLY|LIVE_FEED)\]/g, "").trim();
    
    const payload = {
      ...body,
      feedMode,
      personalNotes: `${modeTag} ${cleanNotes || (isManual ? "Manual Simulator Trade" : "Live Upstox Practice Trade")}`.trim()
    };
    
    const trade = createPaperTrade(payload);
    ensurePaperEngineStarted();
    
    if (!isManual) {
      await paperTradeEngine.syncTrade(trade.id);
    }
    
    paperTradeEngine.publish("trade_mutation", { action: "create", tradeId: trade.id, feedMode });
    sendJson(res, { item: trade, feedMode, isManual }, 201);
    return true;
  }

  const paperToggleModeMatch = url.pathname.match(/^\/api\/(?:paper-lab|live-alerts)\/trades\/(\d+)\/toggle-mode$/);
  if (req.method === "POST" && paperToggleModeMatch) {
    const id = Number(paperToggleModeMatch[1]);
    const trade = getTradeById(id);
    if (!trade) {
      sendJson(res, { error: "Trade not found" }, 404);
      return true;
    }
    const currentNotes = trade.personalNotes || "";
    const isCurrentlyManual = currentNotes.includes("[MANUAL_ONLY]");
    const newMode = isCurrentlyManual ? "LIVE" : "MANUAL";
    const newTag = isCurrentlyManual ? "[LIVE_FEED]" : "[MANUAL_ONLY]";
    const updatedNotes = `${newTag} ${currentNotes.replace(/\[(?:SANDBOX_MANUAL|MANUAL_ONLY|LIVE_FEED)\]/g, "").trim()}`.trim();
    
    const db = getDb();
    db.prepare("INSERT INTO trade_journal (trade_id, personal_notes, updated_at) VALUES (?, ?, datetime('now')) ON CONFLICT(trade_id) DO UPDATE SET personal_notes = excluded.personal_notes, updated_at = datetime('now')").run(id, updatedNotes);
    trade.personalNotes = updatedNotes;
    trade.feedMode = newMode;
    
    ensurePaperEngineStarted();
    if (newMode === "LIVE") {
      await paperTradeEngine.ensureTradeSubscription(trade, { force: true });
    } else {
      paperTradeEngine.removeTrade(id);
    }
    
    paperTradeEngine.publish("trade_mutation", { action: "toggle_mode", tradeId: id, feedMode: newMode });
    sendJson(res, { success: true, id, feedMode: newMode, message: `Switched to ${newMode === "LIVE" ? "🟢 Live Upstox Stream" : "🎮 Manual Simulator"}` });
    return true;
  }

  if (req.method === "POST" && ["/api/paper-lab/auto-deploy", "/api/live-alerts/auto-deploy"].includes(url.pathname)) {
    try {
      const token = paperTradeEngine.client.accessToken;
      let spotPrice = 24151.10;
      let optionLtp = 100.00;
      let symbol = "NIFTY";
      let strike = 24200;
      let optionType = "PUT";
      let tokenKey = "NSE_FO|46994";

      // Query live Upstox quote if token is configured
      if (token) {
        try {
          const quoteRes = await fetch("https://api.upstox.com/v2/market-quote/quotes?instrument_key=NSE_INDEX|Nifty 50,NSE_FO|46993,NSE_FO|46994", {
            headers: { "Accept": "application/json", "Authorization": `Bearer ${token}` }
          });
          const qData = await quoteRes.json();
          const spotData = qData?.data?.["NSE_INDEX:Nifty 50"];
          const peData = qData?.data?.["NSE_FO:NIFTY2690124200PE"];
          const ceData = qData?.data?.["NSE_FO:NIFTY2690124200CE"];
          
          if (spotData?.last_price) spotPrice = Number(spotData.last_price);
          const netChange = Number(spotData?.net_change || 0);

          if (netChange >= 0 && ceData?.last_price) {
            optionType = "CALL";
            optionLtp = Number(ceData.last_price);
            tokenKey = "NSE_FO|46993";
          } else if (peData?.last_price) {
            optionType = "PUT";
            optionLtp = Number(peData.last_price);
            tokenKey = "NSE_FO|46994";
          }
        } catch (e) {
          console.warn("Upstox quote fetch fallback:", e.message);
        }
      }

      const entryPrice = Math.round(optionLtp * 20) / 20;
      const stopLoss = Math.round((entryPrice - 4.50) * 20) / 20;
      const targetPrice = Math.round((entryPrice + 15.00) * 20) / 20;

      const trade = createPaperTrade({
        underlyingSymbol: symbol,
        strikePrice: strike,
        optionType: optionType,
        currentPrice: entryPrice,
        entryPrice: entryPrice,
        stopLoss: stopLoss,
        targetPrice: targetPrice,
        quantity: 1,
        lotSize: 65,
        personalNotes: `UPSTOX_TOKEN:${tokenKey} Live AI Copilot Automated Market Signal`
      });

      ensurePaperEngineStarted();
      await paperTradeEngine.syncTrade(trade.id);
      paperTradeEngine.publish("trade_mutation", { action: "create", tradeId: trade.id });
      sendJson(res, { success: true, item: trade, message: `Live ${optionType} alert deployed at ₹${entryPrice.toFixed(2)}` }, 201);
      return true;
    } catch (err) {
      sendJson(res, { success: false, error: err.message }, 500);
      return true;
    }
  }

  const paperMarkMatch = url.pathname.match(/^\/api\/(?:paper-lab|live-alerts)\/trades\/(\d+)\/mark$/);
  if (req.method === "POST" && paperMarkMatch) {
    const body = await readJsonBody(req);
    const result = markPaperTrade(Number(paperMarkMatch[1]), body);
    if (result.trade.status !== "OPEN") paperTradeEngine.removeTrade(Number(paperMarkMatch[1]));
    paperTradeEngine.publish("trade_mutation", { action: "mark", tradeId: Number(paperMarkMatch[1]) });
    sendJson(res, result);
    return true;
  }

  if (req.method === "POST" && ["/api/paper-lab/square-off-all", "/api/live-alerts/square-off-all"].includes(url.pathname)) {
    const db = getDb();
    const openTrades = db.prepare("SELECT * FROM trades WHERE trade_mode = 'PAPER' AND status = 'OPEN'").all();
    const closedResults = [];
    for (const trade of openTrades) {
      try {
        const markPrice = Number(trade.last_mark_price || trade.entry_price);
        const result = closePaperTrade(trade.id, { price: markPrice, reason: "MANUAL_EXIT" });
        paperTradeEngine.removeTrade(trade.id);
        closedResults.push(result);
      } catch (err) {
        console.warn(`Failed to close trade ${trade.id}:`, err.message);
      }
    }
    paperTradeEngine.publish("trade_mutation", { action: "square_off_all", count: closedResults.length });
    sendJson(res, { success: true, count: closedResults.length, items: closedResults });
    return true;
  }

  const paperCloseMatch = url.pathname.match(/^\/api\/(?:paper-lab|live-alerts)\/trades\/(\d+)\/close$/);
  if (req.method === "POST" && paperCloseMatch) {
    const body = await readJsonBody(req);
    const result = closePaperTrade(Number(paperCloseMatch[1]), body);
    paperTradeEngine.removeTrade(Number(paperCloseMatch[1]));
    paperTradeEngine.publish("trade_mutation", { action: "close", tradeId: Number(paperCloseMatch[1]) });
    sendJson(res, result);
    return true;
  }

  const paperStopLossMatch = url.pathname.match(/^\/api\/(?:paper-lab|live-alerts)\/trades\/(\d+)\/stop-loss$/);
  if (["PATCH", "POST"].includes(req.method) && paperStopLossMatch) {
    const id = Number(paperStopLossMatch[1]);
    const body = await readJsonBody(req);
    const stopLoss = Number(body.stopLoss || 0);
    const db = getDb();
    db.prepare("UPDATE trades SET stop_loss = ?, updated_at = datetime('now') WHERE id = ?").run(stopLoss, id);
    const trade = getTradeById(id);
    if (trade && paperTradeEngine.activeTrades.has(id)) {
      paperTradeEngine.activeTrades.get(id).trade.stopLoss = stopLoss;
    }
    paperTradeEngine.publish("stop_loss_updated", {
      tradeId: id,
      stopLoss,
      message: `Stop Loss updated to ₹${stopLoss.toFixed(2)}`,
    });
    paperTradeEngine.publish("trade_mutation", { action: "stop_loss", tradeId: id });
    sendJson(res, { success: true, item: trade });
    return true;
  }

  const paperTargetMatch = url.pathname.match(/^\/api\/(?:paper-lab|live-alerts)\/trades\/(\d+)\/target$/);
  if (["PATCH", "POST"].includes(req.method) && paperTargetMatch) {
    const id = Number(paperTargetMatch[1]);
    const body = await readJsonBody(req);
    const targetPrice = Number(body.targetPrice || body.target || 0);
    const db = getDb();
    db.prepare("UPDATE trades SET target_price = ?, updated_at = datetime('now') WHERE id = ?").run(targetPrice, id);
    const trade = getTradeById(id);
    if (trade && paperTradeEngine.activeTrades.has(id)) {
      paperTradeEngine.activeTrades.get(id).trade.targetPrice = targetPrice;
    }
    paperTradeEngine.publish("target_updated", {
      tradeId: id,
      targetPrice,
      message: `Target updated to ₹${targetPrice.toFixed(2)}`,
    });
    sendJson(res, { success: true, item: trade });
    return true;
  }

  const paperPostDeleteMatch = url.pathname.match(/^\/api\/(?:paper-lab|live-alerts)\/trades\/(\d+)\/delete$/);
  if (req.method === "POST" && paperPostDeleteMatch) {
    const id = Number(paperPostDeleteMatch[1]);
    const result = deletePaperTrade(id);
    paperTradeEngine.removeTrade(id);
    sendJson(res, result);
    return true;
  }

  const paperDeleteMatch = url.pathname.match(/^\/api\/(?:paper-lab|live-alerts)\/trades\/(\d+)$/);
  if (req.method === "DELETE" && paperDeleteMatch) {
    const id = Number(paperDeleteMatch[1]);
    const result = deletePaperTrade(id);
    paperTradeEngine.removeTrade(id);
    sendJson(res, result);
    return true;
  }

  const journalDeleteMatch = url.pathname.match(/^\/api\/trades\/(\d+)(?:\/delete)?$/);
  if (["DELETE", "POST"].includes(req.method) && journalDeleteMatch) {
    const id = Number(journalDeleteMatch[1]);
    const db = getDb();
    db.exec("PRAGMA foreign_keys = ON;");
    db.exec("BEGIN;");
    try {
      db.prepare("DELETE FROM trade_executions WHERE trade_id = ?").run(id);
      db.prepare("DELETE FROM trade_journal WHERE trade_id = ?").run(id);
      db.prepare("DELETE FROM trade_strategy_tags WHERE trade_id = ?").run(id);
      db.prepare("DELETE FROM trade_mistake_tags WHERE trade_id = ?").run(id);
      db.prepare("DELETE FROM trade_attachments WHERE trade_id = ?").run(id);
      db.prepare("DELETE FROM trades WHERE id = ?").run(id);
      db.exec("COMMIT;");
    } catch (e) {
      db.exec("ROLLBACK;");
      throw e;
    }
    paperTradeEngine.removeTrade(id);
    paperTradeEngine.publish("trade_mutation", { action: "delete", tradeId: id });
    sendJson(res, { success: true, deleted: true, id });
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/trades") {
    sendJson(res, { items: getTradesForUrl(url) });
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/trades") {
    const body = await readJsonBody(req);
    const trade = createTrade(body);
    sendJson(res, { item: trade }, 201);
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/trading/analytics") {
    const range = getRange(url);
    const trades = getTradesForUrl(url);
    sendJson(res, {
      range,
      label: rangeLabel(range),
      analytics: buildTradeAnalytics(trades),
    });
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/trading/reviews") {
    const range = getRange(url);
    const trades = getTradesForUrl(url);
    const analytics = buildTradeAnalytics(trades);
    sendJson(res, {
      range,
      label: rangeLabel(range),
      reports: buildReviewReports(trades, analytics, rangeLabel(range)),
    });
    return true;
  }

  if (req.method === "GET" && url.pathname.startsWith("/evidence/trades/")) {
    serveEvidence(url.pathname, res);
    return true;
  }

  return false;
}

function ensurePaperEngineStarted() {
  paperTradeEngine.start();
}

function streamPaperEvents(req, res, url) {
  const afterId = Number(url.searchParams.get("after") || 0);
  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-store, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.write(": connected\n\n");

  for (const event of paperTradeEngine.getRecentEvents(afterId)) {
    writeSse(res, event);
  }

  const onEvent = (event) => writeSse(res, event);
  const heartbeat = setInterval(() => {
    res.write(`: heartbeat ${Date.now()}\n\n`);
  }, 25_000);

  paperTradeEngine.on("event", onEvent);
  req.on("close", () => {
    clearInterval(heartbeat);
    paperTradeEngine.off("event", onEvent);
  });
}

function writeSse(res, event) {
  res.write(`id: ${event.id}\n`);
  res.write(`event: ${event.type}\n`);
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

function getTradesForUrl(url) {
  const range = getRange(url);
  const { start, end } = getRangeWindow(range, url.searchParams.get("from"), url.searchParams.get("to"));
  return listTrades({ start, end });
}

function getRange(url) {
  return url.searchParams.get("range") || "all";
}

function serveEvidence(pathname, res) {
  const name = path.basename(decodeURIComponent(pathname));
  const filePath = path.resolve(evidenceRoot, name);
  if (!filePath.startsWith(evidenceRoot) || !fs.existsSync(filePath)) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const type = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
  res.writeHead(200, { "Content-Type": type, "Cache-Control": "no-store" });
  fs.createReadStream(filePath).pipe(res);
}

async function readJsonBody(req) {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 18 * 1024 * 1024) {
      const error = new Error("Trade payload is too large. Keep screenshots below 4 MB each.");
      error.status = 413;
      throw error;
    }
  }

  if (!body.trim()) return {};
  try {
    return JSON.parse(body);
  } catch {
    const error = new Error("Invalid JSON payload.");
    error.status = 400;
    throw error;
  }
}

function sendJson(res, data, status = 200) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}