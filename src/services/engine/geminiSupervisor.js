import crypto from "node:crypto";
import { recordSupervisorEvaluation, getSupervisorEvaluationByCandidateId } from "./geminiSupervisorRepository.js";

/**
 * PORTFOLIOX — Constrained Gemini Supervisor Service
 * Stage 3 Step 4: Server-side advisory supervisor for deterministic NIFTY options candidates.
 * 
 * Invariants:
 * - Advisory only: Gemini NEVER replaces deterministic scanner (F1–F12) or .NET 8 RMS.
 * - Modes: SHADOW (default) or VETO_ONLY. Live mode strictly banned.
 * - Immutable candidate: Gemini recommendations are recorded separately; candidate cannot be mutated.
 * - Local validation: Schema, reason codes, enums, identifier matching strictly validated. Extra fields rejected.
 * - EDGE_STATUS: Strictly NOT_VALIDATED. Model output cannot alter validation status.
 */

export const SUPERVISOR_MODES = Object.freeze({
  SHADOW: "SHADOW",
  VETO_ONLY: "VETO_ONLY",
});

export const RECOMMENDATIONS = Object.freeze({
  NO_VETO: "NO_VETO",
  VETO: "VETO",
  ABSTAIN: "ABSTAIN",
});

export const ALLOWED_REASON_CODES = Object.freeze([
  "TREND_CONVERGENCE",
  "MOMENTUM_ALIGNMENT",
  "HIGH_VOLATILITY_RISK",
  "SPREAD_EXPANSION_RISK",
  "RESISTANCE_CLUSTER",
  "SUPPORT_FAILURE",
  "REGIME_UNCERTAINTY",
  "INSUFFICIENT_CONTEXT",
  "TECHNICAL_DISPARITY",
  "DETERMINISTIC_AGREEMENT",
  "ADVERSE_STRUCTURE_RISK",
  "CHOPPY_REGIME_RISK",
  "UNKNOWN",
]);

export const SUPERVISOR_RESPONSE_SCHEMA = Object.freeze({
  type: "OBJECT",
  properties: {
    candidateId: { type: "STRING" },
    recommendation: { type: "STRING", enum: ["NO_VETO", "VETO", "ABSTAIN"] },
    reasonCodes: { 
      type: "ARRAY", 
      items: { type: "STRING" } 
    },
    summary: { type: "STRING" },
  },
  required: ["recommendation", "reasonCodes", "summary"],
});

export class GeminiSupervisorService {
  constructor(options = {}) {
    this.mode = options.mode || process.env.GEMINI_SUPERVISOR_MODE || SUPERVISOR_MODES.SHADOW;
    // Strict safety check: Never allow LIVE mode
    if (this.mode !== SUPERVISOR_MODES.SHADOW && this.mode !== SUPERVISOR_MODES.VETO_ONLY) {
      this.mode = SUPERVISOR_MODES.SHADOW;
    }

    this.model = options.model || process.env.GEMINI_MODEL || "gemini-2.5-flash";
    this.timeoutMs = options.timeoutMs || Number(process.env.GEMINI_TIMEOUT_MS) || 5000;
    this.dedupWindowMs = options.dedupWindowMs || Number(process.env.GEMINI_DEDUP_MS) || 60000;
    this.apiKey = options.apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
    this.customDb = options.db || null;
    this.mockClient = options.mockClient || null; // For dependency injection in tests

    this.inMemoryCache = new Map();
  }

  getMode() {
    return this.mode;
  }

  setMode(newMode) {
    if (newMode === SUPERVISOR_MODES.SHADOW || newMode === SUPERVISOR_MODES.VETO_ONLY) {
      this.mode = newMode;
      return true;
    }
    return false;
  }

