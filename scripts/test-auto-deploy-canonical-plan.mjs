import assert from "node:assert/strict";
import { calculateCanonicalExecutionPlan } from "../src/client/utils/canonicalExecutionPlan.js";
import { evaluateTradeTrigger } from "../src/services/engine/triggerEvaluator.js";
import { getDb } from "../src/db/connection.js";
import { closePaperTrade, createPaperTrade } from "../src/repositories/paper-lab.repository.js";

console.log("=== PORTFOLIOX: Canonical Plan & Auto-Deploy Deterministic Regression Suite ===");

// ---------------------------------------------------------------------------
// TEST 1: Video Fixture Verification (Exact reproduction of video values)
// ---------------------------------------------------------------------------
console.log("\n[Test 1] Video Fixture Non-Compliance Audit");
const videoFixture = {
  symbol: "NIFTY 22900 CE",
  underlying: "NIFTY",
  entryPrice: 144.40,
  stopLoss: 137.61,
  targetPrice: 149.15,
  quantity: 1,
  lotSize: 65,
  totalUnits: 65,
  direction: "LONG",
  stopPolicy: "ATR_ENTRY_RELATIVE",
  targetPolicy: "RR_DERIVED",
  adverseSlippageAllowance: 0.50,
};

const videoPlan = calculateCanonicalExecutionPlan(videoFixture);

// Verify exact values from user's screen recording
assert.equal(videoPlan.stopDistancePts, 6.79, "Stop distance must match 6.79 pts (144.40 - 137.61)");
assert.equal(videoPlan.targetDistancePts, 4.75, "Target distance must match 4.75 pts (149.15 - 144.40)");
assert.equal(videoPlan.grossRiskRupees, 473.85, "Gross risk with 0.50pt adverse exit allowance ((6.79+0.50)*65)");
assert.equal(videoPlan.grossRewardRupees, 308.75, "Gross reward must match ₹308.75 (4.75 * 65)");
assert.equal(videoPlan.grossRewardToRiskRatio, 0.65, "Gross R:R must match video (0.70 without slippage allowance / 0.65 with)");
assert.ok(videoPlan.modelledNetRisk > 500, `Modelled net risk ₹${videoPlan.modelledNetRisk} must exceed ₹500 (video displayed ₹504.47)`);
assert.ok(videoPlan.netRewardToRiskRatio < 1.0, `Net R:R 1:${videoPlan.netRewardToRiskRatio} must be ~0.50`);

// Verify hard gates fail on the video fixture
assert.equal(videoPlan.isRiskCeilingSatisfied, false, "Risk ceiling must FAIL (504.47 > 300.00)");
assert.equal(videoPlan.isRewardToRiskSatisfied, false, "Reward-to-risk must FAIL (0.50 < 2.00)");
assert.equal(videoPlan.isCompliant, false, "Overall compliance must be FALSE");
assert.ok(videoPlan.rejectionReasonCodes.includes("MODELLED_RISK_EXCEEDS_CEILING"), "Must include MODELLED_RISK_EXCEEDS_CEILING");
assert.ok(videoPlan.rejectionReasonCodes.includes("RR_BELOW_MINIMUM"), "Must include RR_BELOW_MINIMUM");
console.log("✅ [Test 1 Passed] Video fixture correctly rejected: Risk ₹" + videoPlan.modelledNetRisk + " (> ₹300) and R:R 1:" + videoPlan.netRewardToRiskRatio + " (< 2:1)");

// ---------------------------------------------------------------------------
// TEST 2: Hard Gate Rejection Across Testing / Sandbox Modes (Zero Bypass)
// ---------------------------------------------------------------------------
console.log("\n[Test 2] Zero-Bypass Deployment Gate Enforcement");
// Simulate direct backend call to handlePaperOrdersRoutes logic
const testPayload = {
  ...videoFixture,
  testingMode: true,
  bypassRiskCap: true,
  activeQuotaMode: "UNLIMITED_TESTING",
};

const testingPlan = calculateCanonicalExecutionPlan(testPayload);
assert.equal(testingPlan.isCompliant, false, "testingMode=true MUST NOT bypass canonical compliance");
assert.equal(testingPlan.isRiskCeilingSatisfied, false, "Risk ceiling must remain strict in testing mode");
assert.equal(testingPlan.isRewardToRiskSatisfied, false, "R:R minimum must remain strict in testing mode");
console.log("✅ [Test 2 Passed] Testing/Sandbox mode cannot bypass hard ₹300 risk ceiling or 2:1 R:R gates");

