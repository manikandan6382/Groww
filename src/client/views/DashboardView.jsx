import React, { useState, useEffect } from "react";
import { MetricKpi } from "../components/common/MetricKpi";
import { TVChart } from "../components/trading/TVChart";
import { HoldingsTable } from "../components/trading/HoldingsTable";
import { AssetAllocationDeck } from "../components/trading/AssetAllocationDeck";
import { WatchlistSection } from "../components/trading/WatchlistSection";
import { Wallet, PieChart, TrendingUp, ShieldCheck } from "lucide-react";

export function DashboardView() {
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPortfolio() {
      try {
        setLoading(true);
        const res = await fetch("/api/portfolio");
        if (res.ok) {
          const data = await res.json();
          setPortfolio(data);
        }
      } catch (err) {
        console.error("Failed to load portfolio:", err);
      } finally {
        setLoading(false);
      }
    }
    loadPortfolio();
  }, []);

  const holdings = portfolio?.holdings || [];
  const margins = portfolio?.margins || { net: 145000, available: 125000, utilised: 20000 };

  const totalCurrentValue = holdings.reduce((acc, h) => acc + (h.quantity * (h.last_price || h.average_price)), 0) || 342500;
  const totalInvested = holdings.reduce((acc, h) => acc + (h.quantity * h.average_price), 0) || 328000;
  const totalPnl = totalCurrentValue - totalInvested;
  const totalPnlPct = ((totalPnl / (totalInvested || 1)) * 100).toFixed(2);

  return (
    <div className="space-y-6">
      {/* Portfolio Hero 4-Chip Stat Row */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricKpi
          icon={<Wallet className="w-5 h-5" />}
          label="Total Net Worth"
          value={`₹${(totalCurrentValue + (margins.available || 0)).toLocaleString("en-IN")}`}
          subtext="Equities + Available Margin"
          tone="cyan"
        />
        <MetricKpi
          icon={<TrendingUp className="w-5 h-5" />}
          label="Total Unrealized P&L"
          value={`+₹${totalPnl.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
          subtext={`+${totalPnlPct}% Overall Return`}
          tone="gain"
        />
        <MetricKpi
          icon={<ShieldCheck className="w-5 h-5" />}
          label="Available Margin"
          value={`₹${Number(margins.available || 125000).toLocaleString("en-IN")}`}
          subtext="Ready for Execution"
          tone="blue"
        />
        <MetricKpi
          icon={<PieChart className="w-5 h-5" />}
          label="Holdings Count"
          value={`${holdings.length || 8} Assets`}
          subtext="Diversified Bluechip Core"
          tone="default"
        />
      </div>

      {/* TradingView 60 FPS Hero Chart Canvas */}
      <TVChart symbol="NIFTY 50" />

      {/* Master 2-Card Analytics Deck: Asset Allocation Donut + Portfolio Health Matrix */}
      <AssetAllocationDeck holdings={holdings} />

      {/* Equity Holdings Table */}
      <HoldingsTable holdings={holdings} />

      {/* Apple Luxury Spatial Market Watchlist */}
      <WatchlistSection />
    </div>
  );
}
