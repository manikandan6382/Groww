/**
 * PortfolioX - TradingView Lightweight Charts Integration
 * High-performance HTML5 Canvas Candlestick & Tick Chart Engine (60 FPS)
 */

export class TradingViewTerminal {
  constructor(containerId, options = {}) {
    this.container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
    if (!this.container) {
      console.warn('[TradingViewTerminal] Container #' + containerId + ' not found.');
      return;
    }

    this.options = Object.assign({
      symbol: 'NIFTY 50',
      timeframe: '5m',
      theme: document.documentElement.getAttribute('data-theme') || 'blue',
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
    const isViolet = document.documentElement.getAttribute('data-theme') === 'violet';
    const isEmerald = document.documentElement.getAttribute('data-theme') === 'emerald';

    return {
      bg: 'transparent',
      textColor: '#9cafc4',
      gridColor: 'rgba(255, 255, 255, 0.04)',
      upColor: isEmerald ? '#00f59b' : '#00f5c4',
      downColor: '#ff5570',
      wickUpColor: isEmerald ? '#00f59b' : '#00f5c4',
      wickDownColor: '#ff5570',
      accentColor: isViolet ? '#a78bfa' : isEmerald ? '#00f59b' : '#00d5ff',
      volumeUp: 'rgba(0, 245, 196, 0.22)',
      volumeDown: 'rgba(255, 85, 112, 0.22)',
      crosshairColor: 'rgba(0, 213, 255, 0.4)'
    };
  }

  init() {
    if (typeof window.LightweightCharts === 'undefined') {
      console.error('[TradingViewTerminal] LightweightCharts library not loaded in window.');
      return;
    }

    const LC = window.LightweightCharts;
    const colors = this.getThemeColors();
    const width = this.container.clientWidth || 620;
    const height = this.options.height || 340;

    this.container.innerHTML = '';
    this.container.style.position = 'relative';

    const crosshairMode = LC.CrosshairMode?.Normal ?? 0;

    this.chart = LC.createChart(this.container, {
      width: width,
      height: height,
      layout: {
        background: { type: 'solid', color: colors.bg },
        textColor: colors.textColor,
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
        fontSize: 12
      },
      grid: {
        vertLines: { color: colors.gridColor, style: 1 },
        horzLines: { color: colors.gridColor, style: 1 }
      },
      crosshair: {
        mode: crosshairMode,
        vertLine: { color: colors.crosshairColor, width: 1, style: 3, labelBackgroundColor: '#0e2238' },
        horzLine: { color: colors.crosshairColor, width: 1, style: 3, labelBackgroundColor: '#0e2238' }
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.08)',
        scaleMargins: { top: 0.1, bottom: 0.25 },
        autoScale: true
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.08)',
        timeVisible: true,
        secondsVisible: false
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: true },
      handleScale: { axisPressedMouseMove: true, mouseWheel: true, pinch: true }
    });

    // LightweightCharts v5.x vs v4.x compatibility
    const candleOptions = {
      upColor: colors.upColor,
      downColor: colors.downColor,
      borderVisible: false,
      wickUpColor: colors.wickUpColor,
      wickDownColor: colors.wickDownColor
    };

    if (typeof this.chart.addCandlestickSeries === 'function') {
      this.candleSeries = this.chart.addCandlestickSeries(candleOptions);
    } else if (LC.CandlestickSeries && typeof this.chart.addSeries === 'function') {
      this.candleSeries = this.chart.addSeries(LC.CandlestickSeries, candleOptions);
    }

    if (this.options.showVolume) {
      const volumeOptions = {
        color: colors.volumeUp,
        priceFormat: { type: 'volume' },
        priceScaleId: '',
        scaleMargins: { top: 0.82, bottom: 0 }
      };

      if (typeof this.chart.addHistogramSeries === 'function') {
        this.volumeSeries = this.chart.addHistogramSeries(volumeOptions);
      } else if (LC.HistogramSeries && typeof this.chart.addSeries === 'function') {
        this.volumeSeries = this.chart.addSeries(LC.HistogramSeries, volumeOptions);
      }
    }

    this.resizeObserver = new ResizeObserver(entries => {
      if (!entries || !entries.length || !this.chart) return;
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) {
        this.chart.applyOptions({ width, height: this.options.height || height });
      }
    });
    this.resizeObserver.observe(this.container);

    this.chart.subscribeCrosshairMove(param => {
      if (typeof this.options.onCrosshairMove === 'function') {
        this.options.onCrosshairMove(param, this.candleSeries);
      }
    });

