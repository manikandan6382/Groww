/**
 * Unified Data Ingestion Interface
 * Research Data Foundation - Workstream B
 * 
 * Provides decoupled ingestion drivers for broker API retrieval and local historical fixtures.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { computePayloadHash } from "../storage/historicalDataStorage.js";
import { normalizeRawCandle } from "../contracts/historicalDataContract.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..", "..", "..");

/**
 * Load active Upstox access token from session store.
 */
export function getUpstoxToken() {
  const sessionPath = path.join(root, "data", "upstox-session.json");
  if (!fs.existsSync(sessionPath)) {
    throw new Error(`Upstox session file missing at ${sessionPath}`);
  }
  const session = JSON.parse(fs.readFileSync(sessionPath, "utf-8"));
  return session.access_token;
}

/**
 * Ingestion Provider: Upstox API Driver
 */
export async function ingestFromUpstox({
  instrument_key,
  interval = "1minute",
  to_date,
  from_date
}) {
  const token = getUpstoxToken();
  const endpoint = `/v2/historical-candle/${encodeURIComponent(instrument_key)}/${interval}/${to_date}/${from_date}`;
  const url = `https://api.upstox.com${endpoint}`;

  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`
    }
  });

  const rawText = await res.text();
  const rawHash = computePayloadHash(rawText);

  if (!res.ok) {
    return {
      success: false,
      http_status: res.status,
      endpoint,
      raw_payload_hash: rawHash,
      error_body: rawText,
      candles: []
    };
  }

  const json = JSON.parse(rawText);
  const rawCandles = json.data?.candles || [];

  // Upstox returns newest first. Reverse to strictly chronological ascending order
  const chronological = [...rawCandles].reverse();
  const normalized = chronological.map(normalizeRawCandle);

  return {
    success: true,
    http_status: res.status,
    endpoint,
    raw_payload_hash: rawHash,
    candles: normalized,
    total_candles: normalized.length
  };
}
