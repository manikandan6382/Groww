import { create } from "zustand";

export const useThemeStore = create((set) => ({
  theme: localStorage.getItem("portfolio-theme") || "blue",
  customColors: {
    accent: localStorage.getItem("portfolio-custom-accent") || "#00d5ff",
    bg: localStorage.getItem("portfolio-custom-bg") || "#020812",
    panel: localStorage.getItem("portfolio-custom-panel") || "#061423",
  },
  setTheme: (theme) => {
    localStorage.setItem("portfolio-theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
    set({ theme });
  },
  setCustomColors: (colors) => {
    localStorage.setItem("portfolio-custom-accent", colors.accent);
    localStorage.setItem("portfolio-custom-bg", colors.bg);
    localStorage.setItem("portfolio-custom-panel", colors.panel);
    
    document.documentElement.style.setProperty("--cyan", colors.accent);
    document.documentElement.style.setProperty("--bg", colors.bg);
    document.documentElement.style.setProperty("--panel", colors.panel);
    document.documentElement.style.setProperty("--panel-glass", `${colors.panel}d9`);
    
    set({ customColors: colors, theme: "custom" });
    document.documentElement.setAttribute("data-theme", "custom");
  },
}));
