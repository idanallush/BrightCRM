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
        sans: ["Figtree", "Heebo", "system-ui", "-apple-system", "Segoe UI", "Arial", "sans-serif"],
      },
      fontSize: {
        "body-md": ["15px", { lineHeight: "1.55" }],
        "body-sm": ["14px", { lineHeight: "1.50" }],
        "caption": ["13px", { lineHeight: "1.40", fontWeight: "500" }],
        "button": ["14px", { lineHeight: "1.30", fontWeight: "500" }],
      },
      colors: {
        // Monday.com blue
        primary: { DEFAULT: "#0073EA", hover: "#0060C2", pressed: "#004DA6" },
        // Accent: Bright yellow (logo only)
        accent: { DEFAULT: "#FFDF4F", hover: "#f5d43a" },
        // Text — Monday.com ink
        ink: { DEFAULT: "#323338", secondary: "#676879", muted: "#C5C7D0" },
        // Surface
        canvas: "#FFFFFF",
        surface: { DEFAULT: "#F6F7FB", soft: "#F0F1F5" },
        // Borders
        border: "#E6E9EF",
        // Status colors — Monday.com full-cell backgrounds
        st: {
          waiting: "#FDAB3D",
          incoming: "#0073EA",
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
      boxShadow: {
        sm: "0 1px 4px 0 rgb(0 0 0 / 0.06)",
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
