import { paperTradeEngine } from "../../services/paperTradeEngine.js";
import { readJsonBody, sendJson } from "./route-helpers.js";

/**
 * Scanner API Routes
 * Exposes deterministic scanner evaluation and candidate query endpoints.
 * All strategy rules and filters are strictly evaluated on the server side.
 */
export async function handleScannerRoutes(req, res, url) {
  if (url.pathname === "/api/scanner/latest") {
    if (req.method === "GET") {
      const evaluation = paperTradeEngine.getLatestScannerEvaluation();
      sendJson(res, {
        success: true,
        evaluation: evaluation || null,
        edgeStatus: "NOT_VALIDATED",
        timestamp: new Date().toISOString(),
      });
      return true;
    }
  }

  if (url.pathname === "/api/scanner/evaluate") {
    if (req.method === "POST") {
      try {
        const body = await readJsonBody(req);
        const evaluation = paperTradeEngine.evaluateScanner(body || {});
        sendJson(res, {
          success: true,
          evaluation,
          decision: evaluation.decision,
          candidate: evaluation.candidate,
          edgeStatus: "NOT_VALIDATED",
        });
        return true;
      } catch (err) {
        sendJson(res, { success: false, error: err.message }, 400);
        return true;
      }
    }
    if (req.method === "GET") {
      const evaluation = paperTradeEngine.evaluateScanner({});
      sendJson(res, {
        success: true,
        evaluation,
        decision: evaluation.decision,
        candidate: evaluation.candidate,
        edgeStatus: "NOT_VALIDATED",
      });
      return true;
    }
  }

  if (url.pathname === "/api/scanner/status") {
    if (req.method === "GET") {
      const latest = paperTradeEngine.getLatestScannerEvaluation();
      sendJson(res, {
        success: true,
        scannerStarted: Boolean(paperTradeEngine.started),
        hasCandidate: Boolean(latest?.candidate),
        latestDecision: latest?.decision || "NO_TRADE",
        edgeStatus: "NOT_VALIDATED",
        lastEvaluatedAt: latest?.evaluatedAt || null,
      });
      return true;
    }
  }

  return false;
}
