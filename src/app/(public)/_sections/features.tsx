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
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
    ),
    title: "Your Numbers, Calculated Precisely",
    description:
      "Enter your age, gender, weight, height, and activity level and we calculate your Basal Metabolic Rate and exact daily calorie target — no guesswork, no generic charts.",
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
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
        />
      </svg>
    ),
    title: "Meal Plans Built Around You",
    description:
      "Every plan is generated from your personal metrics. Whether your goal is weight loss, muscle gain, or maintenance, your meals match your body's actual needs.",
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
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
        />
      </svg>
    ),
    title: "Nutritionist-Grade, Zero Appointments",
    description:
      "Get the kind of tailored nutritional guidance that used to require expensive consultations — available instantly, whenever you need it.",
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
            <span>How Meal Chef Works For You</span>
          </h2>
          <p className="mt-6 text-lg leading-7 text-muted-foreground">
            Tell us about yourself once. We handle the nutrition science so you
            can focus on eating well.
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
