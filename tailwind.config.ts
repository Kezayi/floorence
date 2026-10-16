import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: {
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1200px",
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        memorial: {
          dark: "hsl(var(--memorial-dark))",
          "dark-foreground": "hsl(var(--memorial-dark-foreground))",
          "dark-muted": "hsl(var(--memorial-dark-muted))",
          anthracite: "hsl(var(--memorial-anthracite))",
          "anthracite-foreground": "hsl(var(--memorial-anthracite-foreground))",
        },
        ivory: "hsl(var(--ivory))",
        footer: { DEFAULT: "hsl(var(--footer-bg))", foreground: "hsl(var(--footer-foreground))", muted: "hsl(var(--footer-muted))" },
        champagne: { DEFAULT: "hsl(var(--champagne))", foreground: "hsl(var(--champagne-foreground))" },
        sage: { DEFAULT: "hsl(var(--sage))", foreground: "hsl(var(--sage-foreground))" },
        "scene-ink": {
          DEFAULT: "hsl(var(--scene-ink))",
          foreground: "hsl(var(--scene-ink-foreground))",
        },
        candle: {
          glow: "hsl(var(--candle-glow))",
        },
        flower: {
          soft: "hsl(var(--flower-soft))",
        },
        admin: {
          burgundy: "hsl(var(--admin-burgundy))",
        },
        "accent-green": {
          DEFAULT: "hsl(var(--accent-green))",
          foreground: "hsl(var(--accent-green-foreground))",
        },
        "ai-gold": {
          DEFAULT: "hsl(var(--ai-gold))",
          foreground: "hsl(var(--ai-gold-foreground))",
          accent: "hsl(var(--ai-gold-accent))",
        },
        "gesture-candle": "hsl(var(--gesture-candle))",
        "gesture-flower": "hsl(var(--gesture-flower))",
        lineage: {
          direct: "hsl(var(--lineage-direct))",
          extended: "hsl(var(--lineage-extended))",
          alliance: "hsl(var(--lineage-alliance))",
          connector: "hsl(var(--lineage-connector))",
        },
        livreor: {
          DEFAULT: "hsl(var(--livreor-bg))",
          foreground: "hsl(var(--livreor-foreground))",
          muted: "hsl(var(--livreor-muted))",
        },
        hommages: {
          DEFAULT: "hsl(var(--hommages-bg))",
          foreground: "hsl(var(--hommages-foreground))",
          muted: "hsl(var(--hommages-muted))",
        },
        submit: {
          free: "hsl(var(--submit-free))",
          "free-hover": "hsl(var(--submit-free-hover))",
          paid: "hsl(var(--submit-paid))",
          "paid-hover": "hsl(var(--submit-paid-hover))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-slow": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(24px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "grow-up": {
          from: { transform: "scaleY(0)", opacity: "0" },
          to: { transform: "scaleY(1)", opacity: "1" },
        },
        "germinate": {
          "0%": { opacity: "0", transform: "translateY(20px) scale(0.9)" },
          "60%": { opacity: "1", transform: "translateY(-4px) scale(1.02)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.6s ease-out forwards",
        "fade-in-slow": "fade-in-slow 1.2s ease-out forwards",
        "slide-up": "slide-up 0.8s ease-out forwards",
        "grow-up": "grow-up 1.4s ease-out forwards",
        "germinate": "germinate 0.8s ease-out forwards",
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
