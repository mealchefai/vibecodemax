import { Inter, Poppins } from "next/font/google";

const primaryFont = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  variable: "--token-font-primary",
  fallback: ["sans-serif"],
  preload: true,
});

const secondaryFont = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
  variable: "--token-font-secondary",
  fallback: ["sans-serif"],
  preload: true,
});

export function getTypographyVariableClasses(): string {
  return [primaryFont.variable, secondaryFont.variable].join(" ");
}
