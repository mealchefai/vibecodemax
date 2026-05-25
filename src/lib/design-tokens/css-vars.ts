import {
  brandColors,
  statusColors,
  surfaceColors,
  textColors,
  borderColors,
  radii,
  spacing,
  shadows,
  lineHeights,
  durations,
} from "@/design-tokens";

/**
 * Generates CSS custom properties from design tokens.
 *
 * This function is safe to run on the server (no document access).
 * The derived CSS variables are injected during SSR in layout.tsx
 * to prevent FOUC (Flash of Unstyled Content).
 *
 * ## Architecture
 *
 * The design system follows this flow:
 * 1. TypeScript tokens (design-tokens.ts) - Single source of truth
 * 2. SSR/build-time CSS variables - Derived from tokens (this file)
 * 3. shadcn semantic aliases - Point to canonical token vars
 * 4. Tailwind config - References CSS variables
 * 5. Components - Consume via Tailwind classes or shadcn components
 *
 * ## shadcn Compatibility
 *
 * This function outputs TWO sets of variables:
 * 1. Canonical token variables (--token-*)
 * 2. shadcn semantic aliases (--primary, --background, etc.)
 *
 * The aliases point to token variables, maintaining single source of truth
 * while allowing shadcn components to work out of the box.
 *
 * @returns CSS string with :root variable declarations
 *
 * @example
 * ```tsx
 * // In layout.tsx
 * const rootVars = buildRootCssVars();
 * return (
 *   <html>
 *     <head>
 *       <style id="design-token-vars">{rootVars}</style>
 *     </head>
 *   </html>
 * );
 * ```
 */
export function buildRootCssVars(): string {
  return `
:root {
  /* =======================
     Canonical token vars
     ======================= */

  /* Brand colors */
  --token-primary: ${brandColors.primary};
  --token-secondary: ${brandColors.secondary};
  --token-accent: ${brandColors.accent};
  --token-neutral: ${brandColors.neutral};

  /* Status colors */
  --token-success: ${statusColors.success};
  --token-warning: ${statusColors.warning};
  --token-danger: ${statusColors.danger};

  /* Surface colors */
  --token-background: ${surfaceColors.background};
  --token-surface: ${surfaceColors.surface};

  /* Text colors */
  --token-text-primary: ${textColors.primary};
  --token-text-secondary: ${textColors.secondary};

  /* Border colors */
  --token-border: ${borderColors.default};

  /* Radius scale */
  --token-radius-sm: ${radii.sm};
  --token-radius-md: ${radii.md};
  --token-radius-lg: ${radii.lg};
  --token-radius-xl: ${radii.xl};
  --token-radius-pill: ${radii.pill};

  /* Spacing scale */
  --token-spacing-page-max-width: ${spacing.pageMaxWidth};
  --token-spacing-section: ${spacing.sectionPadding.desktop};
  --token-spacing-section-mobile: ${spacing.sectionPadding.mobile};
  --token-spacing-container: ${spacing.containerPadding.desktop};
  --token-spacing-container-mobile: ${spacing.containerPadding.mobile};

  /* Shadow effects */
  --token-shadow-sm: ${shadows.sm};
  --token-shadow-md: ${shadows.md};
  --token-shadow-lg: ${shadows.lg};
  --token-shadow-xl: ${shadows.xl};

  /* Line heights */
  --token-line-height-tight: ${lineHeights.tight};
  --token-line-height-normal: ${lineHeights.normal};
  --token-line-height-relaxed: ${lineHeights.relaxed};

  /* Animation durations */
  --token-duration-fast: ${durations.fast};
  --token-duration-normal: ${durations.normal};
  --token-duration-slow: ${durations.slow};

  /* =======================
     shadcn semantic aliases
     ======================= */

  --background: var(--token-background);
  --foreground: var(--token-text-primary);

  --card: var(--token-surface);
  --card-foreground: var(--token-text-primary);

  --popover: var(--token-surface);
  --popover-foreground: var(--token-text-primary);

  --primary: var(--token-primary);
  --primary-foreground: var(--token-text-primary);

  --secondary: var(--token-secondary);
  --secondary-foreground: var(--token-text-primary);

  --muted: var(--token-surface);
  --muted-foreground: var(--token-text-secondary);

  --accent: var(--token-accent);
  --accent-foreground: var(--token-text-primary);

  --destructive: var(--token-danger);
  --destructive-foreground: var(--token-text-primary);

  --border: var(--token-border);
  --input: var(--token-border);
  --ring: var(--token-primary);

  /* shadcn uses --radius for some components */
  --radius: var(--token-radius-md);
}
  `.trim();
}