  /**
   * Builds a safe, compact, immutable snapshot of the candidate for Gemini evaluation.
   * Strips all credentials, tokens, or personal identifiers.
   */
  buildCandidateSnapshot(candidate, context = {}) {
    if (!candidate) return null;

    const candidateId = candidate.candidateId || candidate.id || 
      `${candidate.symbol || "UNKNOWN"}_${candidate.strike || 0}_${candidate.optionType || "NA"}_${candidate.generatedAt || Date.now()}`;

    const snapshot = {
      candidateId,
      snapshotTimestamp: new Date().toISOString(),
      symbol: candidate.symbol,
      optionType: candidate.optionType,
      strike: candidate.strike,
      lotConfiguration: {
        lots: Number(candidate.lots || 1),
        lotSize: Number(candidate.lotSize || 65),
        units: Number(candidate.units || candidate.lotSize || 65),
      },
      underlyingPrice: candidate.underlyingPrice !== undefined ? Number(candidate.underlyingPrice) : null,
      underlyingIndicators: {
        underlyingAtr: candidate.underlyingAtr !== undefined ? Number(candidate.underlyingAtr) : null,
        ema20: context.ema20 !== undefined ? Number(context.ema20) : null,
        ema50: context.ema50 !== undefined ? Number(context.ema50) : null,
        vwap: context.vwap !== undefined ? Number(context.vwap) : null,
        swingStructure: context.swingStructure || "BULLISH_HH_HL",
      },
      deterministicFilters: {
        f1Trend: context.f1Trend || "PASS",
        f2Structure: context.f2Structure || "PASS",
        f3Liquidity: context.f3Liquidity || "PASS",
        f4VolumeOi: context.f4VolumeOi || "PASS",
        f5Delta: context.f5Delta || "PASS",
        f6AtrStop: context.f6AtrStop || "PASS",
        f7EvValidation: "PASS_RESEARCH_ONLY",
        f8RiskReward: context.f8RiskReward || "PASS",
        f9Session: context.f9Session || "PASS",
        f10Macro: context.f10Macro || "PASS",
        f11PositionLimit: "PASS",
        f12DailyDrawdown: "PASS",
      },
      marketEvidence: {
        quoteFreshnessMs: context.quoteFreshnessMs || 1200,
        bid: context.bid !== undefined ? Number(context.bid) : null,
        ask: context.ask !== undefined ? Number(context.ask) : null,
        spread: context.spread !== undefined ? Number(context.spread) : null,
        depthUnits: context.depthUnits !== undefined ? Number(context.depthUnits) : null,
        rvol: context.rvol !== undefined ? Number(context.rvol) : null,
        openInterest: context.openInterest !== undefined ? Number(context.openInterest) : null,
      },
      marketRegime: {
        sessionWindow: context.sessionWindow || "MORNING_EXPANSION",
        macroBlackout: false,
      },
      strategyPolicies: {
        stopPolicy: candidate.stopPolicy || "ATR_ENTRY_RELATIVE",
        targetPolicy: candidate.targetPolicy || "RR_DERIVED",
      },
      referencePrices: {
        referenceEntryPrice: candidate.referenceEntryPrice !== undefined ? Number(candidate.referenceEntryPrice) : candidate.entryPrice,
        rawStopLoss: candidate.stopLoss !== undefined ? Number(candidate.stopLoss) : null,
        rawTarget: candidate.target !== undefined ? Number(candidate.target) : null,
        stopDistancePts: candidate.stopDistancePts !== undefined ? Number(candidate.stopDistancePts) : null,
        targetDistancePts: candidate.targetDistancePts !== undefined ? Number(candidate.targetDistancePts) : null,
      },
      canonicalRisk: {
        modelledNetLoss: candidate.modelledNetRisk !== undefined ? Number(candidate.modelledNetRisk) : Number(candidate.netRiskRupees || 279.64),
        netTargetProfit: candidate.modelledNetReward !== undefined ? Number(candidate.modelledNetReward) : Number(candidate.netRewardRupees || 560.78),
        netRiskRewardRatio: candidate.modelledNetRrRatio !== undefined ? Number(candidate.modelledNetRrRatio) : Number(candidate.netRiskRewardRatio || 2.01),
      },
      portfolioStatus: {
        activePositions: context.activePositions !== undefined ? Number(context.activePositions) : 0,
        reconciliationState: "CLEAN",
      },
      edgeStatus: "NOT_VALIDATED",
    };

    return Object.freeze(snapshot);
  }

