module.exports = {
  content: [
    "./src/client/**/*.{js,jsx,html}",
    "./public/**/*.{html,js}"
  ],
  darkMode: ["class", '[data-theme]'],
  theme: {
    extend: {
      colors: {
        app: {
          bg: "var(--bg)",
          sidebar: "var(--sidebar)",
          panel: "var(--panel)",
          "panel-2": "var(--panel-2)",
          accent: "var(--cyan)",
          blue: "var(--blue)",
          success: "var(--green)",
          danger: "var(--red)",
          gold: "var(--gold)",
          purple: "var(--purple)",
        },
      },
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", "SF Pro Display", "Outfit", "Inter", "sans-serif"],
        mono: ["SF Mono", "Fira Code", "Roboto Mono", "monospace"],
      },
      boxShadow: {
        panel: "var(--shadow-main)",
        glow: "var(--shadow-glow)",
        ceramic: "inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 12px 32px rgba(0, 0, 0, 0.4)",
      },
      borderRadius: {
        ceramic: "18px",
      },
    },
  },
  plugins: [],
};
