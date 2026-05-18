import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Heebo",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Arial",
          "sans-serif",
        ],
      },
      colors: {
        ink: "#1d1d1f",
        parchment: "#f5f5f7",
        brand: {
          DEFAULT: "#0066cc",
          focus: "#0071e3",
        },
      },
    },
  },
  plugins: [],
};

export default config;