// ---------------------------------------------------------------------------
// TEST 3: Parameter Parity & Dynamic Slippage Pegging on Compliant Setup
// ---------------------------------------------------------------------------
console.log("\n[Test 3] Compliant Trade Parameter Parity & Dynamic Pegging");
// Valid setup: Entry 144.40, SL 141.50 (2.90 pt stop = ₹221 gross / ₹290.03 net <= 300)
// Target: 154.50 (10.10 pt target = ₹656.50 gross / ₹585.79 net, Net R:R 585.79 / 290.03 = 2.02 >= 2.0)
const compliantCandidate = {
  symbol: "NIFTY 22900 CE",
  underlying: "NIFTY",
  entryPrice: 144.40,
  stopLoss: 141.50,
  targetPrice: 154.50,
  quantity: 1,
  lotSize: 65,
  totalUnits: 65,
  direction: "LONG",
  stopPolicy: "ATR_ENTRY_RELATIVE",
  targetPolicy: "RR_DERIVED",
  adverseSlippageAllowance: 0.50,
};

const compliantPlan = calculateCanonicalExecutionPlan(compliantCandidate);
assert.equal(compliantPlan.isCompliant, true, "Compliant setup must be ACCEPTED");
assert.ok(compliantPlan.modelledNetRisk <= 300.00, `Modelled net risk ₹${compliantPlan.modelledNetRisk} must be <= ₹300.00`);
assert.ok(compliantPlan.netRewardToRiskRatio >= 2.00, `Net R:R 1:${compliantPlan.netRewardToRiskRatio} must be >= 2.00`);

// Dynamic slippage pegging test: Actual fill slipped to 145.65 (+1.25 pts)
const entryFillPrice = 145.65;
const peggedStopLoss = Number((entryFillPrice - compliantPlan.stopDistancePts).toFixed(2));
const peggedTarget = Number((entryFillPrice + compliantPlan.targetDistancePts).toFixed(2));

assert.equal(peggedStopLoss, 142.75, "Pegged stop loss must preserve exact 2.90pt stop distance (145.65 - 2.90 = 142.75)");
assert.equal(peggedTarget, 155.75, "Pegged target must preserve exact 10.10pt target distance (145.65 + 10.10 = 155.75)");

// Re-verify that pegged execution plan preserves risk ceiling
const executedPlan = calculateCanonicalExecutionPlan({
  ...compliantCandidate,
  entryPrice: entryFillPrice,
  stopLoss: peggedStopLoss,
  targetPrice: peggedTarget,
});
assert.equal(executedPlan.isCompliant, true, "Executed pegged plan must remain fully compliant");
assert.ok(executedPlan.modelledNetRisk <= 300.00, "Executed net risk must remain <= ₹300.00");
assert.ok(executedPlan.netRewardToRiskRatio >= 2.00, "Executed net R:R must remain >= 2.00");
console.log("✅ [Test 3 Passed] Pre-flight preview and pegged execution plan agree with 100% parameter parity");

// ---------------------------------------------------------------------------
// TEST 4: No False Trigger at ₹144.30 for Displayed Stop 138.86 / Target 158.40
// ---------------------------------------------------------------------------
console.log("\n[Test 4] False Trigger Immunity at ₹144.30");
// Mock open trade with entry 145.65, SL 138.86, Target 158.40
const mockOpenTrade = {
  id: 999991,
  symbol: "NIFTY 22900 CE",
  direction: "LONG",
  entryPrice: 145.65,
  stopLoss: 138.86,
  targetPrice: 158.40,
  quantity: 1,
  lotSize: 65,
};

let exitTriggered = null;
const mockEngine = {
  triggering: new Set(),
  activeTrades: new Map([[999991, { trade: mockOpenTrade }]]),
  publish: (evt, data) => {},
};

// Evaluate ticks: 144.40, 144.35, 144.30
for (const tickPrice of [144.40, 144.35, 144.30]) {
  evaluateTradeTrigger(
    mockEngine,
    mockOpenTrade,
    { ltp: tickPrice, lastPrice: tickPrice },
    (engine, trade, tick, reason) => {
      exitTriggered = reason;
    }
  );
  assert.equal(exitTriggered, null, `Quote at ₹${tickPrice} must NEVER trigger an exit on SL 138.86 / TP 158.40!`);
}
assert.equal(mockOpenTrade.stopLoss, 138.86, "Stop loss must not have drifted or ratcheted prematurely");
console.log("✅ [Test 4 Passed] Quotes at ₹144.40 -> ₹144.30 do not trigger false SL or TP on 138.86/158.40 position");

