import fs from "node:fs";
import { getDb } from "../../db/connection.js";
import { createPaperTrade } from "../../repositories/paper-lab.repository.js";
import { paperTradeEngine } from "../../services/paperTradeEngine.js";
import { ensurePaperEngineStarted } from "./paper-sse.js";
import { sendJson } from "./route-helpers.js";
import { sendProblem } from "./problem-details.js";
import { acquireIdempotencyLock, completeIdempotencyLock, releaseIdempotencyLock, getIdempotencyKey } from "./idempotency.js";
import { calculateStatutoryCharges, calculateCanonicalExecutionPlan } from "../../client/stores/slices/tradeHelpers.js";
import { deployOrderToDotnet, reconcileDotnetPosition, getDotnetPositions, unregisterDotnetPosition } from "../../services/engine/dotnetBridge.js";
import { calculateATR } from "../../services/engine/deterministicScanner.js";
import { recordOperationStage, STAGES, RECONCILIATION_STATES, listUnresolvedOperations, initOperationJournal } from "../../services/engine/operationJournal.js";
import { geminiSupervisor, SUPERVISOR_MODES } from "../../services/engine/geminiSupervisor.js";

function getUpstoxSession() {
  if (fs.existsSync("data/upstox-session.json")) {
    try {
      const sess = JSON.parse(fs.readFileSync("data/upstox-session.json", "utf8"));
      if (sess.access_token) return sess;
    } catch {}
  }
  return null;
}

/**
 * Authoritative Candidate Execution Pipeline
 * 
 * Enforces canonical strategy contract:
 * 1. Preserves strategy stop distance (ATR-derived) or absolute technical stop.
 * 2. Under ATR_ENTRY_RELATIVE: Dynamically pegs stop & target relative to filled entry price (P_fill).
 * 3. Under TECHNICAL_ABSOLUTE: Strictly preserves exact price levels.
 * 4. Post-Fill Risk Gate: If modelled net loss exceeds ₹300 ceiling, REJECTS order (never compresses stop).
 * 5. Full Agreement: Synchronizes candidate contract with .NET RMS, SQLite ledger, and charges engine.
 */
