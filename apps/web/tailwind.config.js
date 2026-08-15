export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        pitch: {
          DEFAULT: "#0b3d24",
          light: "#0f5030",
          line: "rgba(255,255,255,0.55)",
        },
        surface: {
          DEFAULT: "#0f1115",
          raised: "#161923",
          border: "#242835",
        },
        accent: {
          DEFAULT: "#38bdf8",
          amber: "#f59e0b",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
