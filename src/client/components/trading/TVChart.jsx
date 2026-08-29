import React, { useEffect, useRef, useState } from "react";
import { createChart, ColorType, CandlestickSeries } from "lightweight-charts";
import { ExternalLink, BarChart3, Maximize2 } from "lucide-react";

export function TVChart({ symbol = "NIFTY 50" }) {
  const chartContainerRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const [selectedRange, setSelectedRange] = useState("1M");

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create Lightweight Chart with Dark Glass Styling
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#94a3b8",
        fontFamily: "'Roboto Mono', monospace",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "rgba(255, 255, 255, 0.04)" },
        horzLines: { color: "rgba(255, 255, 255, 0.04)" },
      },
      crosshair: {
        vertLine: { color: "#38bdf8", width: 1, style: 2 },
        horzLine: { color: "#38bdf8", width: 1, style: 2 },
      },
      timeScale: {
        borderColor: "rgba(255, 255, 255, 0.08)",
        timeVisible: true,
      },
      rightPriceScale: {
        borderColor: "rgba(255, 255, 255, 0.08)",
      },
      width: chartContainerRef.current.clientWidth,
      height: 280,
    });

    const seriesOptions = {
      upColor: "#34d399",
      downColor: "#fb7185",
      borderUpColor: "#34d399",
      borderDownColor: "#fb7185",
      wickUpColor: "#34d399",
      wickDownColor: "#fb7185",
    };

    const candleSeries = (typeof chart.addSeries === "function" && CandlestickSeries)
      ? chart.addSeries(CandlestickSeries, seriesOptions)
      : chart.addCandlestickSeries(seriesOptions);

    // Sample initial market structure data
    const sampleData = [
      { time: "2026-08-01", open: 24200, high: 24350, low: 24150, close: 24300 },
      { time: "2026-08-02", open: 24300, high: 24450, low: 24280, close: 24420 },
      { time: "2026-08-03", open: 24420, high: 24500, low: 24380, close: 24460 },
      { time: "2026-08-04", open: 24460, high: 24580, low: 24410, close: 24540 },
      { time: "2026-08-05", open: 24540, high: 24620, low: 24500, close: 24580 },
      { time: "2026-08-08", open: 24580, high: 24650, low: 24520, close: 24610 },
      { time: "2026-08-09", open: 24610, high: 24700, low: 24590, close: 24680 },
      { time: "2026-08-10", open: 24680, high: 24720, low: 24600, close: 24640 },
      { time: "2026-08-11", open: 24640, high: 24750, low: 24620, close: 24710 },
      { time: "2026-08-12", open: 24710, high: 24800, low: 24680, close: 24790 },
      { time: "2026-08-15", open: 24790, high: 24850, low: 24740, close: 24820 },
      { time: "2026-08-16", open: 24820, high: 24880, low: 24760, close: 24850 },
      { time: "2026-08-17", open: 24850, high: 24920, low: 24800, close: 24900 },
      { time: "2026-08-18", open: 24900, high: 24950, low: 24820, close: 24890 },
      { time: "2026-08-19", open: 24890, high: 24930, low: 24810, close: 24860 },
      { time: "2026-08-22", open: 24860, high: 24980, low: 24840, close: 24950 },
      { time: "2026-08-23", open: 24950, high: 25020, low: 24910, close: 24990 },
      { time: "2026-08-24", open: 24990, high: 25050, low: 24940, close: 25010 },
      { time: "2026-08-25", open: 25010, high: 25100, low: 24980, close: 25080 },
      { time: "2026-08-26", open: 25080, high: 25140, low: 25020, close: 25110 },
      { time: "2026-08-27", open: 25110, high: 25180, low: 25060, close: 25150 },
      { time: "2026-08-28", open: 25150, high: 25220, low: 25120, close: 25190 },
    ];

    candleSeries.setData(sampleData);
    chart.timeScale().fitContent();

    chartInstanceRef.current = chart;
    candleSeriesRef.current = candleSeries;

    // Responsive Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
      if (entries.length && chartInstanceRef.current) {
        chartInstanceRef.current.applyOptions({
          width: entries[0].contentRect.width,
        });
      }
    });

    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, [symbol]);

  function handlePopout() {
    window.open("/chart-popout.html", "PortfolioX_PopoutChart", "width=1200,height=750,resizable=yes,scrollbars=no");
  }

  return (
    <div className="apple-ceramic-card p-4 space-y-3">
      {/* Header: Symbol + Range Tabs + Popout */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold font-mono">
              {symbol}
            </span>
            <strong className="text-base font-extrabold text-white font-mono tabular-nums">25,190.00</strong>
            <span className="text-xs font-bold text-emerald-400 font-mono tabular-nums">+0.82%</span>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">
            <span className="pulse-beacon" />
            60 FPS Canvas
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Timeframe Range Tabs */}
          <div className="flex items-center gap-1 bg-slate-900/80 p-0.5 rounded-lg border border-white/5">
            {["1D", "1W", "1M", "1Y", "ALL"].map((range) => (
              <button
                key={range}
                onClick={() => setSelectedRange(range)}
                className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition ${
                  selectedRange === range ? "bg-white/10 text-white font-extrabold" : "text-slate-400 hover:text-white"
                }`}
              >
                {range}
              </button>
            ))}
          </div>

          {/* Popout Button */}
          <button
            onClick={handlePopout}
            className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold rounded-lg border border-white/10 flex items-center gap-1.5 transition"
            title="Open detached multi-monitor TradingView window"
          >
            <Maximize2 className="w-3 h-3" />
            <span className="hidden sm:inline">Pop-Out</span>
          </button>
        </div>
      </div>

      {/* Lightweight Charts Canvas Mount */}
      <div ref={chartContainerRef} className="w-full min-h-[280px] rounded-xl overflow-hidden" />

      {/* Rosetta Legend Ribbon */}
      <div className="pt-2 border-t border-white/5 flex flex-wrap items-center justify-between text-[10px] text-slate-400 gap-2">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <strong className="text-slate-300">Green Candle:</strong> Buyers (UP)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            <strong className="text-slate-300">Red Candle:</strong> Sellers (DOWN)
          </span>
        </div>
        <span className="font-mono text-slate-500">TradingView Lightweight Charts v5.2</span>
      </div>
    </div>
  );
}
