import React from "react";
import { useLivePriceStore } from "../../../stores/useLivePriceStore";
import { useTradingStore } from "../../../stores/useTradingStore";
import { IndexCard } from "./IndexCard";
import { IndiaVixCard } from "./IndiaVixCard";
import { SessionPnlCard } from "./SessionPnlCard";

/**
 * 🍏 Apple Vision Pro 4-Card Luxury Market Command Deck
 * Mounted globally below Topbar in AppShell
 */
export function MarketIndicesStrip() {
  const { isPrivacyMode, closedAlerts, openAlerts, startingCapital } = useTradingStore();

  // Real-time Upstox live tick prices & dynamic in-memory sparklines
  const nifty = useLivePriceStore((s) => s.indices?.["NSE_INDEX|Nifty 50"]);
  const bankNifty = useLivePriceStore((s) => s.indices?.["NSE_INDEX|Nifty Bank"]);
  const indiaVix = useLivePriceStore((s) => s.indices?.["NSE_INDEX|India VIX"]);
  const sparklines = useLivePriceStore((s) => s.sparklines);

  // NIFTY 50 Telemetry
  const niftyLtp = nifty?.ltp != null ? Number(nifty.ltp) : 23813.70;
  const niftyChange = nifty?.change != null ? Number(nifty.change) : -242.10;
  const niftyChangePct = nifty?.changePct != null ? Number(nifty.changePct) : -1.01;
  const niftyHigh = nifty?.high != null ? Number(nifty.high) : 23896.05;
  const niftyLow = nifty?.low != null ? Number(nifty.low) : 23786.80;
  const niftySparkline = sparklines?.["NSE_INDEX|Nifty 50"] ?? [23858, 23896, 23840, 23800, 23786, 23813.70];

  // BANKNIFTY Telemetry
  const bankNiftyLtp = bankNifty?.ltp != null ? Number(bankNifty.ltp) : 56942.40;
  const bankNiftyChange = bankNifty?.change != null ? Number(bankNifty.change) : -467.20;
  const bankNiftyChangePct = bankNifty?.changePct != null ? Number(bankNifty.changePct) : -0.81;
  const bankNiftyHigh = bankNifty?.high != null ? Number(bankNifty.high) : 57221.10;
  const bankNiftyLow = bankNifty?.low != null ? Number(bankNifty.low) : 56823.20;
  const bankNiftySparkline = sparklines?.["NSE_INDEX|Nifty Bank"] ?? [57006, 57221, 57100, 56900, 56823, 56942.40];

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
        <IndexCard
          title="NIFTY 50"
          subtitle="NSE · BENCHMARK"
          ltp={niftyLtp}
          change={niftyChange}
          changePct={niftyChangePct}
          high={niftyHigh}
          low={niftyLow}
          sparkline={niftySparkline}
          accent="cyan"
        />

        <IndexCard
          title="BANKNIFTY"
          subtitle="BANKING · 12 STOCKS"
          ltp={bankNiftyLtp}
          change={bankNiftyChange}
          changePct={bankNiftyChangePct}
          high={bankNiftyHigh}
          low={bankNiftyLow}
          sparkline={bankNiftySparkline}
          accent="indigo"
        />

        <IndiaVixCard
          vix={indiaVix}
          sparkline={sparklines?.["NSE_INDEX|India VIX"]}
        />

        <SessionPnlCard
          isPrivacyMode={isPrivacyMode}
          sessionNetPnl={sessionNetPnl}
          sessionPnlPct={sessionPnlPct}
          isSessionPnlPositive={isSessionPnlPositive}
        />
      </div>
    </section>
  );
}

export default MarketIndicesStrip;
