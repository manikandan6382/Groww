const tradeState = {
  bootstrapped: false,
  range: "all",
  trades: [],
  analytics: null,
};

const viewPaths = {
  dashboard: "/dashboard",
  paper: "/paper-lab",
  foreign: "/foreign-stocks",
  journal: "/trading-journal",
};
const routeViews = new Map([
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

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });
const usdTrade = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
const pct = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 });

const tradeForm = document.getElementById("tradeForm");

initViewNavigation();
initTradingJournal();

function initViewNavigation() {
  document.querySelectorAll("[data-view-target]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      setActiveView(button.dataset.viewTarget, { historyMode: "push" });
    });
  });
  window.addEventListener("popstate", () => {
    setActiveView(getViewFromPath(location.pathname), { historyMode: "none" });
  });
  setActiveView(getViewFromPath(location.pathname), { historyMode: "replace" });
}

function getViewFromPath(pathname) {
  const normalized = normalizePath(pathname);
  return routeViews.get(normalized) || "dashboard";
}

function setActiveView(target, options = {}) {
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
  if (nextView === "journal") loadTradingJournal();
  updateTopbarForView(nextView);
  document.dispatchEvent(new CustomEvent("portfoliox:view-change", { detail: { view: nextView } }));
}

function updateTopbarForView(view) {
  const title = document.querySelector(".market-title");
  const search = document.getElementById("searchInput");
  if (title) title.textContent = view === "paper" ? "LIVE ALERTS" : view === "foreign" ? "Foreign Stocks" : "Market Overview";
  if (search) {
    search.placeholder = view === "paper"
      ? "Search holdings, positions, stocks..."
      : view === "foreign"
        ? "Search global watchlist..."
        : "Search holdings...";
  }
}

function normalizePath(pathname) {
  const clean = `/${String(pathname || "/").replace(/^\/+/, "")}`.replace(/\/+$/, "");
  return clean === "" ? "/" : clean;
}

function initTradingJournal() {
  if (!tradeForm) return;

  setDefaultEntryTime();
  toggleOptionFields();
  recalculateTradePlan();

  document.getElementById("instrumentType").addEventListener("change", toggleOptionFields);
  tradeForm.addEventListener("input", recalculateTradePlan);
  tradeForm.addEventListener("reset", () => {
    setTimeout(() => {
      setDefaultEntryTime();
      toggleOptionFields();
      recalculateTradePlan();
      setFormStatus("Ready");
    }, 0);
  });
  tradeForm.addEventListener("submit", saveTrade);

  document.querySelectorAll(".journal-range").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".journal-range").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      tradeState.range = button.dataset.tradeRange;
      toggleCustomRangeFields();
      loadTradingJournal();
    });
  });
  ["tradeRangeFrom", "tradeRangeTo"].forEach((id) => {
    document.getElementById(id).addEventListener("change", () => {
      tradeState.range = "custom";
      document.querySelectorAll(".journal-range").forEach((item) => item.classList.toggle("active", item.dataset.tradeRange === "custom"));
      toggleCustomRangeFields();
      loadTradingJournal();
    });
  });
  toggleCustomRangeFields();
}

async function loadTradingJournal() {
  if (!tradeForm) return;
  try {
    if (!tradeState.bootstrapped) await loadBootstrap();
    const query = buildRangeQuery();
    const [trades, analytics, reviews] = await Promise.all([
      fetchJson(`/api/trades${query}`),
      fetchJson(`/api/trading/analytics${query}`),
      fetchJson(`/api/trading/reviews${query}`),
    ]);
    tradeState.trades = trades.items || [];
    tradeState.analytics = analytics.analytics;
    renderTradeHistory(tradeState.trades);
    renderAnalytics(analytics.analytics, analytics.label);
    renderReviewReports(reviews.reports || []);
    setFormStatus("Ready");
  } catch (error) {
    setFormStatus(error.message, true);
  }
}

async function loadBootstrap() {
  const data = await fetchJson("/api/trading/bootstrap");
  renderDatalist("strategyTagOptions", data.strategyTags || []);
  renderDatalist("mistakeTagOptions", data.mistakeTags || []);
  tradeState.bootstrapped = true;
}

