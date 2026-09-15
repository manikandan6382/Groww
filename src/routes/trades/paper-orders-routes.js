import { getDb } from "../../db/connection.js";
import { closePaperTrade, createPaperTrade, getPaperLab } from "../../repositories/paper-lab.repository.js";
import { paperTradeEngine } from "../../services/paperTradeEngine.js";
import { ensurePaperEngineStarted, streamPaperEvents } from "./paper-sse.js";
import { getRange, readJsonBody, sendJson } from "./route-helpers.js";
import { handleAutoDeploy } from "./paper-auto-deploy.js";
import { deployOrderToDotnet, squareOffAllDotnet } from "../../services/engine/dotnetBridge.js";

export async function handlePaperOrdersRoutes(req, res, url) {
  if (req.method === "GET" && ["/api/paper-lab", "/api/live-alerts"].includes(url.pathname)) {
    ensurePaperEngineStarted();
    sendJson(res, getPaperLab({
      range: getRange(url),
      from: url.searchParams.get("from"),
      to: url.searchParams.get("to"),
    }));
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
    const entryPrice = Number(body.entryPrice);
    const targetPrice = Number(body.targetPrice);
    const stopLoss = Number(body.stopLoss);
    const quantity = Number(body.quantity || 1);
    const direction = String(body.direction || "LONG").toUpperCase();

    if (!body.symbol || typeof body.symbol !== "string") {
      sendJson(res, { error: "Missing or invalid symbol." }, 422);
      return true;
    }
    if (!Number.isFinite(entryPrice) || entryPrice <= 0) {
      sendJson(res, { error: "Entry price must be a positive number." }, 422);
      return true;
    }
    if (!Number.isFinite(quantity) || quantity < 1) {
      sendJson(res, { error: "Quantity must be at least 1 lot." }, 422);
      return true;
    }
    if (direction === "LONG") {
      if (Number.isFinite(stopLoss) && stopLoss > 0 && stopLoss >= entryPrice) {
        sendJson(res, { error: "For LONG trades, stop loss must be lower than entry price." }, 422);
        return true;
      }
      if (Number.isFinite(targetPrice) && targetPrice > 0 && targetPrice <= entryPrice) {
        sendJson(res, { error: "For LONG trades, target price must be higher than entry price." }, 422);
        return true;
      }
    } else if (direction === "SHORT") {
      if (Number.isFinite(stopLoss) && stopLoss > 0 && stopLoss <= entryPrice) {
        sendJson(res, { error: "For SHORT trades, stop loss must be higher than entry price." }, 422);
        return true;
      }
      if (Number.isFinite(targetPrice) && targetPrice > 0 && targetPrice >= entryPrice) {
        sendJson(res, { error: "For SHORT trades, target price must be lower than entry price." }, 422);
        return true;
      }
    }

    const feedMode = String(body.feedMode || (body.isManual ? "MANUAL" : "LIVE")).toUpperCase();
    const isManual = feedMode === "MANUAL";
    const modeTag = isManual ? "[MANUAL_ONLY]" : "[LIVE_FEED]";
    const cleanNotes = (body.personalNotes || "").replace(/\[(?:SANDBOX_MANUAL|MANUAL_ONLY|LIVE_FEED|DOTNET_HFT:[^\]]+)\]/g, "").trim();

    let dotnetMeta = "";
    let effectiveEntryPrice = entryPrice;

    if (!isManual) {
      try {
        const dotnetRes = await deployOrderToDotnet({
          symbol: body.symbol,
          instrumentKey: body.tokenKey || body.instrumentKey || "",
          direction,
          quantity,
          entryPrice,
          stopLoss,
          targetPrice,
          idempotencyKey: body.idempotencyKey,
        });
        if (dotnetRes.ok && dotnetRes.data?.success) {
          const d = dotnetRes.data;
          effectiveEntryPrice = Number(d.filledPrice || entryPrice);
          dotnetMeta = `[DOTNET_HFT:${d.orderId}:${d.positionId}]`;
        }
      } catch (err) {
        console.warn("[UnifiedExecution] .NET gateway bypassed:", err.message);
      }
    }

    const payload = {
      ...body,
      entryPrice: effectiveEntryPrice,
      feedMode,
      personalNotes: `${modeTag} ${dotnetMeta} ${cleanNotes || (isManual ? "Manual Simulator Trade" : "Live Upstox Practice Trade")}`.trim()
    };

    const trade = createPaperTrade(payload);
    ensurePaperEngineStarted();

    let tokenKey = null;
    if (!isManual) {
      await paperTradeEngine.syncTrade(trade.id);
      tokenKey = paperTradeEngine.activeTrades.get(trade.id)?.tokenKey || null;
    }

    paperTradeEngine.publish("trade_mutation", { action: "create", tradeId: trade.id, feedMode });
    sendJson(res, { item: { ...trade, tokenKey }, feedMode, isManual }, 201);
    return true;
  }

  if (req.method === "POST" && ["/api/paper-lab/auto-deploy", "/api/live-alerts/auto-deploy"].includes(url.pathname)) {
    return handleAutoDeploy(res);
  }

  if (req.method === "POST" && ["/api/paper-lab/square-off-all", "/api/live-alerts/square-off-all"].includes(url.pathname)) {
    squareOffAllDotnet().catch(() => {});
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

  return false;
}
