module.exports = {
  content: [
    "./src/client/**/*.{js,jsx,html}",
    "./public/**/*.{html,js}"
  ],
  darkMode: ["class", '[data-theme]'],
  theme: {
    extend: {
      gridTemplateColumns: {
        '5': 'repeat(5, minmax(0, 1fr))',
        '10': 'repeat(10, minmax(0, 1fr))',
        '15': 'repeat(15, minmax(0, 1fr))',
        '20': 'repeat(20, minmax(0, 1fr))',
      },
      colors: {
        app: {
          bg: "var(--bg)",
          card: "var(--card)",
          "card-elevated": "var(--card-elevated)",
          sidebar: "var(--sidebar)",
          panel: "var(--panel)",
          "panel-2": "var(--panel-2)",
          border: "var(--line)",
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
