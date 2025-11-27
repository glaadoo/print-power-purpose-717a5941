import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
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
        mascot: {
          bg: "hsl(var(--mascot-bg))",
          text: "hsl(var(--mascot-text))",
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
        "text-on-dark": "hsl(var(--text-on-dark))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        wiggle: {
          "0%, 100%": { transform: "rotate(-12deg)" },
          "50%": { transform: "rotate(12deg)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "kenzie-bounce": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        "puppy-excited": {
          "0%, 100%": { transform: "translateY(0) rotate(0deg)" },
          "25%": { transform: "translateY(-4px) rotate(-1deg)" },
          "50%": { transform: "translateY(0) rotate(0deg)" },
          "75%": { transform: "translateY(-4px) rotate(1deg)" },
        },
        "tail-wag": {
          "0%, 100%": { transform: "translateX(-4px) rotate(-15deg)" },
          "50%": { transform: "translateX(4px) rotate(15deg)" },
        },
        "sparkle-tail": {
          "0%, 100%": { opacity: "1", transform: "scale(1) rotate(0deg)" },
          "50%": { opacity: "0.6", transform: "scale(1.2) rotate(180deg)" },
        },
        "paw-appear": {
          "0%": { opacity: "0", transform: "scale(0.5) translateY(0)" },
          "20%": { opacity: "0.6", transform: "scale(1) translateY(-5px)" },
          "80%": { opacity: "0.6", transform: "scale(1) translateY(-5px)" },
          "100%": { opacity: "0", transform: "scale(0.5) translateY(-10px)" },
        },
        "dust-puff": {
          "0%": { opacity: "0", transform: "scale(0.3) translateY(0)" },
          "30%": { opacity: "0.5", transform: "scale(1) translateY(-8px)" },
          "70%": { opacity: "0.3", transform: "scale(1.3) translateY(-12px)" },
          "100%": { opacity: "0", transform: "scale(1.5) translateY(-16px)" },
        },
        "dust-spread": {
          "0%": { opacity: "0", transform: "scale(0.5) translateX(0)" },
          "40%": { opacity: "0.4", transform: "scale(1) translateX(-5px)" },
          "100%": { opacity: "0", transform: "scale(0.8) translateX(-15px)" },
        },
        "puppy-bounce": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        "paw-walk": {
          "0%": { opacity: "0", transform: "scale(0.3) translateY(10px)" },
          "15%": { opacity: "0.7", transform: "scale(1) translateY(0)" },
          "70%": { opacity: "0.5", transform: "scale(1) translateY(-5px)" },
          "100%": { opacity: "0", transform: "scale(0.8) translateY(-15px)" },
        },
        "paw-walk-horizontal": {
          "0%": { opacity: "0", transform: "scale(0.5) translateX(20px)" },
          "20%": { opacity: "0.7", transform: "scale(1) translateX(0)" },
          "80%": { opacity: "0.4", transform: "scale(0.9) translateX(-30px)" },
          "100%": { opacity: "0", transform: "scale(0.7) translateX(-50px)" },
        },
        "butterfly": {
          "0%, 100%": { transform: "translateY(0) translateX(0) rotate(0deg)" },
          "25%": { transform: "translateY(-10px) translateX(8px) rotate(5deg)" },
          "50%": { transform: "translateY(-5px) translateX(-5px) rotate(-3deg)" },
          "75%": { transform: "translateY(-15px) translateX(3px) rotate(8deg)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        wiggle: "wiggle 0.3s ease-in-out infinite",
        float: "float 2s ease-in-out infinite",
        "fade-in": "fade-in 0.5s ease-out forwards",
        "kenzie-bounce": "kenzie-bounce 2s ease-in-out infinite",
        "tail-wag": "tail-wag 0.4s ease-in-out infinite",
        "sparkle-tail": "sparkle-tail 0.6s ease-in-out infinite",
        "paw-appear": "paw-appear 1.2s ease-in-out infinite",
        "dust-puff": "dust-puff 0.8s ease-out infinite",
        "dust-spread": "dust-spread 0.6s ease-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
