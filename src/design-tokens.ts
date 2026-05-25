/**
 * Design Tokens - Single Source of Truth
 *
 * This file contains all design tokens for the application.
 * CSS variables are derived from these tokens and injected during SSR.
 *
 * @example
 * // Import specific token categories
 * import { brandColors, statusColors } from "@/design-tokens";
 *
 * // Use in components
 * const bgColor = brandColors.primary;
 *
 * // CSS variables are automatically available in styles
 * className="bg-primary text-primary-foreground"
 */

// ============================================================================
// COLOR TOKENS
// ============================================================================

/**
 * Brand Colors - Primary brand identity colors
 */
export const brandColors = {
  primary: "#e8512c",
  secondary: "#dda140",
  accent: "#31ebf2",
  neutral: "#ac9a91",
} as const;

/**
 * Status Colors - Semantic feedback colors
 */
export const statusColors = {
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
} as const;

/**
 * Surface Colors - Background and surface colors
 */
export const surfaceColors = {
  background: "#171312",
  surface: "#231d1a",
} as const;

/**
 * Text Colors - Typography colors
 */
export const textColors = {
  primary: "#edeae9",
  secondary: "#bab0ab",
} as const;

/**
 * Border Colors - Border and divider colors
 */
export const borderColors = {
  default: "#473a33",
} as const;

// ============================================================================
// RADIUS TOKENS
// ============================================================================

/**
 * Border Radius Scale
 */
export const radii = {
  sm: "0.5rem",
  md: "0.65rem",
  lg: "0.75rem",
  xl: "1.5rem",
  pill: "9999px",
} as const;

// ============================================================================
// SPACING TOKENS
// ============================================================================

/**
 * Spacing Scale - Layout spacing tokens
 */
export const spacing = {
  pageMaxWidth: "1280px",
  sectionPadding: {
    desktop: "6rem",
    mobile: "4rem",
  },
  containerPadding: {
    desktop: "2rem",
    mobile: "1rem",
  },
} as const;

// ============================================================================
// EFFECT TOKENS
// ============================================================================

/**
 * Shadow Effects - Box shadow scale with brand tint
 * Using primary brand color (#7c3aed) for subtle brand consistency
 */
export const shadows = {
  sm: "0 2px 8px rgba(124, 58, 237, 0.1)",
  md: "0 4px 16px rgba(124, 58, 237, 0.12)",
  lg: "0 8px 32px rgba(124, 58, 237, 0.15)",
  xl: "0 16px 48px rgba(124, 58, 237, 0.2)",
} as const;

/**
 * Line Height Scale
 */
export const lineHeights = {
  tight: "1.25",
  normal: "1.5",
  relaxed: "1.75",
} as const;

/**
 * Animation Durations - Timing scale for transitions and animations
 */
export const durations = {
  fast: "0.1s",
  normal: "0.3s",
  slow: "0.6s",
} as const;

// ============================================================================
// TYPOGRAPHY TOKENS
// ============================================================================

export type FontFamilyToken = {
  family: string;
  fallbacks: string[];
  subsets: string[];
  weights: string[];
  styles?: ("normal" | "italic")[];
};

/**
 * Font Family Tokens
 *
 * IMPORTANT: Changing fonts is a TWO-STEP process:
 * 1. Update the font configuration below (family, weights, styles, etc.)
 * 2. Update src/lib/typography/next-fonts.ts:
 *    - Import the new font from "next/font/google"
 *    - Initialize it with the same configuration
 *    - Update getTypographyVariableClasses() to include it
 * Then rebuild
 */
export const fonts = {
  primary: {
    family: "Inter",
    fallbacks: ["sans-serif"],
    subsets: ["latin"],
    weights: ["400", "500", "700"],
  },
  secondary: {
    family: "Poppins",
    fallbacks: ["sans-serif"],
    subsets: ["latin"],
    weights: ["400", "600", "700"],
  },
} as const;
