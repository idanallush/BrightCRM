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
        sans: ["Inter", "-apple-system", "system-ui", "Segoe UI", "Helvetica", "sans-serif"],
      },
      fontSize: {
        "display-lg": ["56px", { lineHeight: "1.10", letterSpacing: "-1px", fontWeight: "600" }],
        "heading-1": ["48px", { lineHeight: "1.15", letterSpacing: "-0.5px", fontWeight: "600" }],
        "heading-2": ["36px", { lineHeight: "1.20", letterSpacing: "-0.5px", fontWeight: "600" }],
        "heading-3": ["28px", { lineHeight: "1.25", fontWeight: "600" }],
        "heading-4": ["22px", { lineHeight: "1.30", fontWeight: "600" }],
        "heading-5": ["18px", { lineHeight: "1.40", fontWeight: "600" }],
        "body-md": ["16px", { lineHeight: "1.55", fontWeight: "400" }],
        "body-sm": ["14px", { lineHeight: "1.50", fontWeight: "400" }],
        "caption": ["13px", { lineHeight: "1.40", fontWeight: "600" }],
        "button": ["14px", { lineHeight: "1.30", fontWeight: "500" }],
      },
      colors: {
        // Notion primary
        primary: { DEFAULT: "#6C3FC5", pressed: "#5B34A8", deep: "#4A2A8C" },
        // Navy
        navy: { DEFAULT: "#191919", deep: "#111111", mid: "#2D2D2D" },
        // Links
        link: { DEFAULT: "#0077D4", pressed: "#005FA3" },

        // Text
        ink: { DEFAULT: "#37352F", deep: "#000000", charcoal: "#37352F" },
        slate: "#787774",
        steel: "#9B9A97",
        stone: "#B4B4B0",
        muted: "#CFCDC9",

        // Surface
        canvas: "#FFFFFF",
        surface: { DEFAULT: "#F7F6F3", soft: "#FBFBFA" },
        hairline: { DEFAULT: "#E3E2DE", soft: "#F1F0EC", strong: "#DBDAD6" },

        // Card tints (Notion pastel palette)
        tint: {
          peach: "#FDECC8",
          rose: "#F5E0E9",
          mint: "#DBEDDB",
          lavender: "#E8DEEE",
          sky: "#D3E5EF",
          yellow: "#FBF3DB",
          "yellow-bold": "#F5C518",
          cream: "#EBE4D2",
          gray: "#E3E2DE",
        },

        // Brand spectrum
        "b-pink": { DEFAULT: "#E9528B", deep: "#C7417A" },
        "b-orange": { DEFAULT: "#D97706", deep: "#9A3412" },
        "b-purple": { DEFAULT: "#9B59B6", 300: "#C4B5FD", 800: "#553C9A" },
        "b-teal": "#0F766E",
        "b-green": "#0F9D58",
        "b-yellow": "#F5C518",

        // Status — per status, using Notion-style tints
        "st-waiting":   { DEFAULT: "#D97706", bg: "#FBF3DB" },
        "st-incoming":  { DEFAULT: "#0077D4", bg: "#D3E5EF" },
        "st-working":   { DEFAULT: "#6C3FC5", bg: "#E8DEEE" },
        "st-approval":  { DEFAULT: "#D97706", bg: "#FDECC8" },
        "st-manager":   { DEFAULT: "#E9528B", bg: "#F5E0E9" },
        "st-done":      { DEFAULT: "#0F9D58", bg: "#DBEDDB" },
        "st-cancelled": { DEFAULT: "#787774", bg: "#F1F0EC" },

        // Semantic
        overdue:  { DEFAULT: "#E03E3E", bg: "#FDECEA" },
        success:  { DEFAULT: "#0F9D58", bg: "#DBEDDB" },
        warning:  { DEFAULT: "#D97706", bg: "#FBF3DB" },

        // Legacy compat aliases
        brand: { DEFAULT: "#6C3FC5", hover: "#5B34A8", light: "#E8DEEE" },
        border: { DEFAULT: "#E3E2DE", hover: "#DBDAD6" },
        "ink-secondary": "#787774",
        "ink-muted": "#9B9A97",
      },
      borderRadius: {
        xs: "4px",
        sm: "6px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        "2xl": "20px",
        "3xl": "24px",
      },
      boxShadow: {
        subtle: "rgba(15,15,15,0.04) 0px 1px 2px 0px",
        card: "rgba(15,15,15,0.08) 0px 4px 12px 0px",
        mockup: "rgba(15,15,15,0.20) 0px 24px 48px -8px",
        modal: "rgba(15,15,15,0.16) 0px 16px 48px -8px",
        "card-hover": "rgba(15,15,15,0.12) 0px 8px 24px 0px",
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
