"use server";

import { randomUUID } from "node:crypto";
import Stripe from "stripe";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  CatalogEnvironmentMode,
  CatalogFeature,
  CatalogPrice,
  CatalogProduct,
  CatalogProvider,
  CatalogTaxBehavior,
  SaveLocalProductInput,
  detectProviderEnvironmentMode,
  getProductCatalogState,
  hasRealProviderPriceId,
  hasRealProviderProductId,
  normalizeCatalogFeatures,
  validateSaveLocalProductInput,
} from "@/lib/payments/catalog";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type ActionResult = {
  success: boolean;
  error?: string;
  syncedCount?: number;
};

export type StripeTaxCodeOption = {
  id: string;
  name: string;
  description: string | null;
};

export type CreateLocalProductInput = {
  name: string;
  description?: string;
  type: "subscription" | "one_time";
  amountCents: number;
  currency: string;
  interval?: "month" | "year" | null;
  providerTaxCode?: string;
  providerTaxBehavior?: CatalogTaxBehavior;
  active: boolean;
};

type ProductRow = {
  id: string;
  provider_product_id: string | null;
  name: string;
  description: string | null;
  provider_description: string | null;
  use_provider_description: boolean | null;
  badge: string | null;
  sort_order: number;
  type: "subscription" | "one_time";
  provider_tax_code?: string | null;
  provider_tax_behavior?: CatalogTaxBehavior;
  features: unknown;
  active: boolean;
  updated_at: string | null;
  product_prices?: PriceRow[];
};

type StripeProductConfigRow = {
  product_id: string;
  tax_code: string | null;
  tax_behavior: CatalogTaxBehavior;
  updated_at: string | null;
};

type PriceRow = {
  id: string;
  provider: "stripe";
  provider_price_id: string;
  amount_cents: number;
  currency: string;
  interval: "month" | "year" | null;
  trial_days: number | null;
  is_default: boolean;
  active: boolean;
  updated_at: string | null;
};

function getAdminClient() {
  return supabaseAdmin();
}

function getStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY in environment.");
  }
  return new Stripe(secretKey);
}

function normalizeFeatures(input: unknown) {
  if (!Array.isArray(input)) {
    return [];
  }

  return normalizeCatalogFeatures(
    input.map((item) => {
      if (!item || typeof item !== "object") {
        return { label: "" };
      }
      const record = item as Record<string, unknown>;
      return {
        key: typeof record.key === "string" ? record.key : undefined,
        label: typeof record.label === "string" ? record.label : "",
      };
    })
  );
}

function serializeCatalogFeatures(
  features: CatalogFeature[]
): Record<string, unknown>[] {
  return features.map((feature) => ({
    ...(feature.key ? { key: feature.key } : {}),
    label: feature.label,
  }));
}

function mapCatalogProduct(row: ProductRow): CatalogProduct {
  const prices: CatalogPrice[] = (row.product_prices || [])
    .filter((price) => price.provider === "stripe")
    .map((price) => ({
      id: price.id,
      provider: price.provider,
      providerPriceId: price.provider_price_id,
      amountCents: price.amount_cents,
      currency: price.currency,
      interval: price.interval || null,
      trialDays: price.trial_days ?? null,
      isDefault: Boolean(price.is_default),
      active: Boolean(price.active),
      updatedAt: price.updated_at ?? null,
    }));

  return {
    id: row.id,
    providerProductId: row.provider_product_id ?? null,
    name: row.name,
    description: row.description ?? null,
    providerDescription: row.provider_description ?? null,
    useProviderDescription: Boolean(row.use_provider_description),
    providerTaxCode: row.provider_tax_code ?? null,
    providerTaxBehavior: normalizeStripeTaxBehavior(row.provider_tax_behavior),
    badge: row.badge ?? null,
    sortOrder: row.sort_order,
    type: row.type,
    features: normalizeFeatures(row.features),
    active: Boolean(row.active),
    updatedAt: row.updated_at ?? null,
    prices,
  };
}

function sanitizeId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_]+/g, "_");
}

function createLocalProductId(providerProductId: string): string {
  return `stripe_${sanitizeId(providerProductId)}`;
}

