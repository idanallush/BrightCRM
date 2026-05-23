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
        sans: ["Heebo", "system-ui", "-apple-system", "Segoe UI", "Arial", "sans-serif"],
      },
      fontSize: {
        "body-md": ["15px", { lineHeight: "1.55" }],
        "body-sm": ["14px", { lineHeight: "1.50" }],
        "caption": ["13px", { lineHeight: "1.40", fontWeight: "500" }],
        "button": ["14px", { lineHeight: "1.30", fontWeight: "500" }],
      },
      colors: {
        // Primary: near-black
        primary: { DEFAULT: "#1A1A1A", hover: "#333333" },
        // Accent: Bright yellow
        accent: { DEFAULT: "#FFDF4F", hover: "#f5d43a" },
        // Links
        link: "#0077D4",
        // Text
        ink: { DEFAULT: "#1A1A1A", secondary: "#6B7280", muted: "#9CA3AF" },
        // Surface — flat, clean
        canvas: "#FFFFFF",
        surface: { DEFAULT: "#F9FAFB", soft: "#F3F4F6" },
        // Borders — 1px only
        border: "#E5E7EB",
        // Status dot colors (dark, saturated — for dots only)
        dot: {
          waiting: "#D29B00",
          incoming: "#2E7CF6",
          working: "#6B3FC5",
          approval: "#D55B00",
          manager: "#C84B8B",
          done: "#0F9549",
          cancelled: "#8C8C8C",
          overdue: "#DC2626",
        },
        // Health
        health: { good: "#0F9549", strategy: "#D29B00", critical: "#DC2626" },
        // Semantic
        overdue: "#DC2626",
      },
      boxShadow: {
        // Minimal shadows — Monday.com flat style
        sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
      },
      keyframes: {
        shimmer: { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
      },
      animation: { shimmer: "shimmer 1.5s ease-in-out infinite" },
    },
  },
  plugins: [],
};

export default config;
