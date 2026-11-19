import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { 
  GeminiSupervisorService, 
  SUPERVISOR_MODES, 
  RECOMMENDATIONS, 
  ALLOWED_REASON_CODES,
  geminiSupervisor
} from "../src/services/engine/geminiSupervisor.js";
import { 
  initSupervisorTable, 
  recordSupervisorEvaluation, 
  getSupervisorEvaluationByCandidateId, 
  listSupervisorEvaluations 
} from "../src/services/engine/geminiSupervisorRepository.js";
import { executeCandidateDeployment } from "../src/routes/trades/paper-auto-deploy.js";
import { DeterministicScanner } from "../src/services/engine/deterministicScanner.js";
import { paperTradeEngine } from "../src/services/paperTradeEngine.js";

console.log("===============================================================================");
console.log("  PORTFOLIOX — STAGE 3 STEP 4 ACCEPTANCE SUITE");
console.log("  CONSTRAINED GEMINI SUPERVISOR INTEGRATION");
console.log("===============================================================================\n");

let passedCount = 0;
let failedCount = 0;

async function test(name, fn) {
  try {
    geminiSupervisor.inMemoryCache.clear();
    await fn();
    console.log(`  [PASS] ${name}`);
    passedCount++;
  } catch (err) {
    console.error(`  [FAIL] ${name}`);
    console.error(`         Error: ${err.message}\n`);
    if (err.stack) {
      console.error(err.stack.split("\n").slice(1, 4).join("\n"));
    }
    failedCount++;
  }
}

// In-memory test DB fixture
const openDbs = [];

