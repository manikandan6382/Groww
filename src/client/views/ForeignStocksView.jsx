import React, { useState, useEffect, useMemo } from "react";
import { 
  Globe2, 
  Cpu, 
  Layers, 
  TrendingUp, 
  ShieldCheck, 
  Zap, 
  ArrowUpRight, 
  ArrowDownRight, 
  Clock, 
  DollarSign, 
  Calculator, 
  Info, 
  CheckCircle2, 
  ExternalLink, 
  Sparkles,
  LayoutGrid,
  List,
  Search,
  BookOpen,
  Coins
} from "lucide-react";
import { RollingTicker } from "../components/common/RollingTicker";
import { soundEngine } from "../utils/soundEngine";
import clsx from "clsx";

/**
 * 🌟 Constants & Default US Titans Dataset (Hoisted to Top for TDZ Prevention)
 */
const USD_INR_RATE = 83.95;
const USD_ANNUAL_ALPHA = 3.8; // Historical ~3.5-4.0% annualized USD/INR appreciation

const US_MARKET_INDICES = [
  { symbol: "S&P 500", name: "US Large Cap Benchmark", price: 5648.40, change: 25.20, changePct: 0.45, isGain: true },
  { symbol: "NASDAQ 100", name: "Tech Heavyweight Index", price: 19820.10, change: 172.50, changePct: 0.88, isGain: true },
  { symbol: "DOW JONES", name: "US Industrial Bluechips", price: 41250.50, change: 74.30, changePct: 0.18, isGain: true },
];

