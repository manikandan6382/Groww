import React, { useEffect, useRef, useState } from "react";
import { createChart, CandlestickSeries } from "lightweight-charts";
import { CHART_OPTIONS, SERIES_OPTIONS, SAMPLE_CANDLE_DATA } from "./chartConfigData";
import { TVChartHeader } from "./TVChartHeader";
import { TVChartLegend } from "./TVChartLegend";

export function TVChart({ symbol = "NIFTY 50" }) {
  const chartContainerRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const [selectedRange, setSelectedRange] = useState("1M");

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      ...CHART_OPTIONS,
      width: chartContainerRef.current.clientWidth,
    });

    const candleSeries = (typeof chart.addSeries === "function" && CandlestickSeries)
      ? chart.addSeries(CandlestickSeries, SERIES_OPTIONS)
      : chart.addCandlestickSeries(SERIES_OPTIONS);

    candleSeries.setData(SAMPLE_CANDLE_DATA);
    chart.timeScale().fitContent();

    chartInstanceRef.current = chart;
    candleSeriesRef.current = candleSeries;

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
      <TVChartHeader
        symbol={symbol}
        selectedRange={selectedRange}
        setSelectedRange={setSelectedRange}
        onPopout={handlePopout}
      />

      {/* Lightweight Charts Canvas Mount */}
      <div ref={chartContainerRef} className="w-full min-h-[280px] rounded-xl overflow-hidden" />

      {/* Rosetta Legend Ribbon */}
      <TVChartLegend />
    </div>
  );
}

export default TVChart;
