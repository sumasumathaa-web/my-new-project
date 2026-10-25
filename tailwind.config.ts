import type { Config } from "tailwindcss";

/**
 * Premium wedding design tokens.
 * Palette: ivory + champagne backgrounds, muted gold accents,
 * deep burgundy + charcoal details.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ivory: "#FAF7F1",
        champagne: "#F3EAD9",
        cream: "#FFFDF8",
        gold: {
          DEFAULT: "#B08D57",
          light: "#D6C2A0",
          dark: "#8F6F42",
        },
        burgundy: {
          DEFAULT: "#6E1E2C",
          dark: "#571622",
          light: "#8A2E3F",
        },
        charcoal: {
          DEFAULT: "#2B2622",
          soft: "#4A423B",
          muted: "#7A7066",
        },
        sage: "#8B9183",
      },
      fontFamily: {
        serif: ["Georgia", "'Times New Roman'", "ui-serif", "serif"],
        sans: ["-apple-system", "BlinkMacSystemFont", "'Segoe UI'", "Roboto", "Arial", "sans-serif"],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(43,38,34,0.06), 0 8px 24px rgba(43,38,34,0.08)",
        card: "0 1px 2px rgba(43,38,34,0.05), 0 4px 14px rgba(43,38,34,0.07)",
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.25rem",
      },
      letterSpacing: {
        widest2: "0.22em",
      },
    },
  },
  plugins: [],
};

export default config;