function createDraftProductId(name: string): string {
  const base =
    sanitizeId(name.trim().toLowerCase()).replace(/^_+|_+$/g, "") || "product";
  return `local_${base}_${sanitizeId(randomUUID().slice(0, 8))}`;
}

function normalizeCurrency(value: string): string {
  return value.trim().toUpperCase() || "USD";
}

function normalizeStripeTaxCode(value: unknown): string | null {
  if (typeof value === "string") {
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }

  if (value && typeof value === "object" && "id" in value) {
    const id = (value as { id?: unknown }).id;
    if (typeof id === "string") {
      const normalized = id.trim();
      return normalized.length > 0 ? normalized : null;
    }
  }

  return null;
}

function normalizeStripeTaxBehavior(value: unknown): CatalogTaxBehavior {
  return value === "exclusive" ||
    value === "inclusive" ||
    value === "unspecified"
    ? value
    : null;
}

function toIsoNow(): string {
  return new Date().toISOString();
}

async function loadStripeProductConfigMap(productIds?: string[]) {
  const supabase = getAdminClient();
  let query = supabase
    .from("stripe_product_config")
    .select("product_id,tax_code,tax_behavior,updated_at");

  if (productIds && productIds.length > 0) {
    query = query.in("product_id", productIds);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(
      error.message || "Failed to load Stripe product tax settings."
    );
  }

  const configMap = new Map<string, StripeProductConfigRow>();
  for (const row of (data || []) as unknown as StripeProductConfigRow[]) {
    configMap.set(row.product_id, {
      product_id: row.product_id,
      tax_code: row.tax_code ?? null,
      tax_behavior: normalizeStripeTaxBehavior(row.tax_behavior),
      updated_at: row.updated_at ?? null,
    });
  }

  return configMap;
}

async function upsertStripeProductConfig(
  productId: string,
  taxCode: unknown,
  taxBehavior: CatalogTaxBehavior,
  updatedAt: string
) {
  const supabase = getAdminClient();
  const { error } = await supabase.from("stripe_product_config").upsert(
    {
      product_id: productId,
      tax_code: normalizeStripeTaxCode(taxCode),
      tax_behavior: normalizeStripeTaxBehavior(taxBehavior),
      updated_at: updatedAt,
    },
    { onConflict: "product_id" }
  );

  if (error) {
    throw new Error(error.message || "Failed to persist Stripe tax settings.");
  }
}

async function loadStripeCatalogRows(): Promise<ProductRow[]> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      "id,provider_product_id,name,description,provider_description,use_provider_description,badge,sort_order,type,features,active,updated_at,product_prices(id,provider,provider_price_id,amount_cents,currency,interval,trial_days,is_default,active,updated_at)"
    )
    .order("sort_order", { ascending: true })
    .order("is_default", { ascending: false, foreignTable: "product_prices" });

  if (error) {
    throw new Error(error.message || "Failed to load products.");
  }
  const rows = ((data || []) as unknown as ProductRow[]).filter((row) =>
    (row.product_prices || []).some((price) => price.provider === "stripe")
  );
  const configMap = await loadStripeProductConfigMap(rows.map((row) => row.id));

  return rows.map((row) => ({
    ...row,
    provider_tax_code: configMap.get(row.id)?.tax_code ?? null,
    provider_tax_behavior: configMap.get(row.id)?.tax_behavior ?? null,
  }));
}

async function loadStripeCatalogProduct(
  productId: string
): Promise<ProductRow | null> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      "id,provider_product_id,name,description,provider_description,use_provider_description,badge,sort_order,type,features,active,updated_at,product_prices(id,provider,provider_price_id,amount_cents,currency,interval,trial_days,is_default,active,updated_at)"
    )
    .eq("id", productId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Failed to load product.");
  }
  const row = (data as unknown as ProductRow | null) || null;
  if (!row) {
    return null;
  }

  const configMap = await loadStripeProductConfigMap([productId]);
  return {
    ...row,
    provider_tax_code: configMap.get(productId)?.tax_code ?? null,
    provider_tax_behavior: configMap.get(productId)?.tax_behavior ?? null,
  };
}

