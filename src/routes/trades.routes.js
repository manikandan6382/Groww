import { handleUpstoxTokenRoutes } from "./trades/upstox-token-routes.js";
import { handleMarketIndicesRoutes } from "./trades/market-indices-routes.js";
import { handleMarketOptionsRoutes } from "./trades/market-options-routes.js";
import { handleMarketHistoryRoutes } from "./trades/market-history-routes.js";
import { handleTradeCandlesRoutes } from "./trades/trade-candles-routes.js";
import { handleCopilotRoutes } from "./trades/copilot-routes.js";
import { handlePaperOrdersRoutes } from "./trades/paper-orders-routes.js";
import { handlePaperManageRoutes } from "./trades/paper-manage-routes.js";
import { handleJournalRoutes } from "./trades/journal-routes.js";

export async function handleTradingRequest(req, res, url) {
  if (await handleJournalRoutes(req, res, url)) return true;
  if (await handleUpstoxTokenRoutes(req, res, url)) return true;
  if (await handleMarketIndicesRoutes(req, res, url)) return true;
  if (await handleMarketOptionsRoutes(req, res, url)) return true;
  if (await handleMarketHistoryRoutes(req, res, url)) return true;
  if (await handleTradeCandlesRoutes(req, res, url)) return true;
  if (await handleCopilotRoutes(req, res, url)) return true;
  if (await handlePaperOrdersRoutes(req, res, url)) return true;
  if (await handlePaperManageRoutes(req, res, url)) return true;

  return false;
}