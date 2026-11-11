import { getDb } from "../../db/connection.js";
import { closePaperTrade, deletePaperTrade, markPaperTrade } from "../../repositories/paper-lab.repository.js";
import { getTradeById } from "../../repositories/trades.repository.js";
import { paperTradeEngine } from "../../services/paperTradeEngine.js";
import { ensurePaperEngineStarted } from "./paper-sse.js";
import { readJsonBody, sendJson } from "./route-helpers.js";
import { handlePaperPartialClose } from "./paper-partial-close.js";
import { squareOffDotnetPosition, updateStopLossDotnet } from "../../services/engine/dotnetBridge.js";

const inFlightCloses = new Set();

export async function handlePaperManageRoutes(req, res, url) {
  const syncMatch = url.pathname.match(/^\/api\/(?:paper-lab|live-alerts)\/trades\/(\d+)\/sync$/);
  if (req.method === "POST" && syncMatch) {
    const id = Number(syncMatch[1]);
    ensurePaperEngineStarted();
    await paperTradeEngine.syncTrade(id);
    paperTradeEngine.publish("trade_mutation", { action: "sync", tradeId: id });
    sendJson(res, { success: true, tradeId: id, message: `Trade ${id} subscription synced` });
    return true;
  }
  const toggleMatch = url.pathname.match(/^\/api\/(?:paper-lab|live-alerts)\/trades\/(\d+)\/toggle-mode$/);
  if (req.method === "POST" && toggleMatch) {
    return handleToggleMode(Number(toggleMatch[1]), res);
  }

  const markMatch = url.pathname.match(/^\/api\/(?:paper-lab|live-alerts)\/trades\/(\d+)\/mark$/);
  if (req.method === "POST" && markMatch) {
    const id = Number(markMatch[1]);
    const body = await readJsonBody(req);
    const result = markPaperTrade(id, body);
    if (result.trade.status !== "OPEN") paperTradeEngine.removeTrade(id);
    paperTradeEngine.publish("trade_mutation", { action: "mark", tradeId: id });
    sendJson(res, result);
    return true;
  }

  const closeMatch = url.pathname.match(/^\/api\/(?:paper-lab|live-alerts)\/trades\/(\d+)\/close$|^\/api\/trades\/(\d+)\/close$/);
  if (req.method === "POST" && closeMatch) {
    return handleCloseTrade(Number(closeMatch[1] || closeMatch[2]), req, res);
  }

  const partialCloseMatch = url.pathname.match(/^\/api\/(?:paper-lab|live-alerts)\/trades\/(\d+)\/partial-close$/);
  if (req.method === "POST" && partialCloseMatch) {
    const body = await readJsonBody(req);
    handlePaperPartialClose(Number(partialCloseMatch[1]), body, res);
    return true;
  }

  const stopLossMatch = url.pathname.match(/^\/api\/(?:paper-lab|live-alerts)\/trades\/(\d+)\/stop-loss$/);
  if (["PATCH", "POST"].includes(req.method) && stopLossMatch) {
    const id = Number(stopLossMatch[1]);
    const body = await readJsonBody(req);
    const stopLoss = Number(body.stopLoss || 0);

    let trade = null;
    try {
      trade = getTradeById(id);
    } catch (e) {}

    if (!trade) {
      sendJson(res, { error: "Trade not found." }, 404);
      return true;
    }

    if (trade.status !== "OPEN") {
      sendJson(res, { error: "Cannot modify Stop Loss on a closed trade." }, 400);
      return true;
    }

    const currentMark = Number(trade.lastMarkPrice || trade.entryPrice || 0);
    const isShort = trade.direction === "SHORT";

    // Server-Side RMS Validation:
    // In LONG, stop loss must be < current mark price!
    // In SHORT, stop loss must be > current mark price!
    if (stopLoss > 0 && currentMark > 0) {
      if (!isShort && stopLoss >= currentMark) {
        sendJson(res, { 
          error: `RMS Boundary Violation: Stop Loss (₹${stopLoss.toFixed(2)}) cannot be at or above current market price (₹${currentMark.toFixed(2)}) for LONG position.` 
        }, 422);
        return true;
      }
      if (isShort && stopLoss <= currentMark) {
        sendJson(res, { 
          error: `RMS Boundary Violation: Stop Loss (₹${stopLoss.toFixed(2)}) cannot be at or below current market price (₹${currentMark.toFixed(2)}) for SHORT position.` 
        }, 422);
        return true;
      }
    }

    const currentSl = Number(trade.stopLoss || trade.stop_loss || 0);
    const entry = Number(trade.entryPrice || 0);
    const isBeLocked = isShort ? (currentSl > 0 && currentSl <= entry) : (currentSl > 0 && currentSl >= entry);
    if (isBeLocked) {
      if (!isShort && stopLoss < currentSl) {
        sendJson(res, { 
          error: `RMS Ratchet Invariant: Risk-free position stop loss (₹${currentSl.toFixed(2)}) cannot be widened or loosened backwards to ₹${stopLoss.toFixed(2)}.` 
        }, 422);
        return true;
      }
      if (isShort && stopLoss > currentSl) {
        sendJson(res, { 
          error: `RMS Ratchet Invariant: Risk-free position stop loss (₹${currentSl.toFixed(2)}) cannot be widened or loosened backwards to ₹${stopLoss.toFixed(2)}.` 
        }, 422);
        return true;
      }
    }

    getDb().prepare("UPDATE trades SET stop_loss = ?, updated_at = datetime('now') WHERE id = ?").run(stopLoss, id);

    if (paperTradeEngine.activeTrades.has(id)) {
      paperTradeEngine.activeTrades.get(id).trade.stopLoss = stopLoss;
    }
    // Synchronize stop loss with authoritative .NET RMS in-memory position
    updateStopLossDotnet(id, stopLoss, currentMark).catch(() => {});

    const updatedTrade = getTradeById(id);
    paperTradeEngine.publish("stop_loss_updated", { tradeId: id, stopLoss, message: `Stop Loss updated to ₹${stopLoss.toFixed(2)}` });
    paperTradeEngine.publish("trade_mutation", { action: "stop_loss", tradeId: id });
    sendJson(res, { success: true, item: updatedTrade });
    return true;
  }

  const targetMatch = url.pathname.match(/^\/api\/(?:paper-lab|live-alerts)\/trades\/(\d+)\/target$/);
  if (["PATCH", "POST"].includes(req.method) && targetMatch) {
    const id = Number(targetMatch[1]);
    const body = await readJsonBody(req);
    const targetPrice = Number(body.targetPrice || body.target || 0);

    let trade = null;
    try {
      trade = getTradeById(id);
    } catch (e) {}

    if (!trade) {
      sendJson(res, { error: "Trade not found." }, 404);
      return true;
    }

    if (trade.status !== "OPEN") {
      sendJson(res, { error: "Cannot modify Target on a closed trade." }, 400);
      return true;
    }

    const currentMark = Number(trade.lastMarkPrice || trade.entryPrice || 0);
    const isShort = trade.direction === "SHORT";

    // Server-Side RMS Validation for Target:
    // In LONG, target must be > current mark price!
    // In SHORT, target must be < current mark price!
    if (targetPrice > 0 && currentMark > 0) {
      if (!isShort && targetPrice <= currentMark) {
        sendJson(res, { 
          error: `RMS Boundary Violation: Target (₹${targetPrice.toFixed(2)}) cannot be at or below current market price (₹${currentMark.toFixed(2)}) for LONG position.` 
        }, 422);
        return true;
      }
      if (isShort && targetPrice >= currentMark) {
        sendJson(res, { 
          error: `RMS Boundary Violation: Target (₹${targetPrice.toFixed(2)}) cannot be at or above current market price (₹${currentMark.toFixed(2)}) for SHORT position.` 
        }, 422);
        return true;
      }
    }

    getDb().prepare("UPDATE trades SET target_price = ?, updated_at = datetime('now') WHERE id = ?").run(targetPrice, id);
    if (paperTradeEngine.activeTrades.has(id)) {
      paperTradeEngine.activeTrades.get(id).trade.targetPrice = targetPrice;
    }
    const updatedTrade = getTradeById(id);
    paperTradeEngine.publish("target_updated", { tradeId: id, targetPrice, message: `Target updated to ₹${targetPrice.toFixed(2)}` });
    sendJson(res, { success: true, item: updatedTrade });
    return true;
  }

  if ((req.method === "POST" || req.method === "DELETE") && ["/api/paper-lab/trades/clear-settled", "/api/live-alerts/trades/clear-settled"].includes(url.pathname)) {
    const db = getDb();
    db.exec("PRAGMA foreign_keys = ON;");
    db.exec("BEGIN;");
    try {
      db.prepare("DELETE FROM trade_executions WHERE trade_id IN (SELECT id FROM trades WHERE status = 'CLOSED')").run();
      db.prepare("DELETE FROM trade_journal WHERE trade_id IN (SELECT id FROM trades WHERE status = 'CLOSED')").run();
      db.prepare("DELETE FROM trade_strategy_tags WHERE trade_id IN (SELECT id FROM trades WHERE status = 'CLOSED')").run();
      db.prepare("DELETE FROM trade_mistake_tags WHERE trade_id IN (SELECT id FROM trades WHERE status = 'CLOSED')").run();
      db.prepare("DELETE FROM trade_attachments WHERE trade_id IN (SELECT id FROM trades WHERE status = 'CLOSED')").run();
      const info = db.prepare("DELETE FROM trades WHERE status = 'CLOSED'").run();
      db.exec("COMMIT;");
      sendJson(res, { success: true, count: info.changes });
    } catch (err) {
      db.exec("ROLLBACK;");
      sendJson(res, { success: false, error: err.message }, 500);
    }
    return true;
  }

  const postDeleteMatch = url.pathname.match(/^\/api\/(?:paper-lab|live-alerts)\/trades\/(\d+)\/delete$/);
  const deleteMatch = url.pathname.match(/^\/api\/(?:paper-lab|live-alerts)\/trades\/(\d+)$/);
  if ((req.method === "POST" && postDeleteMatch) || (req.method === "DELETE" && deleteMatch)) {
    const id = Number(postDeleteMatch ? postDeleteMatch[1] : deleteMatch[1]);
    const result = deletePaperTrade(id);
    paperTradeEngine.removeTrade(id);
    sendJson(res, result);
    return true;
  }

  const getMatch = url.pathname.match(/^\/api\/(?:paper-lab|live-alerts)\/trades\/(\d+)$/);
  if (req.method === "GET" && getMatch) {
    const id = Number(getMatch[1]);
    try {
      const trade = getTradeById(id);
      sendJson(res, { success: true, trade, item: trade });
    } catch {
      sendJson(res, { success: false, error: "Trade not found" }, 404);
    }
    return true;
  }

  return false;
}

