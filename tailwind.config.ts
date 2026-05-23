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
        display: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      colors: {
        // Cal.com adapted palette
        ink: { DEFAULT: "#111111", body: "#374151", muted: "#6b7280", soft: "#898989" },
        canvas: "#ffffff",
        surface: {
          DEFAULT: "#ffffff",
          soft: "#f8f9fa",
          card: "#f5f5f5",
          strong: "#e5e7eb",
          dark: "#101010",
          "dark-elevated": "#1a1a1a",
        },
        hairline: { DEFAULT: "#e5e7eb", soft: "#f3f4f6" },
        primary: { DEFAULT: "#111111", active: "#242424" },
        accent: "#3b82f6",
        // Status colors
        status: {
          active: "#3b82f6",
          done: "#10b981",
          closed: "#9ca3af",
          overdue: "#ef4444",
          warning: "#f59e0b",
        },
        // Badge pastels
        badge: {
          orange: "#fb923c",
          pink: "#ec4899",
          violet: "#8b5cf6",
          emerald: "#34d399",
        },
      },
      borderRadius: {
        xs: "4px",
        sm: "6px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        pill: "9999px",
      },
      boxShadow: {
        subtle: "0 1px 2px rgba(0,0,0,0.05)",
        card: "0 1px 2px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.08)",
        "card-hover": "0 4px 12px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.06)",
      },
      spacing: {
        "section": "96px",
      },
      letterSpacing: {
        display: "-0.04em",
        "display-tight": "-0.03em",
      },
    },
  },
  plugins: [],
};

export default config;
