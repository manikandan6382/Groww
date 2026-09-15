import { soundEngine } from "../../../utils/soundEngine";

// Institutional CA & Tax-Filing Derivative Ledger (Section 44AD / 44ADA Compliant)
export function exportTaxCsv(filteredTrades, journalRange) {
  const headers = [
    "Trade ID",
    "Date",
    "Symbol / Contract",
    "Side",
    "Quantity",
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
    "Net Realized PnL (INR)",
    "Setup / Strategy Tag",
    "Integrity Score",
    "Execution Notes"
  ];

  const rows = filteredTrades.map((t, idx) => {
    const qty = t.lotSize && t.quantity ? t.lotSize * t.quantity : 25;
    const entryPrice = Number(t.entryPrice || 0);
    const exitPrice = Number(t.exitPrice || 0);
    const buyVal = entryPrice * qty;
    const sellVal = exitPrice * qty;
    const gross = t.direction === "SHORT" ? (buyVal - sellVal) : (sellVal - buyVal);
    const turnover = Math.abs(gross);
    const brokerage = 40.0;
    const stt = Number((sellVal * 0.001).toFixed(2));
    const exch = Number(((buyVal + sellVal) * 0.0005).toFixed(2));
    const gst = Number((0.18 * (brokerage + exch)).toFixed(2));
    const net = Number((gross - (brokerage + stt + exch + gst)).toFixed(2));

    return [
      `TRD-${t.id || (1000 + idx)}`,
      `"${t.exitDatetime?.split("T")[0] || t.entryDatetime?.split("T")[0] || new Date().toISOString().split("T")[0]}"`,
      `"${t.symbol}"`,
      `"${t.direction || (t.optionType === "PUT" ? "SELL" : "BUY")}"`,
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
      (t.netPnl !== undefined ? t.netPnl : net).toFixed(2),
      `"${(Array.isArray(t.strategyTags) ? t.strategyTags.join("; ") : String(t.strategyTags || t.strategyTag || t.setupTag || "Quantitative Setup")).replace(/"/g, '""')}"`,
      `${t.setupIntegrityScore || 90}%`,
      `"${(t.notes || t.executionDetails || "Executed on quantitative criteria").replace(/"/g, '""')}"`
    ];
  });

  const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `trading_journal_tax_ledger_${journalRange}_${new Date().toISOString().split("T")[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  soundEngine.playSuccessTone();
}