  /**
   * Strictly validates raw Gemini output.
   * Rejects malformed JSON, unexpected fields, invalid enums, and candidate ID mismatches.
   */
  validateSupervisorResponse(rawResponse, expectedCandidateId) {
    if (!rawResponse || typeof rawResponse !== "object") {
      return { isValid: false, error: "Response must be a non-null JSON object." };
    }

    // 1. Extra / Unexpected Properties Gate: Disallow any fields outside schema
    const allowedKeys = new Set(["evaluationId", "candidateId", "recommendation", "reasonCodes", "summary", "modelVersion", "evaluatedAt"]);
    for (const key of Object.keys(rawResponse)) {
      if (!allowedKeys.has(key)) {
        return { 
          isValid: false, 
          error: `Unexpected field '${key}' detected in model output. Model is strictly forbidden from providing modified prices, quantities, stop losses, targets, or custom instructions.` 
        };
      }
    }

    // 2. Candidate ID matching (if provided)
    if (rawResponse.candidateId && rawResponse.candidateId !== expectedCandidateId) {
      return { 
        isValid: false, 
        error: `Candidate ID mismatch: response candidateId (${rawResponse.candidateId}) does not match expected candidate (${expectedCandidateId}).` 
      };
    }

    // 3. Recommendation Enum
    if (!rawResponse.recommendation || !Object.values(RECOMMENDATIONS).includes(rawResponse.recommendation)) {
      return { 
        isValid: false, 
        error: `Invalid recommendation '${rawResponse.recommendation}'. Must be one of: ${Object.values(RECOMMENDATIONS).join(", ")}.` 
      };
    }

    // 4. Reason Codes
    if (!Array.isArray(rawResponse.reasonCodes)) {
      return { isValid: false, error: "reasonCodes must be an array of strings." };
    }
    for (const code of rawResponse.reasonCodes) {
      if (typeof code !== "string" || code.trim().length === 0) {
        return { isValid: false, error: "reasonCodes must contain non-empty string codes." };
      }
      if (!ALLOWED_REASON_CODES.includes(code)) {
        return { isValid: false, error: `Invalid reason code '${code}'. Must be from bounded list.` };
      }
    }

    // 5. Summary
    if (typeof rawResponse.summary !== "string") {
      return { isValid: false, error: "summary must be a string." };
    }

    return { isValid: true, sanitized: rawResponse };
  }

