import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        board: {
          bg: "#fdfdfb",
          border: "#e5e2d8",
        },
      },
    },
  },
  plugins: [],
};

export default config;