async function getDefaultStripePrice(
  productId: string
): Promise<PriceRow | null> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("product_prices")
    .select(
      "id,provider,provider_price_id,amount_cents,currency,interval,trial_days,is_default,active,updated_at"
    )
    .eq("product_id", productId)
    .eq("provider", "stripe")
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Failed to load default price.");
  }

  return (data as unknown as PriceRow | null) || null;
}

async function ensureStripeProduct(product: ProductRow): Promise<string> {
  const stripe = getStripeClient();
  const now = toIsoNow();
  const supabase = getAdminClient();

  if (hasRealProviderProductId("stripe", product.provider_product_id)) {
    await stripe.products.update(product.provider_product_id!, {
      name: product.name,
      description: product.description || undefined,
      tax_code: normalizeStripeTaxCode(product.provider_tax_code) || undefined,
      active: product.active,
      metadata: {
        product_id: product.id,
      },
    });
    return product.provider_product_id!;
  }

  const created = await stripe.products.create({
    name: product.name,
    description: product.description || undefined,
    tax_code: normalizeStripeTaxCode(product.provider_tax_code) || undefined,
    active: product.active,
    metadata: {
      product_id: product.id,
    },
  });

  const { error } = await supabase
    .from("products")
    .update({
      provider_product_id: created.id,
      updated_at: now,
    })
    .eq("id", product.id);

  if (error) {
    throw new Error(error.message || "Failed to persist Stripe product id.");
  }

  return created.id;
}

function priceMatchesLocal(
  stripePrice: Stripe.Price,
  localPrice: PriceRow,
  localType: "subscription" | "one_time",
  localTaxBehavior: CatalogTaxBehavior
): boolean {
  const stripeInterval = stripePrice.recurring?.interval || null;
  const localInterval =
    localType === "subscription" ? localPrice.interval || "month" : null;
  const stripeTaxBehavior = stripePrice.tax_behavior || "unspecified";
  const normalizedTaxBehavior = localTaxBehavior || "unspecified";

  return (
    (stripePrice.unit_amount || 0) === localPrice.amount_cents &&
    stripePrice.currency.toUpperCase() ===
      normalizeCurrency(localPrice.currency) &&
    stripeInterval === localInterval &&
    stripeTaxBehavior === normalizedTaxBehavior
  );
}

async function ensureStripePrice(
  product: ProductRow,
  price: PriceRow,
  providerProductId: string
): Promise<string> {
  const stripe = getStripeClient();

  if (hasRealProviderPriceId("stripe", price.provider_price_id)) {
    try {
      const existing = await stripe.prices.retrieve(price.provider_price_id);
      if (
        priceMatchesLocal(
          existing,
          price,
          product.type,
          product.provider_tax_behavior ?? null
        )
      ) {
        if (existing.active !== price.active) {
          await stripe.prices.update(existing.id, { active: price.active });
        }
        return existing.id;
      }
    } catch {
      // Continue with create path below.
    }
  }

  const recurring =
    product.type === "subscription"
      ? { interval: (price.interval || "month") as "month" | "year" }
      : undefined;

  const created = await stripe.prices.create({
    product: providerProductId,
    unit_amount: price.amount_cents,
    currency: normalizeCurrency(price.currency).toLowerCase(),
    recurring,
    tax_behavior:
      normalizeStripeTaxBehavior(product.provider_tax_behavior) || undefined,
    active: price.active,
    metadata: {
      product_id: product.id,
      price_id: price.id,
    },
  });

  return created.id;
}

async function deactivateLocalCatalogEntries(
  syncedProductIds: Set<string>,
  syncedPriceIds: Set<string>,
  now: string
): Promise<void> {
  const supabase = getAdminClient();
  const rows = await loadStripeCatalogRows();

  for (const row of rows) {
    const mapped = mapCatalogProduct(row);
    const state = getProductCatalogState(mapped, "stripe");
    const shouldRemainActive = syncedProductIds.has(row.id);

    if (!shouldRemainActive || state.isDemo || state.isPartiallyLinked) {
      await supabase
        .from("products")
        .update({ active: false, updated_at: now })
        .eq("id", row.id);

      await supabase
        .from("product_prices")
        .update({ active: false, updated_at: now })
        .eq("product_id", row.id)
        .eq("provider", "stripe");
      continue;
    }

    const stalePriceIds = (row.product_prices || [])
      .filter((price) => price.provider === "stripe")
      .filter((price) => !syncedPriceIds.has(price.provider_price_id))
      .map((price) => price.id);

    if (stalePriceIds.length > 0) {
      await supabase
        .from("product_prices")
        .update({ active: false, updated_at: now })
        .in("id", stalePriceIds);
    }
  }
}