  /**
   * Internal model execution engine with strict server-authoritative metadata.
   */
  async executeModelEvaluation(snapshot, candidateId, serverEvaluationId, serverEvaluatedAt, startTime, options = {}) {
    const apiKey = options.apiKey || this.apiKey;
    const mode = options.mode || this.mode;

    if (!apiKey && !this.mockClient && !options.mockClient) {
      return {
        evaluationId: serverEvaluationId,
        candidateId,
        mode,
        recommendation: RECOMMENDATIONS.ABSTAIN,
        reasonCodes: ["INSUFFICIENT_CONTEXT"],
        summary: "Gemini API key is not configured. Supervisor is standing down.",
        modelVersion: this.model,
        latencyMs: Date.now() - startTime,
        status: "MISSING_API_KEY",
        errorMessage: "GEMINI_API_KEY environment variable not configured.",
        candidateSnapshot: snapshot,
        rawResponse: null,
        evaluatedAt: serverEvaluatedAt,
      };
    }

    let rawResult = null;
    let status = "SUCCESS";
    let errorMessage = null;

    try {
      if (this.mockClient || options.mockClient) {
        const client = options.mockClient || this.mockClient;
        rawResult = await client.generateContent({
          model: this.model,
          prompt: JSON.stringify(snapshot),
          schema: SUPERVISOR_RESPONSE_SCHEMA,
          timeoutMs: this.timeoutMs,
        });
      } else {
        rawResult = await this.callGeminiApi(snapshot, apiKey);
      }
    } catch (err) {
      if (err.name === "AbortError" || err.message?.includes("timeout")) {
        status = "TIMEOUT";
        errorMessage = `Gemini API request timed out after ${this.timeoutMs}ms.`;
      } else if (err.status === 429 || err.message?.includes("429") || err.message?.includes("quota")) {
        status = "RATE_LIMITED";
        errorMessage = `Gemini API rate limit exceeded (HTTP 429): ${err.message}`;
      } else {
        status = "ERROR";
        errorMessage = err.message || "Unknown error calling Gemini supervisor.";
      }
    }

    const latencyMs = Date.now() - startTime;

    if (status === "SUCCESS" && rawResult) {
      const validation = this.validateSupervisorResponse(rawResult, candidateId);
      if (validation.isValid) {
        return {
          evaluationId: serverEvaluationId, // Server-authoritative ID
          candidateId,
          mode,
          recommendation: rawResult.recommendation,
          reasonCodes: rawResult.reasonCodes,
          summary: rawResult.summary,
          modelVersion: this.model, // Server-authoritative model version
          latencyMs,
          status: "SUCCESS",
          errorMessage: null,
          candidateSnapshot: snapshot,
          rawResponse: rawResult,
          evaluatedAt: serverEvaluatedAt, // Server-authoritative timestamp
        };
      } else {
        return {
          evaluationId: serverEvaluationId,
          candidateId,
          mode,
          recommendation: RECOMMENDATIONS.ABSTAIN,
          reasonCodes: ["TECHNICAL_DISPARITY"],
          summary: `Model response failed local schema validation: ${validation.error}`,
          modelVersion: this.model,
          latencyMs,
          status: "MALFORMED_RESPONSE",
          errorMessage: validation.error,
          candidateSnapshot: snapshot,
          rawResponse: rawResult,
          evaluatedAt: serverEvaluatedAt,
        };
      }
    }

    return {
      evaluationId: serverEvaluationId,
      candidateId,
      mode,
      recommendation: RECOMMENDATIONS.ABSTAIN,
      reasonCodes: ["INSUFFICIENT_CONTEXT"],
      summary: errorMessage || "Supervisor could not reach a decision.",
      modelVersion: this.model,
      latencyMs,
      status,
      errorMessage,
      candidateSnapshot: snapshot,
      rawResponse: rawResult,
      evaluatedAt: serverEvaluatedAt,
    };
  }

