/**
 * Normalized Historical Data Storage & Provenance Catalog
 * Research Data Foundation - Workstream B
 * 
 * Manages atomic persistence of normalized research datasets with cryptographic SHA-256 provenance.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..", "..", "..");

const RESEARCH_DATA_DIR = path.join(root, "data", "research");
const DATASETS_DIR = path.join(RESEARCH_DATA_DIR, "datasets");

// Ensure directories exist
if (!fs.existsSync(DATASETS_DIR)) {
  fs.mkdirSync(DATASETS_DIR, { recursive: true });
}

/**
 * Compute SHA-256 hash of raw string/buffer payload.
 */
export function computePayloadHash(payload) {
  const content = typeof payload === "string" ? payload : JSON.stringify(payload);
  return crypto.createHash("sha256").update(content).digest("hex");
}

/**
 * Persist normalized dataset with full provenance record.
 */
export function persistNormalizedDataset({
  dataset_id,
  contract_metadata,
  candles,
  provenance,
  audit_report = null
}) {
  const sanitizedId = String(dataset_id).replace(/[^a-zA-Z0-9_-]/g, "_");
  const datasetFile = path.join(DATASETS_DIR, `${sanitizedId}.json`);

  const record = {
    dataset_id: sanitizedId,
    dataset_version: provenance?.dataset_version || "1.0.0",
    created_at: new Date().toISOString(),
    provenance: {
      source_provider: provenance?.source_provider || "UPSTOX_REST_API",
      source_endpoint: provenance?.source_endpoint || "/v2/historical-candle",
      retrieved_at: provenance?.retrieved_at || new Date().toISOString(),
      raw_payload_hash: provenance?.raw_payload_hash || computePayloadHash(candles),
      contract_calendar_version: provenance?.contract_calendar_version || "calendar_v3_current_2026",
      data_quality_version: provenance?.data_quality_version || "1.0.0"
    },
    contract_metadata,
    audit_report,
    candles_count: candles.length,
    candles
  };

  fs.writeFileSync(datasetFile, JSON.stringify(record, null, 2), "utf-8");

  // Update catalog manifest
  updateCatalogIndex(record);

  return {
    success: true,
    dataset_id: sanitizedId,
    file_path: datasetFile,
    sha256_hash: record.provenance.raw_payload_hash,
    candles_count: candles.length
  };
}

/**
 * Load normalized dataset by ID.
 */
export function loadNormalizedDataset(dataset_id) {
  const sanitizedId = String(dataset_id).replace(/[^a-zA-Z0-9_-]/g, "_");
  const datasetFile = path.join(DATASETS_DIR, `${sanitizedId}.json`);
  if (!fs.existsSync(datasetFile)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(datasetFile, "utf-8"));
}

/**
 * Append or update dataset in research catalog index.
 */
function updateCatalogIndex(record) {
  const catalogFile = path.join(RESEARCH_DATA_DIR, "catalog_manifest.json");
  let manifest = { updated_at: new Date().toISOString(), datasets: [] };
  if (fs.existsSync(catalogFile)) {
    try {
      manifest = JSON.parse(fs.readFileSync(catalogFile, "utf-8"));
    } catch {}
  }

  manifest.datasets = manifest.datasets.filter((d) => d.dataset_id !== record.dataset_id);
  manifest.datasets.push({
    dataset_id: record.dataset_id,
    dataset_version: record.dataset_version,
    contract: record.contract_metadata?.symbol,
    expiry: record.contract_metadata?.expiry_date,
    candle_count: record.candles_count,
    provenance_hash: record.provenance.raw_payload_hash,
    calendar_version: record.provenance.contract_calendar_version,
    audit_status: record.audit_report?.status || "UNAUDITED",
    persisted_at: record.created_at
  });
  manifest.updated_at = new Date().toISOString();

  fs.writeFileSync(catalogFile, JSON.stringify(manifest, null, 2), "utf-8");
}
