import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        bg: "#05070f",
        panel: "#0f1629",
        panelSoft: "#131d35",
        accent: "#36d8ff",
        mint: "#55f5b5",
        amber: "#f2c14f",
        danger: "#ff5d7d"
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(95, 208, 255, 0.2), 0 24px 80px rgba(0, 0, 0, 0.55)"
      },
      backgroundImage: {
        "hero-grid": "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.06) 1px, transparent 0)"
      }
    }
  },
  plugins: []
};

export default config;
