"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui";

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: "How does Meal Chef calculate my meal plan?",
    answer:
      "We use your age, gender, weight, height, and activity level to calculate your Basal Metabolic Rate (BMR). From there we work out your daily calorie target and build a meal plan that hits your macros based on your goal — whether that's losing weight, gaining muscle, or maintaining.",
  },
  {
    question: "What information do I need to get started?",
    answer:
      "Just the basics — your age, gender, current weight, height, and how active you are day to day. The whole setup takes under two minutes and your plan is ready immediately after.",
  },
  {
    question: "Is this the same as seeing a dietitian?",
    answer:
      "Meal Chef uses the same science-backed formulas that nutritionists use to calculate calorie and macro targets. While it doesn't replace a medical consultation, it gives you personalised, accurate guidance without the cost or wait time.",
  },
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  };

  return (
    <section className="py-section-mobile md:py-section">
      <div className="container mx-auto px-container-mobile md:px-container max-w-page">
        <div className="mx-auto max-w-3xl text-center mb-12">
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground">
            Frequently Asked Questions
          </h2>
          <p className="mt-6 text-lg leading-8 text-text-secondary">
            Everything you need to know about how Meal Chef builds a plan
            around your body.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <Card
                key={index}
                className="border border-border/60 bg-surface/80 backdrop-blur-md "
              >
                <button
                  className="w-full flex items-start justify-between gap-4 p-5 text-left"
                  onClick={() => toggle(index)}
                >
                  <div>
                    <h3 className="text-lg font-semibold text-text-primary">
                      {faq.question}
                    </h3>
                    {isOpen && (
                      <p className="mt-3 text-text-secondary leading-relaxed">
                        {faq.answer}
                      </p>
                    )}
                  </div>
                  <span
                    className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform duration-200"
                    aria-hidden
                  >
                    <svg
                      className={`h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-180" : "rotate-0"}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 9l6 6 6-6"
                      />
                    </svg>
                  </span>
                </button>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
