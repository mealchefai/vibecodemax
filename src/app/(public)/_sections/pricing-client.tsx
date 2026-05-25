"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/supabase/client";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Badge,
} from "@/components/ui";

export type PricingInterval = "month" | "year";
export type PricingProductType = "subscription" | "one_time";

export interface PricingPrice {
  id: string;
  provider_price_id: string;
  amount_cents: number;
  currency: string;
  interval: PricingInterval | null;
  trial_days: number | null;
  is_default: boolean;
}

export interface PricingFeature {
  key: string;
  label: string;
}

export interface PricingProduct {
  id: string;
  name: string;
  description?: string | null;
  badge?: string | null;
  sort_order: number;
  type: PricingProductType;
  features: PricingFeature[];
  prices: PricingPrice[];
}

export interface PricingSectionClientProps {
  billingMode: "subscriptions" | "one_time" | "mixed";
  products: PricingProduct[];
}

const CTA_BY_TYPE: Record<PricingProductType, string> = {
  subscription: "Subscribe",
  one_time: "Buy now",
};

function formatPrice(amountCents: number, currency: string) {
  if (amountCents === 0) return "Free";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(amountCents / 100);
}

function getPriceForInterval(
  prices: PricingPrice[],
  interval: PricingInterval | null
) {
  if (interval) {
    const match = prices.find((price) => price.interval === interval);
    if (match) {
      return match;
    }
  }
  return prices.find((price) => price.is_default) || prices[0];
}

function getAvailableIntervals(products: PricingProduct[]): PricingInterval[] {
  const seen = new Set<PricingInterval>();

  for (const product of products) {
    for (const price of product.prices) {
      if (price.interval === "month" || price.interval === "year") {
        seen.add(price.interval);
      }
    }
  }

  return (["month", "year"] as const).filter((interval) => seen.has(interval));
}

function TrialBadge({ trialDays }: { trialDays: number | null }) {
  if (!trialDays || trialDays <= 0) return null;
  return (
    <Badge variant="secondary" className="mt-4">
      {trialDays}-day free trial
    </Badge>
  );
}

