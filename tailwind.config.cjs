module.exports = {
  content: ["./public/**/*.html", "./public/**/*.js"],
  theme: {
    extend: {
      colors: {
        app: {
          bg: "var(--bg)",
          panel: "var(--panel)",
          accent: "var(--cyan)",
          success: "var(--green)",
        },
      },
      boxShadow: {
        panel: "var(--shadow)",
      },
    },
  },
  plugins: [],
};
