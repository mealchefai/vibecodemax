import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // shadcn semantic colors (used by shadcn components)
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",

        // Additional token colors for custom components
        neutral: "var(--token-neutral)",
        success: "var(--token-success)",
        warning: "var(--token-warning)",
        danger: "var(--token-danger)",
        surface: "var(--token-surface)",
        text: {
          primary: "var(--token-text-primary)",
          secondary: "var(--token-text-secondary)",
        },
      },
      fontFamily: {
        primary: "var(--token-font-primary)",
        secondary: "var(--token-font-secondary)",
        sans: "var(--token-font-primary)",
        heading: "var(--token-font-secondary)",
      },
      fontSize: {
        xs: "0.75rem",
        sm: "0.875rem",
        base: "1rem",
        lg: "1.125rem",
        xl: "1.25rem",
        "2xl": "1.5rem",
        "3xl": "1.875rem",
        "4xl": "2.25rem",
        "5xl": "3rem",
        "6xl": "3.75rem",
      },
      fontWeight: {
        normal: "400",
        medium: "500",
        semibold: "600",
        bold: "700",
        extrabold: "800",
      },
      lineHeight: {
        tight: "var(--token-line-height-tight)",
        normal: "var(--token-line-height-normal)",
        relaxed: "var(--token-line-height-relaxed)",
      },
      letterSpacing: {
        tight: "-0.025em",
        normal: "0",
        wide: "0.025em",
      },
      borderRadius: {
        // Canonical token radii
        sm: "var(--token-radius-sm)",
        DEFAULT: "var(--token-radius-md)",
        md: "var(--token-radius-md)",
        lg: "var(--token-radius-lg)",
        xl: "var(--token-radius-xl)",
        pill: "var(--token-radius-pill)",
        // shadcn semantic radius
        radius: "var(--radius)",
      },
      boxShadow: {
        sm: "none",
        DEFAULT: "none",
        md: "none",
        lg: "none",
        xl: "none",
      },
      maxWidth: {
        page: "var(--token-spacing-page-max-width)",
      },
      spacing: {
        section: "var(--token-spacing-section)",
        "section-mobile": "var(--token-spacing-section-mobile)",
        container: "var(--token-spacing-container)",
        "container-mobile": "var(--token-spacing-container-mobile)",
      },

      animation: {
        "fade-in": "fadeIn 0.5s ease-in-out",
        "slide-in": "slideIn 0.5s ease-out",
        "scale-in": "scaleIn 0.3s ease-out",
        shimmer: "shimmer 2s infinite",
        gradient: "gradient 8s ease infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideIn: {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        scaleIn: {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        gradient: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
