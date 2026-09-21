import { useMemo } from "react";
import { extractAvailableMargin } from "./marginExtractor";
import { calculateSectorBreakdown } from "./sectorEngine";

export function useAllocationMetrics(holdings = [], margins = {}) {
  const {
    equityValue,
    goldValue,
    cashValue,
    total,
    items,
    maxHoldingSymbol,
    maxConcentrationPct,
    healthScore,
    healthStatus,
    healthColor,
  } = useMemo(() => {
    const currentItems = Array.isArray(holdings) ? holdings : [];
    let eqVal = 0;
    let gdVal = 0;
    let maxVal = 0;
    let maxSym = "--";

    currentItems.forEach((h) => {
      const sym = String(h.tradingsymbol || "").toUpperCase();
      const val = Number(h.quantity || 0) * Number(h.last_price || h.average_price || 0);
      if (sym.includes("GOLD") || sym.includes("SILVER") || sym.includes("COMMODITY")) {
        gdVal += val;
      } else {
        eqVal += val;
      }

      if (val > maxVal) {
        maxVal = val;
        maxSym = h.tradingsymbol || sym;
      }
    });

    const safeEquity = eqVal;
    const safeGold = gdVal;
    const safeCash = extractAvailableMargin(margins);
    const sumTotal = safeEquity + safeGold + safeCash;
    const maxPct = sumTotal > 0 ? ((maxVal / sumTotal) * 100).toFixed(1) : "0.0";
    const maxWeight = sumTotal > 0 ? (maxVal / sumTotal) : 0;

    // Mathematical Health & Concentration Scoring (HHI & single-asset weighting)
    let score = 95;
    if (maxWeight > 0.70) {
      score -= 35;
    } else if (maxWeight > 0.50) {
      score -= Math.round(15 + ((maxWeight - 0.50) / 0.20) * 15);
    } else if (maxWeight > 0.35) {
      score -= Math.round(5 + ((maxWeight - 0.35) / 0.15) * 10);
    }

    if (safeCash < 500 && sumTotal > 50000) {
      score -= 5;
    }

    const healthScore = Math.max(20, Math.min(100, score));
    let healthStatus = "Optimal";
    let healthColor = "emerald";
    if (healthScore < 70) {
      healthStatus = "Concentrated";
      healthColor = "amber";
    } else if (healthScore < 85) {
      healthStatus = "Moderate Concentration";
      healthColor = "amber";
    } else {
      healthStatus = "Optimal";
      healthColor = "emerald";
    }

    return {
      equityValue: safeEquity,
      goldValue: safeGold,
      cashValue: safeCash,
      total: sumTotal,
      items: currentItems,
      maxHoldingSymbol: maxSym,
      maxConcentrationPct: Number.isFinite(parseFloat(maxPct)) ? maxPct : "0.0",
      healthScore,
      healthStatus,
      healthColor
    };
  }, [holdings, margins]);

  const equityPct = total > 0 ? Math.round((equityValue / total) * 100) : 0;
  const goldPct = total > 0 ? Math.round((goldValue / total) * 100) : 0;
  const cashPct = total > 0 ? Math.max(0, 100 - equityPct - goldPct) : 0;
  const capitalGuardPct = Math.min(100, goldPct + cashPct);
  const liquidShieldVal = goldValue + cashValue;

  // Donut SVG circumference: 2 * PI * 38 = 238.76
  const circ = 238.76;
  const eqStroke = total > 0 ? (equityPct / 100) * circ : 0;
  const goldStroke = total > 0 ? (goldPct / 100) * circ : 0;
  const cashStroke = total > 0 ? (cashPct / 100) * circ : 0;

  const sectorMetrics = useMemo(() => {
    return calculateSectorBreakdown(holdings, total);
  }, [holdings, total]);

  return {
    equityValue,
    goldValue,
    cashValue,
    total,
    items,
    maxHoldingSymbol,
    maxConcentrationPct,
    healthScore,
    healthStatus,
    healthColor,
    equityPct,
    goldPct,
    cashPct,
    capitalGuardPct,
    liquidShieldVal,
    circ,
    eqStroke,
    goldStroke,
    cashStroke,
    sectorMetrics,
  };
}
