export type CatalogProvider = "stripe" | "none";
export type CatalogEnvironmentMode = "test" | "production";
export type CatalogProductType = "subscription" | "one_time";
export type CatalogInterval = "month" | "year" | null;
export type CatalogTaxBehavior =
  | "exclusive"
  | "inclusive"
  | "unspecified"
  | null;

export interface CatalogFeature {
  key?: string;
  label: string;
}

export interface CatalogPrice {
  id: string;
  provider: "stripe";
  providerPriceId: string;
  amountCents: number;
  currency: string;
  interval: CatalogInterval;
  trialDays: number | null;
  isDefault: boolean;
  active: boolean;
  updatedAt: string | null;
}

export interface CatalogProduct {
  id: string;
  providerProductId: string | null;
  name: string;
  description: string | null;
  providerDescription?: string | null;
  useProviderDescription?: boolean;
  providerTaxCode?: string | null;
  providerTaxBehavior?: CatalogTaxBehavior;
  badge: string | null;
  sortOrder: number;
  type: CatalogProductType;
  features: CatalogFeature[];
  active: boolean;
  updatedAt: string | null;
  prices: CatalogPrice[];
}

export interface SaveLocalProductInput {
  productId: string;
  name: string;
  description?: string;
  useProviderDescription?: boolean;
  providerTaxCode?: string;
  providerTaxBehavior?: CatalogTaxBehavior;
  badge?: string;
  type: CatalogProductType;
  active: boolean;
  amountCents: number;
  currency: string;
  interval?: CatalogInterval;
  features: CatalogFeature[];
}

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ProductCatalogState {
  hasRealProductId: boolean;
  hasRealPriceId: boolean;
  hasPlaceholderPriceId: boolean;
  isPartiallyLinked: boolean;
  isProviderBacked: boolean;
  isDemo: boolean;
}

export interface CatalogStateSummary {
  hasDemoProducts: boolean;
  hasProviderBackedProducts: boolean;
  hasPartiallyLinkedProducts: boolean;
  isDemoCatalog: boolean;
}

export const COMMON_CURRENCY_OPTIONS = [
  "USD",
  "EUR",
  "GBP",
  "AUD",
  "CAD",
] as const;

function isPlaceholderId(value: string | null | undefined): boolean {
  return !value || value.startsWith("__VG_");
}

function isStripeProvider(provider: string): provider is "stripe" {
  return provider === "stripe";
}

export function hasRealProviderProductId(
  provider: CatalogProvider,
  providerProductId: string | null | undefined
): boolean {
  if (provider === "none" || isPlaceholderId(providerProductId)) {
    return false;
  }

  if (isStripeProvider(provider)) {
    return providerProductId!.startsWith("prod_");
  }

  return providerProductId!.trim().length > 0;
}

export function hasRealProviderPriceId(
  provider: CatalogProvider,
  providerPriceId: string | null | undefined
): boolean {
  if (provider === "none" || isPlaceholderId(providerPriceId)) {
    return false;
  }

  if (isStripeProvider(provider)) {
    return providerPriceId!.startsWith("price_");
  }

  return providerPriceId!.trim().length > 0;
}

export function getProductCatalogState(
  product: Pick<CatalogProduct, "providerProductId" | "prices">,
  provider: CatalogProvider
): ProductCatalogState {
  const activePrices = product.prices.filter((price) => price.active !== false);
  const hasRealProductId = hasRealProviderProductId(
    provider,
    product.providerProductId
  );
  const hasRealPriceId = activePrices.some((price) =>
    hasRealProviderPriceId(provider, price.providerPriceId)
  );
  const hasPlaceholderPriceId = activePrices.some(
    (price) => !hasRealProviderPriceId(provider, price.providerPriceId)
  );
  const isProviderBacked = hasRealProductId && hasRealPriceId;
  const isPartiallyLinked = hasRealProductId && !hasRealPriceId;

  return {
    hasRealProductId,
    hasRealPriceId,
    hasPlaceholderPriceId,
    isPartiallyLinked,
    isProviderBacked,
    isDemo: !isProviderBacked,
  };
}

export function getCatalogState(
  products: CatalogProduct[],
  provider: CatalogProvider
): CatalogStateSummary {
  const activeProducts = products.filter((product) => product.active !== false);
  const states = activeProducts.map((product) =>
    getProductCatalogState(product, provider)
  );

  const hasDemoProducts = states.some((state) => state.isDemo);
  const hasProviderBackedProducts = states.some(
    (state) => state.isProviderBacked
  );
  const hasPartiallyLinkedProducts = states.some(
    (state) => state.isPartiallyLinked
  );

  return {
    hasDemoProducts,
    hasProviderBackedProducts,
    hasPartiallyLinkedProducts,
    isDemoCatalog: hasDemoProducts && !hasProviderBackedProducts,
  };
}

