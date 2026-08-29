import React, { useState, useEffect } from "react";
import { MetricKpi } from "../components/common/MetricKpi";
import { Sparkline } from "../components/common/Sparkline";
import { Globe2, Cpu, Layers, TrendingUp, CheckCircle2, ShieldAlert } from "lucide-react";
import clsx from "clsx";

const DEFAULT_US_STOCKS = [
  { symbol: "NVDA", name: "Nvidia Corporation", sector: "AI Hardware & GPUs", price: 128.50, change: 4.20, changePct: 3.38, tag: "AI King" },
  { symbol: "AAPL", name: "Apple Inc.", sector: "Consumer Electronics & Services", price: 224.30, change: 1.80, changePct: 0.81, tag: "Ecosystem" },
  { symbol: "MSFT", name: "Microsoft Corporation", sector: "Enterprise Cloud & AI", price: 418.60, change: 3.50, changePct: 0.84, tag: "Cloud Leader" },
  { symbol: "QQQ", name: "Invesco QQQ Trust (Nasdaq 100)", sector: "US Tech Index ETF", price: 482.10, change: 5.40, changePct: 1.13, tag: "Nasdaq 100" },
  { symbol: "GOOGL", name: "Alphabet Inc.", sector: "Search & Generative AI", price: 168.90, change: -0.90, changePct: -0.53, tag: "Search Monolith" },
  { symbol: "AMZN", name: "Amazon.com Inc.", sector: "E-Commerce & AWS Cloud", price: 186.20, change: 2.10, changePct: 1.14, tag: "Cloud & Retail" },
];

export function ForeignStocksView() {
  const [foreignQuotes, setForeignQuotes] = useState(DEFAULT_US_STOCKS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadForeign() {
      try {
        setLoading(true);
        const res = await fetch("/api/alpha/foreign-quotes");
        if (res.ok) {
          const data = await res.json();
          if (data.results && data.results.length) {
            setForeignQuotes(data.results);
          }
        }
      } catch {
        // Fallback to default US stocks
      } finally {
        setLoading(false);
      }
    }
    loadForeign();
  }, []);

  return (
    <div className="space-y-6">
      {/* Foreign Hero Banner */}
      <div className="p-5 rounded-2xl bg-app-card/70 backdrop-blur-xl border border-white/5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/20">
              GLOBAL MARKET RADAR
            </span>
            <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
              Alpha Vantage US Active
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">
            Foreign Stocks &amp; US Tech Giants
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Track US market leaders (AAPL, MSFT, NVDA, QQQ) and global indices with currency risk analytics before funding a foreign broker account.
          </p>
        </div>

        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 text-xs self-start md:self-auto space-y-0.5">
          <span className="text-[10px] text-slate-400 block">Market Data Provider</span>
          <strong className="text-white block font-bold">Alpha Vantage US</strong>
          <small className="text-[10px] text-emerald-400">Free research feeds active.</small>
        </div>
      </div>

      {/* KPI US Tech Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricKpi
          icon={<Globe2 className="w-5 h-5" />}
          label="US Radar Coverage"
          value="Nasdaq & S&P"
          subtext="Alpha Vantage API Feed"
          tone="cyan"
        />
        <MetricKpi
          icon={<Cpu className="w-5 h-5" />}
          label="AI Hardware Leader"
          value="NVDA ($128.50)"
          subtext="+3.38% Today"
          tone="gain"
        />
        <MetricKpi
          icon={<Layers className="w-5 h-5" />}
          label="Nasdaq Benchmark"
          value="QQQ ($482.10)"
          subtext="+1.13% Tech Momentum"
          tone="gain"
        />
        <MetricKpi
          icon={<TrendingUp className="w-5 h-5" />}
          label="USD / INR Reference"
          value="₹83.95"
          subtext="Forex Reference Rate"
          tone="blue"
        />
      </div>

      {/* US Tech Cards Grid */}
      <div className="p-5 rounded-2xl bg-app-card/70 backdrop-blur-xl border border-white/5 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">US Watch Radar</h3>
            <p className="text-xs text-slate-400">Track mega-cap US equities and Nasdaq 100 indices.</p>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-mono font-bold">
            NASDAQ &amp; NYSE
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {foreignQuotes.map((stock, idx) => {
            const isGain = Number(stock.change || 0) >= 0;
            return (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-cyan-500/30 transition space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 flex items-center justify-center font-bold text-xs">
                      {stock.symbol.slice(0, 2)}
                    </span>
                    <div>
                      <strong className="text-sm font-bold text-white block">{stock.symbol}</strong>
                      <span className="text-[10px] text-slate-400 truncate block max-w-[120px]">{stock.name}</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-white/5 text-[9px] font-bold text-slate-300 border border-white/5">
                    {stock.tag || "US Mega Cap"}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Price (USD)</span>
                    <strong className="text-lg font-mono font-extrabold text-white tabular-nums">
                      ${Number(stock.price || stock.regularMarketPrice || 0).toFixed(2)}
                    </strong>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block font-medium">Day Change</span>
                    <strong className={clsx("text-xs font-mono font-bold tabular-nums", isGain ? "text-emerald-400" : "text-rose-400")}>
                      {isGain ? "+" : ""}{Number(stock.change || stock.regularMarketChange || 0).toFixed(2)} ({isGain ? "+" : ""}{Number(stock.changePct || stock.regularMarketChangePercent || 0).toFixed(2)}%)
                    </strong>
                  </div>
                </div>

                <div className="pt-2 flex justify-center">
                  <Sparkline
                    data={[
                      Number(stock.price || 100) - 2,
                      Number(stock.price || 100) - 1,
                      Number(stock.price || 100) + (isGain ? 1 : -1),
                      Number(stock.price || 100) + (isGain ? 2 : -2),
                      Number(stock.price || 100)
                    ]}
                    isGain={isGain}
                    width={180}
                    height={24}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pre-Investment Protocol 3-Step Checklist */}
      <div className="p-5 rounded-2xl bg-app-card/70 backdrop-blur-xl border border-white/5 shadow-xl space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-white/5">
          <h3 className="text-sm font-bold text-white">Pre-Investment Protocol</h3>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/5 text-slate-300 border border-white/10">
            3-Step Checklist
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 font-bold flex items-center justify-center text-[10px]">1</span>
              <strong className="text-white font-bold">Fundamental Quality First</strong>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Compare cash flow, business moats, and valuation before buying US equities.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 font-bold flex items-center justify-center text-[10px]">2</span>
              <strong className="text-white font-bold">USD / INR Currency Hedge</strong>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Forex fluctuations impact net INR returns even when the underlying stock is flat.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 font-bold flex items-center justify-center text-[10px]">3</span>
              <strong className="text-white font-bold">LRS &amp; Tax Compliance</strong>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Understand RBI Liberalised Remittance Scheme (LRS) and TCS rules before wiring capital.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
