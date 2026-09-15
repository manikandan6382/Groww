import { fetchJson, showError } from "./app-helpers.js";
import { state } from "./app-state.js";

export function getSelectedRange() {
  return document.querySelector(".range-tabs .selected")?.dataset.range || "1mo";
}

export async function loadYahooChart(range = "1mo") {
  const container = document.getElementById("tradingviewChartContainer");
  if (!state.tvTerminal && container && window.TradingViewTerminal) {
    state.tvTerminal = new window.TradingViewTerminal(container, {
      symbol: "NIFTY 50",
      height: 280,
      showVolume: true,
      onCrosshairMove: (param, series) => {
        if (!param || !param.time) return;
        const data = param.seriesData?.get(series);
        if (!data) return;
        
        const oEl = document.getElementById("tvO");
        const hEl = document.getElementById("tvH");
        const lEl = document.getElementById("tvL");
        const cEl = document.getElementById("tvC");
        const priceEl = document.getElementById("tvLegendPrice");
        const changeEl = document.getElementById("tvLegendChange");

        if (oEl && data.open !== undefined) oEl.textContent = data.open.toFixed(2);
        if (hEl && data.high !== undefined) hEl.textContent = data.high.toFixed(2);
        if (lEl && data.low !== undefined) lEl.textContent = data.low.toFixed(2);
        if (cEl && data.close !== undefined) cEl.textContent = data.close.toFixed(2);
        if (priceEl && data.close !== undefined) priceEl.textContent = "₹" + data.close.toFixed(2);
        
        if (changeEl && data.open && data.close) {
          const diff = data.close - data.open;
          const pct = (diff / data.open) * 100;
          changeEl.textContent = (diff >= 0 ? "+" : "") + pct.toFixed(2) + "%";
          changeEl.className = "tv-legend-change " + (diff >= 0 ? "text-gain" : "text-loss");
        }
      }
    });

    state.tvTerminal.setVisualPricePlan({
      entry: 24165.00,
      stopLoss: 24150.00,
      target: 24205.00
    });
  }

  try {
    const data = await fetchJson(`/api/yahoo/chart?symbol=^NSEI&range=${range}&interval=1d`);
    const result = data.chart?.result?.[0];
    const timestamps = result?.timestamp || [];
    const quote = result?.indicators?.quote?.[0] || {};
    
    if (timestamps.length && quote.open && quote.close) {
      const candles = [];
      for (let i = 0; i < timestamps.length; i++) {
        const o = quote.open[i];
        const h = quote.high[i];
        const l = quote.low[i];
        const c = quote.close[i];
        const v = quote.volume?.[i] || 0;
        if (typeof c === "number" && typeof o === "number") {
          candles.push({
            time: timestamps[i],
            open: Number(o.toFixed(2)),
            high: Number((h || Math.max(o, c)).toFixed(2)),
            low: Number((l || Math.min(o, c)).toFixed(2)),
            close: Number(c.toFixed(2)),
            volume: v
          });
        }
      }
      if (candles.length && state.tvTerminal) {
        state.tvTerminal.loadHistoricalCandles(candles);
        const last = candles[candles.length - 1];
        const oEl = document.getElementById("tvO");
        const hEl = document.getElementById("tvH");
        const lEl = document.getElementById("tvL");
        const cEl = document.getElementById("tvC");
        const priceEl = document.getElementById("tvLegendPrice");
        const changeEl = document.getElementById("tvLegendChange");

        if (oEl && last.open !== undefined) oEl.textContent = last.open.toFixed(2);
        if (hEl && last.high !== undefined) hEl.textContent = last.high.toFixed(2);
        if (lEl && last.low !== undefined) lEl.textContent = last.low.toFixed(2);
        if (cEl && last.close !== undefined) cEl.textContent = last.close.toFixed(2);
        if (priceEl && last.close !== undefined) priceEl.textContent = "₹" + last.close.toFixed(2);
        if (changeEl && last.open && last.close) {
          const diff = last.close - last.open;
          const pct = (diff / last.open) * 100;
          changeEl.textContent = (diff >= 0 ? "+" : "") + pct.toFixed(2) + "%";
          changeEl.className = "tv-legend-change " + (diff >= 0 ? "text-gain" : "text-loss");
        }

        state.tvTerminal.setVisualPricePlan({
          entry: Number((last.close - 15).toFixed(2)),
          stopLoss: Number((last.close - 40).toFixed(2)),
          target: Number((last.close + 45).toFixed(2))
        });
      }
    } else if (state.tvTerminal) {
      const samples = state.tvTerminal.generateSampleCandles(24310, 60, 5);
      state.tvTerminal.loadHistoricalCandles(samples);
    }
  } catch (error) {
    if (state.tvTerminal) {
      const samples = state.tvTerminal.generateSampleCandles(24310, 60, 5);
      state.tvTerminal.loadHistoricalCandles(samples);
    }
    showError(`Yahoo chart fallback active: ${error.message}`);
  }
}
