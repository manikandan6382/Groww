import { soundEngine } from "../../../utils/soundEngine.js";
import { resolveIndexLotSize } from "../../../stores/slices/tradeHelpers.js";

/**
 * 🏛️ Institutional CA & Tax-Filing Derivative Ledger (Section 44AD / 44ADA Compliant)
 * Hardened with CWE-1236 CSV Formula Injection Sanitization & SSR/Node Safety.
 */
export function sanitizeTaxCell(val) {
  if (val === null || val === undefined) return '""';
  let str = String(val).trim();
  // CWE-1236: Escape spreadsheet formulas (=, +, -, @, tab, CR)
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

export function generateTaxCsvContent(filteredTrades = []) {
  const headers = [
    "Trade ID",
    "Date",
    "Symbol / Contract",
    "Side",
    "Quantity (Total Units)",
    "Entry Price (INR)",
    "Exit Price (INR)",
    "Gross Buy Value (INR)",
    "Gross Sell Value (INR)",
    "Gross PnL (INR)",
    "Sec 44AD Turnover (Absolute PnL INR)",
    "Brokerage (INR)",
    "STT / CTT (INR)",
    "Exchange Charges (INR)",
    "GST (18% INR)",
    "Total Statutory Friction (INR)",
    "Net Realized PnL (INR)",
    "Setup / Strategy Tag",
    "Mistake Tag",
    "Integrity Score",
    "Catalyst / Mechanics",
    "Execution Lessons / Notes"
  ];

  const rows = filteredTrades.map((t, idx) => {
    const effectiveLotSize = resolveIndexLotSize(t.symbol, t.lotSize);
    const rawQty = Number(t.quantity || 1);
    const qty = Number(t.totalQty || (rawQty >= effectiveLotSize ? rawQty : rawQty * effectiveLotSize));

    const entryPrice = Number(t.entryPrice || 0);
    const exitPrice = Number(t.exitPrice || 0);
    const isShort = t.direction === "SHORT" || t.side === "SELL";

    const buyVal = entryPrice * qty;
    const sellVal = exitPrice * qty;
    const gross = isShort ? (buyVal - sellVal) : (sellVal - buyVal);
    const turnover = Math.abs(gross);

    const brokerage = 40.0;
    const stt = Number((sellVal * 0.001).toFixed(2));
    const exch = Number(((buyVal + sellVal) * 0.0005).toFixed(2));
    const gst = Number((0.18 * (brokerage + exch)).toFixed(2));
    const totalCharges = Number(t.taxesAndCharges || (brokerage + stt + exch + gst).toFixed(2));
    const net = Number(t.netPnl !== undefined ? t.netPnl : (gross - totalCharges).toFixed(2));

    const strat = Array.isArray(t.strategyTags) 
      ? t.strategyTags.join("; ") 
      : String(t.strategyTags || t.strategyTag || t.setupTag || "Quantitative Setup");

    const mistake = Array.isArray(t.mistakeTags)
      ? t.mistakeTags.join("; ")
      : String(t.mistakeTags || "None / Disciplined");

    const mechanics = t.notes || t.executionDetails || t.catalyst || "Breakout / Pivot confirmation";
    const lessons = t.lessonsLearned || "Executed according to quantitative criteria";

    return [
      sanitizeTaxCell(t.id ? `TRD-${t.id}` : `TRD-${1000 + idx}`),
      sanitizeTaxCell(t.exitDatetime?.split("T")[0] || t.entryDatetime?.split("T")[0] || new Date().toISOString().split("T")[0]),
      sanitizeTaxCell(t.symbol || "NIFTY OPTION"),
      sanitizeTaxCell(isShort ? "SELL" : "BUY"),
      qty,
      entryPrice.toFixed(2),
      exitPrice.toFixed(2),
      buyVal.toFixed(2),
      sellVal.toFixed(2),
      gross.toFixed(2),
      turnover.toFixed(2),
      brokerage.toFixed(2),
      stt.toFixed(2),
      exch.toFixed(2),
      gst.toFixed(2),
      totalCharges.toFixed(2),
      net.toFixed(2),
      sanitizeTaxCell(strat),
      sanitizeTaxCell(mistake),
      `${t.setupIntegrityScore || 90}%`,
      sanitizeTaxCell(mechanics),
      sanitizeTaxCell(lessons)
    ];
  });

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

export function exportTaxCsv(filteredTrades = [], journalRange = "all") {
  const csvContent = generateTaxCsvContent(filteredTrades);

  // SSR / Node.js test runner guard
  if (typeof document === "undefined") {
    return csvContent;
  }

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `trading_journal_tax_ledger_${journalRange}_${new Date().toISOString().split("T")[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  soundEngine?.playSuccessTone?.();

  return csvContent;
}

export default exportTaxCsv;
