import type { Metadata } from "next";
import "./globals.css";
import { buildRootCssVars } from "@/lib/design-tokens/css-vars";
import { getTypographyVariableClasses } from "@/lib/typography/next-fonts";
import { validateSelectedJobsEnv } from "@/lib/jobs/env";
import { validateSelectedSecurityEnv } from "@/lib/security/env";

export const metadata: Metadata = {
  title: "Meal Chef AI",
  description:
    "Meal Chef AI is a meal planner app that helps people to get meal plans with the assistance of AI",
};

validateSelectedSecurityEnv();

validateSelectedJobsEnv();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const rootVars = buildRootCssVars();
  const fontVars = getTypographyVariableClasses();

  return (
    <html lang="en" className={fontVars} data-scroll-behavior="smooth">
      <head>
        <style id="design-token-vars">{rootVars}</style>
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
