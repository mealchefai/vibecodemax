import React from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui";

const features = [
  {
    icon: (
      <svg
        className="h-7 w-7"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
        />
      </svg>
    ),
    title: "Next.js 16 + TypeScript",
    description:
      "Built on the latest Next.js with TypeScript, Tailwind CSS, and modern React patterns for maximum performance and developer experience.",
  },
  {
    icon: (
      <svg
        className="h-7 w-7"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
        />
      </svg>
    ),
    title: "Polished User Flows",
    description:
      "Clear paths for visitors and signed-in users, with layouts that stay focused on the task at hand.",
  },
  {
    icon: (
      <svg
        className="h-7 w-7"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
        />
      </svg>
    ),
    title: "Reusable Components",
    description:
      "Consistent cards, buttons, forms, navigation, and feedback states ready for product-specific screens.",
  },
  {
    icon: (
      <svg
        className="h-7 w-7"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
        />
      </svg>
    ),
    title: "Data Ready",
    description:
      "A structure that can support dynamic content, user data, and operational workflows as your app grows.",
  },
  {
    icon: (
      <svg
        className="h-7 w-7"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
        />
      </svg>
    ),
    title: "Deploy Anywhere",
    description:
      "A standard Next.js app shape that works with common hosting platforms and deployment workflows.",
  },
  {
    icon: (
      <svg
        className="h-7 w-7"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    title: "Maintainable Foundation",
    description:
      "Readable project structure, typed code, and design tokens that make future changes easier to manage.",
  },
];

export function FeaturesSection() {
  return (
    <section
      id="features"
      className="py-section-mobile md:py-section relative bg-background"
    >
      <div className="container mx-auto px-container-mobile md:px-container max-w-page">
        {/* Header */}
        <div className="mx-auto max-w-4xl text-center mb-16">
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground">
            <span>Everything You Need to Ship Fast</span>
          </h2>
          <p className="mt-6 text-lg leading-7 text-muted-foreground">
            Start from a clean foundation and focus on building the details that
            make your product valuable.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="relative group bg-surface border-border transition-all duration-fast ease-out hover:-translate-y-2 border-border/50 hover:border-border/80"
            >
              <CardHeader className="relative z-10 p-8">
                <div className="h-14 w-14 rounded-xl flex items-center justify-center mb-6 transition-all duration-300 bg-primary ">
                  <div className="text-primary-foreground">{feature.icon}</div>
                </div>
                <CardTitle className="text-2xl font-heading font-bold text-foreground">
                  {feature.title}
                </CardTitle>
              </CardHeader>

              <CardContent className="relative z-10 p-8 pt-0">
                <CardDescription className="text-lg text-text-secondary leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