  /**
   * Starts the Gemini evaluation asynchronously without awaiting its response
   * on the baseline paper-execution critical path.
   * Persists pending outcome durably, dispatches background evaluation,
   * updates the database when complete, and handles errors with zero unhandled rejections.
   */
  evaluateCandidateAsync(candidate, context = {}, options = {}) {
    const startTime = Date.now();
    const serverEvaluationId = crypto.randomUUID();
    const serverEvaluatedAt = new Date().toISOString();
    const targetDb = options.db || this.customDb;
    const mode = options.mode || this.mode;

    // 1. Candidate Qualification Gate
    if (!candidate || (!candidate.symbol && !candidate.strike)) {
      const skippedResult = {
        evaluationId: serverEvaluationId,
        candidateId: "UNKNOWN",
        mode,
        recommendation: RECOMMENDATIONS.ABSTAIN,
        reasonCodes: ["INSUFFICIENT_CONTEXT"],
        summary: "Invalid candidate object provided.",
        modelVersion: this.model,
        latencyMs: 0,
        status: "SKIPPED",
        errorMessage: "Candidate missing required attributes.",
        evaluatedAt: serverEvaluatedAt,
      };
      return {
        evaluationId: serverEvaluationId,
        candidateId: "UNKNOWN",
        mode,
        status: "SKIPPED",
        recommendation: RECOMMENDATIONS.ABSTAIN,
        summary: skippedResult.summary,
        promise: Promise.resolve(skippedResult),
      };
    }

    const snapshot = this.buildCandidateSnapshot(candidate, context);
    const candidateId = snapshot.candidateId;

    // 2. Deduplication Gate
    const now = Date.now();
    const skipDedup = Boolean(options.skipDeduplication);

    if (!skipDedup && this.inMemoryCache.has(candidateId)) {
      const cached = this.inMemoryCache.get(candidateId);
      if (now - cached.timestamp < this.dedupWindowMs) {
        const dedupResult = {
          ...cached.result,
          status: "DEDUPLICATED",
          isDeduplicated: true,
        };
        return {
          evaluationId: cached.result.evaluationId,
          candidateId,
          mode,
          status: "DEDUPLICATED",
          recommendation: cached.result.recommendation,
          reasonCodes: cached.result.reasonCodes,
          summary: cached.result.summary,
          promise: Promise.resolve(dedupResult),
        };
      }
    }

    // Check durable SQLite store for deduplication
    if (!skipDedup) {
      try {
        const persisted = getSupervisorEvaluationByCandidateId(candidateId, targetDb);
        if (persisted && (now - new Date(persisted.evaluatedAt).getTime() < this.dedupWindowMs)) {
          this.inMemoryCache.set(candidateId, { timestamp: now, result: persisted });
          const dedupResult = {
            ...persisted,
            status: "DEDUPLICATED",
            isDeduplicated: true,
          };
          return {
            evaluationId: persisted.evaluationId,
            candidateId,
            mode,
            status: "DEDUPLICATED",
            recommendation: persisted.recommendation,
            reasonCodes: persisted.reasonCodes,
            summary: persisted.summary,
            promise: Promise.resolve(dedupResult),
          };
        }
      } catch {
        // Non-blocking fallback
      }
    }

    // 3. Persist immediate PENDING record durably into SQLite
    const pendingRecord = {
      evaluationId: serverEvaluationId,
      candidateId,
      mode,
      recommendation: RECOMMENDATIONS.ABSTAIN,
      reasonCodes: [],
      summary: "Advisory review pending in background",
      modelVersion: this.model,
      latencyMs: 0,
      status: "PENDING",
      errorMessage: null,
      candidateSnapshot: snapshot,
      rawResponse: null,
      evaluatedAt: serverEvaluatedAt,
    };

    try {
      recordSupervisorEvaluation(pendingRecord, targetDb);
    } catch {
      // Non-blocking persistence fallback
    }

    // 4. Dispatch background evaluation with strict rejection boundary
    const backgroundPromise = (async () => {
      try {
        const finalEvaluation = await this.executeModelEvaluation(
          snapshot,
          candidateId,
          serverEvaluationId,
          serverEvaluatedAt,
          startTime,
          options
        );

        try {
          recordSupervisorEvaluation(finalEvaluation, targetDb);
        } catch {}

        this.inMemoryCache.set(candidateId, { timestamp: Date.now(), result: finalEvaluation });
        return finalEvaluation;
      } catch (err) {
        const errorRecord = {
          evaluationId: serverEvaluationId,
          candidateId,
          mode,
          recommendation: RECOMMENDATIONS.ABSTAIN,
          reasonCodes: ["INSUFFICIENT_CONTEXT"],
          summary: `Supervisor evaluation failed: ${err.message}`,
          modelVersion: this.model,
          latencyMs: Date.now() - startTime,
          status: "ERROR",
          errorMessage: err.message,
          candidateSnapshot: snapshot,
          rawResponse: null,
          evaluatedAt: serverEvaluatedAt,
        };
        try {
          recordSupervisorEvaluation(errorRecord, targetDb);
        } catch {}
        return errorRecord;
      }
    })();

    // Ensure no unhandled promise rejection can occur
    backgroundPromise.catch(() => {});

    // Return immediate dispatch ticket synchronously
    return {
      evaluationId: serverEvaluationId,
      candidateId,
      mode,
      status: "PENDING",
      recommendation: RECOMMENDATIONS.ABSTAIN,
      summary: "Advisory review pending in background",
      candidateSnapshot: snapshot,
      promise: backgroundPromise,
    };
  }