function createTestDb() {
  const db = new DatabaseSync(":memory:");
  openDbs.push(db);
  initSupervisorTable(db);
  // Add trades table for daily drawdown / trade operations
  db.exec(`
    CREATE TABLE IF NOT EXISTS trades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      instrument_id INTEGER,
      trade_mode TEXT NOT NULL,
      status TEXT NOT NULL,
      direction TEXT NOT NULL DEFAULT 'LONG',
      quantity REAL NOT NULL,
      lot_size REAL NOT NULL DEFAULT 65,
      entry_price REAL NOT NULL,
      planned_entry_price REAL,
      entry_slippage REAL DEFAULT 0,
      stop_loss REAL,
      target_price REAL,
      net_pnl REAL,
      token_key TEXT,
      personal_notes TEXT,
      exit_datetime TEXT,
      closed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS trade_operation_journal (
      operation_id TEXT PRIMARY KEY,
      client_order_id TEXT,
      order_id TEXT,
      position_id TEXT,
      trade_id INTEGER,
      symbol TEXT NOT NULL,
      direction TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      reference_entry_price REAL,
      filled_entry_price REAL,
      stop_loss REAL,
      target_price REAL,
      stop_policy TEXT,
      target_policy TEXT,
      modelled_risk REAL,
      stage TEXT NOT NULL,
      reconciliation_state TEXT NOT NULL DEFAULT 'IN_FLIGHT',
      is_ambiguous INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  return db;
}

// Canonical candidate fixture
function getCanonicalCandidate(id = "cand_test_default") {
  return {
    candidateId: id,
    symbol: "NIFTY26OCT25400CE",
    strike: 25400,
    optionType: "CALL",
    tokenKey: "NSE_FO|12345",
    lots: 1,
    lotSize: 65,
    units: 65,
    referenceEntryPrice: 125.10,
    entryPrice: 125.10,
    stopLoss: 122.30,
    target: 132.10,
    stopDistancePts: 2.80,
    targetDistancePts: 7.00,
    stopPolicy: "ATR_ENTRY_RELATIVE",
    targetPolicy: "RR_DERIVED",
    modelledNetRisk: 280.77,
    modelledNetReward: 562.62,
    modelledNetRrRatio: 2.00,
    underlyingPrice: 25380.0,
    underlyingAtr: 8.5,
    edgeStatus: "NOT_VALIDATED",
    generatedAt: "2026-10-27T10:00:00.000Z",
  };
}

// --- TEST GROUP 1: Authority Hierarchy & Safety Gates ---
console.log("--- TEST GROUP 1: Authority Hierarchy & Safety Gates ---");

await test("Test 1: Candidates failing deterministic filters never reach Gemini", async () => {
  let geminiCallCount = 0;
  const mockClient = {
    generateContent: async () => {
      geminiCallCount++;
      return {
        evaluationId: "eval_fail_case",
        candidateId: "cand_none",
        recommendation: "NO_VETO",
        reasonCodes: ["DETERMINISTIC_AGREEMENT"],
        summary: "Should not be called",
        modelVersion: "gemini-2.5-flash",
        evaluatedAt: new Date().toISOString(),
      };
    }
  };

  const scanner = new DeterministicScanner();
  // Pass an empty context that triggers F1 failure (INSUFFICIENT_1H_CANDLES)
  const result = scanner.evaluate({ candles1h: [] });

  assert.equal(result.decision, "NO_TRADE");
  assert.equal(result.candidate, null);

  // If candidate is null, supervisor evaluateCandidate is never dispatched
  const supervisor = new GeminiSupervisorService({ mockClient });
  const evalResult = await supervisor.evaluateCandidate(result.candidate);
  assert.equal(evalResult.status, "SKIPPED");
  assert.equal(geminiCallCount, 0, "Gemini must never be called for non-qualified candidate");
});

await test("Test 2: VETO_ONLY mode can veto eligible candidates (blocks deployment with 422)", async () => {
  const db = createTestDb();
  const candidate = getCanonicalCandidate("cand_test_veto_blocks");

  const mockVetoClient = {
    generateContent: async () => ({
      evaluationId: "eval_veto_1",
      candidateId: candidate.candidateId,
      recommendation: RECOMMENDATIONS.VETO,
      reasonCodes: ["RESISTANCE_CLUSTER", "HIGH_VOLATILITY_RISK"],
      summary: "Major overhead supply cluster detected on 15m order flow. High probability of false breakout.",
      modelVersion: "gemini-2.5-flash",
      evaluatedAt: new Date().toISOString(),
    })
  };

  const deployResult = await executeCandidateDeployment({
    candidate,
    isTesting: true,
    mockPersist: true,
    supervisorMode: SUPERVISOR_MODES.VETO_ONLY,
    supervisorMockClient: mockVetoClient,
    db,
  });

  assert.equal(deployResult.success, false);
  assert.equal(deployResult.status, 422);
  assert.equal(deployResult.title, "Supervisor Veto Active");
  assert.ok(deployResult.detail.includes("Major overhead supply cluster"));
  assert.deepEqual(deployResult.errors, ["RESISTANCE_CLUSTER", "HIGH_VOLATILITY_RISK"]);
  assert.equal(deployResult.supervisorEvaluation.recommendation, "VETO");
});

await test("Test 3: VETO_ONLY mode cannot bypass RMS risk rejection even when Gemini recommends NO_VETO", async () => {
  const db = createTestDb();
  // Candidate with excessive risk: Stop 115.00 against Entry 125.10 -> Gross risk 10.10 * 65 = ₹656.50 > ₹300 ceiling
  const excessiveRiskCandidate = {
    ...getCanonicalCandidate(),
    candidateId: "cand_excessive_risk",
    stopLoss: 115.00,
    stopDistancePts: 10.10,
    modelledNetRisk: 685.20, // Breaches ₹300 limit
  };

  const mockNoVetoClient = {
    generateContent: async () => ({
      evaluationId: "eval_no_veto_high_risk",
      candidateId: excessiveRiskCandidate.candidateId,
      recommendation: RECOMMENDATIONS.NO_VETO,
      reasonCodes: ["TREND_CONVERGENCE"],
      summary: "Trend is strong and aligned.",
      modelVersion: "gemini-2.5-flash",
      evaluatedAt: new Date().toISOString(),
    })
  };

  const deployResult = await executeCandidateDeployment({
    candidate: excessiveRiskCandidate,
    isTesting: true,
    mockPersist: true,
    supervisorMode: SUPERVISOR_MODES.VETO_ONLY,
    supervisorMockClient: mockNoVetoClient,
    db,
  });

  // RMS / Post-fill risk rejection MUST prevail! Gemini cannot bypass risk gates!
  assert.equal(deployResult.success, false);
  assert.equal(deployResult.status, 422);
  assert.ok(deployResult.detail.includes("exceeds the approved ₹300.00 ceiling") || deployResult.detail.includes("RMS"));
});

await test("Test 4: Supervisor failure in VETO_ONLY mode fails closed and blocks deployment", async () => {
  const db = createTestDb();
  const candidate = getCanonicalCandidate("cand_test_timeout_fail_closed");

  const mockTimeoutClient = {
    generateContent: async () => {
      const err = new Error("Simulated timeout abort");
      err.name = "AbortError";
      throw err;
    }
  };

  const deployResult = await executeCandidateDeployment({
    candidate,
    isTesting: true,
    mockPersist: true,
    supervisorMode: SUPERVISOR_MODES.VETO_ONLY,
    supervisorMockClient: mockTimeoutClient,
    db,
  });

  assert.equal(deployResult.success, false);
  assert.equal(deployResult.status, 422);
  assert.equal(deployResult.title, "Supervisor Veto Active");
  assert.ok(deployResult.detail.includes("Fails closed") || deployResult.detail.includes("timed out"));
});

// --- TEST GROUP 2: SHADOW Mode Non-Interference ---
console.log("\n--- TEST GROUP 2: SHADOW Mode Non-Interference ---");

await test("Test 5: SHADOW mode records recommendations without altering paper execution", async () => {
  const db = createTestDb();
  const candidate = getCanonicalCandidate("cand_test_shadow_veto");

  const mockVetoInShadowClient = {
    generateContent: async () => ({
      evaluationId: "eval_shadow_veto",
      candidateId: candidate.candidateId,
      recommendation: RECOMMENDATIONS.VETO,
      reasonCodes: ["REGIME_UNCERTAINTY"],
      summary: "Shadow advisory noted regime uncertainty.",
      modelVersion: "gemini-2.5-flash",
      evaluatedAt: new Date().toISOString(),
    })
  };

  const deployResult = await executeCandidateDeployment({
    candidate,
    isTesting: true,
    mockPersist: true,
    supervisorMode: SUPERVISOR_MODES.SHADOW,
    supervisorMockClient: mockVetoInShadowClient,
    db,
  });

  // In SHADOW mode, execution MUST succeed immediately despite VETO recommendation
  assert.equal(deployResult.success, true);
  assert.equal(deployResult.status, 201);
  assert.ok(deployResult.item);
  assert.equal(deployResult.supervisorEvaluation.mode, "SHADOW");
  assert.equal(deployResult.executedStopLoss, Math.round((deployResult.effectiveEntryPrice - 2.80) * 20) / 20);

  // Await background evaluation settlement
  const backgroundResult = await deployResult.supervisorEvaluation.promise;
  assert.equal(backgroundResult.recommendation, "VETO");
  assert.equal(backgroundResult.status, "SUCCESS");
});

await test("Test 6: SHADOW mode failure (e.g. timeout or error) never interrupts paper execution", async () => {
  const db = createTestDb();
  const candidate = {
    ...getCanonicalCandidate("cand_test_shadow_failure"),
  };

  const mockFailingClient = {
    generateContent: async () => {
      throw new Error("Gemini upstream 500 internal server error");
    }
  };

  const deployResult = await executeCandidateDeployment({
    candidate,
    isTesting: true,
    mockPersist: true,
    supervisorMode: SUPERVISOR_MODES.SHADOW,
    supervisorMockClient: mockFailingClient,
    db,
  });

  assert.equal(deployResult.success, true);
  assert.equal(deployResult.status, 201);
  const backgroundResult = await deployResult.supervisorEvaluation.promise;
  assert.equal(backgroundResult.status, "ERROR");
  assert.equal(backgroundResult.recommendation, "ABSTAIN");
});

// --- TEST GROUP 3: Decision Contract & Strict Local Validation ---
console.log("\n--- TEST GROUP 3: Decision Contract & Strict Local Validation ---");

await test("Test 7: Valid NO_VETO, VETO, and ABSTAIN responses conform to contract", async () => {
  const supervisor = new GeminiSupervisorService();
  const candidateId = "cand_test_schema";

  for (const rec of [RECOMMENDATIONS.NO_VETO, RECOMMENDATIONS.VETO, RECOMMENDATIONS.ABSTAIN]) {
    const raw = {
      evaluationId: "eval_valid_" + rec,
      candidateId,
      recommendation: rec,
      reasonCodes: ["TREND_CONVERGENCE", "MOMENTUM_ALIGNMENT"],
      summary: `Recommendation is ${rec}`,
      modelVersion: "gemini-2.5-flash",
      evaluatedAt: new Date().toISOString(),
    };

    const res = supervisor.validateSupervisorResponse(raw, candidateId);
    assert.equal(res.isValid, true);
    assert.equal(res.sanitized.recommendation, rec);
  }
});

await test("Test 8: Rejects candidateId mismatch", async () => {
  const supervisor = new GeminiSupervisorService();
  const raw = {
    evaluationId: "eval_mismatch",
    candidateId: "WRONG_ID",
    recommendation: "NO_VETO",
    reasonCodes: ["TREND_CONVERGENCE"],
    summary: "Testing mismatch",
    modelVersion: "gemini-2.5-flash",
    evaluatedAt: new Date().toISOString(),
  };

  const res = supervisor.validateSupervisorResponse(raw, "EXPECTED_ID");
  assert.equal(res.isValid, false);
  assert.ok(res.error.includes("Candidate ID mismatch"));
});

await test("Test 9: Rejects invalid recommendation enum", async () => {
  const supervisor = new GeminiSupervisorService();
  const raw = {
    evaluationId: "eval_bad_enum",
    candidateId: "cand_1",
    recommendation: "APPROVE_STRONGLY", // Prohibited enum
    reasonCodes: ["TREND_CONVERGENCE"],
    summary: "Testing enum",
    modelVersion: "gemini-2.5-flash",
    evaluatedAt: new Date().toISOString(),
  };

  const res = supervisor.validateSupervisorResponse(raw, "cand_1");
  assert.equal(res.isValid, false);
  assert.ok(res.error.includes("Invalid recommendation"));
});

await test("Test 10: Rejects invalid reason codes not in bounded list", async () => {
  const supervisor = new GeminiSupervisorService();
  const raw = {
    evaluationId: "eval_bad_code",
    candidateId: "cand_1",
    recommendation: "NO_VETO",
    reasonCodes: ["FABRICATED_REASON_CODE"], // Invalid
    summary: "Testing reason codes",
    modelVersion: "gemini-2.5-flash",
    evaluatedAt: new Date().toISOString(),
  };

  const res = supervisor.validateSupervisorResponse(raw, "cand_1");
  assert.equal(res.isValid, false);
  assert.ok(res.error.includes("Invalid reason code"));
});

await test("Test 11: Rejects adversarial extra fields (attempting to alter price, quantity, stop, target)", async () => {
  const supervisor = new GeminiSupervisorService();
  const adversarialResponse = {
    evaluationId: "eval_adversarial",
    candidateId: "cand_1",
    recommendation: "NO_VETO",
    reasonCodes: ["TREND_CONVERGENCE"],
    summary: "Adversarial payload",
    modelVersion: "gemini-2.5-flash",
    evaluatedAt: new Date().toISOString(),
    // Adversarial injected fields:
    entryPrice: 150.00,
    stopLoss: 80.00,
    target: 200.00,
    quantity: 500,
    riskBudget: 5000.00,
  };

  const res = supervisor.validateSupervisorResponse(adversarialResponse, "cand_1");
  assert.equal(res.isValid, false);
  assert.ok(res.error.includes("Unexpected field"));
  assert.ok(res.error.includes("Model is strictly forbidden from providing modified prices"));
});

// --- TEST GROUP 4: Fault Tolerance, Rate Limiting & Timeouts ---
console.log("\n--- TEST GROUP 4: Fault Tolerance, Rate Limiting & Timeouts ---");

await test("Test 12: Handles API rate limit (HTTP 429) gracefully", async () => {
  const db = createTestDb();
  const candidate = getCanonicalCandidate("cand_test_rate_limit");

  const mockRateLimitedClient = {
    generateContent: async () => {
      const err = new Error("Resource has been exhausted (e.g. check quota)");
      err.status = 429;
      throw err;
    }
  };

  const supervisor = new GeminiSupervisorService({ mockClient: mockRateLimitedClient, db });
  const evalResult = await supervisor.evaluateCandidate(candidate);

  assert.equal(evalResult.status, "RATE_LIMITED");
  assert.equal(evalResult.recommendation, "ABSTAIN");
  assert.ok(evalResult.errorMessage.includes("rate limit exceeded"));
});

await test("Test 13: Handles missing API credentials gracefully without throwing", async () => {
  const db = createTestDb();
  const candidate = getCanonicalCandidate("cand_test_missing_creds");

  const supervisor = new GeminiSupervisorService({ apiKey: "", mockClient: null, db });
  const evalResult = await supervisor.evaluateCandidate(candidate);

  assert.equal(evalResult.status, "MISSING_API_KEY");
  assert.equal(evalResult.recommendation, "ABSTAIN");
  assert.ok(evalResult.summary.includes("Gemini API key is not configured"));
});

await test("Test 14: Handles API timeout gracefully and records latency", async () => {
  const db = createTestDb();
  const candidate = getCanonicalCandidate("cand_test_timeout_latency");

  const mockTimeoutClient = {
    generateContent: async () => {
      const err = new Error("The operation was aborted due to timeout");
      err.name = "AbortError";
      throw err;
    }
  };

  const supervisor = new GeminiSupervisorService({ mockClient: mockTimeoutClient, timeoutMs: 100, db });
  const evalResult = await supervisor.evaluateCandidate(candidate);

  assert.equal(evalResult.status, "TIMEOUT");
  assert.equal(evalResult.recommendation, "ABSTAIN");
  assert.ok(evalResult.errorMessage.includes("timed out"));
  assert.ok(evalResult.latencyMs >= 0);
});

// --- TEST GROUP 5: Deduplication, Immutability & Persistence ---
console.log("\n--- TEST GROUP 5: Deduplication, Immutability & Persistence ---");

await test("Test 15: Qualified candidates are evaluated once per deduplication key", async () => {
  const db = createTestDb();
  const candidate = getCanonicalCandidate("cand_test_dedup_window");
  let apiCallCount = 0;

  const mockClient = {
    generateContent: async () => {
      apiCallCount++;
      return {
        evaluationId: "eval_dedup_1",
        candidateId: candidate.candidateId,
        recommendation: "NO_VETO",
        reasonCodes: ["TREND_CONVERGENCE"],
        summary: "Deduplication test",
        modelVersion: "gemini-2.5-flash",
        evaluatedAt: new Date().toISOString(),
      };
    }
  };

  const supervisor = new GeminiSupervisorService({ mockClient, dedupWindowMs: 60000, db });

  // Call 1
  const res1 = await supervisor.evaluateCandidate(candidate);
  assert.equal(res1.status, "SUCCESS");
  assert.equal(apiCallCount, 1);

  // Call 2 with identical candidate within dedup window
  const res2 = await supervisor.evaluateCandidate(candidate);
  assert.equal(res2.status, "DEDUPLICATED");
  assert.equal(apiCallCount, 1, "Gemini must NOT be invoked again for duplicate candidate");
});

await test("Test 16: Original candidate object remains strictly immutable after evaluation", async () => {
  const db = createTestDb();
  const candidate = getCanonicalCandidate("cand_test_immutability");
  const originalSnapshot = JSON.stringify(candidate);

  const mockClient = {
    generateContent: async () => ({
      evaluationId: "eval_immutability",
      candidateId: candidate.candidateId,
      recommendation: "NO_VETO",
      reasonCodes: ["DETERMINISTIC_AGREEMENT"],
      summary: "Immutability check",
      modelVersion: "gemini-2.5-flash",
      evaluatedAt: new Date().toISOString(),
    })
  };

  const supervisor = new GeminiSupervisorService({ mockClient, db });
  await supervisor.evaluateCandidate(candidate);

  // Assert candidate fields were not mutated
  assert.equal(JSON.stringify(candidate), originalSnapshot);
  assert.equal(candidate.referenceEntryPrice, 125.10);
  assert.equal(candidate.stopLoss, 122.30);
  assert.equal(candidate.target, 132.10);
  assert.equal(candidate.lots, 1);
  assert.equal(candidate.units, 65);
});

await test("Test 17: EDGE_STATUS strictly remains NOT_VALIDATED regardless of Gemini output", async () => {
  const db = createTestDb();
  const candidate = getCanonicalCandidate("cand_test_edge_status");

  const mockHyperBullishClient = {
    generateContent: async () => ({
      evaluationId: "eval_edge_status",
      candidateId: candidate.candidateId,
      recommendation: "NO_VETO",
      reasonCodes: ["TREND_CONVERGENCE", "MOMENTUM_ALIGNMENT"],
      summary: "Extremely high conviction setup. Claiming edge is validated.",
      modelVersion: "gemini-2.5-flash",
      evaluatedAt: new Date().toISOString(),
    })
  };

  const supervisor = new GeminiSupervisorService({ mockClient: mockHyperBullishClient, db });
  const evalResult = await supervisor.evaluateCandidate(candidate);

  // Neither candidate nor supervisor can alter EDGE_STATUS
  assert.equal(candidate.edgeStatus, "NOT_VALIDATED");
  assert.equal(evalResult.candidateSnapshot.edgeStatus, "NOT_VALIDATED");
});

await test("Test 18: Durable SQLite persistence stores evaluation events and survives restart", async () => {
  const db = createTestDb();
  const candidate = getCanonicalCandidate("cand_test_persistence");

  const mockClient = {
    generateContent: async () => ({
      evaluationId: "eval_persist_test",
      candidateId: candidate.candidateId,
      recommendation: "VETO",
      reasonCodes: ["HIGH_VOLATILITY_RISK"],
      summary: "High volatility pre-market event.",
      modelVersion: "gemini-2.5-flash",
      evaluatedAt: new Date().toISOString(),
    })
  };

  const supervisor1 = new GeminiSupervisorService({ mockClient, db });
  await supervisor1.evaluateCandidate(candidate);

  // Retrieve from DB directly
  const stored = getSupervisorEvaluationByCandidateId(candidate.candidateId, db);
  assert.notEqual(stored, null);
  assert.ok(stored.evaluationId.length > 20); // Server-authoritative UUID
  assert.equal(stored.recommendation, "VETO");
  assert.deepEqual(stored.reasonCodes, ["HIGH_VOLATILITY_RISK"]);

  // Simulate process restart with new supervisor instance connected to same DB
  const supervisor2 = new GeminiSupervisorService({ mockClient: null, db, dedupWindowMs: 60000 });
  const resAfterRestart = await supervisor2.evaluateCandidate(candidate);
  assert.equal(resAfterRestart.status, "DEDUPLICATED");
  assert.equal(resAfterRestart.evaluationId, stored.evaluationId);
});

// --- TEST GROUP 6: Non-Blocking Shadow & Server Metadata Authority ---
console.log("\n--- TEST GROUP 6: Non-Blocking Shadow & Server Metadata Authority ---");

await test("Test 19: SHADOW mode does not delay paper execution with deliberately delayed Gemini", async () => {
  const db = createTestDb();
  const candidate = getCanonicalCandidate("cand_test_delayed_shadow");

  const mockDelayedClient = {
    generateContent: async () => {
      await new Promise(resolve => setTimeout(resolve, 250));
      return {
        candidateId: candidate.candidateId,
        recommendation: "NO_VETO",
        reasonCodes: ["TREND_CONVERGENCE"],
        summary: "Trend is healthy after delayed analysis.",
      };
    }
  };

  const startMs = Date.now();
  const deployResult = await executeCandidateDeployment({
    candidate,
    isTesting: true,
    mockPersist: true,
    supervisorMode: SUPERVISOR_MODES.SHADOW,
    supervisorMockClient: mockDelayedClient,
    db,
  });
  const elapsedMs = Date.now() - startMs;

  // Paper execution critical path MUST complete well before the 250ms Gemini response arrives!
  assert.equal(deployResult.success, true);
  assert.equal(deployResult.status, 201);
  assert.ok(elapsedMs < 100, `Deployment took ${elapsedMs}ms, which is >= 100ms. Must be non-blocking!`);

  // Check that immediate DB record is durably stored as PENDING
  const pendingRecord = getSupervisorEvaluationByCandidateId(candidate.candidateId, db);
  assert.notEqual(pendingRecord, null);
  assert.equal(pendingRecord.status, "PENDING");

  // Await the asynchronous evaluation promise to prove eventual persistence
  const finalEval = await deployResult.supervisorEvaluation.promise;
  assert.equal(finalEval.status, "SUCCESS");
  assert.equal(finalEval.recommendation, "NO_VETO");
  assert.ok(finalEval.latencyMs >= 240, `Recorded latency was ${finalEval.latencyMs}ms, expected >= 240ms`);

  // Check that DB record transitioned to SUCCESS
  const finalRecord = getSupervisorEvaluationByCandidateId(candidate.candidateId, db);
  assert.equal(finalRecord.status, "SUCCESS");
  assert.equal(finalRecord.recommendation, "NO_VETO");
});

await test("Test 20: Handles rejected promise without unhandled rejections", async () => {
  const db = createTestDb();
  const candidate = getCanonicalCandidate("cand_test_rejection_resilience");

  const mockRejectingClient = {
    generateContent: async () => {
      throw new Error("Simulated upstream network disruption / socket reset");
    }
  };

  const deployResult = await executeCandidateDeployment({
    candidate,
    isTesting: true,
    mockPersist: true,
    supervisorMode: SUPERVISOR_MODES.SHADOW,
    supervisorMockClient: mockRejectingClient,
    db,
  });

  // Paper execution completes successfully regardless of supervisor crash
  assert.equal(deployResult.success, true);
  assert.equal(deployResult.status, 201);

  // Await background promise to ensure clean error persistence and 0 unhandled rejections
  const finalEval = await deployResult.supervisorEvaluation.promise;
  assert.equal(finalEval.status, "ERROR");
  assert.ok(finalEval.errorMessage.includes("Simulated upstream network disruption"));

  const stored = getSupervisorEvaluationByCandidateId(candidate.candidateId, db);
  assert.equal(stored.status, "ERROR");
});

await test("Test 21: Model metadata is strictly server-authoritative (spoofed client metadata overridden)", async () => {
  const db = createTestDb();
  const candidate = getCanonicalCandidate("cand_test_spoofed_metadata");

  const mockSpoofedClient = {
    generateContent: async () => ({
      evaluationId: "spoofed_eval_id_666",
      candidateId: candidate.candidateId,
      recommendation: "NO_VETO",
      reasonCodes: ["TREND_CONVERGENCE"],
      summary: "Attempting to spoof model version and timestamps.",
      modelVersion: "rogue-agent-v9",
      evaluatedAt: "1970-01-01T00:00:00.000Z",
    })
  };

  const supervisor = new GeminiSupervisorService({ mockClient: mockSpoofedClient, db });
  const evalResult = await supervisor.evaluateCandidate(candidate, {}, { mode: SUPERVISOR_MODES.VETO_ONLY, awaitShadow: true });

  // Evaluation ID must be server-generated UUID, NOT the client spoofed ID
  assert.notEqual(evalResult.evaluationId, "spoofed_eval_id_666");
  assert.ok(evalResult.evaluationId.length > 20);

  // Model version must be server configured model version
  assert.equal(evalResult.modelVersion, "gemini-2.5-flash");
  assert.notEqual(evalResult.modelVersion, "rogue-agent-v9");

  // Timestamp must be recent server timestamp
  assert.notEqual(evalResult.evaluatedAt, "1970-01-01T00:00:00.000Z");
  assert.ok(new Date(evalResult.evaluatedAt).getFullYear() >= 2026);

  // Verify DB record matches server-authoritative values
  const stored = getSupervisorEvaluationByCandidateId(candidate.candidateId, db);
  assert.equal(stored.evaluationId, evalResult.evaluationId);
  assert.equal(stored.modelVersion, "gemini-2.5-flash");
});

// Summary
console.log("\n===============================================================================");
console.log(`  GEMINI SUPERVISOR TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
console.log("===============================================================================");

try {
  paperTradeEngine?.stop?.();
} catch {}

for (const d of openDbs) {
  try {
    d.close();
  } catch {}
}

const handles = process._getActiveHandles ? process._getActiveHandles() : [];
for (const h of handles) {
  if (typeof h.unref === "function") {
    try { h.unref(); } catch {}
  }
}

process.exitCode = failedCount > 0 ? 1 : 0;

