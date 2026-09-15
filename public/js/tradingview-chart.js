import { createLightweightChartInstance, generateSampleCandles, getThemeColors, openPopoutChart, setVisualPricePlan } from "./chart-helpers.js";

export { createLightweightChartInstance, generateSampleCandles, getThemeColors, openPopoutChart, setVisualPricePlan };

export class TradingViewTerminal {
  constructor(containerId, options = {}) {
    this.container = typeof containerId === "string" ? document.getElementById(containerId) : containerId;
    if (!this.container) {
      console.warn("[TradingViewTerminal] Container #" + containerId + " not found.");
      return;
    }

    this.options = Object.assign({
      symbol: "NIFTY 50",
      timeframe: "5m",
      theme: document.documentElement.getAttribute("data-theme") || "blue",
      height: 340,
      showVolume: true,
      onCrosshairMove: null
    }, options);

    this.chart = null;
    this.candleSeries = null;
    this.volumeSeries = null;
    this.priceLines = { entry: null, stopLoss: null, target: null };
    this.lastCandleTime = null;

    this.init();
  }

  getThemeColors() {
    return getThemeColors();
  }

  init() {
    if (typeof window.LightweightCharts === "undefined") {
      console.error("[TradingViewTerminal] LightweightCharts library not loaded in window.");
      return;
    }

    const LC = window.LightweightCharts;
    const colors = this.getThemeColors();
    this.chart = createLightweightChartInstance(this.container, this.options, colors);

    const candleOpts = {
      upColor: colors.upColor,
      downColor: colors.downColor,
      borderVisible: false,
      wickUpColor: colors.wickUpColor,
      wickDownColor: colors.wickDownColor
    };

    if (typeof this.chart.addCandlestickSeries === "function") {
      this.candleSeries = this.chart.addCandlestickSeries(candleOpts);
    } else if (LC.CandlestickSeries && typeof this.chart.addSeries === "function") {
      this.candleSeries = this.chart.addSeries(LC.CandlestickSeries, candleOpts);
    }

    if (this.options.showVolume) {
      const volOpts = { color: colors.volumeUp, priceFormat: { type: "volume" }, priceScaleId: "", scaleMargins: { top: 0.82, bottom: 0 } };
      if (typeof this.chart.addHistogramSeries === "function") {
        this.volumeSeries = this.chart.addHistogramSeries(volOpts);
      } else if (LC.HistogramSeries && typeof this.chart.addSeries === "function") {
        this.volumeSeries = this.chart.addSeries(LC.HistogramSeries, volOpts);
      }
    }

    this.resizeObserver = new ResizeObserver((entries) => {
      if (!entries || !entries.length || !this.chart) return;
      const { width: w, height: h } = entries[0].contentRect;
      if (w > 0 && h > 0) this.chart.applyOptions({ width: w, height: this.options.height || h });
    });
    this.resizeObserver.observe(this.container);

    this.chart.subscribeCrosshairMove((param) => {
      if (typeof this.options.onCrosshairMove === "function") {
        this.options.onCrosshairMove(param, this.candleSeries);
      }
    });
  }

  loadHistoricalCandles(data) {
    if (!this.candleSeries || !Array.isArray(data) || !data.length) return;
    const sorted = [...data].filter((d) => d && typeof d.time === "number" && !isNaN(d.close)).sort((a, b) => a.time - b.time);
    const uniqueMap = new Map();
    sorted.forEach((d) => uniqueMap.set(d.time, d));
    const cleanData = Array.from(uniqueMap.values());

    this.candleSeries.setData(cleanData);
    if (this.volumeSeries) {
      const volData = cleanData.map((d) => ({
        time: d.time,
        value: d.volume || (Math.abs(d.close - d.open) * 1250) + 5000,
        color: d.close >= d.open ? "rgba(0, 245, 196, 0.3)" : "rgba(255, 85, 112, 0.3)"
      }));
      this.volumeSeries.setData(volData);
    }
    this.lastCandleTime = cleanData[cleanData.length - 1]?.time;
    this.chart.timeScale().fitContent();
  }

  updateTick(tick) {
    if (!this.candleSeries || !tick) return;
    this.candleSeries.update(tick);
    if (this.volumeSeries && tick.volume !== undefined) {
      this.volumeSeries.update({
        time: tick.time,
        value: tick.volume,
        color: tick.close >= tick.open ? "rgba(0, 245, 196, 0.3)" : "rgba(255, 85, 112, 0.3)"
      });
    }
  }

  setVisualPricePlan(plan) {
    setVisualPricePlan(this.candleSeries, this.priceLines, plan);
  }

  generateSampleCandles(basePrice, count, intervalMinutes) {
    return generateSampleCandles(basePrice, count, intervalMinutes);
  }

  setTimeframe(tf) {
    this.options.timeframe = tf;
    const intervalMap = { "1m": 1, "5m": 5, "15m": 15, "1h": 60 };
    const mins = intervalMap[tf] || 5;
    const basePrice = this.options.symbol?.includes("BANK") ? 52000 : 24200;
    this.loadHistoricalCandles(this.generateSampleCandles(basePrice, 80, mins));
  }

  destroy() {
    if (this.resizeObserver) this.resizeObserver.disconnect();
    if (this.chart) this.chart.remove();
    this.chart = null;
  }
}
