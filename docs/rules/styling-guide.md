# Styling Guide

## TL;DR

- Use semantic token classes only for visual styling (`bg-surface`, `text-foreground`, `bg-primary`, etc.).
- No raw `hex/rgb/hsl` colors in components, and no Tailwind palette colors for UI semantics (`red-*`, `green-*`, `blue-*`, etc.).
- Minimalist design avoids decorative gradients for UI surfaces, text, badges, chips, or buttons.
- Arbitrary values are allowed only for mechanics (Radix placement/CSS vars, aspect ratios, viewport math, fixed chart containers).
- Use Tailwind spacing scale for normal UI spacing; avoid one-off arbitrary spacing.
- If the same new visual pattern appears twice, add/extend a token in `src/design-tokens.ts`.
- Prefer composing from `components/ui/*` primitives before creating bespoke components.
- Use `cn()` consistently and `cva` for variant-driven components.

---

## Purpose

Preserve a clean, modern SaaS aesthetic in a **minimalist, gradient-free visual style** while keeping all visual primitives token-driven from `src/design-tokens.ts`.

Minimalist design emphasizes clarity, hierarchy, and contrast without decorative gradients.

---

## Core Doctrine

1. **Single source of truth**  
   Visual primitives come from `src/design-tokens.ts`.

2. **Tailwind as interface**  
   Components consume token-backed Tailwind utilities, not token objects.

3. **Token-first pattern evolution**  
   Repeated visual needs must be promoted to tokens and mapped utilities.

4. **Strict defaults, explicit exceptions**  
   If an exception is not listed here, assume it is not allowed.

---

## Changing Fonts

Fonts are part of the token system. Do not change font classes directly in components.

When changing the project font, update both places:

1. `src/design-tokens.ts`
   - Update the `fonts` tokens with the new family name, fallbacks, subsets, weights, and styles.
2. `src/lib/typography/next-fonts.ts`
   - Import the matching font from `next/font/google`.
   - Initialize it with the same subsets, weights, styles, fallback, and CSS variable.
   - Keep `getTypographyVariableClasses()` returning the active font variables.

After changing fonts, run the project quality commands and visually check key screens for text overflow, cramped buttons, broken line breaks, or layout shifts.

## Approved Semantic Class Vocabulary

Use these canonical classes (and their opacity variants like `/10`, `/20` where appropriate):

- **Color backgrounds**: `bg-background`, `bg-surface`, `bg-card`, `bg-popover`, `bg-primary`, `bg-secondary`, `bg-accent`, `bg-muted`, `bg-destructive`, `bg-success`, `bg-warning`, `bg-danger`
- **Text**: `text-foreground`, `text-text-primary`, `text-text-secondary`, `text-muted-foreground`, `text-primary`, `text-secondary`, `text-accent`, `text-danger`, `text-warning`, `text-success`, `text-primary-foreground`, `text-secondary-foreground`, `text-accent-foreground`, `text-destructive-foreground`
- **Borders/Rings**: `border-border`, `border-input`, `border-primary`, `border-accent`, `border-danger`, `ring-ring`
- **Radius**: `rounded-sm`, `rounded-md`, `rounded-lg`, `rounded-xl`, `rounded-full`, `rounded-pill` (if mapped)
- **Shadows**: `shadow-sm`, `shadow-md`, `shadow-lg` (token-mapped)
- **Typography scale**: `text-xs` through `text-4xl` (or project scale aliases)

If a needed semantic class is missing, add/extend a token and map it before usage.

---

## Minimalist Color Rules

### Required behavior

- Primary emphasis uses solid token color surfaces (`bg-primary`) and correct foreground (`text-primary-foreground`).
- Secondary emphasis uses existing semantic surfaces (`bg-secondary`, `bg-accent`, `bg-muted`) as mapped.
- Status UI uses semantic status tokens (`success`, `warning`, `danger`) only.

### Disallowed in minimalist design

- Decorative gradients on normal UI:
  - `bg-gradient-*`
  - `text-gradient-*`
  - `bg-gradient-to-* from-* via-* to-*`
- Gradient text via clipping:
  - `bg-clip-text text-transparent` combinations for styling.