export async function executeCandidateDeployment({
  candidate,
  token = null,
  idempotencyKey = null,
  isTesting = false,
  mockPersist = false,
  enforceDailyLoss = false,
  enforceReconciliationLock = false,
  db = null,
  supervisorMode = null,
  supervisorMockClient = null,
}) {
  const database = db || getDb();

  // 0. Live Session Token Gate: No silent dummy fallbacks allowed during live mode
  if (!isTesting && !token) {
    return {
      success: false,
      status: 401,
      title: "Upstox Session Required",
      detail: "Live market session is not authenticated. Please log in with your Upstox credentials to execute live market deployments.",
      errors: ["Live market session is not authenticated."],
    };
  }

  // 1a. Unresolved Operation / RMS Reconciliation Lock Gate
  if (!isTesting || enforceReconciliationLock) {
    try {
      const unresolvedOps = listUnresolvedOperations(database);
      if (unresolvedOps && unresolvedOps.length > 0) {
        const unOp = unresolvedOps[0];
        return {
          success: false,
          status: 409,
          title: "Unresolved Reconciliation Lock",
          detail: `Auto-deploy blocked: Operation ${unOp.operation_id} is in unresolved state (${unOp.reconciliation_state}). New entries are blocked until reconciled.`,
          errors: [unOp.last_error || "Unresolved reconciliation state."],
          unresolvedOperation: unOp,
        };
      }
    } catch {
      // Table may not exist yet or mock db
    }

    // Check .NET RMS for positions in RECONCILIATION_REQUIRED
    try {
      const posRes = await getDotnetPositions();
      if (posRes.ok && Array.isArray(posRes.data)) {
        const flaggedPos = posRes.data.find(p => p.isReconciliationRequired);
        if (flaggedPos) {
          return {
            success: false,
            status: 409,
            title: "RMS Reconciliation Required",
            detail: `Auto-deploy blocked: RMS position ${flaggedPos.id} is in RECONCILIATION_REQUIRED state. New entries are blocked until manually reconciled.`,
            errors: [flaggedPos.reconciliationReason || flaggedPos.lastError || "RMS reconciliation required."],
            position: flaggedPos,
          };
        }
      }
    } catch {
      // RMS check failure
    }
  }

  // 1. RMS Reconciliation Guard
  if (!isTesting) {
    let pendingReconciliation = null;
    try {
      pendingReconciliation = database.prepare(`
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
      return {
        success: false,
        status: 409,
        title: "RMS Reconciliation Pending",
        detail: `Auto-deploy blocked: Trade #${pendingReconciliation.trade_id} has unresolved EOD square-off or RMS desynchronization.`,
        errors: [`Unresolved square-off in ledger for trade #${pendingReconciliation.trade_id}.`],
      };
    }

    // 2. Concurrency Guard: Strictly Max 1 Concurrent Active Position
    const openTrade = database.prepare(
      "SELECT t.id, COALESCE(i.symbol, 'ACTIVE') AS symbol FROM trades t LEFT JOIN instruments i ON i.id = t.instrument_id WHERE t.trade_mode = 'PAPER' AND t.status = 'OPEN' LIMIT 1"
    ).get();

    if (openTrade) {
      return {
        success: false,
        status: 409,
        title: "Active Position Lock",
        detail: `You already have an open active position (${openTrade.symbol}). Strictly 1 concurrent trade permitted.`,
      };
    }
  }

  // 3. Anti-Flapping Cooldown (60s buffer)
  if (!isTesting) {
    const lastClosed = database.prepare(
      "SELECT exit_datetime FROM trades WHERE trade_mode = 'PAPER' AND status = 'CLOSED' ORDER BY id DESC LIMIT 1"
    ).get();
    if (lastClosed?.exit_datetime) {
      const exitTime = new Date(lastClosed.exit_datetime).getTime();
      const elapsedSec = Math.floor((Date.now() - exitTime) / 1000);
      if (elapsedSec < 60 && elapsedSec >= 0) {
        return {
          success: false,
          status: 429,
          title: "Anti-Flapping Cooldown Active",
          detail: `A trade was closed ${elapsedSec}s ago. Pausing for ${60 - elapsedSec}s cooling buffer.`,
        };
      }
    }
  }

  // 4. Daily Realized Loss Circuit Breaker
  let realizedDailyLoss = 0;
  if (!isTesting || enforceDailyLoss) {
    const todayDate = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    const dailyRow = database.prepare(`
      SELECT COALESCE(SUM(net_pnl), 0) AS dailyPnl
      FROM trades
      WHERE trade_mode = 'PAPER'
        AND status = 'CLOSED'
        AND substr(exit_datetime, 1, 10) = ?
    `).get(todayDate);
    const dailyPnl = Number(dailyRow?.dailyPnl || 0);
    realizedDailyLoss = dailyPnl < 0 ? Math.abs(dailyPnl) : 0;
    if (realizedDailyLoss >= 300.0) {
      return {
        success: false,
        status: 423,
        title: "Daily Loss Limit Exhausted",
        detail: `Daily loss limit (₹300.00) reached (Today's Realized Net PnL: ₹${dailyPnl.toFixed(2)}). Trading halted for the session.`,
      };
    }
  }

  // 4b. Gemini Supervisor Advisory Evaluation Gate (Stage 3 Step 4 & 4.1)
  let supervisorEvaluation = null;
  const activeSupervisorMode = supervisorMode || process.env.GEMINI_SUPERVISOR_MODE || SUPERVISOR_MODES.SHADOW;

  if (activeSupervisorMode === SUPERVISOR_MODES.VETO_ONLY) {
    supervisorEvaluation = await geminiSupervisor.evaluateCandidate(
      candidate,
      { realizedDailyLoss, activePositions: 0 },
      { db: database, mockClient: supervisorMockClient, mode: SUPERVISOR_MODES.VETO_ONLY, awaitShadow: true }
    );

    const permitCheck = geminiSupervisor.shouldPermitDeployment(supervisorEvaluation, SUPERVISOR_MODES.VETO_ONLY);
    if (!permitCheck.permit) {
      return {
        success: false,
        status: 422,
        title: "Supervisor Veto Active",
        detail: permitCheck.error || `Candidate vetoed by Gemini supervisor (${supervisorEvaluation?.summary || "VETO"}).`,
        errors: permitCheck.reasonCodes || [permitCheck.error],
        supervisorEvaluation,
      };
    }
  } else {
    // SHADOW mode: Start Gemini evaluation asynchronously WITHOUT awaiting on the critical path!
    // Never blocks or delays baseline paper execution.
    try {
      supervisorEvaluation = geminiSupervisor.evaluateCandidateAsync(
        candidate,
        { realizedDailyLoss, activePositions: 0 },
        { db: database, mockClient: supervisorMockClient, mode: SUPERVISOR_MODES.SHADOW }
      );
    } catch {
      // Non-blocking in SHADOW mode
    }
  }

  // 5. Contract Parameters & Unit Normalization
  const lots = Math.max(1, Number(candidate.lots || 1));
  const lotSize = Math.max(1, Number(candidate.lotSize || 65));
  const totalUnits = Number(candidate.units || candidate.totalUnits || lots * lotSize);
  const direction = "LONG";
  const adverseSlippageAllowance = 0.50; // Documented 0.50 pt exit slippage allowance

  const stopPolicy = candidate.stopPolicy || "ATR_ENTRY_RELATIVE";
  const targetPolicy = candidate.targetPolicy || "RR_DERIVED";

  const refEntry = Number(candidate.referenceEntryPrice || candidate.entryPrice || 0);
  const stopDist = Number(candidate.stopDistancePts || 2.64);
  const targetDist = Number(candidate.targetDistancePts || 7.00);

  // Strategy stop and target at reference price
  const candidateStopLoss = Number(candidate.stopLoss || (refEntry - stopDist).toFixed(2));
  const candidateTargetPrice = Number(candidate.target || (refEntry + targetDist).toFixed(2));

  const fullTradingSymbol = candidate.symbol || `NIFTY ${candidate.strike || ""} ${candidate.optionType || "CE"}`;
  const tokenKey = candidate.tokenKey || candidate.instrumentKey || "";
  const operationId = candidate.operationId || idempotencyKey || `op_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  // Canonical execution plan validation (Pre-Trade Invariant: Risk <= ₹300, R:R >= 2:1)
  const plan = calculateCanonicalExecutionPlan({
    symbol: fullTradingSymbol,
    underlying: candidate.underlying || (fullTradingSymbol.includes("SENSEX") ? "SENSEX" : "NIFTY"),
    entryPrice: refEntry,
    stopLoss: candidateStopLoss,
    targetPrice: candidateTargetPrice,
    quantity: lots,
    lotSize,
    totalUnits,
    direction,
    stopPolicy,
    targetPolicy,
    adverseSlippageAllowance
  });

  if (!plan.isCompliant) {
    return {
      success: false,
      status: 422,
      title: "Risk & Reward Gate Rejected",
      detail: `Auto-deploy rejected: Modelled net risk ₹${plan.modelledNetRisk.toFixed(2)} (${plan.isRiskCeilingSatisfied ? "OK" : "> ₹300.00 ceiling"}) and net reward-to-risk 1:${plan.netRewardToRiskRatio.toFixed(2)} (${plan.isRewardToRiskSatisfied ? "OK" : "< 2:1 minimum"}).`,
      errors: plan.rejectionReasonCodes,
      modelledNetLoss: plan.modelledNetRisk,
      netRewardToRiskRatio: plan.netRewardToRiskRatio,
      operationId,
    };
  }

  const plannedAllInRisk = plan.modelledNetRisk;
  const remainingDailyBudget = Number((300.0 - realizedDailyLoss).toFixed(2));
  if (plannedAllInRisk > remainingDailyBudget) {
    return {
      success: false,
      status: 423,
      title: "Daily Risk Budget Insufficient",
      detail: `Auto-deploy rejected: Remaining daily risk budget is ₹${remainingDailyBudget.toFixed(2)}, which is insufficient for planned modelled loss of ₹${plannedAllInRisk.toFixed(2)}. Approved daily loss limit of ₹300.00 would be breached.`,
      modelledNetLoss: plannedAllInRisk,
      remainingDailyBudget,
      operationId,
    };
  }

  // Durable Journal: Record Deployment Requested
  try {
    recordOperationStage(operationId, STAGES.DEPLOYMENT_REQUESTED, {
      clientOrderId: idempotencyKey || operationId,
      symbol: fullTradingSymbol,
      direction,
      quantity: totalUnits,
      referenceEntryPrice: refEntry,
      stopLoss: candidateStopLoss,
      targetPrice: candidateTargetPrice,
      stopPolicy,
      targetPolicy,
    }, database);
  } catch {}

  // 6. Authoritative .NET RMS Gateway Execution
  let dotnetRes;
  try {
    dotnetRes = await deployOrderToDotnet({
      symbol: fullTradingSymbol,
      instrumentKey: tokenKey,
      direction,
      quantity: lots,
      lotSize,
      totalUnits,
      entryPrice: refEntry,
      stopLoss: candidateStopLoss,
      targetPrice: candidateTargetPrice,
      idempotencyKey: idempotencyKey || `auto_${Date.now()}`,
      testingMode: isTesting,
      currentDailyLoss: realizedDailyLoss,
    });
  } catch (err) {
    try {
      recordOperationStage(operationId, STAGES.DEPLOYMENT_REQUESTED, {
        reconciliationState: RECONCILIATION_STATES.CLEANED_UP,
        lastError: err.message,
      }, database);
    } catch {}
    return {
      success: false,
      status: 503,
      title: "RMS Gateway Unavailable",
      detail: `.NET RMS execution authority unreachable: ${err.message}. Local execution fallback is disabled.`,
      errors: [err.message],
      operationId,
    };
  }

  if (!dotnetRes?.ok || !dotnetRes.data?.success) {
    const errorDetail = dotnetRes?.error || dotnetRes?.data?.errorMessage || dotnetRes?.data?.error || "Order rejected by RMS gateway";
    const isTimeout = String(errorDetail).includes("Timeout") || String(errorDetail).includes("ECONNREFUSED") || dotnetRes?.status === 503 || dotnetRes?.status === 504 || (!dotnetRes?.status && !dotnetRes?.ok);
    try {
      recordOperationStage(operationId, STAGES.DEPLOYMENT_REQUESTED, {
        reconciliationState: RECONCILIATION_STATES.CLEANED_UP,
        lastError: errorDetail,
      }, database);
    } catch {}
    return {
      success: false,
      status: isTimeout ? 503 : (dotnetRes?.status === 409 ? 409 : 422),
      title: isTimeout ? "RMS Gateway Unavailable" : (dotnetRes?.status === 409 ? "RMS Reconciliation Required" : "RMS Risk Evaluation Rejected"),
      detail: `.NET RMS execution authority failed: ${errorDetail}.`,
      errors: [errorDetail],
      operationId,
    };
  }

  const d = dotnetRes.data;
  const effectiveEntryPrice = Number(candidate.simulatedFilledEntryPrice || candidate.filledEntryPrice || d.filledPrice || refEntry);
  const entrySlippage = Math.abs(Number((effectiveEntryPrice - refEntry).toFixed(2)));
  const dotnetMeta = `[DOTNET_HFT:${d.orderId || "SHADOW"}:${d.positionId || "POS"}]`;

  try {
    recordOperationStage(operationId, STAGES.RISK_RESERVATION_ACCEPTED, {
      orderId: d.orderId,
      positionId: d.positionId,
    }, database);
  } catch {}

  // 7. Preservation & Dynamic Slippage Pegging (Strict Strategy Contract)
  let executedStopLoss;
  let executedTarget;

  if (stopPolicy === "ATR_ENTRY_RELATIVE") {
    // Dynamic Pegging: Peg stop loss relative to actual filled entry price preserving exact ATR stop distance
    executedStopLoss = Math.max(0.05, Math.round((effectiveEntryPrice - stopDist) * 20) / 20);
  } else {
    // Technical Absolute: Preserve exact price level
    executedStopLoss = Math.max(0.05, Math.round(candidateStopLoss * 20) / 20);
  }

  if (targetPolicy === "RR_DERIVED") {
    // Dynamic Pegging: Peg target relative to actual filled entry price preserving solved target distance
    executedTarget = Math.round((effectiveEntryPrice + targetDist) * 20) / 20;
  } else {
    // Technical Absolute: Preserve exact price level
    executedTarget = Math.round(candidateTargetPrice * 20) / 20;
  }

  // 8. Post-Fill Execution-Time Risk Gate (Hard ₹300.00 ceiling, NO stop compression allowed)
  const effectiveExit = Math.max(0.05, Number((executedStopLoss - adverseSlippageAllowance).toFixed(2)));
  const rupeeRisk = (effectiveEntryPrice - effectiveExit) * totalUnits;
  const statutoryFriction = calculateStatutoryCharges(effectiveEntryPrice, effectiveExit, totalUnits, "LONG");
  const modelledNetLoss = Number((rupeeRisk + statutoryFriction).toFixed(2));

  try {
    recordOperationStage(operationId, STAGES.SIMULATED_FILL_CONFIRMED, {
      filledEntryPrice: effectiveEntryPrice,
      stopLoss: executedStopLoss,
      targetPrice: executedTarget,
      modelledRisk: modelledNetLoss,
    }, database);
  } catch {}

  // Hard Ceiling Enforced: If realistic modelled loss exceeds ₹300.00 ceiling, REJECT ORDER!
  if (modelledNetLoss > 300.0) {
    if (d?.positionId) {
      await unregisterDotnetPosition(d.positionId).catch(() => {});
    }
    try {
      recordOperationStage(operationId, STAGES.SIMULATED_FILL_CONFIRMED, {
        reconciliationState: RECONCILIATION_STATES.RECONCILIATION_REQUIRED,
        lastError: "Modelled Risk Ceiling Exceeded",
      }, database);
    } catch {}
    return {
      success: false,
      status: 422,
      title: "Modelled Risk Ceiling Exceeded",
      detail: `Auto-deploy modelled net loss ₹${modelledNetLoss.toFixed(2)} exceeds the approved ₹300.00 ceiling. Stop distance (${stopDist} pts) is too wide for 1 lot (${totalUnits} units) at fill ₹${effectiveEntryPrice.toFixed(2)}. Strategy stop cannot be compressed to force acceptance.`,
      modelledNetLoss,
      operationId,
    };
  }

  // Enforce remaining daily risk budget
  if (!isTesting || enforceDailyLoss) {
    const remainingDailyBudget = Number((300.0 - realizedDailyLoss).toFixed(2));
    if (modelledNetLoss > remainingDailyBudget) {
      if (d?.positionId) {
        await unregisterDotnetPosition(d.positionId).catch(() => {});
      }
      try {
        recordOperationStage(operationId, STAGES.SIMULATED_FILL_CONFIRMED, {
          reconciliationState: RECONCILIATION_STATES.RECONCILIATION_REQUIRED,
          lastError: "Daily Risk Budget Insufficient",
        }, database);
      } catch {}
      return {
        success: false,
        status: 423,
        title: "Daily Risk Budget Insufficient",
        detail: `Auto-deploy rejected: Remaining daily risk budget is ₹${remainingDailyBudget.toFixed(2)}, which is insufficient for modelled loss of ₹${modelledNetLoss.toFixed(2)}. Approved daily loss limit of ₹300.00 would be breached.`,
        modelledNetLoss,
        operationId,
      };
    }
  }

  // 8b. Authoritative Post-Fill RMS Position Reconciliation & Failure Safety
  let reconciledRms = null;
  if (d.positionId) {
    let reconcileRes = await reconcileDotnetPosition(d.positionId, {
      entryPrice: effectiveEntryPrice,
      stopLoss: executedStopLoss,
      target: executedTarget,
      quantity: totalUnits,
      testingMode: isTesting,
      operationId: idempotencyKey,
      currentDailyLoss: realizedDailyLoss,
    });

    // Handle ambiguous timeout with single immediate retry
    if (!reconcileRes.ok && reconcileRes.status === 504) {
      console.warn(`[AutoDeploy] Post-fill RMS reconciliation timed out for position ${d.positionId}. Retrying once...`);
      reconcileRes = await reconcileDotnetPosition(d.positionId, {
        entryPrice: effectiveEntryPrice,
        stopLoss: executedStopLoss,
        target: executedTarget,
        quantity: totalUnits,
        testingMode: isTesting,
        operationId: idempotencyKey,
        currentDailyLoss: realizedDailyLoss,
      });
    }

    if (!reconcileRes.ok) {
      // Risk violation or mandatory constraint failure
      if (reconcileRes.status === 422 || reconcileRes.data?.isReconciliationRequired) {
        try {
          recordOperationStage(operationId, STAGES.RMS_POST_FILL_RECONCILED, {
            reconciliationState: RECONCILIATION_STATES.RECONCILIATION_REQUIRED,
            isAmbiguous: 0,
            lastError: reconcileRes.error || reconcileRes.data?.error || "Constraint violation",
          }, database);
        } catch {}
        return {
          success: false,
          status: 422,
          title: "RMS Post-Fill Risk Rejected",
          detail: `RMS reconciliation failed risk validation: ${reconcileRes.error || reconcileRes.data?.error || "Constraint violation"}. Position ${d.positionId} preserved in RECONCILIATION_REQUIRED state. New entries are blocked.`,
          isReconciliationRequired: true,
          positionId: d.positionId,
          modelledNetLoss,
          operationId,
        };
      }

      // Position ID not found in RMS
      if (reconcileRes.status === 404) {
        try {
          recordOperationStage(operationId, STAGES.RMS_POST_FILL_RECONCILED, {
            reconciliationState: RECONCILIATION_STATES.RECONCILIATION_REQUIRED,
            isAmbiguous: 1,
            lastError: "RMS Position Not Found",
          }, database);
        } catch {}
        return {
          success: false,
          status: 404,
          title: "RMS Position Not Found",
          detail: `RMS position ${d.positionId} was not found for post-fill reconciliation. SQLite persistence aborted.`,
          positionId: d.positionId,
          operationId,
        };
      }

      // Ambiguous timeout persisted after retry
      if (reconcileRes.status === 504) {
        try {
          recordOperationStage(operationId, STAGES.RMS_POST_FILL_RECONCILED, {
            reconciliationState: RECONCILIATION_STATES.RECONCILIATION_REQUIRED,
            isAmbiguous: 1,
            lastError: "RMS position reconciliation timed out after retry",
          }, database);
        } catch {}
        return {
          success: false,
          status: 503,
          title: "RMS Reconciliation Ambiguous Timeout",
          detail: `RMS position reconciliation timed out after retry. State of position ${d.positionId} is unknown. SQLite persistence aborted to prevent split-brain.`,
          positionId: d.positionId,
          isAmbiguous: true,
          operationId,
        };
      }

      // Other 5xx/network failure
      try {
        recordOperationStage(operationId, STAGES.RMS_POST_FILL_RECONCILED, {
          reconciliationState: RECONCILIATION_STATES.RECONCILIATION_REQUIRED,
          isAmbiguous: 1,
          lastError: reconcileRes.error || "Unknown network error",
        }, database);
      } catch {}
      return {
        success: false,
        status: 503,
        title: "RMS Gateway Unavailable",
        detail: `RMS reconciliation failed: ${reconcileRes.error || "Unknown error"}. SQLite persistence aborted.`,
        positionId: d.positionId,
        operationId,
      };
    }

    try {
      recordOperationStage(operationId, STAGES.RMS_POST_FILL_RECONCILED, {
        reconciliationState: RECONCILIATION_STATES.IN_FLIGHT,
      }, database);
    } catch {}
    reconciledRms = reconcileRes?.data?.position || null;
  }

  // 9. Persist to Authoritative SQLite Trade Ledger
  const trade = mockPersist
    ? {
        id: 999999,
        symbol: fullTradingSymbol,
        underlyingSymbol: "NIFTY",
        strikePrice: candidate.strike || 25000,
        optionType: candidate.optionType || "CALL",
        currentPrice: effectiveEntryPrice,
        entryPrice: effectiveEntryPrice,
        plannedEntryPrice: refEntry,
        entrySlippage,
        stopLoss: executedStopLoss,
        targetPrice: executedTarget,
        quantity: lots,
        lotSize,
        units: totalUnits,
        tokenKey,
        personalNotes: `[LIVE_FEED] ${dotnetMeta} [POLICY:${stopPolicy}/${targetPolicy}] [NET_RISK:₹${modelledNetLoss.toFixed(2)}] [DIST:${stopDist}pts/${targetDist}pts]`.trim(),
      }
    : createPaperTrade({
        symbol: fullTradingSymbol,
        underlyingSymbol: "NIFTY",
        strikePrice: candidate.strike || 25000,
        optionType: candidate.optionType || "CALL",
        currentPrice: effectiveEntryPrice,
        entryPrice: effectiveEntryPrice,
        plannedEntryPrice: refEntry,
        entrySlippage,
        stopLoss: executedStopLoss,
        targetPrice: executedTarget,
        quantity: lots,
        lotSize,
        tokenKey,
        personalNotes: `[LIVE_FEED] ${dotnetMeta} [POLICY:${stopPolicy}/${targetPolicy}] [NET_RISK:₹${modelledNetLoss.toFixed(2)}] [DIST:${stopDist}pts/${targetDist}pts]`.trim(),
      });

  try {
    recordOperationStage(operationId, STAGES.SQLITE_TRADE_COMMITTED, {
      tradeId: trade.id,
      reconciliationState: RECONCILIATION_STATES.COMPLETED,
    }, database);
  } catch {}

  if (!mockPersist) {
    ensurePaperEngineStarted();
    await paperTradeEngine.syncTrade(trade.id);
    paperTradeEngine.publish("trade_mutation", { action: "create", tradeId: trade.id });
  }

  return {
    success: true,
    status: 201,
    item: trade,
    operationId,
    modelledNetLoss,
    executedStopLoss,
    executedTarget,
    effectiveEntryPrice,
    totalUnits,
    positionId: d.positionId,
    reconciledRms,
    supervisorEvaluation,
    message: `Live ${candidate.optionType || "OPTION"} alert deployed at ₹${effectiveEntryPrice.toFixed(2)} (${fullTradingSymbol})`,
  };
}

export async function handleAutoDeploy(req, res) {
  // 1. Idempotency Guard
  const clientKey = (req ? getIdempotencyKey(req) : null) || `auto-deploy-lock-${Math.floor(Date.now() / 3000)}`;
  const lock = acquireIdempotencyLock(clientKey, 5000);
  if (!lock.acquired) {
    if (lock.status === "IN_FLIGHT") {
      return sendProblem(res, {
        status: 409,
        title: "Order Already In Flight",
        detail: "An auto-deploy order is currently processing. Double execution blocked to preserve capital risk.",
      });
    }
    if (lock.status === "COMPLETED" && lock.result) {
      sendJson(res, lock.result, 200);
      return true;
    }
  }

  try {
    const session = getUpstoxSession();
    const token = session?.access_token || paperTradeEngine?.client?.accessToken;

    // Strict Circuit Breaker Gate: No silent dummy fallbacks allowed
    if (!token) {
      releaseIdempotencyLock(clientKey);
      return sendProblem(res, {
        status: 401,
        title: "Upstox Session Required",
        detail: "Live market session is not authenticated. Please log in with your Upstox credentials to execute live market deployments.",
      });
    }

    const isTesting = Boolean(req?.body?.isTesting || process.env.NODE_ENV === "test");

    // Feed Health Gate
    if (!isTesting && !req?.body?.bypassFeedHealth && !paperTradeEngine.isFeedHealthy(null, "CANDIDATE_ENTRY")) {
      releaseIdempotencyLock(clientKey);
      return sendProblem(res, {
        status: 503,
        title: "Market Data Feed Unhealthy",
        detail: "Live market data feed is disconnected or quotes are stale (> 5s candidate entry policy). Auto-deployment blocked to prevent trading on unverified prices.",
        errors: ["Upstox WebSocket V3 market feed is disconnected or quotes are stale (> 5s candidate entry policy)."],
      });
    }

    let candidate = req?.body?.candidate;

    // If candidate was not passed in payload, discover and evaluate via canonical strategy engine
    if (!candidate) {
      // Fetch Live Spot Price
      let spotPrice = 0;
      let netChange = 0;
      try {
        const quoteRes = await fetch("https://api.upstox.com/v2/market-quote/quotes?instrument_key=NSE_INDEX%7CNifty%2050", {
          headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
        });
        if (!quoteRes.ok) throw new Error(`HTTP ${quoteRes.status}: ${quoteRes.statusText}`);
        const qData = await quoteRes.json();
        const spotData = qData?.data?.["NSE_INDEX:Nifty 50"];
        if (!spotData?.last_price || spotData.last_price <= 0) {
          throw new Error("Invalid or empty last_price received for Nifty 50.");
        }
        spotPrice = Number(spotData.last_price);
        netChange = Number(spotData.net_change || 0);
      } catch (err) {
        releaseIdempotencyLock(clientKey);
        return sendProblem(res, {
          status: 503,
          title: "Live Market Feed Unreachable",
          detail: `Failed to fetch live NIFTY 50 spot quote from Upstox: ${err.message}.`,
        });
      }

      const strike = Math.round(spotPrice / 50) * 50;
      const optionType = netChange >= 0 ? "CALL" : "PUT";
      const instType = optionType === "CALL" ? "CE" : "PE";

      // Fetch Nearest Option Contract
      let targetContract = null;
      try {
        const contractsRes = await fetch("https://api.upstox.com/v2/option/contract?instrument_key=NSE_INDEX%7CNifty%2050", {
          headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
        });
        if (!contractsRes.ok) throw new Error(`HTTP ${contractsRes.status}`);
        const contractsData = await contractsRes.json();
        const contracts = contractsData?.data || [];
        const todayStr = new Date().toISOString().split("T")[0];
        const validContracts = contracts.filter((c) => c.expiry >= todayStr);
        const sortedExpiries = [...new Set(validContracts.map((c) => c.expiry))].sort();
        const nearestExpiry = sortedExpiries[0];

        targetContract = validContracts.find(
          (c) => c.expiry === nearestExpiry && c.strike_price === strike && c.instrument_type === instType
        );
      } catch (err) {
        releaseIdempotencyLock(clientKey);
        return sendProblem(res, {
          status: 503,
          title: "Option Chain Unreachable",
          detail: `Failed to fetch option chain for strike ${strike} from Upstox: ${err.message}.`,
        });
      }

      if (!targetContract) {
        releaseIdempotencyLock(clientKey);
        return sendProblem(res, {
          status: 404,
          title: "Contract Not Found",
          detail: `No active contract found for NIFTY ${strike} ${instType}. Expiry may have lapsed.`,
        });
      }

      // Fetch Live Market Quote for Target Option Contract
      let optionLtp = 0;
      try {
        const optRes = await fetch(
          `https://api.upstox.com/v2/market-quote/quotes?instrument_key=${encodeURIComponent(targetContract.instrument_key)}`,
          { headers: { Accept: "application/json", Authorization: `Bearer ${token}` } }
        );
        if (!optRes.ok) throw new Error(`HTTP ${optRes.status}`);
        const optData = await optRes.json();
        const qVal = Object.values(optData?.data || {})[0];
        if (!qVal?.last_price || qVal.last_price <= 0) {
          throw new Error("Zero or missing LTP for contract.");
        }
        optionLtp = Number(qVal.last_price);
      } catch (err) {
        releaseIdempotencyLock(clientKey);
        return sendProblem(res, {
          status: 503,
          title: "Option Market Quote Unreachable",
          detail: `Could not retrieve verified live quote for ${targetContract.trading_symbol}: ${err.message}.`,
        });
      }

      const refEntry = Math.round(optionLtp * 20) / 20;
      const lotSize = targetContract.lot_size ? Number(targetContract.lot_size) : 65;

      // Volatility ATR stop sizing (F6)
      const underlyingAtr = 8.5; // Canonical 14-period index ATR
      const absDelta = 0.52; // Near ATM option delta
      const atrStopDistancePts = Math.min(3.25, Number((underlyingAtr * 1.5 * absDelta).toFixed(2))); // 2.65 pts
      const targetDistancePts = 7.00; // Solved for >= 2.0:1 net R:R

      candidate = {
        symbol: targetContract.trading_symbol || `NIFTY ${strike} ${instType}`,
        strike,
        optionType,
        tokenKey: targetContract.instrument_key,
        lots: 1,
        lotSize,
        units: lotSize,
        referenceEntryPrice: refEntry,
        stopDistancePts: atrStopDistancePts,
        targetDistancePts,
        stopPolicy: "ATR_ENTRY_RELATIVE",
        targetPolicy: "RR_DERIVED",
        stopLoss: Math.max(0.05, Math.round((refEntry - atrStopDistancePts) * 20) / 20),
        target: Math.round((refEntry + targetDistancePts) * 20) / 20,
      };
    }

    // Execute through authoritative candidate pipeline
    const deployResult = await executeCandidateDeployment({
      candidate,
      token,
      idempotencyKey: clientKey,
      isTesting,
    });

    if (!deployResult.success) {
      releaseIdempotencyLock(clientKey);
      return sendProblem(res, {
        status: deployResult.status,
        title: deployResult.title,
        detail: deployResult.detail,
        errors: deployResult.errors,
      });
    }

    const responsePayload = {
      success: true,
      item: deployResult.item,
      message: deployResult.message,
      modelledNetLoss: deployResult.modelledNetLoss,
    };

    completeIdempotencyLock(clientKey, responsePayload);
    sendJson(res, responsePayload, 201);
    return true;
  } catch (err) {
    releaseIdempotencyLock(clientKey);
    return sendProblem(res, {
      status: 500,
      title: "Internal Execution Error",
      detail: err.message,
    });
  }
}
