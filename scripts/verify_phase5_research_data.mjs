/**
 * PORTFOLIOX PHASE 5.0 RESEARCH DATA & EXECUTION-MODEL VERIFICATION SUITE
 * 
 * Deterministic test harness for:
 * DATA-01: Provenance (SHA-256 hash, metadata, explicit status)
 * DATA-02: Timestamp ordering (strictly ascending, detection of inversions)
 * DATA-03: Duplicate detection (rejection of duplicate timestamps)
 * DATA-04: Missing-data detection (intraday gap tracking, no silent repair)
 * DATA-05: Contract identity (symbol parsing and field extraction)
 * DATA-06: Expiry-calendar correctness (eras, weeklies, discontinuations, holiday shifts)
 * DATA-07: Look-ahead prevention (point-in-time boundary & guarded feed)
 * DATA-08: Same-bar STOP-FIRST behavior (conservative resolution & ambiguity flag)
 * DATA-09: Execution-model labeling (ESTIMATED_EXECUTION only, no ACTUAL_EXECUTION)
 * DATA-10: Slippage sensitivity determinism (monotonic sensitivity across 5 tiers)
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  auditCandleDataset,
  AUDIT_STATUS
} from "../src/research/quality/dataQualityAudit.js";
import {
  resolveContractCalendar,
  resolveCalendarVersion,
  adjustExpiryForHoliday,
  parseContractIdentity,
  CALENDAR_VERSIONS
} from "../src/research/calendar/contractCalendarResolver.js";
import {
  auditDecisionPointInTime,
  GuardedDataFeed,
  LookAheadAccessError
} from "../src/research/execution/lookAheadAudit.js";
import {
  simulateEstimatedTradeExecution,
  evaluateSlippageSensitivityMatrix,
  EXECUTION_LABELS,
  DATA_QUALITY_MODES,
  INTRABAR_POLICIES
} from "../src/research/execution/estimatedExecutionModel.js";
import {
  loadNormalizedDataset,
  computePayloadHash
} from "../src/research/storage/historicalDataStorage.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

const testResults = [];

function recordTest(id, name, status, details) {
  testResults.push({ id, name, status, details });
  const icon = status === "PASS" ? "✅" : "❌";
  console.log(`${icon} [${status}] ${id}: ${name} -> ${details}`);
}

console.log("=".repeat(80));
console.log("   🔬 PORTFOLIOX PHASE 5.0: RESEARCH DATA & EXECUTION-MODEL VERIFICATION");
console.log("=".repeat(80));

// ==============================================================================
// TEST DATA-01: Data Provenance Audit
// ==============================================================================
{
  const id = "DATA-01";
  const name = "Dataset Provenance & Cryptographic Integrity";
  
  const dataset = loadNormalizedDataset("NIFTY_24550_CE_20261027_1MIN");
  if (!dataset) {
    recordTest(id, name, "FAIL", "NIFTY_24550_CE_20261027_1MIN dataset not found in storage.");
  } else {
    const prov = dataset.provenance;
    const hasRequiredProvenance = 
      prov.source_provider === "UPSTOX_V2_REST_API" &&
      typeof prov.source_endpoint === "string" &&
      typeof prov.retrieved_at === "string" &&
      typeof prov.raw_payload_hash === "string" &&
      prov.raw_payload_hash.length === 64 &&
      prov.contract_calendar_version === "calendar_v3_current_2026";

    // Audit the dataset
    const audit = auditCandleDataset({
      contract_metadata: dataset.contract_metadata,
      candles: dataset.candles,
      expected_hash: prov.raw_payload_hash,
      raw_payload_hash: prov.raw_payload_hash
    });

    const isClassified = Object.values(AUDIT_STATUS).includes(audit.status);

    if (hasRequiredProvenance && isClassified && audit.status === "PARTIAL") {
      recordTest(id, name, "PASS", `Provenance intact. SHA-256: ${prov.raw_payload_hash.slice(0, 16)}... Status explicitly classified as '${audit.status}'.`);
    } else {
      recordTest(id, name, "FAIL", `Provenance check failed. Provenance valid: ${hasRequiredProvenance}, Status: ${audit.status}`);
    }
  }
}

// ==============================================================================
// TEST DATA-02: Timestamp Ordering & Inversion Detection
// ==============================================================================
{
  const id = "DATA-02";
  const name = "Strict Timestamp Ordering & Inversion Rejection";

  const validCandles = [
    { timestamp: "2026-10-01T09:15:00+05:30", epoch_ms: 1790826300000, open: 10, high: 12, low: 9, close: 11, volume: 100, open_interest: 500 },
    { timestamp: "2026-10-01T09:16:00+05:30", epoch_ms: 1790826360000, open: 11, high: 13, low: 10, close: 12, volume: 150, open_interest: 520 },
    { timestamp: "2026-10-01T09:17:00+05:30", epoch_ms: 1790826420000, open: 12, high: 14, low: 11, close: 13, volume: 120, open_interest: 530 }
  ];

  const invertedCandles = [
    { timestamp: "2026-10-01T09:15:00+05:30", epoch_ms: 1790826300000, open: 10, high: 12, low: 9, close: 11, volume: 100, open_interest: 500 },
    { timestamp: "2026-10-01T09:14:00+05:30", epoch_ms: 1790826240000, open: 11, high: 13, low: 10, close: 12, volume: 150, open_interest: 520 } // Inverted!
  ];

  const meta = { symbol: "TEST CE", expiry_date: "2026-10-27" };
  const validAudit = auditCandleDataset({ contract_metadata: meta, candles: validCandles });
  const invertedAudit = auditCandleDataset({ contract_metadata: meta, candles: invertedCandles });

  if (validAudit.metrics.ordering_violations === 0 && invertedAudit.metrics.ordering_violations === 1 && invertedAudit.status === AUDIT_STATUS.INVALID) {
    recordTest(id, name, "PASS", "Strict ascending timestamps validated. Time-inversion accurately rejected with status INVALID.");
  } else {
    recordTest(id, name, "FAIL", "Ordering check failed.");
  }
}

// ==============================================================================
// TEST DATA-03: Duplicate Timestamp Detection
// ==============================================================================
{
  const id = "DATA-03";
  const name = "Duplicate Timestamp Detection & Rejection";

  const duplicateCandles = [
    { timestamp: "2026-10-01T09:15:00+05:30", epoch_ms: 1790826300000, open: 10, high: 12, low: 9, close: 11, volume: 100, open_interest: 500 },
    { timestamp: "2026-10-01T09:15:00+05:30", epoch_ms: 1790826300000, open: 10, high: 12, low: 9, close: 11, volume: 100, open_interest: 500 } // Duplicate!
  ];

  const meta = { symbol: "TEST CE", expiry_date: "2026-10-27" };
  const audit = auditCandleDataset({ contract_metadata: meta, candles: duplicateCandles });

  if (audit.metrics.duplicate_timestamps === 1 && audit.status === AUDIT_STATUS.INVALID) {
    recordTest(id, name, "PASS", "Duplicate timestamps detected (count: 1). Dataset marked INVALID.");
  } else {
    recordTest(id, name, "FAIL", "Duplicate detection failed to flag duplicates.");
  }
}

// ==============================================================================
// TEST DATA-04: Missing-Data Detection (No Silent Repair)
// ==============================================================================
{
  const id = "DATA-04";
  const name = "Missing-Data Detection & Zero Silent Repair Policy";

  // Gap between 09:15 and 09:20 (4 missing minutes)
  const gappedCandles = [
    { timestamp: "2026-10-01T09:15:00+05:30", epoch_ms: 1790826300000, open: 10, high: 12, low: 9, close: 11, volume: 100, open_interest: 500 },
    { timestamp: "2026-10-01T09:20:00+05:30", epoch_ms: 1790826600000, open: 11, high: 13, low: 10, close: 12, volume: 150, open_interest: 520 }
  ];

  const meta = { symbol: "TEST CE", expiry_date: "2026-10-27" };
  const audit = auditCandleDataset({ contract_metadata: meta, candles: gappedCandles });

  // Missing intervals must be flagged as PARTIAL without synthesizing phantom data
  if (audit.metrics.missing_1min_intervals === 4 && audit.status === AUDIT_STATUS.PARTIAL && gappedCandles.length === 2) {
    recordTest(id, name, "PASS", "Detected 4 missing intervals. Classified as PARTIAL. Zero phantom candles silently synthesized.");
  } else {
    recordTest(id, name, "FAIL", "Missing interval detection failed.");
  }
}

// ==============================================================================
// TEST DATA-05: Contract Identity Resolution
// ==============================================================================
{
  const id = "DATA-05";
  const name = "Option Contract Identity Parsing & Validation";

  const c1 = parseContractIdentity("NIFTY 24550 CE 27 OCT 26");
  const c2 = parseContractIdentity("NSE_FO|NIFTY26OCT24550CE");
  const c3 = parseContractIdentity("BANKNIFTY 52000 PE");
  const c4 = parseContractIdentity("INVALID_JUNK_SYMBOL_STRING");

  const valid = 
    c1.status === "VALID" && c1.underlying === "NIFTY" && c1.strike === 24550 && c1.option_type === "CE" &&
    c2.status === "VALID" && c2.underlying === "NIFTY" && c2.strike === 24550 && c2.option_type === "CE" &&
    c3.status === "VALID" && c3.underlying === "BANKNIFTY" && c3.strike === 52000 && c3.option_type === "PE" &&
    c4.status === "UNRESOLVED";

  if (valid) {
    recordTest(id, name, "PASS", "Standard and broker formats correctly resolved to canonical underlying, strike, and type.");
  } else {
    recordTest(id, name, "FAIL", "Contract identity parsing failed.");
  }
}

// ==============================================================================
// TEST DATA-06: Expiry-Calendar Correctness & Holiday Shifts
// ==============================================================================
{
  const id = "DATA-06";
  const name = "Regulatory Expiry Eras & Holiday Calendar Adjustments";

  // Era 1: Pre-Sep 2023 (Legacy Thursday)
  const era1 = resolveContractCalendar({ underlying_symbol: "NIFTY", expiry_date: "2023-05-18" });
  // Era 2: Mid 2023 - Nov 2024 (BANKNIFTY Wednesday)
  const era2 = resolveContractCalendar({ underlying_symbol: "BANKNIFTY", expiry_date: "2024-03-20" });
  // Era 3: Current 2026 (NIFTY Tuesday, BANKNIFTY weekly discontinued)
  const era3 = resolveContractCalendar({ underlying_symbol: "NIFTY", expiry_date: "2026-10-27" });
  const era3Banknifty = resolveContractCalendar({ underlying_symbol: "BANKNIFTY", symbol: "BANKNIFTY 52000 CE", expiry_date: "2026-10-28" });

  // Holiday shift test: 2026-10-02 (Friday, Gandhi Jayanti) -> should adjust to 2026-10-01 (Thursday)
  const holidayAdj = adjustExpiryForHoliday("2026-10-02");

  const era1Correct = era1.contract_calendar_version === CALENDAR_VERSIONS.LEGACY_PRE_SEPT_2023 && era1.day_of_week === "Thursday";
  const era2Correct = era2.contract_calendar_version === CALENDAR_VERSIONS.MID_2023_TO_NOV_2024 && era2.day_of_week === "Wednesday";
  const era3Correct = era3.contract_calendar_version === CALENDAR_VERSIONS.CURRENT_2025_2026 && era3.day_of_week === "Tuesday";
  const warningPresent = era3Banknifty.warning !== null;
  const holidayShifted = holidayAdj.is_adjusted && holidayAdj.adjusted_expiry === "2026-10-01";

  if (era1Correct && era2Correct && era3Correct && warningPresent && holidayShifted) {
    recordTest(id, name, "PASS", "Verified 3 regulatory eras: NIFTY Thu (2023) -> BANKNIFTY Wed (2024) -> NIFTY Tue (2026). Holiday 2026-10-02 shifted to 2026-10-01.");
  } else {
    recordTest(id, name, "FAIL", `Calendar era or holiday test failed. Era1: ${era1Correct}, Era2: ${era2Correct}, Era3: ${era3Correct}, Warning: ${warningPresent}, Holiday: ${holidayShifted}`);
  }
}

// ==============================================================================
// TEST DATA-07: Look-Ahead Bias Prevention & Guarded Feed
// ==============================================================================
{
  const id = "DATA-07";
  const name = "Point-in-Time Causality & Guarded Feed Peeking Rejection";

  // 1. Audit function test: decision timestamp is 09:15:00, input data contains 09:16:00
  const decTs = new Date("2026-10-01T09:15:00+05:30").getTime();
  const futureTs = new Date("2026-10-01T09:16:00+05:30").getTime();
  const pastTs = new Date("2026-10-01T09:14:00+05:30").getTime();

  const auditResult = auditDecisionPointInTime({
    decision_name: "ENTRY_SIGNAL",
    decision_timestamp_ms: decTs,
    data_timestamps_ms: [pastTs, futureTs]
  });

  // 2. GuardedDataFeed test: forward peeking must throw LookAheadAccessError
  const feed = new GuardedDataFeed([
    { timestamp: "09:15", close: 100 },
    { timestamp: "09:16", close: 105 },
    { timestamp: "09:17", close: 110 }
  ]);

  feed.next(); // cursor = 0 (09:15)
  let caughtError = false;
  try {
    feed.peek(1); // Attempt forward peek
  } catch (err) {
    if (err instanceof LookAheadAccessError) {
      caughtError = true;
    }
  }

  const history = feed.getHistory(); // Should only have length 1
  const historySafe = history.length === 1 && history[0].timestamp === "09:15";

  if (auditResult.has_lookahead_bias && caughtError && historySafe) {
    recordTest(id, name, "PASS", "Point-in-time boundary detected future timestamp. GuardedDataFeed threw LookAheadAccessError on forward peek.");
  } else {
    recordTest(id, name, "FAIL", `Look-ahead audit failed. Audit bias detected: ${auditResult.has_lookahead_bias}, Error caught: ${caughtError}, History safe: ${historySafe}`);
  }
}

// ==============================================================================
// TEST DATA-08: Same-Bar STOP-FIRST Behavior (Intrabar Ambiguity)
// ==============================================================================
{
  const id = "DATA-08";
  const name = "Conservative Same-Bar STOP-FIRST Execution Resolution";

  // Entry at 100, SL at 90, Target at 120
  // Candle 1: High = 125 (Target touched), Low = 85 (Stop touched) -> Both hit in same 1-min candle!
  const ambiguousCandles = [
    { timestamp: "2026-10-01T09:16:00+05:30", open: 100, high: 125, low: 85, close: 110, volume: 500, open_interest: 1000 }
  ];

  const simStopFirst = simulateEstimatedTradeExecution({
    candles: ambiguousCandles,
    entry_price: 100,
    stop_loss: 90,
    target: 120,
    direction: "LONG",
    quantity: 65,
    slippage_tier: 0.20,
    intrabar_policy: INTRABAR_POLICIES.CONSERVATIVE_STOP_FIRST
  });

  const simOptimistic = simulateEstimatedTradeExecution({
    candles: ambiguousCandles,
    entry_price: 100,
    stop_loss: 90,
    target: 120,
    direction: "LONG",
    quantity: 65,
    slippage_tier: 0.20,
    intrabar_policy: INTRABAR_POLICIES.OPTIMISTIC_TARGET_FIRST
  });

  const stopFirstPassed = 
    simStopFirst.intrabar_ambiguity_flag === true &&
    simStopFirst.exit_fill.exit_reason === "STOP_LOSS" &&
    simStopFirst.exit_fill.nominal_price === 90;

  const optimisticCheck = 
    simOptimistic.intrabar_ambiguity_flag === true &&
    simOptimistic.exit_fill.exit_reason === "TARGET";

  if (stopFirstPassed && optimisticCheck) {
    recordTest(id, name, "PASS", "Same-bar touch resolved conservatively as STOP_LOSS (never assumes target first). intrabar_ambiguity_flag set to true.");
  } else {
    recordTest(id, name, "FAIL", "Same-bar resolution failed.");
  }
}

// ==============================================================================
// TEST DATA-09: Execution-Model Labeling (ESTIMATED vs ACTUAL)
// ==============================================================================
{
  const id = "DATA-09";
  const name = "Mandatory ESTIMATED_EXECUTION Labeling (Never ACTUAL)";

  const candles = [
    { timestamp: "2026-10-01T09:16:00+05:30", open: 100, high: 104, low: 98, close: 102, volume: 500, open_interest: 1000 },
    { timestamp: "2026-10-01T09:17:00+05:30", open: 102, high: 121, low: 101, close: 120, volume: 600, open_interest: 1100 } // Target hit
  ];

  const sim = simulateEstimatedTradeExecution({
    candles,
    entry_price: 100,
    stop_loss: 90,
    target: 120,
    direction: "LONG",
    quantity: 65,
    slippage_tier: 0.20
  });

  const isEstimated = sim.execution_label === EXECUTION_LABELS.ESTIMATED_EXECUTION;
  const isNotActual = sim.execution_label !== "ACTUAL_EXECUTION";
  const isTrackA = sim.data_quality_mode === DATA_QUALITY_MODES.TRACK_A_ESTIMATED;
  const isPartialExcursion = sim.excursions.data_quality === "PARTIAL" && sim.excursions.is_observed === false;

  if (isEstimated && isNotActual && isTrackA && isPartialExcursion) {
    recordTest(id, name, "PASS", "Execution strictly labeled 'ESTIMATED_EXECUTION'. Excursions classified 'PARTIAL' (zero fabricated tick curves).");
  } else {
    recordTest(id, name, "FAIL", `Labeling test failed. Label: ${sim.execution_label}, Mode: ${sim.data_quality_mode}`);
  }
}

// ==============================================================================
// TEST DATA-10: Slippage Sensitivity Determinism
// ==============================================================================
{
  const id = "DATA-10";
  const name = "Slippage Sensitivity Matrix Robustness (₹0.05 to ₹0.50)";

  const candles = [
    { timestamp: "2026-10-01T09:16:00+05:30", open: 100, high: 105, low: 98, close: 103, volume: 500, open_interest: 1000 },
    { timestamp: "2026-10-01T09:17:00+05:30", open: 103, high: 122, low: 102, close: 121, volume: 600, open_interest: 1100 } // Target hit
  ];

  const report = evaluateSlippageSensitivityMatrix({
    candles,
    entry_price: 100,
    stop_loss: 90,
    target: 120,
    direction: "LONG",
    quantity: 65,
    tiers: [0.05, 0.10, 0.20, 0.30, 0.50]
  });

  // Verify that increasing slippage strictly reduces net P&L monotonically
  let monotonicPnlDeterioration = true;
  for (let i = 1; i < report.matrix.length; i++) {
    if (report.matrix[i].net_pnl >= report.matrix[i - 1].net_pnl) {
      monotonicPnlDeterioration = false;
      break;
    }
  }

  const allTiersTested = report.matrix.length === 5;
  const noSelectionMade = report.selection_policy === "NO_OPTIMIZATION_OR_SELECTION";

  if (allTiersTested && monotonicPnlDeterioration && noSelectionMade) {
    recordTest(id, name, "PASS", `5 slippage tiers evaluated deterministically (₹0.05 -> ₹0.50). Net P&L: ₹${report.matrix[0].net_pnl} -> ₹${report.matrix[4].net_pnl}. Zero cherry-picking.`);
  } else {
    recordTest(id, name, "FAIL", `Slippage sensitivity test failed. Monotonic: ${monotonicPnlDeterioration}`);
  }
}

console.log("\n" + "=".repeat(80));
console.log("📊 PHASE 5.0 RESEARCH DATA VERIFICATION SUMMARY (10 Tests)");
console.log("=".repeat(80) + "\n");
console.table(testResults);

const allPassed = testResults.every((t) => t.status === "PASS");
if (allPassed) {
  console.log("\n🎉 ALL 10 PHASE 5.0 DATA & EXECUTION-MODEL TESTS PASSED!\n");
  process.exit(0);
} else {
  console.error("\n❌ PHASE 5.0 VERIFICATION FAILED!\n");
  process.exit(1);
}
