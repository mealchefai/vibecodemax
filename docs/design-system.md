# Design System Guide

> A beginner-friendly guide to understanding and customizing the design system

## Table of Contents

- [What is the Design System?](#what-is-the-design-system)
- [How It Works](#how-it-works)
- [Changing Design Tokens](#changing-design-tokens)
- [Adding New Design Tokens](#adding-new-design-tokens)
- [Removing Design Tokens](#removing-design-tokens)
- [Common Customizations](#common-customizations)
- [Troubleshooting](#troubleshooting)

---

## What is the Design System?

Think of the design system as a **central control panel** for your app's look and feel. Instead of hardcoding colors, fonts, and spacing throughout your app, you define them once in a single place, and they automatically apply everywhere.

### Why This Matters

**Without a design system:**

```tsx
// ❌ Colors scattered everywhere - hard to change
<button className="bg-[#7c3aed]">Click me</button>
<div className="text-[#7c3aed]">Some text</div>
<span className="border-[#7c3aed]">Badge</span>
```

If you want to change the purple color, you'd have to find and update it in dozens of files!

**With a design system:**

```tsx
// ✅ One token, used everywhere - easy to change
<button className="bg-primary">Click me</button>
<div className="text-primary">Some text</div>
<span className="border-primary">Badge</span>
```

Now you can change the primary color in ONE place and it updates everywhere automatically!

---

## How It Works

The design system follows a simple 4-step flow:

```
1. design-tokens.ts → 2. css-vars.ts → 3. globals.css → 4. Your Components
   (Define values)     (SSR injection)   (Tailwind theme)   (Use classes)
```

### Step 1: Define Tokens (`src/design-tokens.ts`)

This is where you define all your design values:

```typescript
export const brandColors = {
  primary: "#7c3aed", // Your main brand color
  secondary: "#a855f7", // Your secondary color
  accent: "#06b6d4", // Accent color for highlights
} as const;
```

### Step 2: SSR Injection (`src/lib/design-tokens/css-vars.ts`)

This file automatically converts your tokens into CSS variables. You rarely need to touch this file, but when adding new tokens, you'll import and export them here:

```typescript
import { brandColors } from "@/design-tokens";

// Later in the file...
--token-primary: ${brandColors.primary};
```

### Step 3: Tailwind Theme (`src/styles/globals.css`)

This is where tokens become Tailwind utilities. Inside the `@theme` block:

```css
@theme {
  --color-primary: var(--token-primary);
}
```

Now you can use `bg-primary`, `text-primary`, `border-primary` in your components!

### Step 4: Use in Components

```tsx
<button className="bg-primary text-primary-foreground">Click me</button>
```

---

## Changing Design Tokens

Changing existing tokens is easy! You only need to update the value in `design-tokens.ts`.

### Example: Change Your Primary Color

**Current primary color:** Purple (`#7c3aed`)
**New primary color:** Blue (`#2563eb`)

1. Open `src/design-tokens.ts`
2. Find the `brandColors` section:

```typescript
export const brandColors = {
  primary: "#7c3aed", // ← Change this line
  secondary: "#a855f7",
  accent: "#06b6d4",
} as const;
```

3. Update the value:

```typescript
export const brandColors = {
  primary: "#2563eb", // ✅ Now blue!
  secondary: "#a855f7",
  accent: "#06b6d4",
} as const;
```

4. Rebuild your app:

```bash
npm run dev
```

That's it! Every button, text, and border using `bg-primary`, `text-primary`, or `border-primary` is now blue!

### More Examples

**Change fonts:**

```typescript
// In src/design-tokens.ts
export const fonts = {
  primary: {
    family: "Roboto", // Changed from Inter
    fallbacks: ["sans-serif"],
    subsets: ["latin"],
    weights: ["400", "500", "600", "700"],
  },
  // ...
};
```

**⚠️ IMPORTANT:** When changing fonts, you also need to update `src/lib/typography/next-fonts.ts` to import and initialize the new font from `next/font/google`.

**Change spacing:**

```typescript
// In src/design-tokens.ts
export const spacing = {
  pageMaxWidth: "1440px", // Changed from 1280px
  sectionPadding: {
    desktop: "8rem", // Changed from 6rem
    mobile: "4rem",
  },
  // ...
};
```

**Change animation speed:**

```typescript
// In src/design-tokens.ts
export const durations = {
  fast: "0.15s", // Changed from 0.1s (slightly slower)
  normal: "0.3s",
  slow: "0.6s",
} as const;
```

---

## Adding New Design Tokens

Adding new tokens requires updating all 3 files in the system. Don't worry - we'll walk through it step by step!

### Example: Add a New Color Token

Let's say you want to add a "tertiary" brand color.

#### Step 1: Add to `design-tokens.ts`

```typescript
// src/design-tokens.ts
export const brandColors = {
  primary: "#7c3aed",
  secondary: "#a855f7",
  accent: "#06b6d4",
  tertiary: "#ec4899", // ✅ New color added!
} as const;
```

#### Step 2: Add to `css-vars.ts` (SSR injection)

```typescript
// src/lib/design-tokens/css-vars.ts

// 1. Import is already there - just verify brandColors is imported
import { brandColors } from "@/design-tokens";

// 2. Find the buildRootCssVars() function
// 3. Add your new token to the brand colors section:

/* Brand colors */
--token-primary: ${brandColors.primary};
--token-secondary: ${brandColors.secondary};
--token-accent: ${brandColors.accent};
--token-tertiary: ${brandColors.tertiary};  /* ✅ Add this line */
```

#### Step 3: Add to `globals.css` (Tailwind theme)

```css
/* src/styles/globals.css */

@theme {
  /* Find the brand colors section */
  --color-primary: var(--token-primary);
  --color-secondary: var(--token-secondary);
  --color-accent: var(--token-accent);
  --color-tertiary: var(--token-tertiary); /* ✅ Add this line */
}
```

#### Step 4: Use in your components

```tsx
<div className="bg-tertiary text-primary-foreground">
  This uses the new tertiary color!
</div>

<button className="border-2 border-tertiary">
  Tertiary border
</button>
```

### Example: Add a New Shadow

Let's add an extra-extra large shadow called `shadow-2xl`.

#### Step 1: Add to `design-tokens.ts`

```typescript
// src/design-tokens.ts
export const shadows = {
  sm: "0 2px 8px rgba(124, 58, 237, 0.1)",
  md: "0 4px 16px rgba(124, 58, 237, 0.12)",
  lg: "0 8px 32px rgba(124, 58, 237, 0.15)",
  xl: "0 16px 48px rgba(124, 58, 237, 0.2)",
  "2xl": "0 24px 64px rgba(124, 58, 237, 0.25)", // ✅ New shadow
} as const;
```

#### Step 2: Add to `css-vars.ts`

```typescript
// src/lib/design-tokens/css-vars.ts
import { shadows } from "@/design-tokens";

// In buildRootCssVars():
/* Shadows */
--token-shadow-sm: ${shadows.sm};
--token-shadow-md: ${shadows.md};
--token-shadow-lg: ${shadows.lg};
--token-shadow-xl: ${shadows.xl};
--token-shadow-2xl: ${shadows["2xl"]};  /* ✅ Add this */
```

#### Step 3: Add to `globals.css`

```css
/* src/styles/globals.css */

@theme {
  --shadow-sm: var(--token-shadow-sm);
  --shadow-md: var(--token-shadow-md);
  --shadow-lg: var(--token-shadow-lg);
  --shadow-xl: var(--token-shadow-xl);
  --shadow-2xl: var(--token-shadow-2xl); /* ✅ Add this */
}
```

#### Step 4: Use it

```tsx
<div className="shadow-2xl">This has a dramatic shadow!</div>
```

---

## Removing Design Tokens

Removing tokens requires careful cleanup to avoid breaking your app.

### ⚠️ Before You Remove

**Search for usage first!** Use your code editor to find all uses of the token you want to remove.

Example: If removing `bg-accent`, search your codebase for:

- `bg-accent`
- `text-accent`
- `border-accent`

### Step-by-Step: Remove a Token

Let's say you want to remove the `neutral` color because you're not using it.

#### Step 1: Search for usage

```bash
# Search for any use of "neutral"
grep -r "neutral" src/
```

If you find any usage, update those components first to use a different color.

#### Step 2: Remove from `design-tokens.ts`

```typescript
// src/design-tokens.ts
export const brandColors = {
  primary: "#7c3aed",
  secondary: "#a855f7",
  accent: "#06b6d4",
  // neutral: "#94a3b8",  ← Remove this line
} as const;
```

#### Step 3: Remove from `css-vars.ts`

```typescript
// src/lib/design-tokens/css-vars.ts

/* Brand colors */
--token-primary: ${brandColors.primary};
--token-secondary: ${brandColors.secondary};
--token-accent: ${brandColors.accent};
// --token-neutral: ${brandColors.neutral};  ← Remove this line
```

#### Step 4: Remove from `globals.css`

```css
/* src/styles/globals.css */

@theme {
  --color-primary: var(--token-primary);
  --color-secondary: var(--token-secondary);
  --color-accent: var(--token-accent);
  /* --color-neutral: var(--token-neutral); */ /* ← Remove this line */
}
```

#### Step 5: Test your app

```bash
npm run dev
```

Make sure nothing is broken!

---

## Common Customizations

### Change Your Brand Colors

The most common customization! Update all three brand colors to match your brand:

```typescript
// src/design-tokens.ts
export const brandColors = {
  primary: "#your-main-color",
  secondary: "#your-secondary-color",
  accent: "#your-accent-color",
} as const;
```

### Adjust Dark Mode Colors

```typescript
// src/design-tokens.ts
export const surfaceColors = {
  background: "#0a0a0a", // Darker background
  surface: "#1a1a1a", // Darker cards
} as const;
```

### Make Animations Faster/Slower

```typescript
// src/design-tokens.ts
export const durations = {
  fast: "0.05s", // Super fast (was 0.1s)
  normal: "0.2s", // Quicker (was 0.3s)
  slow: "0.5s", // Bit faster (was 0.6s)
} as const;
```

### Change Border Roundness

```typescript
// src/design-tokens.ts
export const radii = {
  sm: "0.25rem", // Less rounded
  md: "0.5rem", // Less rounded
  lg: "0.75rem", // Same
  xl: "1rem", // Less rounded
  pill: "9999px", // Same
} as const;
```

### Increase Spacing

```typescript
// src/design-tokens.ts
export const spacing = {
  pageMaxWidth: "1440px", // Wider pages
  sectionPadding: {
    desktop: "8rem", // More padding
    mobile: "5rem", // More padding
  },
  containerPadding: {
    desktop: "3rem", // More padding
    mobile: "1.5rem", // More padding
  },
} as const;
```

---

## Troubleshooting

### My changes aren't showing up!

1. **Did you restart the dev server?**

   ```bash
   # Stop the server (Ctrl+C) and restart
   npm run dev
   ```

2. **Did you clear your browser cache?**
   - Hard refresh: `Cmd/Ctrl + Shift + R`
   - Or open DevTools and disable cache

3. **Did you update all 3 files?**
   - `design-tokens.ts` ✓
   - `css-vars.ts` ✓
   - `globals.css` ✓

### I get TypeScript errors!

Make sure you're using the `as const` at the end:

```typescript
export const brandColors = {
  primary: "#7c3aed",
} as const; // ← Don't forget this!
```

### I changed a font but it's not working!

Font changes require updating two files:

1. `src/design-tokens.ts` - Update the font configuration
2. `src/lib/typography/next-fonts.ts` - Import and initialize the font

Example for `next-fonts.ts`:

```typescript
import { Inter, Roboto } from "next/font/google"; // Import new font

const roboto = Roboto({
  // Initialize it
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// Update getTypographyVariableClasses() to include it
export function getTypographyVariableClasses(): string {
  return `${roboto.variable}`; // Add your font variable
}
```

### My new token doesn't work in components!

Check that you followed all 4 steps:

1. ✓ Added to `design-tokens.ts`
2. ✓ Added to `css-vars.ts` (with `--token-` prefix)
3. ✓ Added to `globals.css` in `@theme` block
4. ✓ Restarted dev server

### The build fails after my changes!

Check for typos:

- Token names must match across all 3 files
- Make sure you didn't miss any commas
- Verify CSS variable names start with `--token-` in `css-vars.ts`
- Verify Tailwind variables don't have the `--token-` prefix in `globals.css`

---

## Quick Reference

### The 3 Files You'll Edit

| File                                | Purpose        | What You Edit                         |
| ----------------------------------- | -------------- | ------------------------------------- |
| `src/design-tokens.ts`              | Define values  | Colors, fonts, spacing, shadows, etc. |
| `src/lib/design-tokens/css-vars.ts` | SSR injection  | Add new tokens to CSS variables       |
| `src/styles/globals.css`            | Tailwind theme | Add tokens to `@theme` block          |

### Common Tokens

| Token Type | Example Usage                                       |
| ---------- | --------------------------------------------------- |
| Colors     | `bg-primary`, `text-primary`, `border-primary`      |
| Fonts      | `font-primary`, `font-heading`                      |
| Shadows    | `shadow-sm`, `shadow-md`, `shadow-lg`               |
| Radius     | `rounded-sm`, `rounded-md`, `rounded-lg`            |
| Duration   | `duration-fast`, `duration-normal`, `duration-slow` |
| Spacing    | `py-section-mobile`, `px-container-mobile`          |

### Need Help?

Check the styling guide at `.cursor/rules/styling-guide.mdc` for component patterns and anti-patterns!
