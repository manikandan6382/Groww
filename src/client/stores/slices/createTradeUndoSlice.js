import { persistDeletedTradeId, removeDeletedTradeId, commitTradeDeletionToBackend } from "./tradePersistence";

export const createTradeUndoSlice = (set, get) => ({
  undoTradeBackup: null,
  undoCountdown: 5,
  undoTimerHandle: null,
  undoIntervalHandle: null,

  deleteJournalTradesWithUndo: (tradesOrTrade) => {
    const rawList = Array.isArray(tradesOrTrade) ? tradesOrTrade : [tradesOrTrade];
    const tradeList = rawList
      .map((t) => (typeof t === "object" && t !== null ? t : get().masterTrades.find((x) => x.id === t)))
      .filter(Boolean);

    if (tradeList.length === 0) return;

    const { undoTradeBackup, undoTimerHandle, undoIntervalHandle } = get();
    if (undoTimerHandle) clearTimeout(undoTimerHandle);
    if (undoIntervalHandle) clearInterval(undoIntervalHandle);

    if (undoTradeBackup) {
      const pending = Array.isArray(undoTradeBackup.trades) ? undoTradeBackup.trades : [undoTradeBackup];
      pending.forEach((pt) => {
        if (pt.id !== undefined && pt.id !== null) {
          commitTradeDeletionToBackend(pt.id);
          if (pt.serverId && pt.serverId !== pt.id) commitTradeDeletionToBackend(pt.serverId);
        }
      });
    }

    const tradeIdsToDelete = new Set();
    for (const t of tradeList) {
      [t.id, String(t.id)].forEach((k) => tradeIdsToDelete.add(k));
      persistDeletedTradeId(t.id);
      if (t.serverId) {
        [t.serverId, String(t.serverId)].forEach((k) => tradeIdsToDelete.add(k));
        persistDeletedTradeId(t.serverId);
      }
    }

    const next = get().masterTrades.filter((t) => !tradeIdsToDelete.has(t.id) && !tradeIdsToDelete.has(String(t.id)));
    set({ masterTrades: next, closedAlerts: next, journalTrades: next });
    try {
      localStorage.setItem("portfolio-master-trades", JSON.stringify(next));
      localStorage.setItem("portfolio-journal-trades", JSON.stringify(next));
    } catch {}

    let count = 5;
    const interval = setInterval(() => {
      count -= 1;
      if (count <= 0) {
        clearInterval(interval);
        set({ undoIntervalHandle: null });
      } else {
        set({ undoCountdown: count });
      }
    }, 1000);

    const timer = setTimeout(() => {
      tradeList.forEach((t) => {
        commitTradeDeletionToBackend(t.id);
        if (t.serverId && t.serverId !== t.id) commitTradeDeletionToBackend(t.serverId);
      });
      set({ undoTradeBackup: null, undoCountdown: 5, undoTimerHandle: null, undoIntervalHandle: null });
    }, 5000);

    const backupObj = tradeList.length === 1
      ? { ...tradeList[0], trades: tradeList, isBatch: false, count: 1 }
      : { id: `batch-${Date.now()}`, symbol: `${tradeList.length} Practice Trades`, trades: tradeList, isBatch: true, count: tradeList.length };

    set({ undoTradeBackup: backupObj, undoCountdown: 5, undoTimerHandle: timer, undoIntervalHandle: interval });
  },

  deleteJournalTradeWithUndo: (trade) => get().deleteJournalTradesWithUndo(trade),

  executeUndoTrade: () => {
    const { undoTradeBackup, undoTimerHandle, undoIntervalHandle } = get();
    if (!undoTradeBackup) return false;
    if (undoTimerHandle) clearTimeout(undoTimerHandle);
    if (undoIntervalHandle) clearInterval(undoIntervalHandle);

    const tradesToRestore = Array.isArray(undoTradeBackup.trades) ? undoTradeBackup.trades : [undoTradeBackup];
    tradesToRestore.forEach((t) => {
      removeDeletedTradeId(t.id);
      if (t.serverId) removeDeletedTradeId(t.serverId);
    });

    const current = get().masterTrades;
    const restoreIds = new Set(tradesToRestore.map((t) => String(t.id)));
    const filteredCurrent = current.filter((t) => !restoreIds.has(String(t.id)));
    const restored = [...tradesToRestore, ...filteredCurrent];
    restored.sort((a, b) => {
      const timeA = new Date(a.exitDatetime || a.entryDatetime || 0).getTime();
      const timeB = new Date(b.exitDatetime || b.entryDatetime || 0).getTime();
      return timeB - timeA;
    });

    set({ masterTrades: restored, closedAlerts: restored, journalTrades: restored, undoTradeBackup: null, undoCountdown: 5, undoTimerHandle: null, undoIntervalHandle: null });
    try {
      localStorage.setItem("portfolio-master-trades", JSON.stringify(restored));
      localStorage.setItem("portfolio-journal-trades", JSON.stringify(restored));
    } catch {}
    return true;
  },

  dismissUndoTrade: () => {
    const { undoTradeBackup, undoTimerHandle, undoIntervalHandle } = get();
    if (undoTimerHandle) clearTimeout(undoTimerHandle);
    if (undoIntervalHandle) clearInterval(undoIntervalHandle);
    if (undoTradeBackup) {
      const pending = Array.isArray(undoTradeBackup.trades) ? undoTradeBackup.trades : [undoTradeBackup];
      pending.forEach((pt) => {
        if (pt.id !== undefined && pt.id !== null) {
          commitTradeDeletionToBackend(pt.id);
          if (pt.serverId && pt.serverId !== pt.id) commitTradeDeletionToBackend(pt.serverId);
        }
      });
    }
    set({ undoTradeBackup: null, undoCountdown: 5, undoTimerHandle: null, undoIntervalHandle: null });
  },

  deleteJournalTrade: async (id) => {
    if (id === undefined || id === null) return;
    const tradeObj = get().masterTrades.find((t) => t.id === id || String(t.id) === String(id) || t.serverId === id);
    const serverId = tradeObj?.serverId;
    persistDeletedTradeId(id);
    if (serverId && serverId !== id) persistDeletedTradeId(serverId);

    const next = get().masterTrades.filter((t) => 
      t.id !== id && t.id !== String(id) && (!serverId || (t.id !== serverId && t.id !== String(serverId) && t.serverId !== serverId))
    );
    set({ masterTrades: next, closedAlerts: next, journalTrades: next });
    try {
      localStorage.setItem("portfolio-master-trades", JSON.stringify(next));
      localStorage.setItem("portfolio-journal-trades", JSON.stringify(next));
    } catch {}
    await commitTradeDeletionToBackend(id);
    if (serverId && serverId !== id) await commitTradeDeletionToBackend(serverId);
  },

  deleteTrade: async (id) => get().deleteJournalTrade(id),
});