const DEFAULT_US_STOCKS = [
  {
    symbol: "NVDA",
    name: "Nvidia Corporation",
    sector: "ai",
    sectorLabel: "AI & Silicon",
    tag: "AI GPU Monolith",
    price: 128.50,
    change: 4.20,
    changePct: 3.38,
    isGain: true,
    whatItDoes: "Dominates 85%+ of global AI GPU chips powering ChatGPT, Google Cloud, and enterprise clusters.",
    peRatio: "64.2x",
    mktCap: "$3.16T",
    low52: 45.50,
    high52: 140.76,
    analystRating: "Strong Buy (92%)",
    sparkline: [122.0, 123.5, 122.8, 125.4, 126.8, 128.50],
  },
  {
    symbol: "AAPL",
    name: "Apple Inc.",
    sector: "consumer",
    sectorLabel: "Consumer Ecosystem",
    tag: "Ecosystem Titan",
    price: 224.30,
    change: 1.80,
    changePct: 0.81,
    isGain: true,
    whatItDoes: "Unmatched consumer lock-in across 2+ Billion active iPhones, Apple Watch, and high-margin App Services.",
    peRatio: "33.8x",
    mktCap: "$3.42T",
    low52: 164.08,
    high52: 237.23,
    analystRating: "Moderate Buy (78%)",
    sparkline: [221.0, 222.5, 221.8, 223.4, 223.9, 224.30],
  },
  {
    symbol: "MSFT",
    name: "Microsoft Corporation",
    sector: "cloud",
    sectorLabel: "Cloud & Enterprise",
    tag: "Cloud & Copilot Leader",
    price: 418.60,
    change: 3.50,
    changePct: 0.84,
    isGain: true,
    whatItDoes: "Monopolizes enterprise software (Windows, Office365) and Azure Cloud in exclusive partnership with OpenAI.",
    peRatio: "35.1x",
    mktCap: "$3.11T",
    low52: 309.45,
    high52: 468.35,
    analystRating: "Strong Buy (94%)",
    sparkline: [412.0, 414.5, 413.2, 416.8, 417.4, 418.60],
  },
  {
    symbol: "GOOGL",
    name: "Alphabet Inc.",
    sector: "ai",
    sectorLabel: "AI & Search",
    tag: "Search Monolith",
    price: 168.90,
    change: -0.90,
    changePct: -0.53,
    isGain: false,
    whatItDoes: "Controls 90%+ of global search, YouTube video network, Android OS, and enterprise Gemini AI infrastructure.",
    peRatio: "24.5x",
    mktCap: "$2.10T",
    low52: 120.21,
    high52: 191.75,
    analystRating: "Moderate Buy (84%)",
    sparkline: [171.0, 170.2, 169.8, 169.5, 169.1, 168.90],
  },
  {
    symbol: "AMZN",
    name: "Amazon.com Inc.",
    sector: "cloud",
    sectorLabel: "Cloud & Retail",
    tag: "AWS & E-Commerce",
    price: 186.20,
    change: 2.10,
    changePct: 1.14,
    isGain: true,
    whatItDoes: "Dominant global e-commerce powerhouse and AWS (the world's most profitable enterprise cloud computing grid).",
    peRatio: "41.2x",
    mktCap: "$1.94T",
    low52: 118.35,
    high52: 201.20,
    analystRating: "Strong Buy (96%)",
    sparkline: [182.0, 183.5, 184.1, 185.0, 185.7, 186.20],
  },
  {
    symbol: "TSLA",
    name: "Tesla Inc.",
    sector: "consumer",
    sectorLabel: "EV & Autonomy",
    tag: "EV & Robotics",
    price: 214.10,
    change: 5.12,
    changePct: 2.45,
    isGain: true,
    whatItDoes: "World leader in Electric Vehicles, Megapack energy grids, Full Self-Driving AI, and Optimus humanoid robotics.",
    peRatio: "61.0x",
    mktCap: "$682B",
    low52: 138.80,
    high52: 271.00,
    analystRating: "Hold / Speculative (52%)",
    sparkline: [205.0, 208.0, 207.5, 211.0, 212.8, 214.10],
  },
  {
    symbol: "META",
    name: "Meta Platforms Inc.",
    sector: "consumer",
    sectorLabel: "Social & Open AI",
    tag: "Social Graph King",
    price: 512.40,
    change: 8.30,
    changePct: 1.65,
    isGain: true,
    whatItDoes: "Connects 3.2 Billion daily users across Instagram, WhatsApp, and Facebook while open-sourcing Llama AI models.",
    peRatio: "26.4x",
    mktCap: "$1.30T",
    low52: 279.40,
    high52: 544.23,
    analystRating: "Strong Buy (88%)",
    sparkline: [498.0, 502.0, 506.0, 509.0, 510.5, 512.40],
  },
  {
    symbol: "QQQ",
    name: "Invesco QQQ ETF",
    sector: "etf",
    sectorLabel: "Nasdaq 100 ETF",
    tag: "Top 100 US Tech",
    price: 482.10,
    change: 5.40,
    changePct: 1.13,
    isGain: true,
    whatItDoes: "The definitive index ETF tracking the top 100 largest non-financial mega-cap innovators on the Nasdaq stock exchange.",
    peRatio: "29.8x",
    mktCap: "$285B",
    low52: 350.10,
    high52: 503.52,
    analystRating: "Core ETF Holding",
    sparkline: [474.0, 476.5, 478.2, 480.1, 481.3, 482.10],
  },
];

const SECTORS = [
  { id: "all", label: "🌟 All US Leaders", count: 8 },
  { id: "ai", label: "🤖 AI & Silicon", count: 2 },
  { id: "consumer", label: "📱 Consumer Tech", count: 3 },
  { id: "cloud", label: "☁️ Cloud & Enterprise", count: 2 },
  { id: "etf", label: "📊 Index ETFs", count: 1 },
];

/**
 * 🌊 Smooth Bézier Area Sparkline Component
 */