async function handleToggleMode(id, res) {
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

  getDb().prepare("INSERT INTO trade_journal (trade_id, personal_notes, updated_at) VALUES (?, ?, datetime('now')) ON CONFLICT(trade_id) DO UPDATE SET personal_notes = excluded.personal_notes, updated_at = datetime('now')").run(id, updatedNotes);
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

async function handleCloseTrade(targetId, req, res) {
  if (inFlightCloses.has(targetId)) {
    sendJson(res, { error: "Square-off order execution already in-flight." }, 409);
    return true;
  }
  inFlightCloses.add(targetId);
  const body = await readJsonBody(req);
  try {
    let trade = null;
    try {
      trade = getTradeById(targetId);
    } catch (err) {
      if (targetId > 1000000000000) {
        const candidate = getDb().prepare("SELECT id FROM trades WHERE trade_mode = 'PAPER' AND status = 'OPEN' ORDER BY id DESC LIMIT 1").get();
        if (candidate?.id) {
          targetId = candidate.id;
          trade = getTradeById(targetId);
        }
      }
      if (!trade) throw err;
    }
    if (trade?.status === "CLOSED") {
      sendJson(res, { success: true, trade, message: "Position already settled." });
      return true;
    }
    const result = closePaperTrade(targetId, body);
    paperTradeEngine.removeTrade(targetId);
    paperTradeEngine.publish("trade_mutation", { action: "close", tradeId: targetId });

    // Sync with .NET RMS if this trade was registered in .NET
    const dotnetMatch = (trade.personalNotes || trade.personal_notes || "").match(/\[DOTNET_HFT:[^:]+:([^\]]+)\]/);
    if (dotnetMatch?.[1]) {
      squareOffDotnetPosition(dotnetMatch[1]).catch(() => {});
    }

    sendJson(res, result);
  } catch (err) {
    sendJson(res, { error: err.message }, err.status || 500);
  } finally {
    inFlightCloses.delete(targetId);
  }
  return true;
}
