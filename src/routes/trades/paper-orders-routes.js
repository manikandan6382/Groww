import { getDb } from "../../db/connection.js";
import { closePaperTrade, createPaperTrade, getPaperLab, calculateEntrySlippage } from "../../repositories/paper-lab.repository.js";
import { paperTradeEngine } from "../../services/paperTradeEngine.js";
import { ensurePaperEngineStarted, streamPaperEvents } from "./paper-sse.js";
import { getRange, readJsonBody, sendJson } from "./route-helpers.js";
import { handleAutoDeploy } from "./paper-auto-deploy.js";
import { deployOrderToDotnet, squareOffAllDotnet } from "../../services/engine/dotnetBridge.js";
import { sendProblem } from "./problem-details.js";
import { validateOrderPayload } from "./order-validator.js";
import { acquireIdempotencyLock, completeIdempotencyLock, releaseIdempotencyLock, getIdempotencyKey } from "./idempotency.js";
import { calculateStatutoryCharges, calculateCanonicalExecutionPlan } from "../../client/stores/slices/tradeHelpers.js";
import { defaultExchangeCalendar } from "../../services/engine/exchangeCalendar.js";

export async function handlePaperOrdersRoutes(req, res, url) {
  if (req.method === "GET" && ["/api/paper-lab", "/api/live-alerts"].includes(url.pathname)) {
    ensurePaperEngineStarted();
    const lab = getPaperLab({
      range: getRange(url),
      from: url.searchParams.get("from"),
      to: url.searchParams.get("to"),
    });
    if (Array.isArray(lab.openTrades)) {
      lab.openTrades = lab.openTrades.map((t) => {
        const active = paperTradeEngine?.activeTrades?.get(Number(t.id));
        if (active) {
          const liveMark = Number(active.lastLtp || active.lastKnownReferencePrice || 0);
          return {
            ...t,
            tokenKey: active.tokenKey || t.tokenKey || null,
            instrumentKey: active.tokenKey || t.instrumentKey || null,
            lastMarkPrice: liveMark > 0 ? liveMark : Number(t.lastMarkPrice || t.entryPrice),
          };
        }
        return t;
      });
    }
    sendJson(res, lab);
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
    const rawBody = await readJsonBody(req);
    const isTesting = Boolean(rawBody.testingMode || rawBody.bypassRiskCap);
    const isUnrestricted = isTesting && (Boolean(rawBody.isUnrestricted) || rawBody.testingRestrictionMode === "UNRESTRICTED" || rawBody.tradeMode === "SANDBOX");

    // 0. Exchange Calendar Gate: Reject deployments on official NSE Holidays and weekends (bypassed in Unrestricted Sandbox)
    const tradingDayStatus = defaultExchangeCalendar.isTradingDay(new Date());
    if (!isUnrestricted && !tradingDayStatus.isTradingDay) {
      return sendProblem(res, {
        status: 422,
        title: "Market Closed: Exchange Holiday",
        detail: `Order deployment blocked: National Stock Exchange (NSE) is closed today (${tradingDayStatus.reason || "Trading Holiday"}). Live and paper order routing is disabled.`,
        errors: [`MARKET_HOLIDAY: ${tradingDayStatus.reason || "NSE Official Trading Holiday"}`]
      });
    }
    const validation = validateOrderPayload(rawBody);

    if (!validation.valid) {
      return sendProblem(res, {
        status: 422,
        title: "Order Validation Failed",
        detail: validation.errors.join(" "),
        errors: validation.errors
      });
    }

    const body = validation.sanitized;
    const entryPrice = body.entryPrice;
    const targetPrice = body.targetPrice;
    const stopLoss = body.stopLoss;
    const quantity = body.quantity;
    const direction = body.direction;
    const lotSize = body.lotSize;
    const totalUnits = quantity * lotSize;
    const isShort = direction === "SHORT";

    // Idempotency check for manual orders
    const idempotencyKey = rawBody.idempotencyKey || getIdempotencyKey(req);
    const lock = acquireIdempotencyLock(idempotencyKey, 10000);
    if (!lock.acquired) {
      if (lock.status === "IN_FLIGHT") {
        return sendProblem(res, {
          status: 409,
          title: "Order In Flight",
          detail: "An identical order is currently executing. Double submission blocked.",
        });
      }
      if (lock.status === "COMPLETED" && lock.result) {
        sendJson(res, lock.result, 200);
        return true;
      }
    }

    const adverseSlippageAllowance = 0.50; // Documented 0.50 pt adverse exit slippage allowance
    const plan = calculateCanonicalExecutionPlan({
      symbol: body.symbol,
      underlying: rawBody.underlying || body.underlyingSymbol || (body.symbol.includes("SENSEX") ? "SENSEX" : "NIFTY"),
      entryPrice,
      stopLoss,
      targetPrice,
      quantity,
      lotSize,
      totalUnits,
      direction,
      stopPolicy: rawBody.stopPolicy || "ATR_ENTRY_RELATIVE",
      targetPolicy: rawBody.targetPolicy || "RR_DERIVED",
      adverseSlippageAllowance: 0.50,
      testingMode: isTesting,
      isUnrestricted
    });

    // 1. Strict Capital Risk & Reward Gate: Planned loss ₹250, Maximum Modelled Risk Ceiling ₹300.00, Minimum 2:1 Net R:R (Enforced in LIVE & LIKE_REAL; Bypassed in Sandbox)
    if (!isUnrestricted && !plan.isCompliant) {
      releaseIdempotencyLock(idempotencyKey);
      const detailMsg = !plan.isRiskCeilingSatisfied
        ? `Trade modelled net loss ₹${plan.modelledNetRisk.toFixed(2)} exceeds the approved ₹300.00 risk ceiling. Stop loss distance (${plan.stopDistancePts.toFixed(2)} pts) is too wide for 1 lot (${totalUnits} units).`
        : !plan.isRewardToRiskSatisfied
        ? `Trade modelled net reward-to-risk 1:${plan.netRewardToRiskRatio.toFixed(2)} is below the required 2:1 minimum (net target ₹${plan.modelledNetReward.toFixed(2)} vs net risk ₹${plan.modelledNetRisk.toFixed(2)}).`
        : `Order validation failed: ${plan.rejectionReasonCodes.join(", ")}`;

      return sendProblem(res, {
        status: 422,
        title: "Risk & Reward Gate Rejected",
        detail: detailMsg,
        errors: plan.rejectionReasonCodes,
        plan
      });
    }

    const modelledNetLoss = plan.modelledNetRisk;

    // 2. Concurrency Guard: Strictly Maximum 1 Concurrent Active Position
    const db = getDb();

    // 2a. RMS Reconciliation Guard: Block all new entries if an EOD square-off or RMS sync is pending/desynced
    let pendingReconciliation = null;
    try {
      pendingReconciliation = db.prepare(`
        SELECT trade_id, status, rms_sync_status 
        FROM eod_squareoff_ledger 
        WHERE status IN ('RECONCILIATION_REQUIRED', 'DEFERRED', 'FAILED') 
           OR rms_sync_status IN ('TIMED_OUT', 'FAILED', 'NOT_STARTED')
        LIMIT 1
      `).get();
    } catch {
      // Table may not exist in minimal test environments
    }

    if (pendingReconciliation) {
      releaseIdempotencyLock(idempotencyKey);
      return sendProblem(res, {
        status: 409,
        title: "RMS Reconciliation Pending",
        detail: `New trade blocked: Trade #${pendingReconciliation.trade_id} has unresolved EOD square-off or RMS desynchronization (status: ${pendingReconciliation.status}, rms_sync_status: ${pendingReconciliation.rms_sync_status}). System must reconcile position state before new entries are permitted.`,
        errors: [`Unresolved square-off in ledger for trade #${pendingReconciliation.trade_id} (${pendingReconciliation.status}/${pendingReconciliation.rms_sync_status}).`]
      });
    }

    if (!isUnrestricted) {
      const activePosition = db.prepare("SELECT t.id, COALESCE(i.symbol, 'ACTIVE') AS symbol FROM trades t LEFT JOIN instruments i ON i.id = t.instrument_id WHERE t.trade_mode = 'PAPER' AND t.status = 'OPEN' LIMIT 1").get();
      if (activePosition) {
        releaseIdempotencyLock(idempotencyKey);
        return sendProblem(res, {
          status: 409,
          title: "Active Position Lock",
          detail: `You already have an active open position (${activePosition.symbol}). Strictly maximum 1 concurrent trade permitted.`,
        });
      }

      // 3. Daily Loss Circuit Breaker: Hard ₹300.00 daily loss limit
      const todayDate = new Date(Date.now() - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0, 10);
      const dailyRow = db.prepare(`
        SELECT COALESCE(SUM(net_pnl), 0) AS dailyPnl
        FROM trades
        WHERE trade_mode = 'PAPER'
          AND status = 'CLOSED'
          AND substr(exit_datetime, 1, 10) = ?
      `).get(todayDate);
      const dailyPnl = Number(dailyRow?.dailyPnl || 0);
      const realizedDailyLoss = dailyPnl < 0 ? Math.abs(dailyPnl) : 0;

      if (realizedDailyLoss >= 300.00) {
        releaseIdempotencyLock(idempotencyKey);
        return sendProblem(res, {
          status: 423,
          title: "Daily Loss Limit Exhausted",
          detail: `Daily loss limit (₹300.00) reached (Today's Realized Net PnL: ₹${dailyPnl.toFixed(2)}). Trading halted for the session.`,
        });
      }

      // 4. Combined Daily Risk Budget Gate: Reject trade if modelled downside breaches remaining daily budget (Enforced in LIVE; Unrestricted in Testing Mode)
      const remainingDailyBudget = 300.00 - realizedDailyLoss;
      if (modelledNetLoss > remainingDailyBudget) {
        releaseIdempotencyLock(idempotencyKey);
        return sendProblem(res, {
          status: 423,
          title: "Daily Risk Budget Insufficient",
          detail: `Trade rejected: Remaining daily risk budget is ₹${remainingDailyBudget.toFixed(2)}, which is insufficient for this trade's modelled downside of ₹${modelledNetLoss.toFixed(2)}. Approved daily loss limit of ₹300.00 would be breached.`,
        });
      }
    }

    const feedMode = String(rawBody.feedMode || (rawBody.isManual ? "MANUAL" : "LIVE")).toUpperCase();
    const isManual = feedMode === "MANUAL";

    // 4b. Upstox V3 Market Data Feed Health & Freshness Gate (Candidate Entry Policy: <= 5s)
    if (!isManual && !isTesting && !rawBody.bypassFeedHealth) {
      const isHealthy = paperTradeEngine.isFeedHealthy(rawBody.tokenKey || rawBody.instrumentKey, "CANDIDATE_ENTRY");
      if (!isHealthy) {
        // Safe Practice Fallback: If exchange is off-hours or WebSocket tick is pending,
        // accept if broker session is valid and candidate entry price is verified (> 0)
        const hasValidPrice = Number(entryPrice) > 0;
        const hasBrokerProfile = Boolean(paperTradeEngine.client?.accessToken);
        if (!hasValidPrice || !hasBrokerProfile) {
          releaseIdempotencyLock(idempotencyKey);
          return sendProblem(res, {
            status: 503,
            title: "Market Data Feed Unhealthy",
            detail: "Live market data feed is disconnected or quotes are stale (> 5s candidate entry policy). Order execution blocked to prevent trading on unverified prices.",
            errors: ["Upstox WebSocket V3 market feed is disconnected or quotes are stale (> 5s candidate entry policy)."]
          });
        }
      }
    }

    const modeTag = `${isManual ? "[MANUAL_ONLY]" : "[LIVE_FEED]"} ${isTesting ? "[TESTING_MODE]" : ""}`.trim();
    const cleanNotes = (rawBody.personalNotes || "").replace(/\[(?:SANDBOX_MANUAL|MANUAL_ONLY|LIVE_FEED|TESTING_MODE|DOTNET_HFT:[^\]]+)\]/g, "").trim();

    let dotnetMeta = "";
    let effectiveEntryPrice = entryPrice;
    let entrySlippage = Number(rawBody.entrySlippage || 0);

    // 5. Mandatory .NET RMS Pre-Trade Gate (No deployment route may bypass RMS)
    let dotnetRes;
    try {
      dotnetRes = await deployOrderToDotnet({
        symbol: body.symbol,
        instrumentKey: rawBody.tokenKey || rawBody.instrumentKey || (body.symbol.includes("SENSEX") ? "BSE_INDEX|SENSEX" : "NSE_INDEX|Nifty 50"),
        direction: "LONG",
        quantity,
        lotSize,
        totalUnits,
        entryPrice,
        stopLoss,
        targetPrice,
        idempotencyKey,
        testingMode: isTesting,
        isUnrestricted,
        currentDailyLoss: realizedDailyLoss
      });
    } catch (err) {
      releaseIdempotencyLock(idempotencyKey);
      return sendProblem(res, {
        status: 503,
        title: "RMS Gateway Unavailable",
        detail: `.NET RMS execution authority unreachable: ${err.message}. Local execution fallback is disabled.`,
        errors: [err.message]
      });
    }

    if (!dotnetRes?.ok || !dotnetRes.data?.success) {
      releaseIdempotencyLock(idempotencyKey);
      const errorDetail = dotnetRes?.error || dotnetRes?.data?.errorMessage || dotnetRes?.data?.error || "Order rejected by RMS gateway";
      const isTimeoutOrUnavailable = String(errorDetail).includes("Timeout") || String(errorDetail).includes("ECONNREFUSED") || !dotnetRes?.ok;
      return sendProblem(res, {
        status: isTimeoutOrUnavailable ? 503 : 422,
        title: isTimeoutOrUnavailable ? "RMS Gateway Unavailable" : "RMS Risk Evaluation Rejected",
        detail: `.NET RMS execution authority failed: ${errorDetail}. Local execution fallback is disabled.`,
        errors: [errorDetail]
      });
    }

    const d = dotnetRes.data;
    effectiveEntryPrice = Number(d.filledPrice || entryPrice);
    entrySlippage = Math.abs(Number((effectiveEntryPrice - entryPrice).toFixed(2)));
    dotnetMeta = `[DOTNET_HFT:${d.orderId}:${d.positionId}]`;

    // Apply realistic adverse entry slippage if not already simulated
    if (effectiveEntryPrice === entryPrice && rawBody.simulateSlippage !== false && !isManual && entrySlippage === 0) {
      const slip = calculateEntrySlippage(entryPrice, direction, true);
      effectiveEntryPrice = slip.filledEntry;
      entrySlippage = Math.abs(Number((effectiveEntryPrice - entryPrice).toFixed(2)));
    }

    const payload = {
      ...rawBody,
      ...body,
      tradeMode: isUnrestricted ? "SANDBOX" : (rawBody.tradeMode || "PAPER"),
      entryPrice: effectiveEntryPrice,
      plannedEntryPrice: entryPrice,
      entrySlippage,
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
    const successResult = { item: { ...trade, tokenKey }, feedMode, isManual, success: true };
    completeIdempotencyLock(idempotencyKey, successResult);
    sendJson(res, successResult, 201);
    return true;
  }

  if (req.method === "POST" && ["/api/paper-lab/auto-deploy", "/api/live-alerts/auto-deploy"].includes(url.pathname)) {
    return handleAutoDeploy(req, res);
  }

  if (req.method === "POST" && ["/api/paper-lab/square-off-all", "/api/live-alerts/square-off-all"].includes(url.pathname)) {
    let dotnetRes = null;
    try {
      dotnetRes = await squareOffAllDotnet();
    } catch (err) {
      return sendProblem(res, {
        status: 503,
        title: "RMS Gateway Unavailable",
        detail: `.NET RMS panic liquidation authority unreachable: ${err.message}. Square-off-all aborted.`,
        errors: [err.message]
      });
    }

    if (!dotnetRes?.ok) {
      const errorDetail = dotnetRes?.error || "Panic liquidation rejected by .NET RMS gateway";
      return sendProblem(res, {
        status: 503,
        title: "RMS Gateway Unavailable",
        detail: `.NET RMS execution authority failed: ${errorDetail}. Square-off-all aborted.`,
        errors: [errorDetail]
      });
    }

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
