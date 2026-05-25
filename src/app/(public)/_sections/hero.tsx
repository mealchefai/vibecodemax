import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui";
/* eslint-disable @next/next/no-img-element */

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-background py-section-mobile md:py-section">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-background" />
      </div>

      <div className="container mx-auto px-container-mobile md:px-container max-w-page">
        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          {/* Content */}
          <div className="lg:col-span-7">
            <div className="mx-auto max-w-2xl lg:mx-0 text-center lg:text-left">
              {/* Badge */}
              <div className="mb-8 flex justify-center lg:justify-start">
                <Link
                  href="#features"
                  className="inline-flex items-center gap-x-3 rounded-full bg-surface px-4 py-2 text-sm border border-border hover:border-border hover:bg-muted/10 transition-all duration-200"
                >
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-primary text-primary-foreground">
                    New
                  </span>
                  <span className="text-text-secondary font-medium text-sm">
                    BMI based meal plans
                  </span>
                  <div className="flex items-center justify-center w-5 h-5 rounded-full bg-primary">
                    <svg
                      className="h-3 w-3 text-primary-foreground"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </Link>
              </div>

              {/* Headlines */}
              <h1 className="text-5xl font-heading font-extrabold tracking-tight text-text-primary sm:text-6xl lg:text-7xl animate-fade-in text-center lg:text-left">
                <span>Your Personal AI </span>
                <span className="text-primary">Meal Planning Assistant</span>
              </h1>
              <p className="mt-8 text-xl leading-relaxed text-text-secondary animate-slide-in text-center lg:text-left">
                Nutritionist grade meal plans without the hourly fees and appointments.
              </p>

              {/* CTAs */}
              <div className="mt-12 flex flex-col sm:flex-row items-center gap-4 animate-slide-in justify-center lg:justify-start">
                <Button size="lg" variant="default" asChild>
                  <Link href="/register">
                    Start Planning
                    <svg
                      className="ml-2 h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 7l5 5m0 0l-5 5m5-5H6"
                      />
                    </svg>
                  </Link>
                </Button>
                <Button variant="secondary" size="lg" asChild>
                  <Link href="#features">Features</Link>
                </Button>
              </div>
            </div>
          </div>

          {/* Image */}
          <div className="mt-10 lg:col-span-5 lg:mt-0 flex items-start">
            <div className="relative w-full">
              <img
                className="aspect-[6/5] w-full object-contain"
                src="/hero.png"
                alt="Product preview"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
