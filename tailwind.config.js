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
          bg: "#0d0d0d",
          panel: "#161616",
          panel2: "#1e1e1e",
          border: "#2a2a2a",
          red: "#e11d2e",
          redDark: "#b3121f",
          text: "#f2f2f2",
          muted: "#9a9a9a",
        },
      },
      fontFamily: {
        display: ["Poppins", "sans-serif"],
        body: ["Inter", "sans-serif"],
      },
      borderRadius: {
        xl2: "1rem",
      },
    },
  },
  plugins: [],
};
