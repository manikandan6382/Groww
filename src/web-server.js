import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { handleTradingRequest } from "./routes/trades.routes.js";
import { getPortfolio, getYahooChart, getYahooQuotes, getAlphaForeignQuotes } from "./server/marketDataApi.js";
import { searchStocks } from "./server/stockUniverse.js";
import { sendBrokerStatus, sendUpstoxCallback, sendKiteCallback, createOAuthState } from "./server/oauthHandlers.js";
import { serveStatic, sendJson, loadDotEnv } from "./server/staticServer.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const publicDir = path.join(projectRoot, "public");
const distDir = path.join(projectRoot, "dist");
const staticDir = fs.existsSync(path.join(distDir, "index.html")) ? distDir : publicDir;

loadDotEnv(path.join(projectRoot, ".env"));

const port = Number(process.env.PORT || 3003);
const kiteApiBase = "https://api.kite.trade";
const alphaApiBase = "https://www.alphavantage.co/query";
const sessionFile = path.resolve(projectRoot, process.env.KITE_SESSION_FILE || ".zerodha-session.json");
const upstoxSessionFile = path.resolve(projectRoot, process.env.UPSTOX_SESSION_FILE || path.join("data", "upstox-session.json"));

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host}`);
    if (await handleTradingRequest(req, res, url)) return;
    if (url.pathname === "/api/portfolio") return sendJson(res, await getPortfolio(kiteApiBase, sessionFile));
    if (url.pathname === "/api/yahoo/chart") return sendJson(res, await getYahooChart(url));
    if (url.pathname === "/api/yahoo/quotes") return sendJson(res, await getYahooQuotes(url));
    if (url.pathname === "/api/alpha/foreign-quotes") return sendJson(res, await getAlphaForeignQuotes(url, alphaApiBase));
    if (url.pathname === "/api/stocks/search") return sendJson(res, await searchStocks(url, kiteApiBase, sessionFile));
    if (url.pathname === "/api/broker/status" || url.pathname === "/api/kite/token-status") return sendBrokerStatus(res, sessionFile, upstoxSessionFile);
    if (url.pathname === "/upstox/login") {
      const upstoxClientId = process.env.UPSTOX_API_KEY || "61557114-951e-4b68-af88-e5121939f2e4";
      const redirectUri = process.env.UPSTOX_REDIRECT_URI || "http://127.0.0.1:3003/upstox/callback";
      const state = createOAuthState();
      res.writeHead(302, { Location: `https://api.upstox.com/v2/login/authorization/dialog?response_type=code&client_id=${encodeURIComponent(upstoxClientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}` });
      return res.end();
    }
    if (url.pathname === "/kite/login") {
      const apiKey = process.env.KITE_API_KEY || "3fm9odz8emxrymjo";
      res.writeHead(302, { Location: `https://kite.zerodha.com/connect/login?v=3&api_key=${encodeURIComponent(apiKey)}` });
      return res.end();
    }
    if (url.pathname === "/upstox/callback") return sendUpstoxCallback(res, url, upstoxSessionFile);
    if (url.pathname === "/kite/callback" || url.pathname === "/callback" || (url.searchParams.has("request_token") && url.pathname === "/")) {
      return sendKiteCallback(res, url, sessionFile);
    }
    await serveStatic(url.pathname, res, staticDir);
  } catch (error) {
    await sendJson(res, { error: error.message }, error.status || 500);
  }
});

server.listen(port, () => {
  console.log(`Finance dashboard running at http://127.0.0.1:${port}`);
});

function gracefulShutdown(signal) {
  console.log(`\n🛑 ${signal} received. Performing SQLite WAL checkpoint and graceful shutdown...`);
  try {
    import("./db/connection.js").then(({ getDb }) => {
      const db = getDb();
      db.exec("PRAGMA wal_checkpoint(TRUNCATE);");
      console.log("💾 SQLite WAL checkpointed successfully.");
      server.close(() => process.exit(0));
    }).catch(() => process.exit(0));
  } catch {
    process.exit(0);
  }
}

server.on("error", (err) => console.error("🛑 Server HTTP Error:", err));
process.stdin.resume();
process.on("exit", (code) => console.log(`🛑 Node Process exiting with code: ${code}`));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("unhandledRejection", (reason, promise) => console.error("⚠️ Unhandled Rejection at:", promise, "reason:", reason));
process.on("uncaughtException", (error) => console.error("🛑 Uncaught Exception:", error));