    console.log('[TradingViewTerminal] Initialized on #' + this.container.id);
  }

  loadHistoricalCandles(data) {
    if (!this.candleSeries || !Array.isArray(data) || !data.length) return;
    // Deduplicate and ensure strict chronological ordering
    const sorted = [...data]
      .filter(d => d && typeof d.time === 'number' && !isNaN(d.close))
      .sort((a, b) => a.time - b.time);

    const uniqueMap = new Map();
    sorted.forEach(d => uniqueMap.set(d.time, d));
    const cleanData = Array.from(uniqueMap.values());

    this.candleSeries.setData(cleanData);
    if (this.volumeSeries) {
      const volData = cleanData.map(d => ({
        time: d.time,
        value: d.volume || (Math.abs(d.close - d.open) * 1250) + 5000,
        color: d.close >= d.open ? 'rgba(0, 245, 196, 0.3)' : 'rgba(255, 85, 112, 0.3)'
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
        color: tick.close >= tick.open ? 'rgba(0, 245, 196, 0.3)' : 'rgba(255, 85, 112, 0.3)'
      });
    }
  }

  setVisualPricePlan({ entry, stopLoss, target }) {
    if (!this.candleSeries) return;
    if (this.priceLines.entry) this.candleSeries.removePriceLine(this.priceLines.entry);
    if (this.priceLines.stopLoss) this.candleSeries.removePriceLine(this.priceLines.stopLoss);
    if (this.priceLines.target) this.candleSeries.removePriceLine(this.priceLines.target);

    const LC = window.LightweightCharts;
    const styleSolid = LC?.LineStyle?.Solid ?? 0;
    const styleDashed = LC?.LineStyle?.Dashed ?? 2;
    const styleDotted = LC?.LineStyle?.Dotted ?? 1;

    if (entry && Number(entry) > 0) {
      this.priceLines.entry = this.candleSeries.createPriceLine({
        price: Number(entry),
        color: '#00d5ff',
        lineWidth: 2,
        lineStyle: styleSolid,
        axisLabelVisible: true,
        title: 'ENTRY @ ₹' + Number(entry).toFixed(2)
      });
    }

    if (stopLoss && Number(stopLoss) > 0) {
      this.priceLines.stopLoss = this.candleSeries.createPriceLine({
        price: Number(stopLoss),
        color: '#ff5570',
        lineWidth: 2,
        lineStyle: styleDashed,
        axisLabelVisible: true,
        title: 'HARD SL @ ₹' + Number(stopLoss).toFixed(2)
      });
    }

    if (target && Number(target) > 0) {
      this.priceLines.target = this.candleSeries.createPriceLine({
        price: Number(target),
        color: '#00f5c4',
        lineWidth: 2,
        lineStyle: styleDotted,
        axisLabelVisible: true,
        title: 'TARGET @ ₹' + Number(target).toFixed(2)
      });
    }
  }

  generateSampleCandles(basePrice = 24310, count = 75, intervalMinutes = 5) {
    const candles = [];
    let currentPrice = basePrice;
    let now = Math.floor(Date.now() / 1000) - (count * intervalMinutes * 60);

    for (let i = 0; i < count; i++) {
      const time = now + (i * intervalMinutes * 60);
      const volatility = currentPrice * 0.0015;
      const change = (Math.random() - 0.49) * volatility;
      const open = currentPrice;
      const close = open + change;
      const high = Math.max(open, close) + Math.random() * (volatility * 0.6);
      const low = Math.min(open, close) - Math.random() * (volatility * 0.6);
      const volume = Math.floor(Math.random() * 45000) + 12000;

      candles.push({
        time: time,
        open: Number(open.toFixed(2)),
        high: Number(high.toFixed(2)),
        low: Number(low.toFixed(2)),
        close: Number(close.toFixed(2)),
        volume: volume
      });
      currentPrice = close;
    }
    return candles;
  }

  destroy() {
    if (this.resizeObserver) this.resizeObserver.disconnect();
    if (this.chart) this.chart.remove();
    this.chart = null;
  }
}

export function openPopoutChart(symbol = "NIFTY 50") {
  const url = `/chart-popout.html?symbol=${encodeURIComponent(symbol)}`;
  const win = window.open(url, "PortfolioXChartPopout", "width=1200,height=800,menubar=no,toolbar=no,location=no,status=no");
  if (win) {
    win.focus();
  }
}
window.openPopoutChart = openPopoutChart;

