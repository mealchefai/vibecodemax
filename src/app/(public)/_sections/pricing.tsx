import { createSupabaseReadOnlyClient } from "@/lib/supabase/server";
import {
  CatalogProduct,
  CatalogProvider,
  getCatalogState,
} from "@/lib/payments/catalog";
import {
  PricingSectionClient,
  PricingProduct,
  PricingPrice,
} from "./pricing-client";

type PricingProvider = "stripe";

type PricingPriceRow = PricingPrice & {
  active?: boolean;
  provider?: PricingProvider;
};

interface ProductRow {
  id: string;
  provider_product_id?: string | null;
  name: string;
  description?: string | null;
  provider_description?: string | null;
  use_provider_description?: boolean | null;
  badge?: string | null;
  sort_order: number;
  type: "subscription" | "one_time";
  features?: Array<{ key: string; label: string }>;
  product_prices?: PricingPriceRow[];
}

const DEMO_CATALOG_NOTICE = null;
const ACTIVE_PRICING_PROVIDER = "stripe" as PricingProvider;

function deriveBillingMode(
  products: PricingProduct[]
): "subscriptions" | "one_time" | "mixed" {
  const hasSubscription = products.some(
    (product) => product.type === "subscription"
  );
  const hasOneTime = products.some((product) => product.type === "one_time");

  if (hasSubscription && hasOneTime) return "mixed";
  if (hasSubscription) return "subscriptions";
  return "one_time";
}

function normalizeProducts(products: ProductRow[]): PricingProduct[] {
  return products
    .map((product) => ({
      id: product.id,
      name: product.name,
      description:
        product.use_provider_description && product.provider_description
          ? product.provider_description
          : product.description,
      badge: product.badge,
      sort_order: product.sort_order,
      type: product.type,
      features: product.features || [],
      prices: getActiveProviderPrices(product),
    }))
    .filter((product) => product.prices.length > 0);
}

function getActiveProviderPrices(product: ProductRow): PricingPriceRow[] {
  return (product.product_prices || []).filter(
    (price) =>
      price.active !== false && price.provider === ACTIVE_PRICING_PROVIDER
  );
}

function toCatalogProducts(products: ProductRow[]): CatalogProduct[] {
  return products.map((product) => ({
    id: product.id,
    providerProductId: product.provider_product_id ?? null,
    name: product.name,
    description: product.description ?? null,
    providerDescription: product.provider_description ?? null,
    useProviderDescription: Boolean(product.use_provider_description),
    badge: product.badge ?? null,
    sortOrder: product.sort_order,
    type: product.type,
    features: product.features || [],
    active: true,
    updatedAt: null,
    prices: getActiveProviderPrices(product).map((price) => ({
      id: price.id,
      provider: price.provider || ACTIVE_PRICING_PROVIDER,
      providerPriceId: price.provider_price_id,
      amountCents: price.amount_cents,
      currency: price.currency,
      interval: price.interval || null,
      trialDays: price.trial_days ?? null,
      isDefault: price.is_default,
      active: price.active !== false,
      updatedAt: null,
    })),
  }));
}

async function fetchPricingProducts(): Promise<ProductRow[]> {
  try {
    const supabase = await createSupabaseReadOnlyClient();
    const { data, error } = await supabase
      .from("products")
      .select(
        "id,provider_product_id,name,description,provider_description,use_provider_description,badge,sort_order,type,features,product_prices(id,provider,provider_price_id,amount_cents,currency,interval,trial_days,is_default,active)"
      )
      .filter("active", "eq", "true")
      .order("sort_order", { ascending: true })
      .order("is_default", {
        ascending: false,
        foreignTable: "product_prices",
      });

    if (error) {
      console.error("Failed to load pricing products:", error);
      return [];
    }

    return (data as unknown as ProductRow[]) || [];
  } catch (error) {
    console.warn("Pricing products unavailable during build/runtime:", error);
    return [];
  }
}

export async function PricingSection() {
  const productRows = await fetchPricingProducts();
  const products = normalizeProducts(productRows);

  if (!products.length) {
    return null;
  }

  const catalogState = getCatalogState(
    toCatalogProducts(productRows),
    ACTIVE_PRICING_PROVIDER as CatalogProvider
  );
  const billingMode = deriveBillingMode(products);

  return (
    <>
      {DEMO_CATALOG_NOTICE && catalogState.isDemoCatalog ? (
        <section className="pb-4 md:pb-6">
          <div className="container mx-auto px-container-mobile md:px-container max-w-page">
            <div className="mx-auto max-w-4xl rounded-xl border border-border bg-surface/80 p-4 text-sm text-text-secondary">
              {DEMO_CATALOG_NOTICE}
            </div>
          </div>
        </section>
      ) : null}
      <PricingSectionClient billingMode={billingMode} products={products} />
    </>
  );
}
