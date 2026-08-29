// 🌐 BROWSER URL ROUTING & DEEP-LINKING SYNC
export const ROUTE_MAP = {
  "/": "dashboard",
  "/dashboard": "dashboard",
  "/practice": "paper",
  "/paper": "paper",
  "/signals": "paper",
  "/journal": "journal",
  "/foreign": "foreign",
  "/global": "foreign",
};

export const VIEW_TO_PATH_MAP = {
  dashboard: "/",
  paper: "/practice",
  journal: "/journal",
  foreign: "/foreign",
};

export const VIEW_TITLES = {
  dashboard: "PortfolioX — My Stocks & Wealth",
  paper: "PortfolioX — Live Signals & Practice Lab",
  journal: "PortfolioX — Trading Journal & Case Studies",
  foreign: "PortfolioX — US Tech Giants & Foreign Alpha",
};

/**
 * Parses window.location.pathname and window.location.hash to determine initial activeView
 */
export function getViewFromUrl() {
  if (typeof window === "undefined") return "dashboard";

  // 1. Check pathname (e.g. /journal, /practice)
  const pathname = window.location.pathname.toLowerCase().replace(/\/+$/, "") || "/";
  if (ROUTE_MAP[pathname]) {
    return ROUTE_MAP[pathname];
  }

  // 2. Check hash fallback (e.g. #/journal or #journal)
  const hash = window.location.hash.toLowerCase().replace(/^#\/?/, "/");
  if (ROUTE_MAP[hash]) {
    return ROUTE_MAP[hash];
  }

  return "dashboard";
}

/**
 * Updates window.history and browser document title
 */
export function syncUrlWithView(viewId, replace = false) {
  if (typeof window === "undefined") return;

  const targetPath = VIEW_TO_PATH_MAP[viewId] || "/";
  const currentPath = window.location.pathname;

  // Update Page Title
  if (VIEW_TITLES[viewId]) {
    document.title = VIEW_TITLES[viewId];
  }

  if (currentPath !== targetPath) {
    try {
      if (replace) {
        window.history.replaceState({ view: viewId }, "", targetPath);
      } else {
        window.history.pushState({ view: viewId }, "", targetPath);
      }
    } catch {
      // Fallback for strict origin restrictions
      window.location.hash = targetPath === "/" ? "" : targetPath;
    }
  }
}