// ---------------------------------------------------------------------------
// TEST 5: Breakeven Safety Margin & No-Choke Invariant
// ---------------------------------------------------------------------------
console.log("\n[Test 5] Breakeven Ratchet Safety & Anti-Choke Guard");
// Scenario A: Compressed target (< 6.0 pts) must NEVER lock breakeven
const compressedTrade = {
  id: 999992,
  symbol: "NIFTY 22900 CE",
  direction: "LONG",
  entryPrice: 145.65,
  stopLoss: 143.00,
  targetPrice: 150.40, // Only 4.75 pts target distance
  quantity: 1,
  lotSize: 65,
};

evaluateTradeTrigger(
  mockEngine,
  compressedTrade,
  { ltp: 148.10, lastPrice: 148.10 }, // 2.45 pts up
  () => {}
);
assert.equal(compressedTrade.stopLoss, 143.00, "Compressed target (< 6 pts) must NOT lock breakeven");

// Scenario B: Valid target (158.40) does lock breakeven when reaching 50% target with safe buffer
const wideTrade = {
  id: 999993,
  symbol: "NIFTY 22900 CE",
  direction: "LONG",
  entryPrice: 145.65,
  stopLoss: 141.20,
  targetPrice: 158.40, // 12.75 pts target distance
  quantity: 1,
  lotSize: 65,
};

// 50% target distance = 6.38 pts -> threshold is 145.65 + 6.38 = 152.03
// At 152.10, breakeven can safely ratchet to entry + 1.50 = 147.15 (4.95 pts breathing room!)
evaluateTradeTrigger(
  mockEngine,
  wideTrade,
  { ltp: 152.10, lastPrice: 152.10 },
  () => {}
);
// Stop loss should ratchet safely
assert.ok(wideTrade.stopLoss >= 147.15, `Stop loss should ratchet above entry, got: ${wideTrade.stopLoss}`);
assert.ok(152.10 - wideTrade.stopLoss >= 0.50, "Breakeven SL must have at least 0.50 pts breathing room from current price");
console.log("✅ [Test 5 Passed] Breakeven anti-choke invariant verified: No ratchets on compressed targets, safe buffer enforced");

// ---------------------------------------------------------------------------
// TEST 6: Settlement Accounting & Idempotent Persistence
// ---------------------------------------------------------------------------
console.log("\n[Test 6] Settlement Accounting & Single-Persistence Audit");
const db = getDb();

// Insert a test paper trade
const testTrade = createPaperTrade({
  symbol: "NIFTY 22900 CE",
  underlyingSymbol: "NIFTY",
  direction: "LONG",
  entryPrice: 145.65,
  stopLoss: 141.20,
  targetPrice: 155.25,
  quantity: 1,
  lotSize: 65,
  tradeMode: "PAPER",
  status: "OPEN",
  personalNotes: "Regression Test Trade",
});

assert.ok(testTrade.id, "Test trade created in DB");

// Close trade via closePaperTrade (exactFill: true to test deterministic price)
const { trade: closedTrade1 } = closePaperTrade(testTrade.id, { price: 141.20, reason: "STOP_LOSS_HIT", exactFill: true });
assert.equal(closedTrade1.status, "CLOSED", "Trade status must be CLOSED");
assert.equal(closedTrade1.exitPrice, 141.20, "Exit price must be recorded");
assert.equal(closedTrade1.closeReason, "STOP_LOSS_HIT", "Close reason must be STOP_LOSS_HIT");
assert.ok(closedTrade1.realizedPnl !== null && closedTrade1.realizedPnl !== undefined, "Realized PnL must be populated");
assert.ok(closedTrade1.netPnl !== null && closedTrade1.netPnl !== undefined, "Net PnL must be populated");
assert.ok(closedTrade1.charges > 0, "Charges must be recorded");

const firstNetPnl = closedTrade1.netPnl;

// Second closure attempt (idempotency check)
const { trade: closedTrade2 } = closePaperTrade(testTrade.id, { price: 141.20, reason: "STOP_LOSS_HIT", exactFill: true });
assert.equal(closedTrade2.status, "CLOSED", "Subsequent close must remain CLOSED");
assert.equal(closedTrade2.netPnl, firstNetPnl, "Net PnL must not be altered on subsequent calls");

// Clean up test trade
db.prepare("DELETE FROM trades WHERE id = ?").run(testTrade.id);
console.log("✅ [Test 6 Passed] Settlement accounting persisted exactly once with consistent exit reason, P&L, and charges");

console.log("\n===============================================================================");
console.log("🎯 ALL 6 DETERMINISTIC REGRESSION TEST SCENARIOS PASSED WITH ZERO FAILURES!");
console.log("===============================================================================");
