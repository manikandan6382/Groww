/**
 * Experiment Registry & Hypothesis Quarantine Engine
 * Research Data Foundation - Workstream B
 * 
 * Manages versioned registration of competing quantitative hypotheses (M1–M7).
 * Enforces production air gap: NO live order capabilities, NO backtest profitability claims.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..", "..", "..");

const REGISTRY_DIR = path.join(root, "data", "research", "experiments");
if (!fs.existsSync(REGISTRY_DIR)) {
  fs.mkdirSync(REGISTRY_DIR, { recursive: true });
}

export const RESEARCH_GOVERNANCE_INVARIANTS = {
  BACKTEST_PROFITABILITY_CLAIMS: "DISABLED",
  LIVE_ORDER_ROUTING: "DISABLED",
  EDGE_STATUS: "NOT_VALIDATED",
  PAPER_TRADES_ROLE: "SYSTEM_VALIDATION_ONLY"
};

export const CANDIDATE_MODELS = {
  M1_FIXED_POINTS: "M1: Fixed-point stop loss",
  M2_ATR_DELTA: "M2: Underlying ATR-based stop (1st order approximation: ATR * Delta)",
  M3_SWING_STRUCTURE: "M3: Swing-structure stop",
  M4_ATR_STRUCTURE: "M4: Combined ATR + structure stop",
  M5_OPTION_VOLATILITY: "M5: Option-premium volatility stop",
  M6_DELTA_GAMMA: "M6: Underlying volatility translated through Delta/Gamma scenario (ATR * Delta + 0.5 * ATR^2 * Gamma)",
  M7_STATISTICAL_BENCHMARK: "M7: Baseline statistical benchmark"
};

/**
 * Register a quantitative hypothesis experiment into the versioned registry.
 */
export function registerExperiment({
  experiment_id,
  strategy_name = "NIFTY_INTRADAY_DIRECTIONAL",
  candidate_model,
  dataset_id,
  dataset_version = "1.0.0",
  contract_calendar_version,
  synthetic_penalty_model = "SYNTHETIC_EXECUTION_PENALTY_V1",
  penalty_points = 0.20,
  hypothesis_rationale
}) {
  const sanitizedId = String(experiment_id).replace(/[^a-zA-Z0-9_-]/g, "_");
  const expFile = path.join(REGISTRY_DIR, `${sanitizedId}.json`);

  const experimentRecord = {
    experiment_id: sanitizedId,
    registered_at: new Date().toISOString(),
    strategy_name,
    candidate_model,
    model_description: CANDIDATE_MODELS[candidate_model] || candidate_model,
    hypothesis_rationale,
    dataset: {
      dataset_id,
      dataset_version,
      contract_calendar_version
    },
    execution_parameters: {
      data_quality_mode: "CANDLE_BASED_ESTIMATED_EXECUTION",
      intrabar_resolution_policy: "CONSERVATIVE_STOP_FIRST",
      synthetic_penalty_model,
      penalty_points
    },
    governance: {
      ...RESEARCH_GOVERNANCE_INVARIANTS,
      state: "REGISTERED_LOCKED",
      backtest_authorized: false,
      authorization_condition: "Awaiting validated historical microstructure datasets."
    }
  };

  fs.writeFileSync(expFile, JSON.stringify(experimentRecord, null, 2), "utf-8");

  return experimentRecord;
}

/**
 * List all registered experiments.
 */
export function listExperiments() {
  const files = fs.readdirSync(REGISTRY_DIR).filter((f) => f.endsWith(".json"));
  return files.map((f) => JSON.parse(fs.readFileSync(path.join(REGISTRY_DIR, f), "utf-8")));
}