export async function listCatalog(): Promise<CatalogProduct[]> {
  await requireAdmin();
  const rows = await loadStripeCatalogRows();
  return rows.map(mapCatalogProduct);
}

export async function getCatalogProvider(): Promise<CatalogProvider> {
  await requireAdmin();
  return "stripe";
}

export async function getCatalogEnvironmentMode(): Promise<CatalogEnvironmentMode | null> {
  await requireAdmin();
  return detectProviderEnvironmentMode("stripe");
}

export async function listStripeTaxCodes(): Promise<StripeTaxCodeOption[]> {
  await requireAdmin();

  try {
    const stripe = getStripeClient();
    const taxCodes = await stripe.taxCodes.list({ limit: 100 });

    return taxCodes.data
      .map((taxCode) => ({
        id: taxCode.id,
        name: taxCode.name,
        description: taxCode.description || null,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

export async function isCatalogEditable(): Promise<boolean> {
  await requireAdmin();
  return true;
}

export async function saveLocalProduct(
  input: SaveLocalProductInput
): Promise<ActionResult> {
  await requireAdmin();

  try {
    const result = await persistLocalProductChanges(input);
    if (!result.success) {
      return result;
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to save product changes.",
    };
  }
}

async function persistLocalProductChanges(
  input: SaveLocalProductInput
): Promise<ActionResult> {
  const validation = validateSaveLocalProductInput(input);
  if (!validation.success) {
    return { success: false, error: validation.error };
  }

  const normalized = validation.data!;
  const supabase = getAdminClient();
  const now = toIsoNow();

  const { data: existingProduct, error: existingProductError } = await supabase
    .from("products")
    .select("id")
    .eq("id", normalized.productId)
    .maybeSingle();

  if (existingProductError) {
    throw new Error(existingProductError.message || "Failed to load product.");
  }
  if (!existingProduct) {
    return { success: false, error: "Product not found." };
  }

  const { error: productError } = await supabase
    .from("products")
    .update({
      name: normalized.name,
      description: normalized.description || null,
      use_provider_description: Boolean(normalized.useProviderDescription),
      badge: normalized.badge || null,
      type: normalized.type,
      features: serializeCatalogFeatures(normalized.features),
      active: normalized.active,
      updated_at: now,
    })
    .eq("id", normalized.productId);

  if (productError) {
    throw new Error(productError.message || "Failed to update product.");
  }

  await upsertStripeProductConfig(
    normalized.productId,
    normalized.providerTaxCode || null,
    normalized.providerTaxBehavior ?? null,
    now
  );

  const existingPrice = await getDefaultStripePrice(normalized.productId);
  if (existingPrice) {
    const { error: priceUpdateError } = await supabase
      .from("product_prices")
      .update({
        amount_cents: Math.floor(normalized.amountCents),
        currency: normalizeCurrency(normalized.currency),
        interval:
          normalized.type === "subscription"
            ? normalized.interval || "month"
            : null,
        active: normalized.active,
        updated_at: now,
      })
      .eq("id", existingPrice.id);

    if (priceUpdateError) {
      throw new Error(
        priceUpdateError.message || "Failed to update default price."
      );
    }
  } else {
    const placeholderProviderPriceId = `__VG_STRIPE_LOCAL_${sanitizeId(
      `${normalized.productId}_${randomUUID()}`
    ).toUpperCase()}__`;

    const { error: priceInsertError } = await supabase
      .from("product_prices")
      .insert({
        product_id: normalized.productId,
        provider: "stripe",
        provider_price_id: placeholderProviderPriceId,
        amount_cents: Math.floor(normalized.amountCents),
        currency: normalizeCurrency(normalized.currency),
        interval:
          normalized.type === "subscription"
            ? normalized.interval || "month"
            : null,
        is_default: true,
        active: normalized.active,
        updated_at: now,
      });

    if (priceInsertError) {
      throw new Error(
        priceInsertError.message || "Failed to create default price."
      );
    }
  }

  return { success: true };
}

export async function createLocalProduct(
  input: CreateLocalProductInput
): Promise<ActionResult> {
  await requireAdmin();

  try {
    const name = input.name.trim();
    const description = input.description?.trim() || "";
    const currency = normalizeCurrency(input.currency);
    const type = input.type === "one_time" ? "one_time" : "subscription";
    const interval = type === "subscription" ? input.interval || "month" : null;
    const providerTaxCode = normalizeStripeTaxCode(input.providerTaxCode);
    const providerTaxBehavior = normalizeStripeTaxBehavior(
      input.providerTaxBehavior
    );

    if (!name) {
      return { success: false, error: "Product name is required." };
    }

    if (description.length > 500) {
      return {
        success: false,
        error: "Description must be 500 characters or fewer.",
      };
    }

    if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
      return {
        success: false,
        error: "Amount must be a positive whole number.",
      };
    }

    if (!/^[A-Z]{3}$/.test(currency)) {
      return {
        success: false,
        error: "Currency must be a valid 3-letter code.",
      };
    }

    if (providerTaxCode && !/^txcd_[A-Za-z0-9]+$/.test(providerTaxCode)) {
      return {
        success: false,
        error: "Tax category must be a Stripe tax code like txcd_10000000.",
      };
    }

    if (
      type === "subscription" &&
      interval !== "month" &&
      interval !== "year"
    ) {
      return {
        success: false,
        error: "Subscriptions must use a monthly or yearly interval.",
      };
    }

    const supabase = getAdminClient();
    const now = toIsoNow();
    const { count, error: countError } = await supabase
      .from("products")
      .select("id", { count: "exact", head: true });

    if (countError) {
      throw new Error(
        countError.message || "Failed to determine product order."
      );
    }

    const productId = createDraftProductId(name);
    const placeholderProviderPriceId = `__VG_STRIPE_LOCAL_${sanitizeId(
      `${productId}_${randomUUID()}`
    ).toUpperCase()}__`;

    const { error: productInsertError } = await supabase
      .from("products")
      .insert({
        id: productId,
        provider_product_id: null,
        name,
        description: description || null,
        provider_description: null,
        use_provider_description: false,
        badge: null,
        sort_order: Number(count || 0) + 1,
        type,
        features: [],
        active: Boolean(input.active),
        updated_at: now,
      });

    if (productInsertError) {
      throw new Error(
        productInsertError.message || "Failed to create product."
      );
    }

    await upsertStripeProductConfig(
      productId,
      providerTaxCode,
      providerTaxBehavior,
      now
    );

    const { error: priceInsertError } = await supabase
      .from("product_prices")
      .insert({
        product_id: productId,
        provider: "stripe",
        provider_price_id: placeholderProviderPriceId,
        amount_cents: Math.floor(input.amountCents),
        currency,
        interval,
        trial_days: null,
        is_default: true,
        active: Boolean(input.active),
        updated_at: now,
      });

    if (priceInsertError) {
      throw new Error(
        priceInsertError.message || "Failed to create default price."
      );
    }

    const createdProduct = await loadStripeCatalogProduct(productId);
    if (!createdProduct) {
      throw new Error("Failed to load newly created product.");
    }

    const defaultPrice = await getDefaultStripePrice(productId);
    if (!defaultPrice) {
      throw new Error("New product is missing a default Stripe price.");
    }

    const providerProductId = await ensureStripeProduct(createdProduct);
    const providerPriceId = await ensureStripePrice(
      createdProduct,
      defaultPrice,
      providerProductId
    );

    const { error: providerPricePersistError } = await supabase
      .from("product_prices")
      .update({
        provider_price_id: providerPriceId,
        provider: "stripe",
        updated_at: now,
      })
      .eq("id", defaultPrice.id);

    if (providerPricePersistError) {
      throw new Error(
        providerPricePersistError.message ||
          "Failed to persist Stripe price id."
      );
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create product.",
    };
  }
}

export async function pushProductToProvider(
  productId: string,
  input?: SaveLocalProductInput
): Promise<ActionResult> {
  await requireAdmin();

  try {
    if (input) {
      const saveResult = await persistLocalProductChanges(input);
      if (!saveResult.success) {
        return saveResult;
      }
    }

    const product = await loadStripeCatalogProduct(productId);
    if (!product) {
      return { success: false, error: "Product not found." };
    }

    const defaultPrice = await getDefaultStripePrice(product.id);
    if (!defaultPrice) {
      return { success: false, error: "Product has no default Stripe price." };
    }

    const now = toIsoNow();
    const supabase = getAdminClient();
    const providerProductId = await ensureStripeProduct(product as ProductRow);
    const providerPriceId = await ensureStripePrice(
      product as ProductRow,
      defaultPrice,
      providerProductId
    );

    const { error: updatePriceError } = await supabase
      .from("product_prices")
      .update({
        provider_price_id: providerPriceId,
        provider: "stripe",
        active: product.active,
        updated_at: now,
      })
      .eq("id", defaultPrice.id);

    if (updatePriceError) {
      throw new Error(
        updatePriceError.message || "Failed to persist Stripe price id."
      );
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to push product to Stripe.",
    };
  }
}

export async function archiveProduct(productId: string): Promise<ActionResult> {
  await requireAdmin();

  try {
    const product = await loadStripeCatalogProduct(productId);
    if (!product) {
      return { success: false, error: "Product not found." };
    }

    const supabase = getAdminClient();
    const now = toIsoNow();
    const stripe = getStripeClient();

    if (hasRealProviderProductId("stripe", product.provider_product_id)) {
      await stripe.products.update(product.provider_product_id!, {
        active: false,
      });
    }

    for (const price of (product.product_prices || []).filter(
      (entry) => entry.provider === "stripe"
    )) {
      if (hasRealProviderPriceId("stripe", price.provider_price_id)) {
        try {
          await stripe.prices.update(price.provider_price_id, {
            active: false,
          });
        } catch {
          // Preserve local archival even if the remote object no longer exists.
        }
      }
    }

    const { error: productError } = await supabase
      .from("products")
      .update({ active: false, updated_at: now })
      .eq("id", productId);

    if (productError) {
      throw new Error(productError.message || "Failed to archive product.");
    }

    const { error: priceError } = await supabase
      .from("product_prices")
      .update({ active: false, updated_at: now })
      .eq("product_id", productId)
      .eq("provider", "stripe");

    if (priceError) {
      throw new Error(
        priceError.message || "Failed to archive product prices."
      );
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to archive product.",
    };
  }
}

export async function moveProduct(
  productId: string,
  direction: "up" | "down"
): Promise<ActionResult> {
  await requireAdmin();

  try {
    const rows = await loadStripeCatalogRows();
    const index = rows.findIndex((row) => row.id === productId);
    if (index === -1) {
      return { success: false, error: "Product not found." };
    }

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= rows.length) {
      return { success: false, error: `Product cannot move ${direction}.` };
    }

    const supabase = getAdminClient();
    const now = toIsoNow();
    const current = rows[index];
    const target = rows[targetIndex];

    const { error: firstError } = await supabase
      .from("products")
      .update({ sort_order: target.sort_order, updated_at: now })
      .eq("id", current.id);

    if (firstError) {
      throw new Error(firstError.message || "Failed to move product.");
    }

    const { error: secondError } = await supabase
      .from("products")
      .update({ sort_order: current.sort_order, updated_at: now })
      .eq("id", target.id);

    if (secondError) {
      throw new Error(secondError.message || "Failed to move product.");
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to reorder products.",
    };
  }
}

export async function syncFromProvider(): Promise<ActionResult> {
  await requireAdmin();

  try {
    const stripe = getStripeClient();
    const supabase = getAdminClient();
    const now = toIsoNow();

    const [stripeProducts, stripePrices] = await Promise.all([
      stripe.products.list({ limit: 100 }),
      stripe.prices.list({ limit: 100 }),
    ]);

    if (stripeProducts.data.length === 0) {
      return {
        success: false,
        error: "No products found in Stripe to sync.",
      };
    }

    const productByProviderId = new Map<string, ProductRow>();
    const existingProducts = await loadStripeCatalogRows();

    for (const row of existingProducts) {
      if (hasRealProviderProductId("stripe", row.provider_product_id)) {
        productByProviderId.set(row.provider_product_id!, {
          id: row.id,
          provider_product_id: row.provider_product_id,
          name: "",
          description: row.description ?? null,
          provider_description: null,
          use_provider_description: row.use_provider_description ?? false,
          provider_tax_code: row.provider_tax_code ?? null,
          provider_tax_behavior: row.provider_tax_behavior ?? null,
          badge: row.badge ?? null,
          sort_order: row.sort_order ?? 0,
          type: "one_time",
          features: serializeCatalogFeatures(normalizeFeatures(row.features)),
          active: true,
          updated_at: null,
        });
      }
    }

    const pricesByProductId = new Map<string, Stripe.Price[]>();
    for (const price of stripePrices.data) {
      const providerProductId =
        typeof price.product === "string" ? price.product : price.product?.id;
      if (!providerProductId) {
        continue;
      }
      const list = pricesByProductId.get(providerProductId) || [];
      list.push(price);
      pricesByProductId.set(providerProductId, list);
    }

    const syncedProductIds = new Set<string>();
    const syncedProviderPriceIds = new Set<string>();
    let syncedCount = 0;

    for (const [index, stripeProduct] of stripeProducts.data.entries()) {
      const providerProductId = stripeProduct.id;
      const providerPrices = pricesByProductId.get(providerProductId) || [];
      const inferredType: "subscription" | "one_time" = providerPrices.some(
        (price) => Boolean(price.recurring)
      )
        ? "subscription"
        : "one_time";

      const existingLocal = productByProviderId.get(providerProductId);
      const localProductId =
        existingLocal?.id || createLocalProductId(providerProductId);

      const { error: upsertProductError } = await supabase
        .from("products")
        .upsert(
          {
            id: localProductId,
            provider_product_id: providerProductId,
            name: stripeProduct.name,
            description: existingLocal?.description ?? null,
            provider_description: stripeProduct.description || null,
            use_provider_description:
              existingLocal?.use_provider_description ?? false,
            badge: existingLocal?.badge ?? null,
            sort_order: existingLocal?.sort_order ?? index + 1,
            type: inferredType,
            features: serializeCatalogFeatures(
              normalizeFeatures(existingLocal?.features)
            ),
            active: stripeProduct.active,
            updated_at: now,
          },
          { onConflict: "id" }
        );

      if (upsertProductError) {
        throw new Error(
          upsertProductError.message || "Failed to upsert product from Stripe."
        );
      }

      syncedProductIds.add(localProductId);

      const defaultProviderPrice = providerPrices[0];
      await upsertStripeProductConfig(
        localProductId,
        stripeProduct.tax_code || null,
        normalizeStripeTaxBehavior(defaultProviderPrice?.tax_behavior),
        now
      );

      for (const [priceIndex, price] of providerPrices.entries()) {
        if (price.unit_amount === null) {
          continue;
        }

        const recurringInterval = price.recurring?.interval;
        const normalizedInterval =
          recurringInterval === "month" || recurringInterval === "year"
            ? recurringInterval
            : null;

        const { error: upsertPriceError } = await supabase
          .from("product_prices")
          .upsert(
            {
              product_id: localProductId,
              provider: "stripe",
              provider_price_id: price.id,
              amount_cents: price.unit_amount,
              currency: normalizeCurrency(price.currency),
              interval: normalizedInterval,
              trial_days: null,
              is_default: priceIndex === 0,
              active: price.active,
              updated_at: now,
            },
            { onConflict: "provider,provider_price_id" }
          );

        if (upsertPriceError) {
          throw new Error(
            upsertPriceError.message || "Failed to upsert price from Stripe."
          );
        }

        syncedProviderPriceIds.add(price.id);
      }

      syncedCount += 1;
    }

    await deactivateLocalCatalogEntries(
      syncedProductIds,
      syncedProviderPriceIds,
      now
    );

    return {
      success: true,
      syncedCount,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to sync catalog from Stripe.",
    };
  }
}
