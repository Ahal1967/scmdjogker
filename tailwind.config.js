/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        djoker: {
          // Disambungkan ke CSS variable di globals.css, bukan hex tetap,
          // supaya otomatis ikut berubah waktu class "dark" aktif.
          bg: "var(--djoker-bg)",
          panel: "var(--djoker-surface)",
          panel2: "var(--djoker-surface-2)",
          border: "var(--djoker-border)",
          red: "var(--djoker-blue)",
          redDark: "var(--djoker-blue-dark)",
          text: "var(--djoker-text)",
          muted: "var(--djoker-muted)",
        },
      },
      fontFamily: {
        display: ["var(--font-inter)", "sans-serif"],
        body: ["var(--font-inter)", "sans-serif"],
      },
      borderRadius: {
        xl2: "1rem",
      },
    },
  },
  plugins: [],
};
