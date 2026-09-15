import { ColorType } from "lightweight-charts";

export const CHART_OPTIONS = {
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
  height: 280,
};

export const SERIES_OPTIONS = {
  upColor: "#34d399",
  downColor: "#fb7185",
  borderUpColor: "#34d399",
  borderDownColor: "#fb7185",
  wickUpColor: "#34d399",
  wickDownColor: "#fb7185",
};

export const SAMPLE_CANDLE_DATA = [
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