function PricingCards({
  products,
  billingInterval,
}: {
  products: PricingProduct[];
  billingInterval: PricingInterval | null;
}) {
  const router = useRouter();
  const [pendingPriceId, setPendingPriceId] = React.useState<string | null>(
    null
  );

  const visibleProducts =
    billingInterval === null
      ? products
      : products.filter(
          (product) =>
            product.type !== "subscription" ||
            product.prices.some((price) => price.interval === billingInterval)
        );

  const handleCheckoutClick = React.useCallback(
    async (priceId: string) => {
      const checkoutHref = `/api/payments/checkout?priceId=${encodeURIComponent(priceId)}`;
      setPendingPriceId(priceId);

      try {
        const user = await getCurrentUser();
        if (!user) {
          router.push(`/login?next=${encodeURIComponent(checkoutHref)}`);
          return;
        }

        window.location.assign(checkoutHref);
      } finally {
        setPendingPriceId(null);
      }
    },
    [router]
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
      {visibleProducts.map((plan) => {
        const hasPrices = plan.prices.length > 0;
        const price = hasPrices
          ? getPriceForInterval(plan.prices, billingInterval)
          : null;
        const isSubscription = plan.type === "subscription";
        const displayInterval =
          isSubscription && price?.interval ? price.interval : null;

        return (
          <Card
            key={plan.id}
            className={`relative group transition-all duration-fast bg-surface backdrop-blur-md border-border ${
              plan.badge
                ? "ring-2 ring-primary lg:-translate-y-2"
                : " hover:-translate-y-1"
            }`}
          >
            {plan.badge && (
              <>
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                  <Badge
                    variant="default"
                    className="border-transparent ring-1 px-4 py-1.5 font-bold "
                  >
                    {plan.badge}
                  </Badge>
                </div>
                <div className="absolute inset-0 rounded-lg bg-primary/5 -z-10" />
              </>
            )}

            <CardHeader className="text-center pb-8 relative z-10">
              <CardTitle className="text-xl text-text-primary">
                {plan.name}
              </CardTitle>
              {plan.description && (
                <CardDescription className="text-base mt-2 text-text-secondary">
                  {plan.description}
                </CardDescription>
              )}

              <div className="mt-6">
                <div className="flex items-center justify-center">
                  <span
                    className={`text-4xl font-bold ${plan.badge ? "text-primary" : "text-text-primary"}`}
                  >
                    {price
                      ? formatPrice(price.amount_cents, price.currency)
                      : "Unavailable"}
                  </span>
                  {displayInterval && (
                    <span className="text-text-secondary ml-2 text-base">
                      /{displayInterval === "month" ? "month" : "year"}
                    </span>
                  )}
                </div>
                <TrialBadge trialDays={price?.trial_days ?? null} />
              </div>
            </CardHeader>

            <CardContent>
              <ul className="space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature.key} className="flex items-start gap-3">
                    <svg
                      className="h-5 w-5 text-primary mt-0.5 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span className="text-sm">{feature.label}</span>
                  </li>
                ))}
              </ul>
            </CardContent>

            <CardFooter>
              <Button
                className="w-full transition-all duration-300"
                size="lg"
                disabled={!hasPrices || !price || pendingPriceId === price?.id}
                onClick={
                  price ? () => handleCheckoutClick(price.id) : undefined
                }
              >
                {hasPrices && price
                  ? pendingPriceId === price.id
                    ? "Loading..."
                    : CTA_BY_TYPE[plan.type]
                  : "Unavailable"}
              </Button>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}

export function PricingSectionClient({
  billingMode,
  products,
}: PricingSectionClientProps) {
  const availableSubscriptionIntervals = React.useMemo(
    () =>
      getAvailableIntervals(
        products.filter((product) => product.type === "subscription")
      ),
    [products]
  );
  const showBillingToggle =
    availableSubscriptionIntervals.includes("month") &&
    availableSubscriptionIntervals.includes("year");

  const defaultBillingInterval = React.useMemo<PricingInterval | null>(() => {
    if (billingMode === "subscriptions" || billingMode === "mixed") {
      if (availableSubscriptionIntervals.includes("month")) {
        return "month";
      }
      if (availableSubscriptionIntervals.includes("year")) {
        return "year";
      }
    }
    return null;
  }, [availableSubscriptionIntervals, billingMode]);

  const [selectedBillingInterval, setSelectedBillingInterval] =
    React.useState<PricingInterval | null>(defaultBillingInterval);

  const billingInterval =
    selectedBillingInterval &&
    availableSubscriptionIntervals.includes(selectedBillingInterval)
      ? selectedBillingInterval
      : defaultBillingInterval;

  return (
    <section className="py-section-mobile md:py-section bg-transparent">
      <div className="container mx-auto px-container-mobile md:px-container max-w-page">
        <div className="text-center mb-20">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-foreground">
            Choose your plan
          </h1>
          <p className="text-lg md:text-xl text-text-secondary max-w-2xl mx-auto">
            Simple, transparent pricing designed to grow with you.
          </p>
        </div>

        {(billingMode === "subscriptions" || billingMode === "mixed") &&
          showBillingToggle && (
            <div className="flex justify-center mb-16">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/70 p-1 backdrop-blur">
                <button
                  type="button"
                  onClick={() => setSelectedBillingInterval("month")}
                  className={`rounded-full px-5 py-2 text-sm font-medium transition ${
                    billingInterval === "month"
                      ? "bg-primary text-primary-foreground shadow"
                      : "text-text-secondary hover:text-foreground"
                  }`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedBillingInterval("year")}
                  className={`rounded-full px-5 py-2 text-sm font-medium transition ${
                    billingInterval === "year"
                      ? "bg-primary text-primary-foreground shadow"
                      : "text-text-secondary hover:text-foreground"
                  }`}
                >
                  Annual
                </button>
              </div>
            </div>
          )}

        <PricingCards
          products={products}
          billingInterval={
            billingMode === "subscriptions" || billingMode === "mixed"
              ? billingInterval
              : null
          }
        />
      </div>
    </section>
  );
}
