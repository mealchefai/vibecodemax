import React from "react";
import { PageContainer } from "@/components/layout";

export default function CookiePolicyPage() {
  return (
    <PageContainer maxWidth="lg" padding="lg">
      <div className="py-section-mobile md:py-section">
        <div className="mx-auto max-w-3xl text-center mb-16">
          <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground">
            <span>Cookie Policy</span>
          </h1>
        </div>

        <div className="mx-auto max-w-3xl">
          <p className="text-lg leading-7 text-text-secondary">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
            eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim
            ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut
            aliquip ex ea commodo consequat.
          </p>
        </div>
      </div>
    </PageContainer>
  );
}