async function saveTrade(event) {
  event.preventDefault();
  setFormStatus("Saving...");

  try {
    const payload = await buildTradePayload();
    await fetchJson("/api/trades", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    tradeForm.reset();
    setDefaultEntryTime();
    toggleOptionFields();
    recalculateTradePlan();
    setFormStatus("Saved");
    await loadTradingJournal();
  } catch (error) {
    setFormStatus(error.message, true);
  }
}

async function buildTradePayload() {
  const data = new FormData(tradeForm);
  const payload = Object.fromEntries(data.entries());
  payload.followedPlan = data.get("followedPlan") === "on";
  payload.strategyTags = splitTags(payload.strategyTags);
  payload.mistakeTags = splitTags(payload.mistakeTags);
  payload.attachments = (
    await Promise.all([
      readEvidenceFile("entryScreenshot", "ENTRY_SCREENSHOT"),
      readEvidenceFile("exitScreenshot", "EXIT_SCREENSHOT"),
      readEvidenceFile("setupImage", "SETUP_IMAGE"),
    ])
  ).filter(Boolean);
  return payload;
}

function renderTradeHistory(trades) {
  const target = document.getElementById("tradeHistory");
  document.getElementById("tradeCountLabel").textContent = `${trades.length} trades`;
  if (!trades.length) {
    target.innerHTML = `
      <div class="empty-state">
        <strong>No trades yet</strong>
        <span>Add your first real or paper trade. Clean history starts here.</span>
      </div>
    `;
    return;
  }

  target.innerHTML = trades.map((trade) => `
    <article class="trade-card">
      <div class="trade-card-main">
        <div>
          <strong>${escapeHtml(trade.symbol)}</strong>
          <span>${escapeHtml(trade.market)} / ${escapeHtml(trade.tradeMode)} / ${escapeHtml(trade.tradeType)}</span>
        </div>
        <em class="${Number(trade.netPnl) >= 0 ? "gain" : "loss"}">${moneyFor(trade).format(Number(trade.netPnl || 0))}</em>
      </div>
      <div class="trade-card-meta">
        <span>${escapeHtml(formatDateTime(trade.entryDatetime))}</span>
        <span>${escapeHtml(trade.status)}</span>
        <span>R:R ${Number(trade.riskRewardRatio || 0).toFixed(2)}</span>
        <span>Risk ${pct.format(Number(trade.riskPercentage || 0))}%</span>
      </div>
      <div class="tag-cloud">
        ${(trade.strategyTags || []).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}
        ${(trade.mistakeTags || []).map((tag) => `<span class="mistake">${escapeHtml(tag)}</span>`).join("")}
      </div>
      ${renderEvidenceLinks(trade.attachments || [])}
      ${trade.lessonsLearned ? `<p>${escapeHtml(trade.lessonsLearned)}</p>` : ""}
    </article>
  `).join("");
}

function renderAnalytics(analytics, label) {
  document.getElementById("analyticsRangeLabel").textContent = label;
  const cards = [
    ["Total trades", analytics.totalTrades],
    ["Winning trades", analytics.winningTrades],
    ["Losing trades", analytics.losingTrades],
    ["Win rate", `${pct.format(analytics.winRate)}%`],
    ["Total P&L", inr.format(analytics.totalPnl)],
    ["Average win", inr.format(analytics.averageWin)],
    ["Average loss", inr.format(analytics.averageLoss)],
    ["Profit factor", Number(analytics.profitFactor || 0).toFixed(2)],
    ["Max drawdown", inr.format(analytics.maximumDrawdown)],
    ["Best strategy", analytics.bestStrategy?.name || "--"],
    ["Worst strategy", analytics.worstStrategy?.name || "--"],
    ["Common mistake", analytics.mostCommonMistakes?.[0]?.name || "--"],
  ];

  document.getElementById("tradeAnalyticsCards").innerHTML = cards.map(([labelText, value]) => `
    <div class="analytics-card">
      <span>${escapeHtml(labelText)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `).join("");
}

function renderReviewReports(reports) {
  const target = document.getElementById("reviewReports");
  target.innerHTML = reports.map((report) => `
    <article class="review-card">
      <div>
        <strong>${escapeHtml(report.title)}</strong>
        <span>${escapeHtml(report.period)}</span>
      </div>
      <p>${escapeHtml(report.summary)}</p>
      <div class="review-metrics">
        ${(report.metrics || []).map((metric) => `
          <span><b>${escapeHtml(metric.value)}</b>${escapeHtml(metric.label)}</span>
        `).join("")}
      </div>
    </article>
  `).join("");
}

function recalculateTradePlan() {
  const values = getFormValues();
  const entry = Number(values.entryPrice || 0);
  const target = Number(values.targetPrice || 0);
  const stop = Number(values.stopLoss || 0);
  const quantity = Number(values.quantity || 0);
  const lotSize = Math.max(1, Number(values.lotSize || 1));
  const units = quantity * lotSize;
  const direction = values.direction || "LONG";
  const position = entry * units;
  const riskPerUnit = stop ? Math.max(0, direction === "LONG" ? entry - stop : stop - entry) : 0;
  const rewardPerUnit = target ? Math.max(0, direction === "LONG" ? target - entry : entry - target) : 0;
  const riskAmount = riskPerUnit * units;
  const expectedReward = rewardPerUnit * units;
  const riskPercent = position ? (riskAmount / position) * 100 : 0;
  const rr = riskAmount ? expectedReward / riskAmount : 0;
  const formatter = values.market === "US" ? usdTrade : inr;
  const items = [
    formatter.format(position || 0),
    formatter.format(riskAmount || 0),
    `${pct.format(riskPercent || 0)}%`,
    formatter.format(expectedReward || 0),
    rr ? `1:${rr.toFixed(2)}` : "--",
  ];
  document.querySelectorAll("#tradePlanPreview strong").forEach((node, index) => {
    node.textContent = items[index];
  });
}

function toggleOptionFields() {
  setElementHidden(document.getElementById("optionFields"), document.getElementById("instrumentType").value !== "OPTION");
}

function toggleCustomRangeFields() {
  const isCustom = tradeState.range === "custom";
  setElementHidden(document.getElementById("tradeRangeFrom"), !isCustom);
  setElementHidden(document.getElementById("tradeRangeTo"), !isCustom);
}

function setElementHidden(element, shouldHide) {
  if (!element) return;
  element.hidden = shouldHide;
  element.style.display = shouldHide ? "none" : "";
  element.setAttribute("aria-hidden", String(shouldHide));
}

function buildRangeQuery() {
  const params = new URLSearchParams();
  params.set("range", tradeState.range);
  if (tradeState.range === "custom") {
    const from = document.getElementById("tradeRangeFrom").value;
    const to = document.getElementById("tradeRangeTo").value;
    if (from) params.set("from", from);
    if (to) params.set("to", to);
  }
  return `?${params.toString()}`;
}

function getFormValues() {
  return Object.fromEntries(new FormData(tradeForm).entries());
}

function setDefaultEntryTime() {
  const input = document.getElementById("entryDatetime");
  if (!input || input.value) return;
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  input.value = now.toISOString().slice(0, 16);
}

function renderDatalist(id, values) {
  document.getElementById(id).innerHTML = values.map((value) => `<option value="${escapeHtml(value)}"></option>`).join("");
}

function splitTags(value) {
  return String(value || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function readEvidenceFile(id, type) {
  const input = document.getElementById(id);
  const file = input.files?.[0];
  if (!file) return Promise.resolve(null);
  if (file.size > 4 * 1024 * 1024) {
    throw new Error(`${file.name} is too large. Keep each evidence image under 4 MB.`);
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({
      type,
      name: file.name,
      dataUrl: reader.result,
    });
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
    reader.readAsDataURL(file);
  });
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok || data.error) throw new Error(data.error || response.statusText);
  return data;
}

function setFormStatus(message, isError = false) {
  const target = document.getElementById("tradeFormStatus");
  target.textContent = message;
  target.classList.toggle("warn", isError);
}

function renderEvidenceLinks(attachments) {
  if (!attachments.length) return "";
  return `
    <div class="evidence-links">
      ${attachments.map((item) => `<a href="${escapeHtml(item.filePath)}" target="_blank" rel="noreferrer">${escapeHtml(formatAttachmentType(item.type))}</a>`).join("")}
    </div>
  `;
}

function formatAttachmentType(type) {
  return String(type || "").replace(/_/g, " ").toLowerCase();
}

function formatDateTime(value) {
  if (!value) return "--";
  return value.replace("T", " ");
}

function moneyFor(trade) {
  return trade.currency === "USD" ? usdTrade : inr;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
