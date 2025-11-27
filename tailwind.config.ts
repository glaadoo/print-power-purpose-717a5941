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
        "butterfly-orbit": {
          "0%": { transform: "translateX(0) translateY(0) rotate(0deg)" },
          "25%": { transform: "translateX(10px) translateY(-8px) rotate(8deg)" },
          "50%": { transform: "translateX(3px) translateY(6px) rotate(-4deg)" },
          "75%": { transform: "translateX(-8px) translateY(-4px) rotate(6deg)" },
          "100%": { transform: "translateX(0) translateY(0) rotate(0deg)" },
        },
        "wing-flap": {
          "0%": { transform: "scaleX(1) rotateY(0deg)" },
          "25%": { transform: "scaleX(0.4) rotateY(60deg)" },
          "50%": { transform: "scaleX(1) rotateY(0deg)" },
          "75%": { transform: "scaleX(0.4) rotateY(-60deg)" },
          "100%": { transform: "scaleX(1) rotateY(0deg)" },
        },
        "wing-flap-blur": {
          "0%": { transform: "scaleX(1.1) translateX(-2px)" },
          "25%": { transform: "scaleX(0.5) translateX(2px)" },
          "50%": { transform: "scaleX(1.1) translateX(-2px)" },
          "75%": { transform: "scaleX(0.5) translateX(2px)" },
          "100%": { transform: "scaleX(1.1) translateX(-2px)" },
        },
        "butterfly-land": {
          "0%": { transform: "translateX(-30px) translateY(-20px)" },
          "15%": { transform: "translateX(-10px) translateY(-10px)" },
          "25%": { transform: "translateX(0) translateY(0)" },
          "55%": { transform: "translateX(0) translateY(0)" },
          "70%": { transform: "translateX(15px) translateY(-15px)" },
          "85%": { transform: "translateX(25px) translateY(-25px)" },
          "100%": { transform: "translateX(-30px) translateY(-20px)" },
        },
        "wing-flap-land": {
          "0%, 15%": { transform: "scaleX(0.4) rotateY(60deg)" },
          "16%, 17%": { transform: "scaleX(1) rotateY(0deg)" },
          "18%, 19%": { transform: "scaleX(0.4) rotateY(-60deg)" },
          "20%, 21%": { transform: "scaleX(1) rotateY(0deg)" },
          "22%, 24%": { transform: "scaleX(0.4) rotateY(60deg)" },
          "25%, 55%": { transform: "scaleX(1) rotateY(0deg)" },
          "56%, 57%": { transform: "scaleX(0.4) rotateY(60deg)" },
          "58%, 59%": { transform: "scaleX(1) rotateY(0deg)" },
          "60%, 100%": { transform: "scaleX(0.4) rotateY(60deg)" },
        },
        "sparkle": {
          "0%, 100%": { opacity: "0", transform: "scale(0.5) rotate(0deg)" },
          "50%": { opacity: "1", transform: "scale(1.2) rotate(180deg)" },
        },
        "paw-float": {
          "0%, 100%": { transform: "translateY(0) translateX(0)", opacity: "0.7" },
          "25%": { transform: "translateY(-8px) translateX(3px)", opacity: "1" },
          "50%": { transform: "translateY(-4px) translateX(-2px)", opacity: "0.9" },
          "75%": { transform: "translateY(-10px) translateX(2px)", opacity: "1" },
        },
        "paw-wiggle": {
          "0%, 100%": { transform: "rotate(0deg) scale(1)" },
          "20%": { transform: "rotate(-15deg) scale(1.1)" },
          "40%": { transform: "rotate(10deg) scale(0.95)" },
          "60%": { transform: "rotate(-8deg) scale(1.05)" },
          "80%": { transform: "rotate(12deg) scale(1)" },
        },
        "paw-pop": {
          "0%, 100%": { transform: "scale(1)", opacity: "0.8" },
          "30%": { transform: "scale(1.3)", opacity: "1" },
          "50%": { transform: "scale(0.9)", opacity: "0.6" },
          "70%": { transform: "scale(1.15)", opacity: "1" },
        },
        "paw-dance": {
          "0%, 100%": { transform: "translateX(0) translateY(0) rotate(0deg)" },
          "25%": { transform: "translateX(5px) translateY(-5px) rotate(10deg)" },
          "50%": { transform: "translateX(-3px) translateY(3px) rotate(-8deg)" },
          "75%": { transform: "translateX(4px) translateY(-2px) rotate(5deg)" },
        },
        "paw-bounce": {
          "0%, 100%": { transform: "translateY(0) scale(1)", opacity: "0.7" },
          "50%": { transform: "translateY(-12px) scale(1.2)", opacity: "1" },
        },
        "draw-line": {
          "0%": { strokeDasharray: "100", strokeDashoffset: "100" },
          "100%": { strokeDasharray: "100", strokeDashoffset: "0" },
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
