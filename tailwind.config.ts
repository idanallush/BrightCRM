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
        ink: { DEFAULT: "#111827", muted: "#6b7280" },
        surface: { DEFAULT: "#ffffff", bg: "#f8f9fb" },
        brand: {
          DEFAULT: "#2563eb",
          light: "#dbeafe",
          focus: "#1d4ed8",
        },
        status: {
          active: "#2563eb",
          done: "#16a34a",
          closed: "#9ca3af",
          overdue: "#dc2626",
          warning: "#f59e0b",
        },
      },
      borderRadius: {
        xl: "0.75rem",
        "2xl": "1rem",
      },
      boxShadow: {
        card: "0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.04)",
        "card-hover":
          "0 4px 6px -1px rgb(0 0 0 / 0.06), 0 2px 4px -2px rgb(0 0 0 / 0.04)",
      },
    },
  },
  plugins: [],
};

export default config;