---

## Spacing and Sizing Consistency

### Default rule

Use Tailwind spacing scale and project spacing utilities for normal UI composition:

- Examples: `p-2/4/6/8`, `px-4`, `py-6`, `gap-2/4/6/8`, `mt-2/4/6`, `max-w-page`, `px-container`, `py-section`

### Not allowed by default

- One-off arbitrary spacing/sizing for normal UI styling, e.g. `mt-[18px]`, `px-[23px]`, `gap-[37px]`, `rounded-[11px]`

### Mechanics-only allowance

Arbitrary values are allowed only in exception buckets listed below.

---

## Approved Component Approach

- Prefer composition from existing `components/ui/*` primitives (shadcn/Radix wrappers) before creating new bespoke components.
- Reuse existing variants where possible.
- For new variant-heavy components, use `cva`.
- Use `cn()` for class composition consistency.

---

## Allowed Exceptions (Narrow)

### 1) Radix/shadcn mechanical positioning and CSS-var passthrough

Allowed patterns include:

- `left-[50%]`, `top-[50%]`, `translate-x-[-50%]`, `translate-y-[-50%]`
- `h-[var(--radix-select-trigger-height)]`, `min-w-[var(--radix-select-trigger-width)]`
- similar framework-driven mechanics in `components/ui/*`

### 2) Structural media ratios and viewport mechanics

Allowed patterns include:

- `aspect-[16/9]`, `aspect-[3/2]`, similar aspect ratios
- viewport mechanics when necessary (`h-[50vh]`, etc.)

### 3) Fixed visualization containers

Allowed when required by chart/list rendering behavior:

- e.g. `h-[350px]`, `max-h-[350px]`

### 4) Overlay/scrim exception (strictly limited)

Allowed only for media readability overlays/scrims, and only with these exact pattern types:

- `bg-black/50`
- `bg-black/60`
- `bg-white/20` (glass/highlight only)

Requirements for any overlay exception:

1. Add an inline TODO comment in the component noting tokenization follow-up.
2. Add a backlog item to introduce semantic overlay tokens/utilities.
3. Do not use these classes for normal surfaces, cards, buttons, chips, badges, or text.

---

## Single Source of Prohibited Patterns (Hard Bans)

The following are disallowed in component/page code unless inside token/theme plumbing files:

- Raw color literals in UI styling (`#hex`, `rgb()`, `hsl()`, inline color styles)
- Tailwind palette colors for semantic UI (`text-red-600`, `bg-green-50`, `bg-blue-500`, etc.)
- Direct token object usage in components (`import { brandColors } ...` in TSX/JSX)
- Custom shadow strings (`shadow-[0_4px_6px_rgba(0,0,0,0.2)]`)
- Arbitrary visual values where a token-backed utility exists
- Gradient utility classes in minimalist design (`bg-gradient-*`, `text-gradient-*`, `bg-gradient-to-*`)

---

## Status Semantics (Success/Warning/Error)

Status UI must use semantic token classes, not palette shortcuts:

- Success: `text-success`, `bg-success/10`, `border-success/30`
- Warning: `text-warning`, `bg-warning/10`, `border-warning/30`
- Danger/Error: `text-danger`, `bg-danger/10`, `border-danger/30`

Do not use `green-*`/`red-*` classes for status states.

---

## Adding New Visual Patterns

When a reusable pattern is missing:

1. Add token(s) in `src/design-tokens.ts`
2. Map token(s) to utilities
3. Use semantic utility classes in components
4. Document if it is a recurring pattern

Rule of thumb: if you need the same visual pattern twice, it should be tokenized.

---

## Quick Review Checklist

- [ ] Only approved semantic token classes used for visual styling
- [ ] No raw colors and no palette color shortcuts for semantics
- [ ] No decorative gradient utilities in minimalist components
- [ ] Spacing follows Tailwind scale except approved mechanics
- [ ] Arbitrary values used only in approved exception buckets
- [ ] Existing `components/ui/*` primitives reused before bespoke solutions
- [ ] Repeated visual needs promoted to tokens
- [ ] Font changes update both `src/design-tokens.ts` and `src/lib/typography/next-fonts.ts`
