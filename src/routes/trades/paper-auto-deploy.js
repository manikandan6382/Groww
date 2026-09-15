import { createPaperTrade } from "../../repositories/paper-lab.repository.js";
import { paperTradeEngine } from "../../services/paperTradeEngine.js";
import { ensurePaperEngineStarted } from "./paper-sse.js";
import { sendJson } from "./route-helpers.js";

export async function handleAutoDeploy(res) {
  try {
    const token = paperTradeEngine.client.accessToken;
    let spotPrice = 24151.10;
    let optionLtp = 100.00;
    let symbol = "NIFTY";
    let strike = 24200;
    let optionType = "PUT";
    let tokenKey = "NSE_FO|46994";

    if (token) {
      try {
        const quoteRes = await fetch("https://api.upstox.com/v2/market-quote/quotes?instrument_key=NSE_INDEX|Nifty 50,NSE_FO|46993,NSE_FO|46994", {
          headers: { Accept: "application/json", Authorization: `Bearer ${token}` }
        });
        const qData = await quoteRes.json();
        const spotData = qData?.data?.["NSE_INDEX:Nifty 50"];
        const peData = qData?.data?.["NSE_FO:NIFTY2690124200PE"];
        const ceData = qData?.data?.["NSE_FO:NIFTY2690124200CE"];

        if (spotData?.last_price) spotPrice = Number(spotData.last_price);
        const netChange = Number(spotData?.net_change || 0);

        if (netChange >= 0 && ceData?.last_price) {
          optionType = "CALL";
          optionLtp = Number(ceData.last_price);
          tokenKey = "NSE_FO|46993";
        } else if (peData?.last_price) {
          optionType = "PUT";
          optionLtp = Number(peData.last_price);
          tokenKey = "NSE_FO|46994";
        }
      } catch (e) {
        console.warn("Upstox quote fetch fallback:", e.message);
      }
    }

    const entryPrice = Math.round(optionLtp * 20) / 20;
    const isNifty = symbol === "NIFTY";
    // Institutional 1:2.25 R:R to outrun friction & slippage:
    // 8.00 pts SL (₹520 risk on 1 lot) / 18.00 pts Target (₹1,170 reward on 1 lot)
    const slBuffer = isNifty ? 8.00 : Math.max(12.00, Math.round((entryPrice * 0.10) * 20) / 20);
    const tpBuffer = isNifty ? 18.00 : Math.max(26.00, Math.round((entryPrice * 0.225) * 20) / 20);
    const stopLoss = Math.max(0.05, Math.round((entryPrice - slBuffer) * 20) / 20);
    const targetPrice = Math.round((entryPrice + tpBuffer) * 20) / 20;

    const trade = createPaperTrade({
      underlyingSymbol: symbol,
      strikePrice: strike,
      optionType,
      currentPrice: entryPrice,
      entryPrice,
      stopLoss,
      targetPrice,
      quantity: 1,
      lotSize: 65,
      personalNotes: `UPSTOX_TOKEN:${tokenKey} Institutional 1:2.25 R:R Scalp (₹520 SL / ₹1,170 TP · Friction Protected)`
    });

    ensurePaperEngineStarted();
    await paperTradeEngine.syncTrade(trade.id);
    paperTradeEngine.publish("trade_mutation", { action: "create", tradeId: trade.id });
    sendJson(res, { success: true, item: trade, message: `Live ${optionType} alert deployed at ₹${entryPrice.toFixed(2)}` }, 201);
    return true;
  } catch (err) {
    sendJson(res, { success: false, error: err.message }, 500);
    return true;
  }
}
