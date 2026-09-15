import { normalizePath, setElementHidden } from "./journal-helpers.js";

export const tradeState = {
  bootstrapped: false,
  range: "all",
  historyFilter: "ALL",
  trades: [],
  analytics: null,
};

export const viewPaths = {
  dashboard: "/dashboard",
  paper: "/paper-lab",
  foreign: "/foreign-stocks",
  journal: "/trading-journal",
};

export const routeViews = new Map([
  ["/", "dashboard"],
  ["/dashboard", "dashboard"],
  ["/stocks", "dashboard"],
  ["/my-stocks", "dashboard"],
  ["/paper-lab", "paper"],
  ["/paper", "paper"],
  ["/paper-trading", "paper"],
  ["/trade", "paper"],
  ["/foreign-stocks", "foreign"],
  ["/foreign", "foreign"],
  ["/us-stocks", "foreign"],
  ["/trading-journal", "journal"],
  ["/journal", "journal"],
  ["/trading", "journal"],
]);

export const syncChannel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("portfoliox_sync") : null;

export function initViewNavigation(loadCallback) {
  document.querySelectorAll("[data-view-target]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      setActiveView(button.dataset.viewTarget, { historyMode: "push" }, loadCallback);
    });
  });
  window.addEventListener("popstate", () => {
    setActiveView(getViewFromPath(location.pathname), { historyMode: "none" }, loadCallback);
  });
  setActiveView(getViewFromPath(location.pathname), { historyMode: "replace" }, loadCallback);
}

export function getViewFromPath(pathname) {
  const normalized = normalizePath(pathname);
  return routeViews.get(normalized) || "dashboard";
}

export function setActiveView(target, options = {}, loadCallback) {
  const nextView = ["dashboard", "paper", "foreign", "journal"].includes(target) ? target : "dashboard";
  const historyMode = options.historyMode || "push";
  const nextPath = viewPaths[nextView];
  document.documentElement.dataset.activeView = nextView;
  document.querySelectorAll("[data-view-target]").forEach((item) => {
    item.classList.toggle("active", item.dataset.viewTarget === nextView);
  });
  document.querySelectorAll("[data-view-panel]").forEach((panel) => {
    setElementHidden(panel, panel.dataset.viewPanel !== nextView);
  });
  if (historyMode === "push" && location.pathname !== nextPath) {
    history.pushState({ view: nextView }, "", nextPath);
  }
  if (historyMode === "replace" && location.pathname !== nextPath) {
    history.replaceState({ view: nextView }, "", nextPath);
  }
  if (nextView === "journal" && typeof loadCallback === "function") loadCallback();
  updateTopbarForView(nextView);
  window.scrollTo({ top: 0, behavior: "instant" });
  document.dispatchEvent(new CustomEvent("portfoliox:view-change", { detail: { view: nextView } }));
}

if (typeof window !== "undefined") {
  window.setActiveView = setActiveView;
}

export function updateTopbarForView(view) {
  const title = document.querySelector(".market-title");
  const search = document.getElementById("searchInput");
  if (title) {
    if (view === "paper") title.textContent = "Live Alerts";
    else if (view === "foreign") title.textContent = "Foreign Stocks Radar";
    else if (view === "journal") title.textContent = "Trading Journal";
    else title.textContent = "Market Overview";
  }
  if (search) {
    search.placeholder = view === "paper"
      ? "Search live alerts, instruments..."
      : view === "foreign"
        ? "Search US stocks (AAPL, MSFT)..."
        : view === "journal"
          ? "Search trading journal..."
          : "Search holdings, stocks...";
  }
}
