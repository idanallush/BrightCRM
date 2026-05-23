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
      fontSize: {
        body: ["15px", "1.6"],
        caption: ["13px", "1.4"],
      },
      colors: {
        // Text
        ink: { DEFAULT: "#111827", secondary: "#6b7280", muted: "#9ca3af" },
        // Surfaces
        canvas: "#ffffff",
        surface: {
          DEFAULT: "#ffffff",
          bg: "#f8f9fa",
          hover: "#f3f4f6",
        },
        // Primary action
        brand: {
          DEFAULT: "#2563eb",
          hover: "#1d4ed8",
          light: "#eff6ff",
        },
        // Borders
        border: { DEFAULT: "#e5e7eb", hover: "#d1d5db" },
        // Status — per status, with bg variant
        "st-waiting":   { DEFAULT: "#f59e0b", bg: "#fffbeb" },
        "st-incoming":  { DEFAULT: "#3b82f6", bg: "#eff6ff" },
        "st-working":   { DEFAULT: "#8b5cf6", bg: "#f5f3ff" },
        "st-approval":  { DEFAULT: "#f97316", bg: "#fff7ed" },
        "st-manager":   { DEFAULT: "#ec4899", bg: "#fdf2f8" },
        "st-done":      { DEFAULT: "#22c55e", bg: "#f0fdf4" },
        "st-cancelled": { DEFAULT: "#6b7280", bg: "#f9fafb" },
        // Semantic
        overdue: { DEFAULT: "#ef4444", bg: "#fef2f2" },
        success: { DEFAULT: "#22c55e", bg: "#f0fdf4" },
        warning: { DEFAULT: "#f59e0b", bg: "#fffbeb" },
        // Health
        health: {
          good: "#22c55e",
          strategy: "#f59e0b",
          critical: "#ef4444",
        },
      },
      borderRadius: {
        lg: "0.75rem",
        xl: "1rem",
      },
      boxShadow: {
        sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        card: "0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)",
        "card-hover": "0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.05)",
        overlay: "0 8px 30px rgb(0 0 0 / 0.12)",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        shimmer: "shimmer 1.5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
