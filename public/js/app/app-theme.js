import { byId } from "./app-helpers.js";

export const colors = ["#15a8ff", "#19e0ff", "#6b57ff", "#a950f5", "#4f83ff", "#00f5c4"];

export const customizableVars = [
  "--bg", "--sidebar", "--panel", "--panel-2", "--line", "--line-soft",
  "--cyan", "--blue", "--green", "--accent-rgb", "--blue-rgb", "--accent-gradient",
];

export function setTheme(theme, persist = true, state = {}) {
  const nextTheme = ["blue", "emerald", "violet", "custom"].includes(theme) ? theme : "blue";
  if (nextTheme === "custom") {
    applyCustomTheme(readCustomTheme());
    updateCustomInputs(readCustomTheme());
  } else {
    clearCustomThemeStyles();
  }
  document.documentElement.dataset.theme = nextTheme;
  document.querySelectorAll(".theme-option").forEach((button) => {
    button.classList.toggle("active", button.dataset.theme === nextTheme);
  });
  if (persist) localStorage.setItem("portfolio-theme", nextTheme);
  if (state.tvTerminal) {
    const themeColors = state.tvTerminal.getThemeColors();
    state.tvTerminal.chart?.applyOptions({
      layout: { textColor: themeColors.textColor },
      grid: { vertLines: { color: themeColors.gridColor }, horzLines: { color: themeColors.gridColor } }
    });
  }
}

export function toggleCustomThemePanel(force) {
  const panel = byId("customThemePanel");
  const button = byId("customThemeBtn");
  if (!panel || !button) return;
  const shouldOpen = typeof force === "boolean" ? force : panel.hidden;
  panel.hidden = !shouldOpen;
  button.setAttribute("aria-expanded", String(shouldOpen));
  if (shouldOpen) {
    updateCustomInputs(readCustomTheme());
    setTheme("custom");
  }
}

export function readCustomTheme() {
  const fallback = { accent: "#00d5ff", bg: "#020812", panel: "#061423" };
  try {
    return { ...fallback, ...JSON.parse(localStorage.getItem("portfolio-custom-theme") || "{}") };
  } catch {
    return fallback;
  }
}

export function updateCustomInputs(theme) {
  if (byId("customAccentColor")) byId("customAccentColor").value = theme.accent;
  if (byId("customBgColor")) byId("customBgColor").value = theme.bg;
  if (byId("customPanelColor")) byId("customPanelColor").value = theme.panel;
}

export function saveCustomThemeFromInputs() {
  const theme = {
    accent: byId("customAccentColor")?.value || "#00d5ff",
    bg: byId("customBgColor")?.value || "#020812",
    panel: byId("customPanelColor")?.value || "#061423",
  };
  localStorage.setItem("portfolio-custom-theme", JSON.stringify(theme));
}

export function applyCustomTheme(theme) {
  const root = document.documentElement;
  const accentRgb = hexToRgb(theme.accent);
  const bgRgb = hexToRgb(theme.bg);
  const panelRgb = hexToRgb(theme.panel);
  const blue = mixHex(theme.accent, "#ffffff", 0.16);
  const success = mixHex(theme.accent, "#7cffd0", 0.36);

  root.style.setProperty("--bg", theme.bg);
  root.style.setProperty("--sidebar", mixHex(theme.bg, theme.panel, 0.34));
  root.style.setProperty("--panel", theme.panel);
  root.style.setProperty("--panel-2", mixHex(theme.panel, "#ffffff", 0.08));
  root.style.setProperty("--panel-glass", `rgba(${panelRgb.join(", ")}, 0.75)`);
  root.style.setProperty("--line", `rgba(${accentRgb.join(", ")}, 0.22)`);
  root.style.setProperty("--line-soft", `rgba(${accentRgb.join(", ")}, 0.1)`);
  root.style.setProperty("--cyan", theme.accent);
  root.style.setProperty("--blue", blue);
  root.style.setProperty("--green", success);
  root.style.setProperty("--accent-rgb", accentRgb.join(", "));
  root.style.setProperty("--blue-rgb", mixRgb(accentRgb, panelRgb, 0.32).join(", "));
  root.style.setProperty("--accent-gradient", `linear-gradient(135deg, ${blue}, ${theme.accent})`);
  root.style.setProperty("--shadow-main", `0 22px 70px rgba(${bgRgb.join(", ")}, 0.52)`);
}

export function clearCustomThemeStyles() {
  customizableVars.forEach((name) => document.documentElement.style.removeProperty(name));
  document.documentElement.style.removeProperty("--panel-glass");
  document.documentElement.style.removeProperty("--shadow-main");
}

export function getAccent() {
  return getComputedStyle(document.documentElement).getPropertyValue("--cyan").trim() || "#00d5ff";
}

export function getPalette() {
  const accent = getAccent();
  const theme = document.documentElement.dataset.theme || "blue";
  if (theme === "emerald") return [accent, "#35e89b", "#34d399", "#22c55e", "#67e8f9", "#8bffcf"];
  if (theme === "violet") return [accent, "#7c3aed", "#c084fc", "#60a5fa", "#22d3ee", "#d8b4fe"];
  return colors;
}

export function hexToRgb(hex) {
  const normalized = hex.replace("#", "");
  return [parseInt(normalized.slice(0, 2), 16), parseInt(normalized.slice(2, 4), 16), parseInt(normalized.slice(4, 6), 16)];
}

export function mixRgb(a, b, weight) {
  return a.map((channel, index) => Math.round(channel * (1 - weight) + b[index] * weight));
}

export function mixHex(hexA, hexB, weight) {
  return `#${mixRgb(hexToRgb(hexA), hexToRgb(hexB), weight).map((ch) => ch.toString(16).padStart(2, "0")).join("")}`;
}
