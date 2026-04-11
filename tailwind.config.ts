import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        wiki: {
          bg: "#0f1117",
          surface: "#1a1d2e",
          border: "#2a2d3e",
          text: "#e2e8f0",
          muted: "#64748b",
          accent: "#7c3aed",
          link: "#818cf8",
          "link-hover": "#a5b4fc",
        },
      },
      typography: {
        DEFAULT: {
          css: {
            color: "#e2e8f0",
            a: { color: "#818cf8" },
            "h1,h2,h3,h4": { color: "#f1f5f9" },
            code: { color: "#a78bfa", background: "#1e1b4b" },
            blockquote: { borderLeftColor: "#7c3aed", color: "#94a3b8" },
          },
        },
      },
    },
  },
  plugins: [typography],
};

export default config;