export function getProviderDisplayName(provider: CatalogProvider): string {
  if (provider === "none") {
    return "Payments";
  }

  return "Stripe";
}

export function detectProviderEnvironmentMode(
  provider: CatalogProvider
): CatalogEnvironmentMode | null {
  if (provider !== "stripe") {
    return null;
  }

  return inferEnvironmentMode(process.env.STRIPE_SECRET_KEY);
}

function inferEnvironmentMode(
  value: string | undefined
): CatalogEnvironmentMode | null {
  if (!value) {
    return null;
  }

  const normalized = value.toLowerCase();
  if (
    normalized.startsWith("sk_test_") ||
    normalized.startsWith("pk_test_") ||
    normalized.includes("_test_")
  ) {
    return "test";
  }

  if (
    normalized.startsWith("sk_live_") ||
    normalized.startsWith("pk_live_") ||
    normalized.includes("_live_") ||
    normalized.includes("_prod_")
  ) {
    return "production";
  }

  return null;
}

export function normalizeCatalogFeatures(
  features: CatalogFeature[]
): CatalogFeature[] {
  const usedKeys = new Set<string>();

  const normalized = (features || []).map<CatalogFeature | null>(
    (feature, index) => {
      const label =
        typeof feature.label === "string" ? feature.label.trim() : "";
      if (!label) {
        return null;
      }

      const baseKey =
        typeof feature.key === "string" && feature.key.trim().length > 0
          ? feature.key.trim()
          : slugify(label) || `feature_${index + 1}`;

      let uniqueKey = baseKey;
      let suffix = 2;
      while (usedKeys.has(uniqueKey)) {
        uniqueKey = `${baseKey}_${suffix++}`;
      }
      usedKeys.add(uniqueKey);

      return {
        key: uniqueKey,
        label,
      };
    }
  );

  return normalized.filter(
    (feature): feature is CatalogFeature => feature !== null
  );
}

export function validateSaveLocalProductInput(
  input: SaveLocalProductInput
): ValidationResult<SaveLocalProductInput> {
  const productId = input.productId.trim();
  const name = input.name.trim();
  const description = input.description?.trim() || "";
  const badge = input.badge?.trim() || "";
  const providerTaxCode = input.providerTaxCode?.trim() || "";
  const providerTaxBehavior = input.providerTaxBehavior ?? null;
  const currency = input.currency.trim().toUpperCase();
  const normalizedFeatures = normalizeCatalogFeatures(input.features || []);

  if (!productId) {
    return { success: false, error: "Product id is required." };
  }

  if (!name) {
    return { success: false, error: "Product name is required." };
  }

  if (name.length > 120) {
    return {
      success: false,
      error: "Product name must be 120 characters or fewer.",
    };
  }

  if (description.length > 500) {
    return {
      success: false,
      error: "Description must be 500 characters or fewer.",
    };
  }

  if (badge.length > 40) {
    return { success: false, error: "Badge must be 40 characters or fewer." };
  }

  if (providerTaxCode && !/^txcd_[A-Za-z0-9]+$/.test(providerTaxCode)) {
    return {
      success: false,
      error: "Tax category must be a Stripe tax code like txcd_10000000.",
    };
  }

  if (
    providerTaxBehavior !== null &&
    providerTaxBehavior !== "exclusive" &&
    providerTaxBehavior !== "inclusive" &&
    providerTaxBehavior !== "unspecified"
  ) {
    return {
      success: false,
      error: "Tax behavior must be exclusive, inclusive, or unspecified.",
    };
  }

  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
    return { success: false, error: "Amount must be a positive integer." };
  }

  if (!/^[A-Z]{3}$/.test(currency)) {
    return { success: false, error: "Currency must be a valid 3-letter code." };
  }

  if (input.type !== "subscription" && input.type !== "one_time") {
    return { success: false, error: "Invalid product type." };
  }

  if (input.type === "subscription") {
    if (input.interval !== "month" && input.interval !== "year") {
      return {
        success: false,
        error: "Subscriptions must use a monthly or yearly interval.",
      };
    }
  }

  if (input.type === "one_time" && input.interval) {
    return {
      success: false,
      error: "One-time products cannot have a billing interval.",
    };
  }

  return {
    success: true,
    data: {
      productId,
      name,
      description: description || undefined,
      useProviderDescription: Boolean(input.useProviderDescription),
      providerTaxCode: providerTaxCode || undefined,
      providerTaxBehavior,
      badge: badge || undefined,
      type: input.type,
      active: Boolean(input.active),
      amountCents: input.amountCents,
      currency,
      interval:
        input.type === "subscription" ? input.interval || "month" : null,
      features: normalizedFeatures,
    },
  };
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-/g, "_");
}