  /**
   * Evaluates a qualified deterministic candidate through the Gemini Supervisor.
   * Awaits and returns the completed evaluation.
   */
  async evaluateCandidate(candidate, context = {}, options = {}) {
    const ticket = this.evaluateCandidateAsync(candidate, context, options);
    return await ticket.promise;
  }

  /**
   * Internal HTTP client calling official Google Gemini REST endpoint.
   */
  async callGeminiApi(snapshot, apiKey) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const systemPrompt = `You are the PORTFOLIOX Quantitative Gemini Supervisor.
Your role is strictly ADVISORY review of an already-qualified deterministic options buying candidate.
Evaluate the candidate snapshot against market indicators and regime risk.
You MUST emit strict JSON conforming to the schema with:
- evaluationId: a new UUID string
- candidateId: exact match of candidateId from input
- recommendation: "NO_VETO", "VETO", or "ABSTAIN"
- reasonCodes: bounded array of string codes from: ${ALLOWED_REASON_CODES.join(", ")}
- summary: concise sentence explaining recommendation
- modelVersion: "${this.model}"
- evaluatedAt: current ISO timestamp

You are strictly FORBIDDEN from modifying prices, quantities, stop losses, targets, or risk parameters.`;

    const requestBody = {
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      },
      contents: [
        {
          role: "user",
          parts: [{ text: JSON.stringify(snapshot) }]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: SUPERVISOR_RESPONSE_SCHEMA,
        temperature: 0.1,
      }
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errorText = await res.text();
        const err = new Error(`Gemini API HTTP ${res.status}: ${errorText}`);
        err.status = res.status;
        throw err;
      }

      const data = await res.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        throw new Error("Empty content parts in Gemini API response.");
      }

      return JSON.parse(rawText);
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Evaluates whether supervisor decision permits deployment.
   * In SHADOW mode: Always returns permit: true (never blocks).
   * In VETO_ONLY mode: Blocks if VETO or UNRESOLVED. Permits only on NO_VETO.
   */
  shouldPermitDeployment(evaluation, mode = null) {
    const effectiveMode = mode || this.mode;

    // SHADOW mode invariant: never blocks, approves, or delays paper execution
    if (effectiveMode === SUPERVISOR_MODES.SHADOW) {
      return {
        permit: true,
        reason: "SHADOW_MODE_PERMITS_ALL",
        evaluation,
      };
    }

    // VETO_ONLY mode: Controlled gate
    if (effectiveMode === SUPERVISOR_MODES.VETO_ONLY) {
      if (!evaluation || (evaluation.status !== "SUCCESS" && evaluation.status !== "DEDUPLICATED")) {
        return {
          permit: false,
          reason: "SUPERVISOR_UNRESOLVED",
          error: evaluation?.errorMessage || "Supervisor evaluation unresolved. Fails closed.",
          evaluation,
        };
      }

      if (evaluation.recommendation === RECOMMENDATIONS.VETO) {
        return {
          permit: false,
          reason: "SUPERVISOR_VETOED",
          error: evaluation.summary || "Candidate was vetoed by Gemini supervisor.",
          reasonCodes: evaluation.reasonCodes || [],
          evaluation,
        };
      }

      if (evaluation.recommendation === RECOMMENDATIONS.ABSTAIN) {
        return {
          permit: false,
          reason: "SUPERVISOR_ABSTAINED",
          error: "Gemini supervisor abstained. VETO_ONLY mode requires affirmative NO_VETO.",
          evaluation,
        };
      }

      if (evaluation.recommendation === RECOMMENDATIONS.NO_VETO) {
        return {
          permit: true,
          reason: "SUPERVISOR_NO_VETO",
          evaluation,
        };
      }
    }

    return {
      permit: false,
      reason: "INVALID_SUPERVISOR_MODE",
      error: `Unrecognized or prohibited supervisor mode: ${effectiveMode}`,
    };
  }
}

export const geminiSupervisor = new GeminiSupervisorService();
