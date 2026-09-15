export function getThemeColors() {
  const isViolet = document.documentElement.getAttribute("data-theme") === "violet";
  const isEmerald = document.documentElement.getAttribute("data-theme") === "emerald";

  return {
    bg: "transparent",
    textColor: "#9cafc4",
    gridColor: "rgba(255, 255, 255, 0.04)",
    upColor: isEmerald ? "#00f59b" : "#00f5c4",
    downColor: "#ff5570",
    wickUpColor: isEmerald ? "#00f59b" : "#00f5c4",
    wickDownColor: "#ff5570",
    accentColor: isViolet ? "#a78bfa" : isEmerald ? "#00f59b" : "#00d5ff",
    volumeUp: "rgba(0, 245, 196, 0.22)",
    volumeDown: "rgba(255, 85, 112, 0.22)",
    crosshairColor: "rgba(0, 213, 255, 0.4)"
  };
}

export function createLightweightChartInstance(container, options, colors) {
  const LC = window.LightweightCharts;
  const width = container.clientWidth || 620;
  const height = options.height || 340;

  container.innerHTML = "";
  container.style.position = "relative";

  return LC.createChart(container, {
    width,
    height,
    layout: {
      background: { type: "solid", color: colors.bg },
      textColor: colors.textColor,
      fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif",
      fontSize: 12
    },
    grid: {
      vertLines: { color: colors.gridColor, style: 1 },
      horzLines: { color: colors.gridColor, style: 1 }
    },
    crosshair: {
      mode: LC.CrosshairMode?.Normal ?? 0,
      vertLine: { color: colors.crosshairColor, width: 1, style: 3, labelBackgroundColor: "#0e2238" },
      horzLine: { color: colors.crosshairColor, width: 1, style: 3, labelBackgroundColor: "#0e2238" }
    },
    rightPriceScale: {
      borderColor: "rgba(255, 255, 255, 0.08)",
      scaleMargins: { top: 0.1, bottom: 0.25 },
      autoScale: true
    },
    timeScale: {
      borderColor: "rgba(255, 255, 255, 0.08)",
      timeVisible: true,
      secondsVisible: false
    },
    handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: true },
    handleScale: { axisPressedMouseMove: true, mouseWheel: true, pinch: true }
  });
}

export function setVisualPricePlan(candleSeries, priceLines, { entry, stopLoss, target }) {
  if (!candleSeries) return;
  if (priceLines.entry) candleSeries.removePriceLine(priceLines.entry);
  if (priceLines.stopLoss) candleSeries.removePriceLine(priceLines.stopLoss);
  if (priceLines.target) candleSeries.removePriceLine(priceLines.target);

  const LC = window.LightweightCharts;
  const styleSolid = LC?.LineStyle?.Solid ?? 0;
  const styleDashed = LC?.LineStyle?.Dashed ?? 2;
  const styleDotted = LC?.LineStyle?.Dotted ?? 1;

  if (entry && Number(entry) > 0) {
    priceLines.entry = candleSeries.createPriceLine({
      price: Number(entry),
      color: "#00d5ff",
      lineWidth: 2,
      lineStyle: styleSolid,
      axisLabelVisible: true,
      title: "ENTRY @ ₹" + Number(entry).toFixed(2)
    });
  }

  if (stopLoss && Number(stopLoss) > 0) {
    priceLines.stopLoss = candleSeries.createPriceLine({
      price: Number(stopLoss),
      color: "#ff5570",
      lineWidth: 2,
      lineStyle: styleDashed,
      axisLabelVisible: true,
      title: "HARD SL @ ₹" + Number(stopLoss).toFixed(2)
    });
  }

  if (target && Number(target) > 0) {
    priceLines.target = candleSeries.createPriceLine({
      price: Number(target),
      color: "#00f5c4",
      lineWidth: 2,
      lineStyle: styleDotted,
      axisLabelVisible: true,
      title: "TARGET @ ₹" + Number(target).toFixed(2)
    });
  }
}

export function generateSampleCandles(basePrice = 24310, count = 75, intervalMinutes = 5) {
  const candles = [];
  let currentPrice = basePrice;
  const now = Math.floor(Date.now() / 1000) - (count * intervalMinutes * 60);

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
      time,
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume
    });
    currentPrice = close;
  }
  return candles;
}

export function openPopoutChart(symbol = "NIFTY 50") {
  const url = `/chart-popout.html?symbol=${encodeURIComponent(symbol)}`;
  const win = window.open(url, "PortfolioXChartPopout", "width=1200,height=800,menubar=no,toolbar=no,location=no,status=no");
  if (win) {
    win.focus();
  }
}
if (typeof window !== "undefined") {
  window.openPopoutChart = openPopoutChart;
}
