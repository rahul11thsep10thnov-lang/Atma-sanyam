import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        forest: {
          DEFAULT: "#1F3B32",
          50: "#EAF0ED",
          100: "#CEDDD5",
          200: "#9FBBAC",
          300: "#709983",
          400: "#48765F",
          500: "#2F5A46",
          600: "#1F3B32", // primary
          700: "#182F28",
          800: "#11221D",
          900: "#0A1512"
        },
        saffron: {
          DEFAULT: "#E08A1E",
          50: "#FDF3E4",
          100: "#FBE4C2",
          200: "#F6C87F",
          300: "#F0AC49",
          400: "#E9992F",
          500: "#E08A1E", // primary accent
          600: "#B96E14",
          700: "#8C5410",
          800: "#5F390B",
          900: "#331F06"
        },
        terracotta: {
          DEFAULT: "#B45A3C",
          50: "#F6E7E0",
          100: "#EBC9B9",
          200: "#DBA189",
          300: "#CB7A5D",
          400: "#C06840",
          500: "#B45A3C",
          600: "#8F452F",
          700: "#6B3423",
          800: "#472318",
          900: "#24110C"
        },
        offwhite: "#FBF7F0",
        charcoal: {
          DEFAULT: "#211F1D",
          light: "#3A3733"
        }
      },
      fontFamily: {
        display: ["var(--font-playfair)", "Georgia", "serif"],
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"]
      },
      backgroundImage: {
        "diya-pattern": "radial-gradient(circle at 1px 1px, rgba(224,138,30,0.14) 1px, transparent 0)"
      },
      keyframes: {
        crossfade: {
          "0%": { opacity: "0" },
          "8%": { opacity: "var(--watermark-opacity, 0.12)" },
          "92%": { opacity: "var(--watermark-opacity, 0.12)" },
          "100%": { opacity: "0" }
        }
      }
    }
  },
  plugins: []
};

export default config;
