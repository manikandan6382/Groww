export const createPreferencesSlice = (set, get) => ({
  // Theme State
  activeTheme: typeof window !== "undefined" ? (localStorage.getItem("portfolio-theme") || "violet") : "violet",
  setTheme: (theme) => {
    set({ activeTheme: theme });
    if (typeof window !== "undefined") {
      localStorage.setItem("portfolio-theme", theme);
      document.documentElement.setAttribute("data-theme", theme);
      document.documentElement.dataset.theme = theme;
    }
  },
  customThemeColors: {
    accent: "#00d5ff",
    bg: "#020812",
    panel: "#061423"
  },
  setCustomColor: (key, val) => {
    const next = { ...get().customThemeColors, [key]: val };
    set({ customThemeColors: next, activeTheme: "custom" });
    document.documentElement.style.setProperty(`--theme-custom-${key}`, val);
    document.documentElement.dataset.theme = "custom";
  },

  // Option Outcome Simulator Interlink State
  simulatorActiveTradeId: null,
  setSimulatorActiveTradeId: (id) => set({ simulatorActiveTradeId: id }),

  // Active Order Pad Contract Watched Live
  activePadSymbol: "NIFTY 23450 PE",
  setActivePadSymbol: (symbol) => set((state) => (state.activePadSymbol !== symbol ? { activePadSymbol: symbol } : state)),
  activeHedgeSymbol: null,
  setActiveHedgeSymbol: (symbol) => set((state) => (state.activeHedgeSymbol !== symbol ? { activeHedgeSymbol: symbol } : state)),

  // Dual Broker Hub Status
  brokerStatus: {
    kiteConnected: false,
    kiteExpired: false,
    upstoxConnected: false,
    upstoxExpired: false,
    feedLatencyMs: 18,
    upstoxExpiry: null
  },
  authenticatingBroker: null, // 'kite' | 'upstox' | null
  setAuthenticatingBroker: (broker) => set((state) => (state.authenticatingBroker !== broker ? { authenticatingBroker: broker } : state)),
  setBrokerStatus: (status) => set((state) => {
    let changed = false;
    for (const k in status) {
      if (state.brokerStatus[k] !== status[k]) {
        changed = true;
        break;
      }
    }
    return changed ? { brokerStatus: { ...state.brokerStatus, ...status } } : state;
  }),

  // Wealth View Persistence
  wealthTimeframe: (() => {
    try {
      return localStorage.getItem("portfolio-wealth-timeframe") || "1M";
    } catch {
      return "1M";
    }
  })(),
  wealthViewMode: (() => {
    try {
      return localStorage.getItem("portfolio-wealth-viewmode") || "total";
    } catch {
      return "total";
    }
  })(),
  setWealthTimeframe: (tf) => {
    set({ wealthTimeframe: tf });
    try { localStorage.setItem("portfolio-wealth-timeframe", tf); } catch {}
  },
  setWealthViewMode: (mode) => {
    set({ wealthViewMode: mode });
    try { localStorage.setItem("portfolio-wealth-viewmode", mode); } catch {}
  },

  // Global Multi-Currency Preference (INR, USD, EUR)
  portfolioCurrency: (() => {
    try {
      return localStorage.getItem("portfolio-currency") || "INR";
    } catch {
      return "INR";
    }
  })(),
  setPortfolioCurrency: (curr) => {
    set({ portfolioCurrency: curr });
    try { localStorage.setItem("portfolio-currency", curr); } catch {}
  },

  // Streamer P&L Privacy Mode
  isPrivacyMode: (() => {
    try {
      return localStorage.getItem("portfolio-privacy-mode") === "true";
    } catch {
      return false;
    }
  })(),
  togglePrivacyMode: () => {
    const next = !get().isPrivacyMode;
    set({ isPrivacyMode: next });
    try {
      localStorage.setItem("portfolio-privacy-mode", String(next));
    } catch {}
  },

  // 1-Click Watchlist -> OrderPad Deployment Bridge
  orderPadPreFill: null,
  setOrderPadPreFill: (data) => set({ orderPadPreFill: data }),

  startingCapital: 100000.0,
});
