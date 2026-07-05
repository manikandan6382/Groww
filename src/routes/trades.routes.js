import fs from "node:fs";
import path from "node:path";
import { getProjectRoot } from "../db/connection.js";
import { buildReviewReports, buildTradeAnalytics } from "../services/analytics/performance-engine.js";
import { getRangeWindow, rangeLabel } from "../services/trading/trade-calculator.js";
import { closePaperTrade, createPaperTrade, deletePaperTrade, getPaperLab, markPaperTrade } from "../repositories/paper-lab.repository.js";
import { createTrade, getTradingBootstrap, listTrades } from "../repositories/trades.repository.js";
import { paperTradeEngine } from "../services/paperTradeEngine.js";

const evidenceRoot = path.join(getProjectRoot(), "data", "uploads", "trades");

export async function handleTradingRequest(req, res, url) {
  if (req.method === "GET" && url.pathname === "/api/trading/bootstrap") {
    sendJson(res, getTradingBootstrap());
    return true;
  }

  if (req.method === "GET" && ["/api/paper-lab", "/api/live-alerts"].includes(url.pathname)) {
    sendJson(res, getPaperLab({
      range: getRange(url),
      from: url.searchParams.get("from"),
      to: url.searchParams.get("to"),
    }));
    return true;
  }

  if (req.method === "GET" && ["/api/paper-lab/live-status", "/api/live-alerts/live-status"].includes(url.pathname)) {
    sendJson(res, paperTradeEngine.getStatus());
    return true;
  }

  if (req.method === "GET" && ["/api/paper-lab/live-events", "/api/live-alerts/live-events"].includes(url.pathname)) {
    streamPaperEvents(req, res, url);
    return true;
  }

  if (req.method === "POST" && ["/api/paper-lab/trades", "/api/live-alerts/trades"].includes(url.pathname)) {
    const body = await readJsonBody(req);
    const trade = createPaperTrade(body);
    paperTradeEngine.syncTrade(trade.id);
    sendJson(res, { item: trade }, 201);
    return true;
  }

  const paperMarkMatch = url.pathname.match(/^\/api\/(?:paper-lab|live-alerts)\/trades\/(\d+)\/mark$/);
  if (req.method === "POST" && paperMarkMatch) {
    const body = await readJsonBody(req);
    const result = markPaperTrade(Number(paperMarkMatch[1]), body);
    if (result.trade.status !== "OPEN") paperTradeEngine.removeTrade(Number(paperMarkMatch[1]));
    sendJson(res, result);
    return true;
  }

  const paperCloseMatch = url.pathname.match(/^\/api\/(?:paper-lab|live-alerts)\/trades\/(\d+)\/close$/);
  if (req.method === "POST" && paperCloseMatch) {
    const body = await readJsonBody(req);
    const result = closePaperTrade(Number(paperCloseMatch[1]), body);
    paperTradeEngine.removeTrade(Number(paperCloseMatch[1]));
    sendJson(res, result);
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
