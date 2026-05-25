"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui";

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: "What is included?",
    answer:
      "A polished app foundation with responsive pages, reusable components, design tokens, and room to add the workflows your product needs.",
  },
  {
    question: "Can I customize the design?",
    answer:
      "Yes. The entire UI is powered by design tokens (colors, radius, shadows). Update tokens and the components restyle automatically.",
  },
  {
    question: "How fast can I launch?",
    answer:
      "You can start with the included pages immediately, then replace the sample copy and sections with your own product details.",
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
            Answers to common questions about launching from this foundation.
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
