import React from "react";
import { Card, CardContent } from "@/components/ui";
/* eslint-disable @next/next/no-img-element */

interface Testimonial {
  quote: string;
  author: {
    name: string;
    title: string;
    company: string;
    avatar?: string;
  };
  rating?: number;
}

const StarRating = ({ rating = 5 }: { rating?: number }) => {
  return (
    <div className="flex items-center gap-1">
      {[...Array(5)].map((_, i) => (
        <svg
          key={i}
          className={`h-4 w-4 ${
            i < rating ? "text-warning" : "text-text-secondary/40"
          }`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
};

const testimonials: Testimonial[] = [
  {
    quote:
      "This foundation helped us move from idea to a polished product much faster than starting from a blank project.",
    author: {
      name: "Elena Vale",
      title: "CTO",
      company: "TechFlow",
    },
    rating: 5,
  },
  {
    quote:
      "Finally, a boilerplate that actually delivers. Clean code, great documentation, and everything I need to launch fast.",
    author: {
      name: "Jonah Mercer",
      title: "Founder",
      company: "StartupLab",
    },
    rating: 5,
  },
  {
    quote:
      "The best investment I made for my SaaS. Shipped to production in 2 weeks instead of 2 months.",
    author: {
      name: "Emily Watson",
      title: "Full Stack Developer",
      company: "IndieDev",
    },
    rating: 5,
  },
  {
    quote:
      "The architecture stayed easy to work with as the product moved from prototype to real customer usage.",
    author: {
      name: "David Kim",
      title: "Lead Engineer",
      company: "GrowthCorp",
    },
    rating: 5,
  },
  {
    quote:
      "Love how everything is configurable through design tokens. Consistent branding across the entire app.",
    author: {
      name: "Jessica Taylor",
      title: "Product Designer",
      company: "DesignStudio",
    },
    rating: 5,
  },
  {
    quote:
      "The deployment workflow is chef's kiss. One command and everything is live with monitoring included.",
    author: {
      name: "Alex Thompson",
      title: "DevOps Engineer",
      company: "CloudNative",
    },
    rating: 5,
  },
];

export function TestimonialsSection() {
  return (
    <section className="py-section-mobile md:py-section relative">
      <div className="container mx-auto px-container-mobile md:px-container">
        {/* Header */}
        <div className="mx-auto max-w-4xl text-center mb-16">
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground">
            <span>Loved By Thousands Of Developers</span>
          </h2>
          <p className="mt-6 text-lg leading-7 text-muted-foreground">
            See what builders are saying about starting from a polished app
            foundation.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <Card
              key={index}
              className="bg-surface border-border hover:border-border/80 hover:-translate-y-2 transition-all duration-fast ease-out group relative overflow-hidden"
            >
              {/* Quote mark decoration */}
              <div className="absolute top-4 right-4 text-6xl text-text-primary font-serif leading-none">
                &ldquo;
              </div>

              <CardContent className="p-6 relative z-10">
                {/* Rating */}
                {testimonial.rating && (
                  <div className="mb-4">
                    <StarRating rating={testimonial.rating} />
                  </div>
                )}

                {/* Quote */}
                <blockquote className="text-lg font-medium leading-7 text-foreground mb-6 relative">
                  &ldquo;{testimonial.quote}&rdquo;
                </blockquote>

                {/* Author */}
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0">
                    {testimonial.author.avatar ? (
                      <img
                        className="h-12 w-12 rounded-full object-cover ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all"
                        src={testimonial.author.avatar}
                        alt={testimonial.author.name}
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center ">
                        <span className="text-sm font-bold text-primary-foreground">
                          {testimonial.author.name.charAt(0)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="font-bold text-foreground">
                      {testimonial.author.name}
                    </div>
                    <div className="text-sm text-text-secondary">
                      {testimonial.author.title} at {testimonial.author.company}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
