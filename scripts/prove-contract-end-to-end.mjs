/**
 * End-to-End Contract Ingestion, Normalization, Audit & Registry Verification Script
 * Research Data Foundation - Workstream B (Step B2)
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { resolveContractCalendar } from "../src/research/calendar/contractCalendarResolver.js";
import { ingestFromUpstox } from "../src/research/ingestion/dataIngestionInterface.js";
import { persistNormalizedDataset, loadNormalizedDataset } from "../src/research/storage/historicalDataStorage.js";
import { auditCandleDataset, AUDIT_STATUS } from "../src/research/quality/dataQualityAudit.js";
import { registerExperiment, listExperiments } from "../src/research/registry/experimentRegistry.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

console.log("================================================================================");
console.log("   🧪 PROVING ONE NIFTY OPTION CONTRACT END-TO-END (Workstream B - Step B2)    ");
console.log("================================================================================\n");

async function runEndToEndVerification() {
  // ----------------------------------------------------------------------------
  // Part 1: Empirical Upstox Test on Expired vs Active Derivative Contracts
  // ----------------------------------------------------------------------------
  console.log("1️⃣ EMPIRICAL UPSTOX API TEST: Expired Contract Retrieval Attempt");
  const expiredKey = "NSE_FO|47349"; // NIFTY 24700 CE 15 SEP 26
  console.log(`   Attempting fetch for expired contract ${expiredKey}...`);
  const expiredResult = await ingestFromUpstox({
    instrument_key: expiredKey,
    to_date: "2026-09-15",
    from_date: "2026-09-10"
  });
  console.log(`   HTTP Status: ${expiredResult.http_status}`);
  console.log(`   API Result: ${expiredResult.success ? "SUCCESS" : "REJECTED (Plan / Key Restriction)"}`);
  console.log(`   Payload Hash (SHA-256): ${expiredResult.raw_payload_hash.slice(0, 16)}...\n`);

  // ----------------------------------------------------------------------------
  // Part 2: Real End-to-End Pipeline on Live NIFTY Option Contract (NSE_FO|51420)
  // ----------------------------------------------------------------------------
  console.log("2️⃣ REAL LIVE CONTRACT RETRIEVAL: NIFTY 24550 CE 27 OCT 26 (NSE_FO|51420)");
  const targetKey = "NSE_FO|51420";
  const toDate = "2026-10-08";
  const fromDate = "2026-10-01";

  console.log(`   Calling Upstox REST API for 1-minute candles from ${fromDate} to ${toDate}...`);
  const ingestionResult = await ingestFromUpstox({
    instrument_key: targetKey,
    to_date: toDate,
    from_date: fromDate
  });

  if (!ingestionResult.success) {
    console.error("❌ Failed to retrieve candles:", ingestionResult.error_body);
    process.exit(1);
  }

  console.log(`   ✅ Retrieved ${ingestionResult.total_candles} candles (HTTP ${ingestionResult.http_status})`);
  console.log(`   Raw Payload SHA-256: ${ingestionResult.raw_payload_hash}\n`);

  // ----------------------------------------------------------------------------
  // Part 3: Contract Calendar Resolution
  // ----------------------------------------------------------------------------
  console.log("3️⃣ RESOLVING VERSIONED CONTRACT CALENDAR:");
  const calendarMetadata = resolveContractCalendar({
    contract_id: "NIFTY26OCT24550CE",
    symbol: "NIFTY 24550 CE 27 OCT 26",
    underlying_symbol: "NIFTY",
    expiry_date: "2026-10-27"
  });

  console.log(`   Contract Calendar Version: ${calendarMetadata.contract_calendar_version}`);
  console.log(`   Expiry Date:               ${calendarMetadata.expiry_date} (${calendarMetadata.day_of_week})`);
  console.log(`   Trading Session Hours:     ${calendarMetadata.session_open} to ${calendarMetadata.session_close}`);
  console.log(`   Regulatory Framework:      ${calendarMetadata.era_description}\n`);

  // ----------------------------------------------------------------------------
  // Part 4: Data Quality Audit (10 Invariants)
  // ----------------------------------------------------------------------------
  console.log("4️⃣ EXECUTING 10-POINT DATA QUALITY AUDIT:");
  const contractInfo = {
    symbol: "NIFTY 24550 CE 27 OCT 26",
    underlying: "NIFTY",
    strike: 24550,
    option_type: "CE",
    expiry_date: "2026-10-27",
    expiry_timestamp: calendarMetadata.expiry_timestamp
  };

  const auditReport = auditCandleDataset({
    contract_metadata: contractInfo,
    candles: ingestionResult.candles,
    audit_version: "v1.0.0"
  });

  console.log(`   Total Candles Audited:     ${auditReport.metrics.total_candles}`);
  console.log(`   First Candle:              ${auditReport.metrics.first_candle_time}`);
  console.log(`   Last Candle:               ${auditReport.metrics.last_candle_time}`);
  console.log(`   Ordering Violations:       ${auditReport.metrics.ordering_violations}`);
  console.log(`   Duplicate Timestamps:      ${auditReport.metrics.duplicate_timestamps}`);
  console.log(`   OHLC Geometry Violations:  ${auditReport.metrics.ohlc_geometry_violations}`);
  console.log(`   Negative OI Candles:       ${auditReport.metrics.negative_oi_candles}`);
  console.log(`   Zero Volume Candles:       ${auditReport.metrics.zero_volume_candles} (${auditReport.metrics.zero_volume_percentage})`);
  console.log(`   Missing 1-min Intervals:   ${auditReport.metrics.missing_1min_intervals}`);
  console.log(`   Out of Session Candles:    ${auditReport.metrics.out_of_session_candles}`);
  console.log(`   Post Expiry Candles:       ${auditReport.metrics.post_expiry_candles}`);
  console.log(`\n   >>> DATASET STATUS = ${auditReport.status} <<<\n`);

  // ----------------------------------------------------------------------------
  // Part 5: Storage & Provenance Persistence
  // ----------------------------------------------------------------------------
  console.log("5️⃣ PERSISTING NORMALIZED DATASET WITH PROVENANCE:");
  const datasetId = "NIFTY_24550_CE_20261027_1MIN";
  const persistResult = persistNormalizedDataset({
    dataset_id: datasetId,
    contract_metadata: contractInfo,
    candles: ingestionResult.candles,
    provenance: {
      source_provider: "UPSTOX_V2_REST_API",
      source_endpoint: ingestionResult.endpoint,
      retrieved_at: new Date().toISOString(),
      raw_payload_hash: ingestionResult.raw_payload_hash,
      contract_calendar_version: calendarMetadata.contract_calendar_version,
      data_quality_version: "v1.0.0"
    },
    audit_report: auditReport
  });

  console.log(`   Dataset ID:      ${persistResult.dataset_id}`);
  console.log(`   Storage File:    ${persistResult.file_path}`);
  console.log(`   SHA-256 Hash:    ${persistResult.sha256_hash}`);
  console.log(`   Candles Count:   ${persistResult.candles_count}\n`);

  // Verify retrieval from storage
  const loaded = loadNormalizedDataset(datasetId);
  if (!loaded || loaded.candles_count !== ingestionResult.total_candles) {
    console.error("❌ Failed to reload persisted dataset from storage!");
    process.exit(1);
  }
  console.log(`   ✅ Integrity Verified: Reloaded ${loaded.candles_count} records cleanly from disk storage.\n`);

  // ----------------------------------------------------------------------------
  // Part 6: Experiment Registry Registration
  // ----------------------------------------------------------------------------
  console.log("6️⃣ EXPERIMENT REGISTRY: Registering Hypotheses Under Strict Quarantine");
  const expRecord = registerExperiment({
    experiment_id: "EXP_001_NIFTY_M1_FIXED_STOP",
    strategy_name: "NIFTY_INTRADAY_MOMENTUM_SCALP",
    candidate_model: "M1_FIXED_POINTS",
    dataset_id: datasetId,
    contract_calendar_version: calendarMetadata.contract_calendar_version,
    synthetic_penalty_model: "SYNTHETIC_EXECUTION_PENALTY_V1",
    penalty_points: 0.20,
    hypothesis_rationale: "Baseline fixed-point stop loss model for single-lot practice scalp."
  });

  console.log(`   Experiment ID:           ${expRecord.experiment_id}`);
  console.log(`   Candidate Model:         ${expRecord.candidate_model} (${expRecord.model_description})`);
  console.log(`   Execution Mode:          ${expRecord.execution_parameters.data_quality_mode}`);
  console.log(`   Intrabar Policy:         ${expRecord.execution_parameters.intrabar_resolution_policy}`);
  console.log(`   Synthetic Penalty Model: ${expRecord.execution_parameters.synthetic_penalty_model} (₹${expRecord.execution_parameters.penalty_points})`);
  console.log(`   Governance Lock:         BACKTEST_PROFITABILITY_CLAIMS = ${expRecord.governance.BACKTEST_PROFITABILITY_CLAIMS}`);
  console.log(`   Live Order Routing:      LIVE_ORDER_ROUTING = ${expRecord.governance.LIVE_ORDER_ROUTING}`);
  console.log(`   Edge Status:             EDGE_STATUS = ${expRecord.governance.EDGE_STATUS}`);
  console.log(`   Paper Trades Role:       DATA_ROLE = ${expRecord.governance.PAPER_TRADES_ROLE}\n`);

  console.log("================================================================================");
  console.log(`🎉 END-TO-END RESEARCH FOUNDATION PIPELINE PROVEN (STATUS = ${auditReport.status})`);
  console.log("================================================================================\n");
}

runEndToEndVerification().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
