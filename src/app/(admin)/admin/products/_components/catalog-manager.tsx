"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  archiveProduct,
  createLocalProduct,
  type StripeTaxCodeOption,
  moveProduct,
  pushProductToProvider,
  syncFromProvider,
} from "../actions";
import {
  CatalogEnvironmentMode,
  CatalogFeature,
  CatalogProduct,
  CatalogProvider,
  CatalogTaxBehavior,
  COMMON_CURRENCY_OPTIONS,
  getCatalogState,
  getProductCatalogState,
  getProviderDisplayName,
} from "@/lib/payments/catalog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Modal,
  ModalClose,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";

// ─── Types ────────────────────────────────────────────────────────────────────

type ProductFormState = {
  name: string;
  description: string;
  useProviderDescription: boolean;
  providerDescription: string;
  providerTaxCode: string;
  providerTaxBehavior: Exclude<CatalogTaxBehavior, null>;
  badge: string;
  type: "subscription" | "one_time";
  active: boolean;
  amountCents: string;
  currency: string;
  interval: "month" | "year" | "";
  features: CatalogFeature[];
};

type NewProductFormState = {
  name: string;
  description: string;
  providerTaxCode: string;
  providerTaxBehavior: Exclude<CatalogTaxBehavior, null>;
  type: "subscription" | "one_time";
  amountCents: string;
  currency: string;
  interval: "month" | "year" | "";
  active: boolean;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDefaultPrice(product: CatalogProduct) {
  return (
    product.prices.find((price) => price.isDefault) || product.prices[0] || null
  );
}

function toFormState(product: CatalogProduct): ProductFormState {
  const defaultPrice = getDefaultPrice(product);
  return {
    name: product.name,
    description: product.description || "",
    useProviderDescription: Boolean(product.useProviderDescription),
    providerDescription: product.providerDescription || "",
    providerTaxCode: product.providerTaxCode || "",
    providerTaxBehavior: product.providerTaxBehavior || "unspecified",
    badge: product.badge || "",
    type: product.type,
    active: product.active,
    amountCents: String(defaultPrice?.amountCents || ""),
    currency: defaultPrice?.currency || "USD",
    interval: defaultPrice?.interval || "",
    features: product.features,
  };
}

function validateFormState(state: ProductFormState): string | null {
  const name = state.name.trim();
  const currency = state.currency.trim().toUpperCase();
  const amountCents = Number(state.amountCents);

  if (!name) return "Product name is required.";
  if (!Number.isInteger(amountCents) || amountCents <= 0)
    return "Amount must be a positive whole number.";
  if (!/^[A-Z]{3}$/.test(currency))
    return "Currency must be a valid 3-letter code.";
  if (
    state.providerTaxCode.trim().length > 0 &&
    !/^txcd_[A-Za-z0-9]+$/.test(state.providerTaxCode.trim())
  )
    return "Tax category must be a Stripe tax code like txcd_10000000.";
  if (
    state.type === "subscription" &&
    state.interval !== "month" &&
    state.interval !== "year"
  )
    return "Subscriptions must use a monthly or yearly interval.";
  if (state.type === "one_time" && state.interval)
    return "One-time products cannot use a billing interval.";
  if (state.features.some((f) => f.label.trim().length === 0))
    return "Feature labels cannot be empty.";
  return null;
}

const STRIPE_TAX_BEHAVIOR_OPTIONS: Array<{
  value: Exclude<CatalogTaxBehavior, null>;
  label: string;
}> = [
  { value: "unspecified", label: "Use Stripe default" },
  { value: "exclusive", label: "Exclusive" },
  { value: "inclusive", label: "Inclusive" },
];

function isKnownStripeTaxCode(
  value: string,
  taxCodeOptions: StripeTaxCodeOption[]
) {
  return taxCodeOptions.some((option) => option.id === value);
}

function renderStripeTaxCodeItems(
  taxCodeOptions: StripeTaxCodeOption[],
  currentValue?: string
) {
  const normalizedCurrentValue = currentValue?.trim() || "";
  const items = [
    <SelectItem key="__default" value="__default">
      Use Stripe default
    </SelectItem>,
  ];

  if (
    normalizedCurrentValue &&
    !isKnownStripeTaxCode(normalizedCurrentValue, taxCodeOptions)
  ) {
    items.push(
      <SelectItem key={normalizedCurrentValue} value={normalizedCurrentValue}>
        Current unlisted code ({normalizedCurrentValue})
      </SelectItem>
    );
  }

  for (const option of taxCodeOptions) {
    items.push(
      <SelectItem key={option.id} value={option.id}>
        {option.name}
      </SelectItem>
    );
  }

  return items;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function EnvironmentLabel({
  provider,
  mode,
}: {
  provider: CatalogProvider;
  mode: CatalogEnvironmentMode | null;
}) {
  if (!mode) return null;
  const providerLabel = getProviderDisplayName(provider);
  const isTest = mode === "test";
  return (
    <div
      className={`flex items-center gap-2.5 rounded-lg border px-4 py-2.5 ${
        isTest
          ? "border-warning/30 bg-warning/5"
          : "border-success/30 bg-success/5"
      }`}
    >
      <span
        className={`inline-block h-2 w-2 shrink-0 rounded-full ${
          isTest ? "bg-warning" : "bg-success"
        }`}
      />
      <span className="text-sm font-medium text-text-primary">
        {providerLabel} {isTest ? "test mode" : "production mode"}
      </span>
      <span className="text-sm text-text-secondary">
        —{" "}
        {isTest
          ? "Publish, archive, and sync actions affect your test catalog only."
          : "Publish, archive, and sync actions affect your live catalog."}
      </span>
    </div>
  );
}

// Inline segmented toggle between "Custom" copy and provider description.
function DescriptionSourceToggle({
  useProvider,
  providerName,
  onChange,
}: {
  useProvider: boolean;
  providerName: string;
  onChange: (v: boolean) => void;
}) {
  return (
    <div
      className="inline-flex overflow-hidden rounded-md border border-border text-xs font-medium"
      role="group"
      aria-label="Description source"
    >
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`px-4 py-2 transition-colors ${
          !useProvider
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-text-secondary hover:bg-muted/70"
        }`}
      >
        Custom
      </button>
      <button
        type="button"
        onClick={() => onChange(true)}
        className={`border-l border-border px-4 py-2 transition-colors ${
          useProvider
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-text-secondary hover:bg-muted/70"
        }`}
      >
        {providerName}
      </button>
    </div>
  );
}

function CurrencyOptions({
  onSelect,
}: {
  onSelect: (currency: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        className="text-xs text-primary hover:text-secondary transition-colors duration-fast"
        onClick={() => setOpen((v) => !v)}
      >
        Common codes
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-2 min-w-[10rem] rounded-lg border border-border bg-surface p-1 ">
            {COMMON_CURRENCY_OPTIONS.map((currency) => (
              <button
                key={currency}
                type="button"
                className="w-full rounded-md px-3 py-1.5 text-left text-sm text-text-primary hover:bg-muted transition-colors duration-fast"
                onClick={() => {
                  onSelect(currency);
                  setOpen(false);
                }}
              >
                {currency}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function AddProductButton({
  provider,
  taxCodeOptions,
  onComplete,
}: {
  provider: CatalogProvider;
  taxCodeOptions: StripeTaxCodeOption[];
  onComplete: (message: { type: "success" | "error"; text: string }) => void;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<NewProductFormState>({
    name: "",
    description: "",
    providerTaxCode: "",
    providerTaxBehavior: "unspecified",
    type: "subscription",
    amountCents: "",
    currency: "USD",
    interval: "month",
    active: true,
  });
  const providerLabel = getProviderDisplayName(provider);

  function resetForm() {
    setFormData({
      name: "",
      description: "",
      providerTaxCode: "",
      providerTaxBehavior: "unspecified",
      type: "subscription",
      amountCents: "",
      currency: "USD",
      interval: "month",
      active: true,
    });
    setError(null);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const name = formData.name.trim();
    const amountCents = Number(formData.amountCents);
    const currency = formData.currency.trim().toUpperCase();

    if (!name) {
      setError("Product name is required.");
      return;
    }
    if (!Number.isInteger(amountCents) || amountCents <= 0) {
      setError("Amount must be a positive whole number.");
      return;
    }
    if (!/^[A-Z]{3}$/.test(currency)) {
      setError("Currency must be a valid 3-letter code.");
      return;
    }
    if (
      formData.providerTaxCode.trim().length > 0 &&
      !/^txcd_[A-Za-z0-9]+$/.test(formData.providerTaxCode.trim())
    ) {
      setError("Tax category must be a Stripe tax code like txcd_10000000.");
      return;
    }
    if (
      formData.type === "subscription" &&
      formData.interval !== "month" &&
      formData.interval !== "year"
    ) {
      setError("Subscriptions must use a monthly or yearly interval.");
      return;
    }

    startTransition(async () => {
      const result = await createLocalProduct({
        name,
        description: formData.description,
        type: formData.type,
        amountCents,
        currency,
        interval:
          formData.type === "subscription"
            ? formData.interval || "month"
            : null,
        providerTaxCode: formData.providerTaxCode,
        providerTaxBehavior: formData.providerTaxBehavior,
        active: formData.active,
      });

      if (!result.success) {
        const message = result.error || "Failed to create product.";
        setError(message);
        onComplete({ type: "error", text: message });
        return;
      }

      onComplete({
        type: "success",
        text: `Created and published product to ${providerLabel}.`,
      });
      setIsOpen(false);
      resetForm();
      router.refresh();
    });
  }

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        <svg
          className="h-4 w-4 mr-2"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </svg>
        Add Product
      </Button>

      <Modal
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) resetForm();
        }}
      >
        <ModalContent className="max-w-md">
          <ModalHeader>
            <ModalTitle>Add Product</ModalTitle>
            <ModalDescription>
              Create and publish a new product to {providerLabel}
            </ModalDescription>
          </ModalHeader>

          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="new-product-name">Name</Label>
                <Input
                  id="new-product-name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((c) => ({ ...c, name: e.target.value }))
                  }
                  placeholder="Enter product name"
                  disabled={isPending}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="new-product-description">Description</Label>
                <Textarea
                  id="new-product-description"
                  rows={3}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((c) => ({ ...c, description: e.target.value }))
                  }
                  placeholder="Enter product description"
                  disabled={isPending}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="new-product-type">Type</Label>
                  <select
                    id="new-product-type"
                    value={formData.type}
                    onChange={(e) =>
                      setFormData((c) => ({
                        ...c,
                        type:
                          e.target.value === "one_time"
                            ? "one_time"
                            : "subscription",
                        interval:
                          e.target.value === "one_time"
                            ? ""
                            : c.interval || "month",
                      }))
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    disabled={isPending}
                  >
                    <option value="subscription">Subscription</option>
                    <option value="one_time">One-time</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-product-interval">Interval</Label>
                  <select
                    id="new-product-interval"
                    value={formData.interval}
                    disabled={isPending || formData.type === "one_time"}
                    onChange={(e) =>
                      setFormData((c) => ({
                        ...c,
                        interval:
                          e.target.value === "year"
                            ? "year"
                            : e.target.value === "month"
                              ? "month"
                              : "",
                      }))
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
                  >
                    {formData.type === "one_time" ? (
                      <option value="">Not applicable</option>
                    ) : null}
                    <option value="month">Monthly</option>
                    <option value="year">Annual</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="new-product-tax-code">Tax category</Label>
                  <Select
                    value={formData.providerTaxCode || "__default"}
                    onValueChange={(value) =>
                      setFormData((c) => ({
                        ...c,
                        providerTaxCode: value === "__default" ? "" : value,
                      }))
                    }
                    disabled={isPending}
                  >
                    <SelectTrigger id="new-product-tax-code">
                      <SelectValue placeholder="Use Stripe default" />
                    </SelectTrigger>
                    <SelectContent>
                      {renderStripeTaxCodeItems(
                        taxCodeOptions,
                        formData.providerTaxCode
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-product-tax-behavior">Tax behavior</Label>
                  <select
                    id="new-product-tax-behavior"
                    value={formData.providerTaxBehavior}
                    onChange={(e) =>
                      setFormData((c) => ({
                        ...c,
                        providerTaxBehavior:
                          e.target.value === "exclusive" ||
                          e.target.value === "inclusive"
                            ? e.target.value
                            : "unspecified",
                      }))
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    disabled={isPending}
                  >
                    {STRIPE_TAX_BEHAVIOR_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="new-product-amount">Amount (cents)</Label>
                  <Input
                    id="new-product-amount"
                    type="number"
                    min={1}
                    step={1}
                    value={formData.amountCents}
                    onChange={(e) =>
                      setFormData((c) => ({
                        ...c,
                        amountCents: e.target.value,
                      }))
                    }
                    placeholder="e.g. 1900"
                    disabled={isPending}
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="new-product-currency">Currency</Label>
                    <CurrencyOptions
                      onSelect={(currency) =>
                        setFormData((c) => ({ ...c, currency }))
                      }
                    />
                  </div>
                  <Input
                    id="new-product-currency"
                    maxLength={3}
                    value={formData.currency}
                    onChange={(e) =>
                      setFormData((c) => ({
                        ...c,
                        currency: e.target.value.toUpperCase(),
                      }))
                    }
                    disabled={isPending}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/20 px-4 py-3">
                <Switch
                  id="new-product-active"
                  checked={formData.active}
                  onCheckedChange={(checked) =>
                    setFormData((c) => ({ ...c, active: checked }))
                  }
                  disabled={isPending}
                />
                <Label
                  htmlFor="new-product-active"
                  className="text-sm font-medium cursor-pointer"
                >
                  Visible in catalog
                </Label>
              </div>

              {error && (
                <div className="rounded-lg border border-danger/20 bg-danger/10 p-3">
                  <p className="text-sm text-danger">{error}</p>
                </div>
              )}
            </div>

            <ModalFooter>
              <ModalClose asChild>
                <Button variant="outline" type="button" disabled={isPending}>
                  Cancel
                </Button>
              </ModalClose>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Creating..." : "Create Product"}
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>
    </>
  );
}

// ─── ProductEditor ─────────────────────────────────────────────────────────────
// Uses plain <div> sections inside <Card> to guarantee predictable padding —
// avoids CardHeader/CardContent shorthand-padding conflicts with overrides.

function ProductEditor({
  provider,
  product,
  taxCodeOptions,
  index,
  total,
  editable,
  onComplete,
}: {
  provider: CatalogProvider;
  product: CatalogProduct;
  taxCodeOptions: StripeTaxCodeOption[];
  index: number;
  total: number;
  editable: boolean;
  onComplete: (message: { type: "success" | "error"; text: string }) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<ProductFormState>(() =>
    toFormState(product)
  );
  const [saveStatus, setSaveStatus] = useState<"success" | "error" | null>(
    null
  );
  const [saveError, setSaveError] = useState<string | null>(null);
  const providerLabel = getProviderDisplayName(provider);
  const defaultPrice = getDefaultPrice(product);
  const state = getProductCatalogState(product, provider);
  const publishLabel = state.isProviderBacked
    ? "Update"
    : `Publish to ${providerLabel}`;

  const originalForm = useMemo(() => toFormState(product), [product]);
  const isDirty = useMemo(
    () =>
      form.name !== originalForm.name ||
      form.description !== originalForm.description ||
      form.useProviderDescription !== originalForm.useProviderDescription ||
      form.providerTaxCode !== originalForm.providerTaxCode ||
      form.providerTaxBehavior !== originalForm.providerTaxBehavior ||
      form.badge !== originalForm.badge ||
      form.type !== originalForm.type ||
      form.active !== originalForm.active ||
      form.amountCents !== originalForm.amountCents ||
      form.currency !== originalForm.currency ||
      form.interval !== originalForm.interval ||
      JSON.stringify(form.features) !== JSON.stringify(originalForm.features),
    [form, originalForm]
  );

  useEffect(() => {
    if (saveStatus !== "success") return;
    const id = window.setTimeout(() => setSaveStatus(null), 2500);
    return () => window.clearTimeout(id);
  }, [saveStatus]);

  const priceLabel = defaultPrice
    ? `${(defaultPrice.amountCents / 100).toFixed(2)} ${defaultPrice.currency}${
        defaultPrice.interval ? ` / ${defaultPrice.interval}` : " · one-time"
      }`
    : null;

  function handlePublish() {
    const validationError = validateFormState(form);
    if (validationError) {
      setSaveError(validationError);
      setSaveStatus("error");
      return;
    }
    startTransition(async () => {
      const result = await pushProductToProvider(product.id, {
        productId: product.id,
        name: form.name,
        description: form.description,
        useProviderDescription: form.useProviderDescription,
        providerTaxCode: form.providerTaxCode,
        providerTaxBehavior: form.providerTaxBehavior,
        badge: form.badge,
        type: form.type,
        active: form.active,
        amountCents: Number(form.amountCents),
        currency: form.currency,
        interval:
          form.type === "subscription" ? form.interval || "month" : null,
        features: form.features,
      });
      if (!result.success) {
        setSaveError(result.error || `Failed to publish ${product.name}.`);
        setSaveStatus("error");
        return;
      }
      setSaveError(null);
      setSaveStatus("success");
      router.refresh();
    });
  }

  function handleArchive() {
    startTransition(async () => {
      const result = await archiveProduct(product.id);
      if (!result.success) {
        onComplete({
          type: "error",
          text: result.error || `Failed to archive ${product.name}.`,
        });
        return;
      }
      onComplete({ type: "success", text: `Archived ${product.name}.` });
      router.refresh();
    });
  }

  function handleMove(direction: "up" | "down") {
    startTransition(async () => {
      const result = await moveProduct(product.id, direction);
      if (!result.success) {
        onComplete({
          type: "error",
          text: result.error || `Failed to move ${product.name}.`,
        });
        return;
      }
      onComplete({
        type: "success",
        text: `Moved ${product.name} ${direction}.`,
      });
      router.refresh();
    });
  }

  return (
    <Card className="overflow-hidden border-border bg-surface">
      {/* ── Header ── */}
      <div className="border-b border-border bg-surface p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-bold text-foreground">
                {product.name}
              </h3>
              {state.isProviderBacked ? (
                <Badge variant="secondary" className="text-xs">
                  Provider-backed
                </Badge>
              ) : state.isPartiallyLinked ? (
                <Badge
                  variant="outline"
                  className="text-xs text-warning border-warning/30"
                >
                  Partially linked
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="text-xs text-text-secondary"
                >
                  Demo product
                </Badge>
              )}
              {form.active ? (
                <Badge className="bg-success/10 text-success border border-success/30 text-xs">
                  Visible
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="text-text-secondary text-xs"
                >
                  Hidden
                </Badge>
              )}
            </div>
            {priceLabel && (
              <p className="text-lg font-semibold text-foreground">
                {priceLabel}
              </p>
            )}
            {!state.isProviderBacked && (
              <p className="text-xs text-text-secondary">
                {state.isPartiallyLinked
                  ? `Partially linked to ${providerLabel}. Finish publishing or sync before launch.`
                  : `Local demo data. Publish to ${providerLabel} or sync to replace demo entries.`}
              </p>
            )}
            <p className="text-xs text-text-secondary">
              Position {index + 1} of {total}
              {product.providerProductId
                ? ` · Provider ID: ${product.providerProductId}`
                : ""}
            </p>
          </div>
          {editable && (
            <div className="flex shrink-0 items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={pending || index === 0}
                onClick={() => handleMove("up")}
                className="h-7 px-2 text-xs text-text-secondary"
              >
                ↑ Up
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={pending || index === total - 1}
                onClick={() => handleMove("down")}
                className="h-7 px-2 text-xs text-text-secondary"
              >
                ↓ Down
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      {editable ? (
        <div className="divide-y divide-border">
          {/* Name */}
          <div className="p-5">
            <div className="space-y-1.5">
              <Label htmlFor={`name-${product.id}`} className="text-sm">
                Name
              </Label>
              <Input
                id={`name-${product.id}`}
                value={form.name}
                onChange={(e) =>
                  setForm((c) => ({ ...c, name: e.target.value }))
                }
                required
              />
            </div>
          </div>

          {/* Badge + Type */}
          <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={`badge-${product.id}`} className="text-sm">
                Badge label
              </Label>
              <Input
                id={`badge-${product.id}`}
                value={form.badge}
                placeholder="e.g. Most popular"
                onChange={(e) =>
                  setForm((c) => ({ ...c, badge: e.target.value }))
                }
              />
              <p className="text-xs text-text-secondary">
                Optional label on the pricing card.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`type-${product.id}`} className="text-sm">
                Type
              </Label>
              <select
                id={`type-${product.id}`}
                value={form.type}
                onChange={(e) =>
                  setForm((c) => ({
                    ...c,
                    type:
                      e.target.value === "one_time"
                        ? "one_time"
                        : "subscription",
                    interval:
                      e.target.value === "one_time"
                        ? ""
                        : c.interval || "month",
                  }))
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="subscription">Subscription</option>
                <option value="one_time">One-time</option>
              </select>
            </div>
          </div>

          {/* Description + source toggle */}
          <div className="space-y-4 p-5">
            <div className="flex items-center justify-between gap-3">
              <Label
                htmlFor={`description-${product.id}`}
                className="text-sm font-medium"
              >
                Pricing-card description
              </Label>
              <DescriptionSourceToggle
                useProvider={form.useProviderDescription}
                providerName={providerLabel}
                onChange={(v) =>
                  setForm((c) => ({ ...c, useProviderDescription: v }))
                }
              />
            </div>
            <Textarea
              id={`description-${product.id}`}
              rows={3}
              value={
                form.useProviderDescription
                  ? form.providerDescription
                  : form.description
              }
              disabled={form.useProviderDescription}
              onChange={(e) =>
                setForm((c) => ({ ...c, description: e.target.value }))
              }
              className="min-h-[72px]"
            />
            <p className="text-xs text-text-secondary">
              {form.useProviderDescription
                ? form.providerDescription
                  ? `Showing the ${providerLabel} description. Switch to Custom to write your own.`
                  : `No ${providerLabel} description available. Switch to Custom to add copy.`
                : "Leave blank to show no description on the pricing card."}
            </p>
          </div>

          {/* Tax */}
          <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={`tax-code-${product.id}`} className="text-sm">
                Tax category
              </Label>
              <Select
                value={form.providerTaxCode || "__default"}
                onValueChange={(value) =>
                  setForm((c) => ({
                    ...c,
                    providerTaxCode: value === "__default" ? "" : value,
                  }))
                }
              >
                <SelectTrigger id={`tax-code-${product.id}`}>
                  <SelectValue placeholder="Use Stripe default" />
                </SelectTrigger>
                <SelectContent>
                  {renderStripeTaxCodeItems(
                    taxCodeOptions,
                    form.providerTaxCode
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`tax-behavior-${product.id}`} className="text-sm">
                Tax behavior
              </Label>
              <select
                id={`tax-behavior-${product.id}`}
                value={form.providerTaxBehavior}
                onChange={(e) =>
                  setForm((c) => ({
                    ...c,
                    providerTaxBehavior:
                      e.target.value === "exclusive" ||
                      e.target.value === "inclusive"
                        ? e.target.value
                        : "unspecified",
                  }))
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {STRIPE_TAX_BEHAVIOR_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Amount + Currency */}
          <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={`amount-${product.id}`} className="text-sm">
                Amount (cents)
              </Label>
              <Input
                id={`amount-${product.id}`}
                type="number"
                min={1}
                step={1}
                value={form.amountCents}
                onChange={(e) =>
                  setForm((c) => ({ ...c, amountCents: e.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor={`currency-${product.id}`} className="text-sm">
                  Currency
                </Label>
                <CurrencyOptions
                  onSelect={(currency) => setForm((c) => ({ ...c, currency }))}
                />
              </div>
              <Input
                id={`currency-${product.id}`}
                maxLength={3}
                value={form.currency}
                onChange={(e) =>
                  setForm((c) => ({
                    ...c,
                    currency: e.target.value.toUpperCase(),
                  }))
                }
                required
              />
            </div>
          </div>

          {/* Interval */}
          <div className="p-5 pt-0">
            <div className="space-y-1.5">
              <Label htmlFor={`interval-${product.id}`} className="text-sm">
                Interval
              </Label>
              <select
                id={`interval-${product.id}`}
                value={form.interval}
                disabled={form.type === "one_time"}
                onChange={(e) =>
                  setForm((c) => ({
                    ...c,
                    interval:
                      e.target.value === "year"
                        ? "year"
                        : e.target.value === "month"
                          ? "month"
                          : "",
                  }))
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
              >
                {form.type === "one_time" ? (
                  <option value="">Not applicable</option>
                ) : null}
                <option value="month">Monthly</option>
                <option value="year">Annual</option>
              </select>
            </div>
          </div>

          {/* Features */}
          <div className="p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-foreground">
                  Pricing card features
                </p>
                <p className="text-xs text-text-secondary mt-0.5">
                  Each feature appears as a bullet point on your public pricing
                  card.
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={pending}
                onClick={() =>
                  setForm((c) => ({
                    ...c,
                    features: [...c.features, { label: "" }],
                  }))
                }
                className="shrink-0"
              >
                Add feature
              </Button>
            </div>
            {form.features.length === 0 ? (
              <p className="rounded-md border border-dashed border-border px-4 py-4 text-center text-sm text-text-secondary">
                No features added yet.
              </p>
            ) : (
              <div className="space-y-2">
                {form.features.map((feature, i) => (
                  <div
                    key={`${product.id}-feature-${i}`}
                    className="flex items-center gap-2"
                  >
                    <span className="shrink-0 text-sm text-success select-none">
                      ✓
                    </span>
                    <Input
                      value={feature.label}
                      placeholder="e.g. Unlimited projects"
                      onChange={(e) =>
                        setForm((c) => ({
                          ...c,
                          features: c.features.map((f, fi) =>
                            fi === i ? { ...f, label: e.target.value } : f
                          ),
                        }))
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={pending}
                      onClick={() =>
                        setForm((c) => ({
                          ...c,
                          features: c.features.filter((_, fi) => fi !== i),
                        }))
                      }
                      className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer: visibility + publish/archive + inline status */}
          <div className="flex flex-col gap-3 bg-muted/20 p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Switch
                  id={`active-${product.id}`}
                  checked={form.active}
                  onCheckedChange={(checked) =>
                    setForm((c) => ({ ...c, active: checked }))
                  }
                />
                <Label
                  htmlFor={`active-${product.id}`}
                  className="text-sm font-medium cursor-pointer"
                >
                  Visible in catalog
                </Label>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {state.isProviderBacked && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={pending}
                    onClick={handleArchive}
                  >
                    Remove
                  </Button>
                )}
                <Button
                  type="button"
                  disabled={!isDirty || pending}
                  onClick={handlePublish}
                >
                  {pending ? "Saving…" : publishLabel}
                </Button>
              </div>
            </div>
            {saveStatus === "success" && (
              <div className="rounded-lg border border-success/30 bg-success/5 px-4 py-2.5 text-sm text-success">
                Product updated.
              </div>
            )}
            {saveStatus === "error" && saveError && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2.5 text-sm text-destructive">
                {saveError}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Read-only view when catalog is not editable */
        <div className="grid grid-cols-2 gap-4 p-5">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-text-secondary">
              Description
            </p>
            <p className="text-sm text-foreground">
              {(form.useProviderDescription
                ? form.providerDescription
                : form.description) || "No description set."}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-text-secondary">
              Default price
            </p>
            <p className="text-sm font-medium text-foreground">
              {defaultPrice
                ? `${(defaultPrice.amountCents / 100).toFixed(2)} ${defaultPrice.currency}${
                    defaultPrice.interval
                      ? ` · ${defaultPrice.interval}`
                      : " · one-time"
                  }`
                : "No default price"}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-text-secondary">
              Badge
            </p>
            <p className="text-sm text-foreground">
              {product.badge || "No badge set."}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-text-secondary">
              Features
            </p>
            <p className="text-sm text-foreground">
              {product.features.length > 0
                ? product.features.map((f) => f.label).join(", ")
                : "No features set."}
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}

// ─── CatalogManager ───────────────────────────────────────────────────────────

interface CatalogManagerProps {
  provider: CatalogProvider;
  editable: boolean;
  products: CatalogProduct[];
  environmentMode: CatalogEnvironmentMode | null;
  taxCodeOptions: StripeTaxCodeOption[];
}

export function CatalogManager({
  provider,
  editable,
  products,
  environmentMode,
  taxCodeOptions,
}: CatalogManagerProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const providerLabel = getProviderDisplayName(provider);
  const catalogState = useMemo(
    () => getCatalogState(products, provider),
    [products, provider]
  );

  function handleSync() {
    startTransition(async () => {
      const result = await syncFromProvider();
      if (!result.success) {
        setMessage({
          type: "error",
          text: result.error || `Failed to sync from ${providerLabel}.`,
        });
        return;
      }
      const countText =
        typeof result.syncedCount === "number"
          ? ` Synced ${result.syncedCount} products.`
          : "";
      setMessage({
        type: "success",
        text: `Catalog synced from ${providerLabel}.${countText}`,
      });
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <EnvironmentLabel provider={provider} mode={environmentMode} />
        <div className="flex items-center gap-2 shrink-0">
          {editable && (
            <AddProductButton
              provider={provider}
              taxCodeOptions={taxCodeOptions}
              onComplete={setMessage}
            />
          )}
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={handleSync}
          >
            {pending ? "Syncing…" : `Sync from ${providerLabel}`}
          </Button>
        </div>
      </div>

      {/* Info callout */}
      <div className="rounded-lg border border-border bg-surface/60 p-5">
        <p className="text-sm text-text-secondary leading-relaxed">
          Products are managed and priced in {providerLabel} — sync pulls them
          in here so you can customize how each one appears on your pricing
          page.{" "}
          {editable
            ? `Edit names, descriptions, pricing, and features, then publish each product to ${providerLabel}.`
            : `Sync keeps your local catalog up to date with ${providerLabel}.`}
        </p>
      </div>

      {/* Demo catalog notice */}
      {catalogState.isDemoCatalog && (
        <div className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/5 p-4">
          <span className="mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full bg-warning" />
          <p className="text-sm text-text-primary">
            <span className="font-medium">Demo catalog active.</span> Publish
            products to {providerLabel} or sync from {providerLabel} to replace
            demo entries before launch.
          </p>
        </div>
      )}

      {/* Sync / move feedback */}
      {message && (
        <Alert variant={message.type === "error" ? "destructive" : "success"}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* Product list */}
      {products.length === 0 ? (
        <Card className="border-border bg-surface/60">
          <div className="flex flex-col items-center gap-3 p-12 text-center">
            <p className="text-base font-semibold text-foreground">
              No products yet
            </p>
            <p className="max-w-sm text-sm text-text-secondary">
              No products found in your database. Use the sync action to import
              from {providerLabel}.
            </p>
            <Button
              type="button"
              disabled={pending}
              onClick={handleSync}
              className="mt-1"
            >
              {pending ? "Syncing…" : `Sync from ${providerLabel}`}
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {products.map((product, index) => (
            <ProductEditor
              key={product.id}
              provider={provider}
              product={product}
              taxCodeOptions={taxCodeOptions}
              index={index}
              total={products.length}
              editable={editable}
              onComplete={setMessage}
            />
          ))}
        </div>
      )}
    </div>
  );
}
