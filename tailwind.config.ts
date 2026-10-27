import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      opacity: {
        8: "0.08",
        12: "0.12",
        15: "0.15",
        18: "0.18",
        22: "0.22",
        28: "0.28",
        32: "0.32",
        35: "0.35",
        38: "0.38",
        42: "0.42",
        45: "0.45",
        48: "0.48",
        52: "0.52",
        55: "0.55",
        58: "0.58",
        62: "0.62",
        65: "0.65",
        68: "0.68",
        72: "0.72",
        78: "0.78",
        82: "0.82",
        85: "0.85",
        88: "0.88",
        92: "0.92",
      },
      colors: {
        ink: {
          950: "#060a09",
          900: "#0a100f",
          850: "#0d1513",
          800: "#111b18",
          700: "#172420",
        },
        mint: {
          50: "#ecfff7",
          100: "#cffce8",
          300: "#6ff0ba",
          400: "#3ddc97",
          500: "#1fc27f",
          600: "#0f9d68",
          700: "#0c7a52",
        },
        sky: {
          400: "#5db9ff",
          500: "#2f9df0",
        },
        gold: "#ffcc66",
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        display: [
          "Avenir Next",
          "Sora",
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "IBM Plex Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(61,220,151,.18), 0 24px 80px -24px rgba(61,220,151,.35)",
        panel: "0 20px 60px -30px rgba(0,0,0,.8)",
      },
      backgroundImage: {
        "grid-mint":
          "linear-gradient(rgba(61,220,151,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(61,220,151,.06) 1px, transparent 1px)",
      },
      keyframes: {
        pulseSoft: {
          "0%, 100%": { opacity: "0.55" },
          "50%": { opacity: "1" },
        },
        floaty: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
      },
      animation: {
        pulseSoft: "pulseSoft 3s ease-in-out infinite",
        floaty: "floaty 7s ease-in-out infinite",
        shimmer: "shimmer 8s linear infinite",
        blink: "blink 1s step-end infinite",
      },
    },
  },
  plugins: [],
};

export default config;
