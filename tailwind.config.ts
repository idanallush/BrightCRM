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
        sans: ["var(--font-almoni)", "system-ui", "-apple-system", "Segoe UI", "Arial", "sans-serif"],
      },
      fontSize: {
        "body-md": ["15px", { lineHeight: "1.55" }],
        "body-sm": ["14px", { lineHeight: "1.50" }],
        "caption": ["13px", { lineHeight: "1.40", fontWeight: "500" }],
        "button": ["14px", { lineHeight: "1.30", fontWeight: "600" }],
      },
      colors: {
        // Primary interactive blue (Miro-inspired)
        primary: { DEFAULT: "#4262FF", hover: "#3651D4", pressed: "#2B42B0" },
        // Accent: Canary yellow (Miro brand)
        accent: { DEFAULT: "#FFD02F", hover: "#F5C518" },
        // Text — deep navy ink
        ink: { DEFAULT: "#050038", hover: "#1A1A4E", secondary: "#6B6B82", muted: "#AEB0C0" },
        // Surface
        canvas: "#FFFFFF",
        surface: { DEFAULT: "#F7F7F8", soft: "#EDEDF0" },
        // Sidebar — deep dark navy
        sidebar: { DEFAULT: "#1B1B3A", hover: "#2A2A55", active: "#141430", border: "#3A3A60" },
        // Borders — softer
        border: "#E0E0E6",
        // Pastels (Miro feature cards)
        pastel: {
          rose: "#FFE4E8",
          coral: "#FFE0D0",
          teal: "#D0F0E8",
          yellow: "#FFF4CC",
          blue: "#DCE4FF",
          purple: "#EDE0FF",
        },
        // Status colors — kept functional (Monday.com-style)
        st: {
          waiting: "#FDAB3D",
          incoming: "#4262FF",
          working: "#A25DDC",
          approval: "#FFCB00",
          manager: "#FF642E",
          done: "#00C875",
          cancelled: "#C4C4C4",
        },
        // Health
        health: { good: "#00C875", strategy: "#FDAB3D", critical: "#E2445C" },
        // Semantic
        overdue: "#E2445C",
        success: "#00C875",
        warning: "#FDAB3D",
      },
      borderRadius: {
        "xl": "12px",
        "2xl": "16px",
        "3xl": "20px",
        "4xl": "24px",
      },
      boxShadow: {
        "sm": "0 1px 3px 0 rgba(5,0,56,0.04)",
        "elevation-1": "0 1px 3px 0 rgba(5,0,56,0.06)",
        "elevation-2": "0 2px 8px 0 rgba(5,0,56,0.08)",
        "elevation-3": "0 4px 16px 0 rgba(5,0,56,0.10)",
        "elevation-4": "0 8px 24px 0 rgba(5,0,56,0.12)",
        "elevation-5": "0 16px 48px 0 rgba(5,0,56,0.16)",
      },
      keyframes: {
        shimmer: { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
      },
      animation: { shimmer: "shimmer 1.5s ease-in-out infinite" },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
