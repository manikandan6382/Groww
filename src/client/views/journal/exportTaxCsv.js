import { soundEngine } from "../../utils/soundEngine";

export function exportTaxCsv(journalTrades = [], journalRange = "all") {
  const escapeCsv = (val) => `"${String(val ?? "").replace(/"/g, '""')}"`;
  const headers = [
    "Trade ID",
    "Date",
    "Symbol / Contract",
    "Side",
    "Quantity",
    "Entry Price (INR)",
    "Exit Price (INR)",
    "Gross PnL (INR)",
    "Taxes & Charges (INR)",
    "Net Realized PnL (INR)",
    "Setup / Strategy Tag",
    "Catalyst",
    "Lessons Learned"
  ];
  const rows = journalTrades.map((t, idx) => [
    escapeCsv(t.id || `TRD-${1000 + idx}`),
    escapeCsv(t.exitDatetime?.split("T")[0] || t.entryDatetime?.split("T")[0] || new Date().toISOString().split("T")[0]),
    escapeCsv(t.symbol),
    escapeCsv(t.direction || "LONG"),
    t.quantity || 1,
    Number(t.entryPrice || 0).toFixed(2),
    Number(t.exitPrice || 0).toFixed(2),
    Number(t.grossPnl || t.netPnl || 0).toFixed(2),
    Number(t.taxesAndCharges || 56.0).toFixed(2),
    Number(t.netPnl || 0).toFixed(2),
    escapeCsv(t.strategyTags || t.strategyTag || "Quantitative Setup"),
    escapeCsv(t.catalyst || ""),
    escapeCsv(t.lessonsLearned || "")
  ]);

  const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `portfoliox_tax_audit_report_${journalRange}_${new Date().toISOString().split("T")[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  soundEngine.playSuccessTone();
}
