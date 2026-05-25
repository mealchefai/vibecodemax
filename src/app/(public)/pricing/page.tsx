import React from "react";
import { PageContainer } from "@/components/layout";
import { PricingSection } from "../_sections/pricing";

export const dynamic = "force-dynamic";

export default function PricingPage() {
  return (
    <PageContainer maxWidth="xl" padding="lg">
      {/* Pricing Section */}
      <PricingSection />
    </PageContainer>
  );
}
