import { getDb } from "../../db/connection.js";

/**
 * PORTFOLIOX — Gemini Supervisor Repository
 * 
 * Durable audit ledger for Gemini supervisor evaluations.
 * Provides idempotent storage, retrieval, and crash recovery.
 */

export function initSupervisorTable(customDb = null) {
  const db = customDb || getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS gemini_supervisor_evaluations (
      evaluation_id TEXT PRIMARY KEY,
      candidate_id TEXT NOT NULL,
      mode TEXT NOT NULL,
      recommendation TEXT NOT NULL,
      reason_codes TEXT NOT NULL,
      summary TEXT,
      model_version TEXT NOT NULL,
      latency_ms INTEGER NOT NULL,
      status TEXT NOT NULL,
      error_message TEXT,
      candidate_snapshot TEXT NOT NULL,
      raw_response TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_gemini_eval_candidate ON gemini_supervisor_evaluations(candidate_id);
    CREATE INDEX IF NOT EXISTS idx_gemini_eval_created ON gemini_supervisor_evaluations(created_at);
  `);
}

export function recordSupervisorEvaluation(evaluation, customDb = null) {
  if (!evaluation || !evaluation.evaluationId) return null;
  const db = customDb || getDb();
  initSupervisorTable(db);

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO gemini_supervisor_evaluations (
      evaluation_id, candidate_id, mode, recommendation, reason_codes,
      summary, model_version, latency_ms, status, error_message,
      candidate_snapshot, raw_response, created_at
    ) VALUES (
      @evaluationId, @candidateId, @mode, @recommendation, @reasonCodes,
      @summary, @modelVersion, @latencyMs, @status, @errorMessage,
      @candidateSnapshot, @rawResponse, @createdAt
    )
  `);

  stmt.run({
    evaluationId: evaluation.evaluationId,
    candidateId: evaluation.candidateId,
    mode: evaluation.mode || "SHADOW",
    recommendation: evaluation.recommendation,
    reasonCodes: JSON.stringify(evaluation.reasonCodes || []),
    summary: evaluation.summary || null,
    modelVersion: evaluation.modelVersion || "unknown",
    latencyMs: Math.round(Number(evaluation.latencyMs || 0)),
    status: evaluation.status || "SUCCESS",
    errorMessage: evaluation.errorMessage || null,
    candidateSnapshot: typeof evaluation.candidateSnapshot === "string" 
      ? evaluation.candidateSnapshot 
      : JSON.stringify(evaluation.candidateSnapshot || {}),
    rawResponse: evaluation.rawResponse ? JSON.stringify(evaluation.rawResponse) : null,
    createdAt: evaluation.evaluatedAt || new Date().toISOString(),
  });

  return evaluation;
}

export function getSupervisorEvaluationByCandidateId(candidateId, customDb = null) {
  if (!candidateId) return null;
  const db = customDb || getDb();
  initSupervisorTable(db);

  const row = db.prepare(`
    SELECT * FROM gemini_supervisor_evaluations
    WHERE candidate_id = ?
    ORDER BY created_at DESC
    LIMIT 1
  `).get(candidateId);

  if (!row) return null;

  return {
    evaluationId: row.evaluation_id,
    candidateId: row.candidate_id,
    mode: row.mode,
    recommendation: row.recommendation,
    reasonCodes: JSON.parse(row.reason_codes || "[]"),
    summary: row.summary,
    modelVersion: row.model_version,
    latencyMs: row.latency_ms,
    status: row.status,
    errorMessage: row.error_message,
    candidateSnapshot: JSON.parse(row.candidate_snapshot || "{}"),
    rawResponse: row.raw_response ? JSON.parse(row.raw_response) : null,
    evaluatedAt: row.created_at,
  };
}

export function listSupervisorEvaluations(limit = 50, customDb = null) {
  const db = customDb || getDb();
  initSupervisorTable(db);

  const rows = db.prepare(`
    SELECT * FROM gemini_supervisor_evaluations
    ORDER BY created_at DESC
    LIMIT ?
  `).all(limit);

  return rows.map(r => ({
    evaluationId: r.evaluation_id,
    candidateId: r.candidate_id,
    mode: r.mode,
    recommendation: r.recommendation,
    reasonCodes: JSON.parse(r.reason_codes || "[]"),
    summary: r.summary,
    modelVersion: r.model_version,
    latencyMs: r.latency_ms,
    status: r.status,
    errorMessage: r.error_message,
    evaluatedAt: r.created_at,
  }));
}
