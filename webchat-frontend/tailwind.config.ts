import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        obsidian: {
          900: "#141925",
          800: "#1A2030",
          700: "#212838",
          600: "#111621",
          500: "#2A3344",
        },
        text: {
          primary: "#E6EAF2",
          secondary: "#9AA4B2",
          muted: "#6B7280",
        },
        accent: {
          cyan: "#5EEAD4",
          violet: "#A78BFA",
          amber: "#F6C177",
          rose: "#F38BA8",
        },
        semantic: {
          success: "#6EE7B7",
          danger: "#FB7185",
          warning: "#FBBF24",
          info: "#67E8F9",
        },
      },
      backgroundColor: {
        base: "var(--bg-base)",
        elevated: "var(--bg-elevated)",
        floating: "var(--bg-floating)",
        sidebar: "var(--bg-sidebar)",
        card: "var(--bg-card)",
      },
      textColor: {
        primary: "var(--text-primary)",
        secondary: "var(--text-secondary)",
        muted: "var(--text-muted)",
      },
      borderRadius: {
        chat: "22px",
        "chat-sm": "16px",
        "chat-lg": "28px",
      },
      fontFamily: {
        sans: ["General Sans", "Plus Jakarta Sans", "system-ui", "sans-serif"],
      },
      letterSpacing: {
        tight: "-0.01em",
      },
      lineHeight: {
        relaxed: "1.6",
      },
      boxShadow: {
        "glow-cyan": "0 0 20px rgba(94, 234, 212, 0.12)",
        "glow-violet": "0 0 20px rgba(167, 139, 250, 0.12)",
        "glow-rose": "0 0 20px rgba(243, 139, 168, 0.12)",
        "elevation-1": "0 2px 8px rgba(0, 0, 0, 0.16)",
        "elevation-2": "0 4px 16px rgba(0, 0, 0, 0.20)",
        "elevation-3": "0 8px 24px rgba(0, 0, 0, 0.24)",
        "inner-cyan": "inset 0 0 1px rgba(94, 234, 212, 0.2)",
        "inner-violet": "inset 0 0 1px rgba(167, 139, 250, 0.2)",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideDown: {
          "0%": { opacity: "0", transform: "translateY(-4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
      },
      animation: {
        "fade-in": "fadeIn 0.2s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
        "slide-down": "slideDown 0.3s ease-out",
        "pulse-subtle": "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
