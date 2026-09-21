import { paperTradeEngine } from "../../services/paperTradeEngine.js";
import { ensurePaperEngineStarted } from "./paper-sse.js";
import { sendJson } from "./route-helpers.js";
import { indicesCache } from "./option-contract-cache.js";

const mapping = [
  { key: "NSE_INDEX|Nifty 50", lookup: "NSE_INDEX:Nifty 50", name: "NIFTY 50" },
  { key: "NSE_INDEX|Nifty Bank", lookup: "NSE_INDEX:Nifty Bank", name: "BANKNIFTY" },
  { key: "NSE_INDEX|India VIX", lookup: "NSE_INDEX:India VIX", name: "INDIA VIX" },
  { key: "NSE_INDEX|Nifty Fin Service", lookup: "NSE_INDEX:Nifty Fin Service", name: "FINNIFTY" },
  { key: "BSE_INDEX|SENSEX", lookup: "BSE_INDEX:SENSEX", name: "BSE SENSEX" }
];

export async function handleMarketIndicesRoutes(req, res, url) {
  if (req.method === "GET" && (url.pathname === "/api/market/indices" || url.pathname === "/api/upstox/indices")) {
    ensurePaperEngineStarted();
    const client = paperTradeEngine.client;
    client.refreshAccessToken();
    const token = client.accessToken || "";

    const cached = indicesCache.get("LIVE_INDICES");
    if (cached && Date.now() - cached.timestamp < 1500) {
      sendJson(res, cached.data);
      return true;
    }

    if (token) {
      try {
        const keys = mapping.map((m) => m.key).join(",");
        const upstoxUrl = `https://api.upstox.com/v2/market-quote/quotes?instrument_key=${encodeURIComponent(keys)}`;
        const qRes = await fetch(upstoxUrl, {
          headers: { Accept: "application/json", Authorization: `Bearer ${token}` }
        });

        if (qRes.ok) {
          const qData = await qRes.json();
          const raw = qData?.data || {};
          const result = {};

          for (const item of mapping) {
            const quote = raw[item.lookup] || raw[item.key];
            if (quote && quote.last_price != null) {
              const ltp = Number(quote.last_price);
              const change = Number(quote.net_change || 0);
              const prevClose = quote.ohlc?.close != null ? Number(quote.ohlc.close) : (ltp - change);
              const changePct = prevClose > 0 ? Number(((change / prevClose) * 100).toFixed(2)) : 0;

              result[item.key] = {
                name: item.name,
                ltp,
                change,
                changePct,
                open: quote.ohlc?.open != null ? Number(quote.ohlc.open) : ltp,
                high: quote.ohlc?.high != null ? Number(quote.ohlc.high) : ltp,
                low: quote.ohlc?.low != null ? Number(quote.ohlc.low) : ltp,
                close: prevClose,
                timestamp: quote.timestamp || new Date().toISOString()
              };

              paperTradeEngine.publish("index_tick", {
                symbol: item.key,
                tokenKey: item.key,
                name: item.name,
                ltp,
                change,
                changePct,
                open: result[item.key].open,
                high: result[item.key].high,
                low: result[item.key].low,
                close: prevClose,
                receivedAt: quote.timestamp || new Date().toISOString()
              });
            }
          }

          const responseData = {
            success: true,
            timestamp: new Date().toISOString(),
            indices: result
          };

          indicesCache.set("LIVE_INDICES", { timestamp: Date.now(), data: responseData });
          sendJson(res, responseData);
          return true;
        }
      } catch (err) {
        console.warn("Live indices fetch error:", err.message);
      }
    }

    if (cached?.data?.indices && Object.keys(cached.data.indices).length > 0) {
      sendJson(res, cached.data);
      return true;
    }

    if (paperTradeEngine.simulator) {
      paperTradeEngine.simulator.simulateIndices();
      const fresh = indicesCache.get("LIVE_INDICES");
      if (fresh?.data) {
        sendJson(res, fresh.data);
        return true;
      }
    }

    sendJson(res, {
      success: false,
      message: "Upstox live feed unavailable or token missing",
      indices: cached?.data?.indices || {}
    });
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/market/depth") {
    ensurePaperEngineStarted();
    const client = paperTradeEngine.client;
    client.refreshAccessToken();
    const token = client.accessToken || "";
    const rawSym = (url.searchParams.get("symbol") || "").trim().toUpperCase();
    const cleanSym = rawSym.replace(/\.(NS|BO)$/, "");

    if (!cleanSym) {
      sendJson(res, { success: false, message: "Symbol query parameter is required" }, 400);
      return true;
    }

    const SEED_KEYS = {
      RELIANCE: "NSE_EQ|INE002A01018",
      TCS: "NSE_EQ|INE467B01029",
      HDFCBANK: "NSE_EQ|INE040A01034",
      INFY: "NSE_EQ|INE009A01021",
      SBIN: "NSE_EQ|INE062A01020",
      TATAMOTORS: "NSE_EQ|INE155A01022",
      ICICIBANK: "NSE_EQ|INE090A01021",
      ZOMATO: "NSE_EQ|INE758T01015",
      JIOFIN: "NSE_EQ|INE414G01012",
      GOLDBEES: "NSE_EQ|INF732E01037",
      KOTAKBANK: "NSE_EQ|INE237A01028",
      LT: "NSE_EQ|INE018A01030",
      ITC: "NSE_EQ|INE154A01025",
      AXISBANK: "NSE_EQ|INE238A01034",
      BHARTIARTL: "NSE_EQ|INE397D01024",
      MARUTI: "NSE_EQ|INE585B01010",
      NIFTY: "NSE_INDEX|Nifty 50",
      "NIFTY 50": "NSE_INDEX|Nifty 50",
      BANKNIFTY: "NSE_INDEX|Nifty Bank",
      FINNIFTY: "NSE_INDEX|Nifty Fin Service",
      SENSEX: "BSE_INDEX|SENSEX",
      "INDIA VIX": "NSE_INDEX|India VIX"
    };

    const instKey = SEED_KEYS[cleanSym] || `NSE_EQ|${cleanSym}`;

    if (token) {
      try {
        const upstoxUrl = `https://api.upstox.com/v2/market-quote/quotes?instrument_key=${encodeURIComponent(instKey)}`;
        const qRes = await fetch(upstoxUrl, {
          headers: { Accept: "application/json", Authorization: `Bearer ${token}` }
        });

        if (qRes.ok) {
          const qData = await qRes.json();
          const raw = qData?.data || {};
          const quote = raw[instKey] || raw[instKey.replace("|", ":")] || Object.values(raw)[0];

          if (quote) {
            const ltp = Number(quote.last_price || 0);
            const netChange = Number(quote.net_change || 0);
            const prevClose = quote.ohlc?.close != null ? Number(quote.ohlc.close) : (ltp - netChange);
            const netChangePct = prevClose > 0 ? Number(((netChange / prevClose) * 100).toFixed(2)) : 0;
            const vwap = Number(quote.average_price || ltp);
            const volume = Number(quote.volume || 0);
            const totalBuy = Number(quote.total_buy_quantity || 0);
            const totalSell = Number(quote.total_sell_quantity || 0);

            const bids = (quote.depth?.buy || [])
              .filter((b) => Number(b.price || 0) > 0 || Number(b.quantity || 0) > 0)
              .map((b) => ({ price: Number(b.price || 0), quantity: Number(b.quantity || 0), orders: Number(b.orders || 0) }));

            const asks = (quote.depth?.sell || [])
              .filter((a) => Number(a.price || 0) > 0 || Number(a.quantity || 0) > 0)
              .map((a) => ({ price: Number(a.price || 0), quantity: Number(a.quantity || 0), orders: Number(a.orders || 0) }));

            const isLive = bids.length > 0 || asks.length > 0 || volume > 0;

            sendJson(res, {
              success: true,
              data: {
                symbol: cleanSym,
                instrumentKey: instKey,
                lastPrice: ltp,
                netChange,
                netChangePct,
                vwap,
                volume,
                totalBuyQuantity: totalBuy,
                totalSellQuantity: totalSell,
                bids,
                asks,
                isLive,
                timestamp: quote.timestamp || new Date().toISOString()
              }
            });
            return true;
          }
        }
      } catch (err) {
        console.warn("Live depth fetch error:", err.message);
      }
    }

    sendJson(res, {
      success: false,
      message: "Live Upstox depth unavailable, fallback active"
    });
    return true;
  }

  return false;
}
