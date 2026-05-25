import React from "react";
import {
  HeroSection,
  FeaturesSection,
  TestimonialsSection,
  FAQSection,
} from "./_sections";
import { PricingSection } from "./_sections";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <HeroSection />
      {/* Features Section */}
      <FeaturesSection />
      {/* Testimonials Section */}
      <TestimonialsSection /> {/* Pricing Section */}
      <PricingSection />
      {/* FAQ Section */}
      <FAQSection />
    </main>
  );
}
