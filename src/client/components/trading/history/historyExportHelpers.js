import { calculateTradeRMultiple, calculateStatutoryCharges, calculateExcursionMetrics, resolveUnderlying, resolveMarketSession } from "./historyCalculations.js";

/**
 * CWE-1236 Safe CSV Cell Sanitizer
 * Mitigates CSV / Formula injection by prepending apostrophe if cell starts with =, +, -, @, tab, or CR
 */
function sanitizeCsvCell(val) {
  if (val == null) return '""';
  let str = String(val);
  if (/^[=\+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

export function exportLedgerCsv(filteredAlerts) {
  const headers = [
    "Trade ID",
    "Symbol",
    "Underlying",
    "Option Type",
    "Market Session",
    "Entry Datetime",
    "Exit Datetime",
    "Duration",
    "Lots",
    "Total Qty",
    "Entry Price (INR)",
    "Exit Price (INR)",
    "Entry Slippage Pts",
    "Stop Loss (INR)",
    "Target (INR)",
    "MFE Pts (Run-Up)",
    "MAE Pts (Drawdown)",
    "Gross PnL (INR)",
    "Statutory Charges & Brokerage (INR)",
    "Net PnL (INR)",
    "Realized R-Multiple",
    "Close Reason",
    "Discipline Status",
    "Mistake Tag",
    "Strategy Tag"
  ];

  const rows = filteredAlerts.map((t) => {
    const rawQty = Number(t.quantity || 1);
    const lotSize = Number(t.lotSize || 65);
    const totalQty = Number(t.totalQty || (rawQty >= lotSize ? rawQty : rawQty * lotSize) || 65);
    const net = Number(t.netPnl || 0);
    const charges = calculateStatutoryCharges(t);
    const gross = Number(t.grossPnl ?? (net + charges));
    const { rMultipleStr, isRuleBreached } = calculateTradeRMultiple(t);
    const disciplineStatus = isRuleBreached ? "RULE BREACH (>₹300 Loss)" : "DISCIPLINED EXECUTION";
    const excursion = calculateExcursionMetrics(t);
    const underlying = resolveUnderlying(t);
    const session = resolveMarketSession(t.entryDatetime);

    return [
      t.serverId || t.id || "",
      t.symbol || "",
      underlying,
      t.optionType || (String(t.symbol || "").includes("PE") ? "PUT" : "CALL"),
      session.label,
      t.entryDatetime || "",
      t.exitDatetime || "",
      t.duration || "",
      t.quantity || 1,
      totalQty,
      t.entryPrice || 0,
      t.exitPrice || 0,
      excursion.entrySlippagePts,
      t.stopLoss || 0,
      t.targetPrice || 0,
      excursion.mfePts,
      excursion.maePts,
      gross.toFixed(2),
      charges.toFixed(2),
      net.toFixed(2),
      rMultipleStr,
      t.closeReason || "MANUAL_SQUARE_OFF",
      disciplineStatus,
      t.mistakeTags || t.mistakeTag || "None",
      t.strategyTag || t.strategyTags || "Practice Scalp"
    ];
  });

  const csvContent = [
    headers.map(sanitizeCsvCell).join(","),
    ...rows.map((r) => r.map(sanitizeCsvCell).join(","))
  ].join("\n");

  if (typeof document === "undefined") {
    return csvContent;
  }

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Groww_Options_Audit_Ledger_${new Date().toISOString().split("T")[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportLedgerJson(closedAlerts) {
  const blob = new Blob([JSON.stringify(closedAlerts, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `portfoliox_ledger_backup_${Date.now()}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export function importLedgerJson(e, onImportSuccess) {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const parsed = JSON.parse(event.target?.result);
      if (Array.isArray(parsed) && parsed.length > 0 && onImportSuccess) {
        onImportSuccess(parsed);
      }
    } catch {}
  };
  reader.readAsText(file);
  e.target.value = "";
}
