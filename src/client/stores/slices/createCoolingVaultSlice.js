import { getLocalDateKey } from "../../utils/dateUtils";

export const createCoolingVaultSlice = (set, get) => {
  return {
    dailyQuotaLimit: 3,
    testingRestrictionMode: (() => {
      try {
        return localStorage.getItem("finance_testing_restriction_mode") || "UNRESTRICTED";
      } catch {
        return "UNRESTRICTED";
      }
    })(),
    testingMode: (() => {
      try {
        return localStorage.getItem("finance_testing_mode") === "true";
      } catch {
        return false;
      }
    })(),
    dailyQuotaBypass: (() => {
      try {
        return localStorage.getItem("finance_daily_quota_bypass") === "true";
      } catch {
        return false;
      }
    })(),
    coolingVaultUnlockTime: (() => {
      try {
        const stored = localStorage.getItem("finance_cooling_vault_unlock_time");
        if (stored) {
          const time = parseInt(stored, 10);
          if (time && time > Date.now()) return time;
          localStorage.removeItem("finance_cooling_vault_unlock_time");
        }
      } catch {}
      return null;
    })(),
    setDailyQuotaBypass: (bypass) => {
      const shouldBypass = Boolean(bypass);
      try {
        if (shouldBypass) {
          localStorage.setItem("finance_daily_quota_bypass", "true");
        } else {
          localStorage.removeItem("finance_daily_quota_bypass");
        }
      } catch {}
      set({ dailyQuotaBypass: shouldBypass });
    },
    setTestingMode: (enabled) => {
      const isTesting = Boolean(enabled);
      try {
        if (isTesting) {
          localStorage.setItem("finance_testing_mode", "true");
          localStorage.setItem("finance_daily_quota_bypass", "true");
        } else {
          localStorage.removeItem("finance_testing_mode");
          localStorage.removeItem("finance_daily_quota_bypass");
        }
      } catch {}
      set({ 
        testingMode: isTesting, 
        dailyQuotaBypass: isTesting,
        coolingVaultUnlockTime: isTesting ? null : get().coolingVaultUnlockTime 
      });
    },
    toggleTestingMode: () => {
      const current = Boolean(get().testingMode);
      get().setTestingMode(!current);
    },
    setTestingRestrictionMode: (mode) => {
      const normalized = mode === "LIKE_REAL" ? "LIKE_REAL" : "UNRESTRICTED";
      try {
        localStorage.setItem("finance_testing_restriction_mode", normalized);
      } catch {}
      set({ testingRestrictionMode: normalized });
    },
    toggleTestingRestrictionMode: () => {
      const current = get().testingRestrictionMode;
      const next = current === "LIKE_REAL" ? "UNRESTRICTED" : "LIKE_REAL";
      get().setTestingRestrictionMode(next);
    },
    requestCoolingVaultUnlock: () => {
      const unlockTime = Date.now() + 15 * 60 * 1000;
      try {
        localStorage.setItem("finance_cooling_vault_unlock_time", String(unlockTime));
      } catch {}
      set({ coolingVaultUnlockTime: unlockTime, dailyQuotaBypass: false });
    },
    cancelCoolingVault: () => {
      try {
        localStorage.removeItem("finance_cooling_vault_unlock_time");
      } catch {}
      set({ coolingVaultUnlockTime: null, dailyQuotaBypass: false });
    },
    claimCoolingVaultUnlock: () => {
      try {
        localStorage.removeItem("finance_cooling_vault_unlock_time");
        localStorage.setItem("finance_daily_quota_bypass", "true");
      } catch {}
      set({ coolingVaultUnlockTime: null, dailyQuotaBypass: true });
    },
    getTodayTradesCount: () => {
      const todayKey = getLocalDateKey(new Date());
      const openCount = (get().openAlerts || []).filter(t => t.entryDatetime && getLocalDateKey(new Date(t.entryDatetime)) === todayKey).length;
      const closedCount = (get().masterTrades || []).filter(t => t.entryDatetime && getLocalDateKey(new Date(t.entryDatetime)) === todayKey).length;
      return openCount + closedCount;
    },
    getTodayRealizedLoss: () => {
      const todayKey = getLocalDateKey(new Date());
      const closed = (get().masterTrades || []).filter(t => {
        const d = t.exitDatetime || t.entryDatetime;
        return d && getLocalDateKey(new Date(d)) === todayKey;
      });
      return closed.reduce((sum, t) => sum + Number(t.netPnl || 0), 0);
    },
    isDailyLossCapReached: () => {
      const pnl = typeof get().getTodayRealizedLoss === "function" ? get().getTodayRealizedLoss() : 0;
      return pnl <= -300;
    },
  };
};
