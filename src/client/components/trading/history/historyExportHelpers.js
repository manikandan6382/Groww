export function exportLedgerCsv(filteredAlerts) {
  const headers = ["Symbol", "OptionType", "EntryPrice", "ExitPrice", "NetPnl", "CloseReason", "Strategy"];
  const rows = filteredAlerts.map((t) => [t.symbol, t.optionType, t.entryPrice, t.exitPrice, t.netPnl, t.closeReason, t.strategyTag || "Scalp"]);
  const csvContent = [headers.join(","), ...rows.map((r) => r.map((v) => `"${v ?? ""}"`).join(","))].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `portfoliox_ledger_${Date.now()}.csv`;
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