function SparklineArea({ data, isGain, width = 76, height = 28 }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((val, idx) => {
    const x = (idx / (data.length - 1)) * width;
    const y = height - ((val - min) / range) * (height - 8) - 4;
    return { x, y };
  });

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
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
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
 * 📊 52-Week Range Bar
 */
function Range52Week({ low, high, current, isGain }) {
  const range = high - low || 1;
  const rawPct = ((current - low) / range) * 100;
  const pct = Math.min(Math.max(rawPct, 5), 95);

  return (
    <div className="space-y-1 w-full pt-1">
      <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 font-bold leading-none">
        <span>52W L: ${Number(low).toFixed(2)}</span>
        <span className="text-slate-300">52W H: ${Number(high).toFixed(2)}</span>
      </div>
      <div className="relative w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden border border-white/5">
        <div 
          className={clsx("absolute top-0 bottom-0 left-0 rounded-full transition-all duration-500", isGain ? "bg-emerald-500/40" : "bg-rose-500/40")}
          style={{ width: `${pct}%` }}
        />
        <div 
          className="absolute top-0 bottom-0 w-1.5 bg-cyan-300 rounded-full shadow-[0_0_8px_rgba(6,182,212,0.9)] -ml-0.5"
          style={{ left: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/**
 * 🍏 Master Apple Vision Pro Foreign Stocks View
 */
export function ForeignStocksView() {
  const [selectedSector, setSelectedSector] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "table"
  const [copiedSymbol, setCopiedSymbol] = useState(null);

  // 💱 Interactive Simulator State
  const [simRupees, setSimRupees] = useState(50000);
  const [simStockSymbol, setSimStockSymbol] = useState("NVDA");

  // Determine US Market Status in IST
  const isMarketOpen = useMemo(() => {
    const now = new Date();
    // US Market is 9:30 AM – 4:00 PM EST (7:00 PM – 1:30 AM IST)
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const currentMin = hours * 60 + minutes;
    // 7:00 PM = 19:00 = 1140 min, 1:30 AM = 90 min
    return currentMin >= 1140 || currentMin <= 90;
  }, []);

  // Filtered US Stocks
  const filteredStocks = useMemo(() => {
    return DEFAULT_US_STOCKS.filter((stock) => {
      const matchesSector = selectedSector === "all" || stock.sector === selectedSector;
      const matchesSearch = 
        stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        stock.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        stock.whatItDoes.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSector && matchesSearch;
    });
  }, [selectedSector, searchQuery]);

  // Selected Stock for Simulator
  const simStock = useMemo(() => {
    return DEFAULT_US_STOCKS.find((s) => s.symbol === simStockSymbol) || DEFAULT_US_STOCKS[0];
  }, [simStockSymbol]);

  // Simulator Calculations
  const simUsdCapital = Number(simRupees) / USD_INR_RATE;
  const simSharesOwned = simUsdCapital / simStock.price;
  const simEstGainPct = 15.0; // Average conservative annualized tech return
  const simProjectedInrValue = (simUsdCapital * (1 + simEstGainPct / 100)) * (USD_INR_RATE * (1 + USD_ANNUAL_ALPHA / 100));
  const simNetInrProfit = simProjectedInrValue - Number(simRupees);
  const simTotalInrRoiPct = ((simNetInrProfit / Number(simRupees)) * 100).toFixed(1);

  const handleCopySymbol = (sym) => {
    navigator.clipboard?.writeText(sym);
    setCopiedSymbol(sym);
    soundEngine.playSuccessTone();
    setTimeout(() => setCopiedSymbol(null), 2000);
  };

  return (
    <div className="space-y-6">
      
      {/* 🌟 1. Wall Street ↔ Dalal Street Master Command HUD */}
      <div className="p-6 rounded-3xl bg-[#070b14]/80 backdrop-blur-3xl border border-white/[0.08] shadow-[0_16px_40px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.18)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-cyan-500/10 via-indigo-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-cyan-300 bg-cyan-500/15 px-3 py-1 rounded-full border border-cyan-500/30 flex items-center gap-1.5 shadow-sm">
                <Globe2 className="w-3 h-3 text-cyan-400" />
                GLOBAL WEALTH RADAR
              </span>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[10px] font-mono font-bold text-slate-300">
                <span className={clsx("w-2 h-2 rounded-full", isMarketOpen ? "bg-emerald-400 animate-ping" : "bg-amber-400")} />
                <span>{isMarketOpen ? "🟢 Wall Street Open (7:00 PM – 1:30 AM IST)" : "🌙 US Pre-Market / Overnight Session"}</span>
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Foreign Equities &amp; US Tech Titans
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Invest in global monopolies powering world artificial intelligence, consumer electronics, and cloud computing with **Dual Currency Compounding** (Stock Gain + USD Appreciation).
            </p>
          </div>

          {/* Forex Reference Rate & Dollar Alpha Capsule */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-2xl shadow-xl flex items-center gap-4 flex-shrink-0">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
              <DollarSign className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                USD / INR Reference
              </span>
              <div className="text-xl font-mono font-black text-white tabular-nums">
                ₹{USD_INR_RATE.toFixed(2)}
              </div>
              <span className="text-[9px] font-mono text-emerald-400 font-bold block flex items-center gap-0.5">
                <TrendingUp className="w-2.5 h-2.5" />
                +{USD_ANNUAL_ALPHA}% Annual USD Hedge vs INR
              </span>
            </div>
          </div>
        </div>

        {/* Major US Benchmark Indices Ticker Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-5 border-t border-white/[0.06]">
          {US_MARKET_INDICES.map((idx, i) => (
            <div 
              key={i} 
              className="p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 transition flex items-center justify-between"
            >
              <div>
                <div className="flex items-center gap-1.5">
                  <strong className="text-xs font-black text-white font-mono">{idx.symbol}</strong>
                  <span className="text-[9px] text-slate-400 font-mono">US</span>
                </div>
                <div className="text-xs font-mono font-bold text-slate-300 mt-0.5">
                  {idx.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </div>
              </div>
              <span className={clsx(
                "text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-full flex items-center gap-0.5",
                idx.isGain ? "text-emerald-300 bg-emerald-500/15 border border-emerald-500/30" : "text-rose-300 bg-rose-500/15 border border-rose-500/30"
              )}>
                {idx.isGain ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
                +{idx.changePct}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 💡 2. "Why Invest in US Equities?" — 3-Pillar Plain-English Rosetta Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Pillar 1: Dual Compounding */}
        <div className="p-5 rounded-2xl bg-[#070b14]/75 border border-white/[0.08] backdrop-blur-2xl shadow-xl space-y-2 relative group hover:border-cyan-500/30 transition">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Coins className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-white tracking-tight">1. Dual Currency Compounding</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            When you own US stocks, you profit twice: once from the company stock growth, and again as the US Dollar historically appreciates (~3.5%/year) against the Indian Rupee.
          </p>
          <div className="pt-1 text-[10px] font-mono text-cyan-300 font-bold">
            💡 15% Stock Gain + 4% USD Rise = ~19% INR Return
          </div>
        </div>

        {/* Pillar 2: Fractional Shares */}
        <div className="p-5 rounded-2xl bg-[#070b14]/75 border border-white/[0.08] backdrop-blur-2xl shadow-xl space-y-2 relative group hover:border-indigo-500/30 transition">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Layers className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-white tracking-tight">2. Zero Minimum: Fractional Shares</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Unlike Indian exchanges requiring 1 whole share, US brokerages allow fractional units. You can own a piece of Apple, Microsoft, or Nvidia starting with just **$1 (~₹84)**.
          </p>
          <div className="pt-1 text-[10px] font-mono text-indigo-300 font-bold">
            💡 Start with ₹500 or ₹5,00,000 anytime
          </div>
        </div>

        {/* Pillar 3: RBI LRS & Tax Safety */}
        <div className="p-5 rounded-2xl bg-[#070b14]/75 border border-white/[0.08] backdrop-blur-2xl shadow-xl space-y-2 relative group hover:border-emerald-500/30 transition">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-white tracking-tight">3. RBI LRS &amp; 0% TCS Compliance</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            RBI's Liberalised Remittance Scheme permits every Indian citizen to invest up to **$250,000/year (~₹2.1 Crore)** abroad. There is **0% TCS** on the first ₹7,00,000 sent annually.
          </p>
          <div className="pt-1 text-[10px] font-mono text-emerald-300 font-bold">
            💡 100% Legal &amp; SEBI/RBI Compliant
          </div>
        </div>
      </div>

      {/* 💱 3. Interactive "Rupee-to-Dollar" Investment & Compounding Simulator */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-[#080f24]/90 via-[#070c18]/90 to-[#040810]/95 border border-cyan-500/20 backdrop-blur-3xl shadow-[0_16px_40px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.15)] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-cyan-400" />
              <h2 className="text-base font-black text-white uppercase tracking-wider">
                Interactive Rupee-to-Dollar Investment Simulator
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              Calculate exact USD allocation, fractional share ownership, and projected 1-Year INR returns.
            </p>
          </div>
          <span className="text-[10px] font-mono font-bold text-cyan-300 bg-cyan-500/10 px-2.5 py-1 rounded-full border border-cyan-500/20 self-start sm:self-auto">
            Live Math Engine
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Controls: Rupee Input & Stock Selector */}
          <div className="lg:col-span-5 space-y-4">
            {/* Rupee Amount Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 block">
                1. Select Investment in Indian Rupees (₹)
              </label>
              <div className="flex items-center gap-2">
                {[10000, 25000, 50000, 100000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => {
                      setSimRupees(amt);
                      soundEngine.playTabSwitchTone();
                    }}
                    className={clsx(
                      "flex-1 py-2 rounded-xl text-xs font-mono font-bold border transition cursor-pointer active:scale-95",
                      simRupees === amt
                        ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-200 shadow-md"
                        : "bg-white/[0.03] border-white/10 text-slate-300 hover:bg-white/[0.06]"
                    )}
                  >
                    ₹{(amt / 1000).toFixed(0)}K
                  </button>
                ))}
              </div>
              <div className="relative mt-2">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold text-sm">
                  ₹
                </span>
                <input
                  type="number"
                  value={simRupees}
                  onChange={(e) => setSimRupees(Math.max(100, Number(e.target.value)))}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-8 pr-3 py-2.5 text-sm font-mono font-bold text-white focus:outline-none focus:border-cyan-500/50"
                  placeholder="Enter custom INR amount"
                />
              </div>
            </div>

            {/* Stock Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 block">
                2. Choose Target US Giant
              </label>
              <div className="grid grid-cols-4 gap-2">
                {DEFAULT_US_STOCKS.map((stock) => (
                  <button
                    key={stock.symbol}
                    type="button"
                    onClick={() => {
                      setSimStockSymbol(stock.symbol);
                      soundEngine.playTabSwitchTone();
                    }}
                    className={clsx(
                      "py-2 px-1 rounded-xl text-xs font-mono font-bold border transition text-center cursor-pointer active:scale-95",
                      simStockSymbol === stock.symbol
                        ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-200 shadow-md"
                        : "bg-white/[0.03] border-white/10 text-slate-400 hover:text-white"
                    )}
                  >
                    {stock.symbol}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Output: Real-time Conversion Matrix */}
          <div className="lg:col-span-7 p-5 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-2xl grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">USD Conversion</span>
              <div className="text-base sm:text-lg font-mono font-black text-white tabular-nums">
                ${simUsdCapital.toFixed(2)}
              </div>
              <small className="text-[9px] text-slate-400 block font-mono">@ ₹{USD_INR_RATE}/USD</small>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">Shares Owned</span>
              <div className="text-base sm:text-lg font-mono font-black text-cyan-300 tabular-nums">
                {simSharesOwned.toFixed(3)}
              </div>
              <small className="text-[9px] text-slate-400 block font-mono">{simStock.symbol} Fractional</small>
            </div>

            <div className="space-y-1 sm:col-span-1 col-span-2">
              <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">1-Yr Est. INR Value</span>
              <div className="text-base sm:text-lg font-mono font-black text-emerald-400 tabular-nums">
                ₹{simProjectedInrValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </div>
              <small className="text-[9px] text-emerald-300 font-bold block font-mono">
                +{simTotalInrRoiPct}% Net INR ROI
              </small>
            </div>
          </div>
        </div>
      </div>

      {/* 💎 4. US Titans Radar Matrix (Filter Tabs, Search & Cards) */}
      <div className="space-y-4">
        {/* Navigation & Filter Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Sector Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            {SECTORS.map((sec) => (
              <button
                key={sec.id}
                type="button"
                onClick={() => {
                  setSelectedSector(sec.id);
                  soundEngine.playTabSwitchTone();
                }}
                className={clsx(
                  "px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer active:scale-95 flex items-center gap-1.5",
                  selectedSector === sec.id
                    ? "bg-cyan-500/20 text-cyan-200 border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.2)]"
                    : "bg-white/[0.03] text-slate-400 hover:text-white border border-white/5 hover:bg-white/[0.06]"
                )}
              >
                <span>{sec.label}</span>
              </button>
            ))}
          </div>

          {/* Search & Grid/Table Switcher */}
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search US Titans..."
                className="bg-white/[0.03] border border-white/10 rounded-full pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/40 w-44 sm:w-56"
              />
            </div>

            <div className="h-8 flex items-center gap-1 p-0.5 rounded-full bg-white/[0.03] border border-white/10">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={clsx(
                  "w-7 h-7 rounded-full flex items-center justify-center text-xs transition cursor-pointer",
                  viewMode === "grid" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30" : "text-slate-400 hover:text-white"
                )}
                title="Bento Grid View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={clsx(
                  "w-7 h-7 rounded-full flex items-center justify-center text-xs transition cursor-pointer",
                  viewMode === "table" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30" : "text-slate-400 hover:text-white"
                )}
                title="High-Density Table View"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* 🌟 View Option A: Spatial Bento Grid Cards */}
        {viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredStocks.map((stock) => {
              const inrPrice = stock.price * USD_INR_RATE;
              const inrDayChange = stock.change * USD_INR_RATE;

              return (
                <div
                  key={stock.symbol}
                  className="p-4 rounded-3xl bg-[#070b14]/75 hover:bg-[#0c1326]/90 border border-white/[0.08] hover:border-cyan-500/40 transition-all duration-300 backdrop-blur-3xl shadow-[0_12px_36px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.18)] group flex flex-col justify-between space-y-3 cursor-default"
                >
                  {/* Card Header: Emblem, Symbol & Sector */}
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 border border-indigo-500/30 text-indigo-300 flex items-center justify-center font-mono font-black text-xs shadow-sm flex-shrink-0">
                          {stock.symbol.slice(0, 3)}
                        </div>
                        <div className="min-w-0">
                          <strong className="text-sm font-black text-white font-mono block leading-tight">
                            {stock.symbol}
                          </strong>
                          <span className="text-[10px] text-slate-400 truncate block">
                            {stock.name}
                          </span>
                        </div>
                      </div>

                      <span className="text-[8px] font-mono font-bold text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20 whitespace-nowrap flex-shrink-0">
                        {stock.tag}
                      </span>
                    </div>

                    {/* Plain English "What They Do" */}
                    <p className="text-[11px] text-slate-300 leading-relaxed mt-2.5 line-clamp-2">
                      {stock.whatItDoes}
                    </p>
                  </div>

                  {/* Pricing Matrix (USD & INR) */}
                  <div className="space-y-2 pt-2 border-t border-white/[0.06]">
                    <div className="flex items-baseline justify-between">
                      <div>
                        <div className="text-lg font-black text-white font-mono tabular-nums tracking-tight">
                          <RollingTicker value={stock.price} prefix="$" decimalPlaces={2} className="text-white font-black" />
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 block">
                          ≈ ₹{inrPrice.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className={clsx(
                          "text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-full flex items-center gap-0.5 shadow-sm justify-end",
                          stock.isGain 
                            ? "text-emerald-300 bg-emerald-500/15 border border-emerald-500/30" 
                            : "text-rose-300 bg-rose-500/15 border border-rose-500/30"
                        )}>
                          {stock.isGain ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
                          {stock.isGain ? "+" : ""}{stock.change.toFixed(2)} ({stock.isGain ? "+" : ""}{stock.changePct}%)
                        </span>
                        <span className="text-[9px] font-mono text-slate-500 block mt-0.5">
                          {stock.isGain ? "+₹" : "-₹"}{Math.abs(inrDayChange).toFixed(0)} Day
                        </span>
                      </div>
                    </div>

                    {/* Area Sparkline */}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[9px] font-mono text-slate-400">P/E: {stock.peRatio} · MCap: {stock.mktCap}</span>
                      <SparklineArea data={stock.sparkline} isGain={stock.isGain} width={64} height={22} />
                    </div>

                    {/* 52-Week Range Bar */}
                    <Range52Week low={stock.low52} high={stock.high52} current={stock.price} isGain={stock.isGain} />
                  </div>

                  {/* Action Bar */}
                  <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSimStockSymbol(stock.symbol);
                        soundEngine.playTabSwitchTone();
                        window.scrollTo({ top: 300, behavior: "smooth" });
                      }}
                      className="flex-1 py-1.5 rounded-xl bg-white/[0.04] hover:bg-cyan-500/20 border border-white/10 hover:border-cyan-500/30 text-[10px] font-mono font-bold text-slate-200 hover:text-cyan-200 transition cursor-pointer text-center"
                    >
                      ⚡ Simulate ₹
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopySymbol(stock.symbol)}
                      className="px-2.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-[10px] font-mono text-slate-300 hover:text-white transition cursor-pointer"
                      title="Copy Symbol"
                    >
                      {copiedSymbol === stock.symbol ? "✓ Copied" : "📋"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* 📊 View Option B: High-Density Table View */
          <div className="p-4 rounded-3xl bg-[#070b14]/75 border border-white/[0.08] backdrop-blur-3xl shadow-xl overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-[10px] font-mono uppercase text-slate-400">
                  <th className="pb-3 px-3 font-bold">Titan</th>
                  <th className="pb-3 px-3 font-bold">What It Does</th>
                  <th className="pb-3 px-3 font-bold text-right">Price (USD)</th>
                  <th className="pb-3 px-3 font-bold text-right">INR Approx</th>
                  <th className="pb-3 px-3 font-bold text-right">Day Change</th>
                  <th className="pb-3 px-3 font-bold text-right">52W Range</th>
                  <th className="pb-3 px-3 font-bold text-center">Simulate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredStocks.map((stock) => (
                  <tr key={stock.symbol} className="hover:bg-white/[0.02] transition">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <strong className="text-white font-mono font-bold">{stock.symbol}</strong>
                        <span className="text-[10px] text-slate-400 truncate max-w-[120px]">{stock.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-[11px] text-slate-300 max-w-xs truncate">
                      {stock.whatItDoes}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-white tabular-nums">
                      ${stock.price.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-300 tabular-nums">
                      ₹{(stock.price * USD_INR_RATE).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className={clsx(
                        "text-[10px] font-mono font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-0.5",
                        stock.isGain ? "text-emerald-400 bg-emerald-500/15" : "text-rose-400 bg-rose-500/15"
                      )}>
                        {stock.isGain ? "+" : ""}{stock.changePct}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-[10px] text-slate-400">
                      ${stock.low52.toFixed(0)} – ${stock.high52.toFixed(0)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setSimStockSymbol(stock.symbol);
                          soundEngine.playTabSwitchTone();
                          window.scrollTo({ top: 300, behavior: "smooth" });
                        }}
                        className="px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 font-mono text-[10px] border border-cyan-500/25 transition cursor-pointer"
                      >
                        ⚡ Simulate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 🛡️ 5. Indian Investor Onboarding & Compliance 3-Step Roadmap */}
      <div className="p-6 rounded-3xl bg-[#070b14]/75 border border-white/[0.08] backdrop-blur-3xl shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Indian Investor 3-Step Onboarding Roadmap
            </h3>
          </div>
          <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono">
            RBI LRS Protocol
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-xl bg-cyan-500/20 text-cyan-300 font-black font-mono flex items-center justify-center text-xs">
                1
              </span>
              <strong className="text-white font-bold">Open Direct US Brokerage Account</strong>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Open a digital US trading account via registered platforms (Vested, INDmoney, or Interactive Brokers). Zero account opening fees.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-xl bg-indigo-500/20 text-indigo-300 font-black font-mono flex items-center justify-center text-xs">
                2
              </span>
              <strong className="text-white font-bold">Fund via Net Banking (0% TCS)</strong>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Wire funds from your Indian bank (HDFC, ICICI, SBI) under RBI LRS. Zero Tax Collected at Source (TCS) up to ₹7,00,000 annually.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-xl bg-emerald-500/20 text-emerald-300 font-black font-mono flex items-center justify-center text-xs">
                3
              </span>
              <strong className="text-white font-bold">Execute Instant Fractional Purchases</strong>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Buy fractional shares of NVDA, AAPL, MSFT, or QQQ from as little as $1. Hold directly in your name in the US depository (SIPC insured up to $500,000).
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
