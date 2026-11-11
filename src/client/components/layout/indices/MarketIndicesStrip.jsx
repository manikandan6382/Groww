import React from "react";
import { useLivePriceStore } from "../../../stores/useLivePriceStore";
import { useTradingStore } from "../../../stores/useTradingStore";
import { useSessionTelemetry } from "../../../hooks/useSessionTelemetry";
import { IndexCard } from "./IndexCard";
import { IndiaVixCard } from "./IndiaVixCard";
import { SessionPnlCard } from "./SessionPnlCard";

/**
 * 🍏 Apple Vision Pro 4-Card Luxury Market Command Deck
 * Mounted globally below Topbar in AppShell
 */
export function MarketIndicesStrip() {
  const isPrivacyMode = useTradingStore((s) => s.isPrivacyMode);

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

  // Unified Centralized Session Telemetry
  const {
    sessionNetPnl,
    sessionPnlPct,
    isSessionProfitable,
    todayTradesCount,
    todayWins,
    todayLosses,
    sessionWinRate,
    sparklineData: sessionSparkline
  } = useSessionTelemetry();

  return (
    <section className="w-full max-w-7xl mx-auto px-3 sm:px-4 md:px-6 pt-2 sm:pt-3 pb-1">
      <div className="flex sm:grid overflow-x-auto sm:overflow-visible snap-x snap-mandatory scrollbar-none gap-2.5 sm:gap-3.5 pb-2 -mx-3 px-3 sm:mx-0 sm:px-0 sm:grid-cols-2 lg:grid-cols-4">
        <div className="w-[260px] sm:w-auto shrink-0 snap-start">
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
        </div>

        <div className="w-[260px] sm:w-auto shrink-0 snap-start">
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
        </div>

        <div className="w-[260px] sm:w-auto shrink-0 snap-start">
          <IndiaVixCard
            vix={indiaVix}
            sparkline={sparklines?.["NSE_INDEX|India VIX"]}
          />
        </div>

        <div className="w-[260px] sm:w-auto shrink-0 snap-start">
          <SessionPnlCard
            isPrivacyMode={isPrivacyMode}
            sessionNetPnl={sessionNetPnl}
            sessionPnlPct={sessionPnlPct}
            isSessionPnlPositive={isSessionProfitable}
            sessionTradesCount={todayTradesCount}
            sessionWins={todayWins}
            sessionLosses={todayLosses}
            sessionWinRate={sessionWinRate}
            sparklineData={sessionSparkline}
          />
        </div>
      </div>
    </section>
  );
}

export default MarketIndicesStrip;
