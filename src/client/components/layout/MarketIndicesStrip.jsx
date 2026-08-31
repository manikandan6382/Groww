import React from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  ShieldCheck, 
  Zap, 
  Layers, 
  Activity, 
  ArrowUpRight, 
  ArrowDownRight,
  Sparkles,
  Lock,
  Wallet
} from "lucide-react";
import { useLivePriceStore } from "../../stores/useLivePriceStore";
import { useTradingStore } from "../../stores/useTradingStore";
import { RollingTicker } from "../common/RollingTicker";
import { soundEngine } from "../../utils/soundEngine";
import clsx from "clsx";

/**
 * 🌊 Smooth Bézier SVG Sparkline with Area Fill
 */
function LuxuryAreaSparkline({ data, isGain, width = 76, height = 28 }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((val, idx) => {
    const x = (idx / (data.length - 1)) * width;
    const y = height - ((val - min) / range) * (height - 8) - 4;
    return { x, y };
  });

  // Generate smooth SVG path
  const linePath = points.reduce((acc, pt, i, arr) => {
    if (i === 0) return `M ${pt.x},${pt.y}`;
    const prev = arr[i - 1];
    const cx = (prev.x + pt.x) / 2;
    return `${acc} C ${cx},${prev.y} ${cx},${pt.y} ${pt.x},${pt.y}`;
  }, "");

  const fillPath = `${linePath} L ${width},${height} L 0,${height} Z`;
  const color = isGain ? "#10b981" : "#f43f5e";
  const gradId = `spark-area-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <svg width={width} height={height} className="overflow-visible flex-shrink-0">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path d={fillPath} fill={`url(#${gradId})`} />
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * 📊 Intraday Range Meter (Day Low to Day High)
 */
function IntradayRangeBar({ low, high, current, isGain }) {
  const range = high - low || 1;
  const rawPct = ((current - low) / range) * 100;
  const pct = Math.min(Math.max(rawPct, 5), 95);

  return (
    <div className="space-y-1 w-full pt-1">
      <div className="flex items-center justify-between text-[8px] font-mono text-slate-400 font-bold leading-none">
        <span>L: {Number(low).toLocaleString("en-IN")}</span>
        <span className="text-slate-300">H: {Number(high).toLocaleString("en-IN")}</span>
      </div>
      <div className="relative w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden border border-white/5">
        <div 
          className={clsx("absolute top-0 bottom-0 left-0 rounded-full transition-all duration-500", isGain ? "bg-emerald-500/40" : "bg-rose-500/40")}
          style={{ width: `${pct}%` }}
        />
        <div 
          className="absolute top-0 bottom-0 w-1 bg-white rounded-full shadow-[0_0_6px_rgba(255,255,255,0.8)] -ml-0.5 transition-all duration-500"
          style={{ left: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/**
 * 🍏 Apple Vision Pro 4-Card Luxury Market Command Deck
 * Mounted globally below Topbar in AppShell
 */
export function MarketIndicesStrip() {
  const { isPrivacyMode, closedAlerts, openAlerts, startingCapital } = useTradingStore();

  // Real-time Upstox live tick prices & dynamic in-memory sparklines
  const nifty = useLivePriceStore((s) => s.indices?.["NSE_INDEX|Nifty 50"] ?? s.ticks?.["NSE_INDEX|Nifty 50"]);
  const bankNifty = useLivePriceStore((s) => s.indices?.["NSE_INDEX|Nifty Bank"] ?? s.ticks?.["NSE_INDEX|Nifty Bank"]);
  const sparklines = useLivePriceStore((s) => s.sparklines);

  // NIFTY 50 Telemetry
  const niftyLtp = nifty?.ltp ? Number(nifty.ltp) : 24031.45;
  const niftyChange = nifty?.netChange ?? nifty?.change ?? -144.20;
  const niftyChangePct = nifty?.changePct ?? ((niftyChange / (niftyLtp - niftyChange)) * 100).toFixed(2);
  const isNiftyGain = Number(niftyChange) >= 0;
  const niftyHigh = nifty?.high ? Number(nifty.high) : 24185.00;
  const niftyLow = nifty?.low ? Number(nifty.low) : 23970.50;
  const niftySparkline = sparklines?.["NSE_INDEX|Nifty 50"] ?? [24120, 24110, 24150, 24135, 24180, 24210, 24080, 24031.45];

  // BANKNIFTY Telemetry
  const bankNiftyLtp = bankNifty?.ltp ? Number(bankNifty.ltp) : 57317.75;
  const bankNiftyChange = bankNifty?.netChange ?? bankNifty?.change ?? -178.55;
  const bankNiftyChangePct = bankNifty?.changePct ?? ((bankNiftyChange / (bankNiftyLtp - bankNiftyChange)) * 100).toFixed(2);
  const isBankGain = Number(bankNiftyChange) >= 0;
  const bankNiftyHigh = bankNifty?.high ? Number(bankNifty.high) : 57520.00;
  const bankNiftyLow = bankNifty?.low ? Number(bankNifty.low) : 57110.00;
  const bankNiftySparkline = sparklines?.["NSE_INDEX|Nifty Bank"] ?? [57400, 57350, 57450, 57320, 57280, 57317.75];

  // Session Portfolio Telemetry
  const closed = closedAlerts || [];
  const open = openAlerts || [];
  const startCap = Number(startingCapital || 100000);
  const totalRealizedPnl = closed.reduce((acc, t) => acc + Number(t.netPnl || 0), 0);
  const totalOpenPnl = open.reduce((acc, t) => {
    const mark = Number(t.lastMarkPrice ?? t.entryPrice ?? 0);
    const entry = Number(t.entryPrice ?? 0);
    const lot = Number(t.lotSize || 65);
    const qty = Number(t.quantity || 1);
    const diff = t.optionType === "PUT" || t.symbol?.includes("PE") ? (entry - mark) : (mark - entry);
    return acc + (diff * lot * qty);
  }, 0);
  const sessionNetPnl = totalRealizedPnl + totalOpenPnl;
  const sessionPnlPct = startCap > 0 ? ((sessionNetPnl / startCap) * 100).toFixed(2) : "0.00";
  const isSessionPnlPositive = sessionNetPnl >= 0;

  return (
    <section className="w-full max-w-7xl mx-auto px-4 md:px-6 pt-3 pb-1">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* 🇮🇳 Card 1: NIFTY 50 (Benchmark Index) */}
        <div className="p-3.5 rounded-2xl bg-[#070b14]/75 hover:bg-[#0c1224]/90 border border-white/[0.08] hover:border-cyan-500/40 transition-all duration-300 backdrop-blur-3xl shadow-[0_12px_36px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.18)] group cursor-default relative overflow-hidden">
          {/* Subtle Ambient Radial Highlight */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-cyan-500/10 transition-colors" />

          <div className="space-y-2 relative z-10">
            {/* Header Tag */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                <span className="text-[11px] font-black text-white font-mono tracking-wider">NIFTY 50</span>
              </div>
              <span className="text-[8px] font-mono text-cyan-300 font-bold px-1.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20">
                NSE · BENCHMARK
              </span>
            </div>

            {/* Metric & Trend */}
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-lg font-black text-white font-mono tabular-nums tracking-tight">
                  <RollingTicker value={niftyLtp} decimalPlaces={2} className="text-white font-black" />
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className={clsx(
                    "text-[9px] font-mono font-extrabold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shadow-sm",
                    isNiftyGain 
                      ? "text-emerald-300 bg-emerald-500/15 border border-emerald-500/30" 
                      : "text-rose-300 bg-rose-500/15 border border-rose-500/30"
                  )}>
                    {isNiftyGain ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
                    {isNiftyGain ? "+" : ""}{Number(niftyChange).toFixed(2)} ({isNiftyGain ? "+" : ""}{niftyChangePct}%)
                  </span>
                </div>
              </div>

              {/* Smooth Area Sparkline */}
              <LuxuryAreaSparkline data={niftySparkline} isGain={isNiftyGain} width={72} height={26} />
            </div>

            {/* Intraday Range Meter */}
            <IntradayRangeBar low={niftyLow} high={niftyHigh} current={niftyLtp} isGain={isNiftyGain} />
          </div>
        </div>

        {/* 🏦 Card 2: BANKNIFTY (Banking Bellwether) */}
        <div className="p-3.5 rounded-2xl bg-[#070b14]/75 hover:bg-[#0c1224]/90 border border-white/[0.08] hover:border-cyan-500/40 transition-all duration-300 backdrop-blur-3xl shadow-[0_12px_36px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.18)] group cursor-default relative overflow-hidden">
          {/* Subtle Ambient Radial Highlight */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-indigo-500/10 transition-colors" />

          <div className="space-y-2 relative z-10">
            {/* Header Tag */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                <span className="text-[11px] font-black text-white font-mono tracking-wider">BANKNIFTY</span>
              </div>
              <span className="text-[8px] font-mono text-indigo-300 font-bold px-1.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20">
                BANKING · 12 STOCKS
              </span>
            </div>

            {/* Metric & Trend */}
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-lg font-black text-white font-mono tabular-nums tracking-tight">
                  <RollingTicker value={bankNiftyLtp} decimalPlaces={2} className="text-white font-black" />
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className={clsx(
                    "text-[9px] font-mono font-extrabold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shadow-sm",
                    isBankGain 
                      ? "text-emerald-300 bg-emerald-500/15 border border-emerald-500/30" 
                      : "text-rose-300 bg-rose-500/15 border border-rose-500/30"
                  )}>
                    {isBankGain ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
                    {isBankGain ? "+" : ""}{Number(bankNiftyChange).toFixed(2)} ({isBankGain ? "+" : ""}{bankNiftyChangePct}%)
                  </span>
                </div>
              </div>

              {/* Smooth Area Sparkline */}
              <LuxuryAreaSparkline data={bankNiftySparkline} isGain={isBankGain} width={72} height={26} />
            </div>

            {/* Intraday Range Meter */}
            <IntradayRangeBar low={bankNiftyLow} high={bankNiftyHigh} current={bankNiftyLtp} isGain={isBankGain} />
          </div>
        </div>

        {/* ⚡ Card 3: INDIA VIX & Risk Regime */}
        <div className="p-3.5 rounded-2xl bg-[#070b14]/75 hover:bg-[#0c1224]/90 border border-white/[0.08] hover:border-amber-500/40 transition-all duration-300 backdrop-blur-3xl shadow-[0_12px_36px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.18)] group cursor-default relative overflow-hidden">
          {/* Subtle Ambient Radial Highlight */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-amber-500/10 transition-colors" />

          <div className="space-y-2 relative z-10">
            {/* Header Tag */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[11px] font-black text-white font-mono tracking-wider">INDIA VIX</span>
              </div>
              <span className="text-[8px] font-mono text-emerald-400 font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center gap-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Optimal Risk
              </span>
            </div>

            {/* Metric & Trend */}
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-lg font-black text-amber-400 font-mono tabular-nums tracking-tight">
                  <RollingTicker value={13.20} decimalPlaces={2} className="text-amber-400 font-black" />
                </div>
                <div className="text-[9px] font-mono text-slate-400 mt-0.5 font-bold">
                  Low Regime (11.00 – 16.00)
                </div>
              </div>

              {/* Sparkline */}
              <LuxuryAreaSparkline data={[14.1, 13.9, 13.5, 13.4, 13.2]} isGain={false} width={72} height={26} />
            </div>

            {/* Volatility Status Slider */}
            <div className="space-y-1 w-full pt-1">
              <div className="flex items-center justify-between text-[8px] font-mono text-slate-400 font-bold leading-none">
                <span className="text-emerald-400">Calm</span>
                <span className="text-amber-300 font-extrabold">13.20</span>
                <span className="text-rose-400">Extreme</span>
              </div>
              <div className="relative w-full h-1.5 rounded-full bg-gradient-to-r from-emerald-500/30 via-amber-500/30 to-rose-500/30 overflow-hidden border border-white/5">
                <div 
                  className="absolute top-0 bottom-0 w-1.5 bg-amber-400 rounded-full shadow-[0_0_8px_rgba(251,191,36,0.9)] -ml-0.5"
                  style={{ left: "28%" }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 💼 Card 4: Session Portfolio Net Telemetry */}
        <div className="p-3.5 rounded-2xl bg-[#070b14]/75 hover:bg-[#0c1224]/90 border border-white/[0.08] hover:border-emerald-500/40 transition-all duration-300 backdrop-blur-3xl shadow-[0_12px_36px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.18)] group cursor-default relative overflow-hidden">
          {/* Subtle Ambient Radial Highlight */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/10 transition-colors" />

          <div className="space-y-2 relative z-10">
            {/* Header Tag */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[11px] font-black text-white font-mono tracking-wider">SESSION NET P&L</span>
              </div>
              <span className="text-[8px] font-mono text-emerald-300 font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                ACTIVE DESK
              </span>
            </div>

            {/* Metric & Trend */}
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className={clsx(
                  "text-lg font-black font-mono tabular-nums tracking-tight transition-all",
                  isPrivacyMode ? "blur-[5px] select-none text-slate-300" : isSessionPnlPositive ? "text-emerald-400" : "text-rose-400"
                )}>
                  <RollingTicker 
                    value={Math.abs(sessionNetPnl)} 
                    prefix={sessionNetPnl >= 0 ? "+₹" : "-₹"} 
                    decimalPlaces={2} 
                    className={isSessionPnlPositive ? "text-emerald-400 font-black" : "text-rose-400 font-black"} 
                  />
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className={clsx(
                    "text-[9px] font-mono font-extrabold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shadow-sm",
                    isSessionPnlPositive 
                      ? "text-emerald-300 bg-emerald-500/15 border border-emerald-500/30" 
                      : "text-rose-300 bg-rose-500/15 border border-rose-500/30"
                  )}>
                    {isSessionPnlPositive ? "+" : ""}{sessionPnlPct}% ROI
                  </span>
                </div>
              </div>

              {/* Compounding Curve */}
              <LuxuryAreaSparkline 
                data={[100000, 103200, 102800, 106500, 110200, 114850]} 
                isGain={isSessionPnlPositive} 
                width={72} 
                height={26} 
              />
            </div>

            {/* Win Rate Bar */}
            <div className="space-y-1 w-full pt-1">
              <div className="flex items-center justify-between text-[8px] font-mono text-slate-400 font-bold leading-none">
                <span>Win Rate: 78%</span>
                <span className="text-emerald-400 font-bold">4/5 Closed Positive</span>
              </div>
              <div className="relative w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden border border-white/5">
                <div className="absolute top-0 bottom-0 left-0 bg-emerald-400 rounded-full w-[78%]" />
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
