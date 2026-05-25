import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { hasRealProviderPriceId } from "@/lib/payments/catalog";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createCheckoutSession } from "@/lib/integrations/stripe";

type ProductPriceRecord = {
  id: string;
  product_id: string;
  provider: "stripe";
  provider_price_id: string;
  active: boolean;
  products: {
    active: boolean;
  } | null;
};

export async function GET(request: NextRequest) {
  const user = await requireUser();
  const priceId = request.nextUrl.searchParams.get("priceId")?.trim();

  if (!priceId) {
    return NextResponse.json(
      { error: "Missing required query param: priceId" },
      { status: 400 }
    );
  }

  const supabase = supabaseAdmin();

  const { data: productPrice, error: productPriceError } = await supabase
    .from("product_prices")
    .select(
      "id,product_id,provider,provider_price_id,active,products!inner(active)"
    )
    .eq("id", priceId)
    .eq("provider", "stripe")
    .maybeSingle();

  if (productPriceError) {
    console.error("Failed to fetch Stripe product price:", productPriceError);
    return NextResponse.json(
      { error: "Unable to load product price." },
      { status: 500 }
    );
  }

  const record = productPrice as ProductPriceRecord | null;
  if (!record || !record.active || !record.products?.active) {
    return NextResponse.json(
      { error: "Selected product is unavailable." },
      { status: 404 }
    );
  }

  if (!hasRealProviderPriceId("stripe", record.provider_price_id)) {
    return NextResponse.json(
      {
        error:
          "Selected product is still using a demo Stripe price. Publish or sync your Stripe catalog before checkout.",
      },
      { status: 400 }
    );
  }

  const { data: existingSubscription } = await supabase
    .from("subscriptions")
    .select("provider_customer_id")
    .eq("user_id", user.id)
    .eq("provider", "stripe")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  try {
    const origin = request.nextUrl.origin;
    const successUrl = `${origin}/checkout/return?status=success`;
    const cancelUrl = `${origin}/checkout/return?status=cancelled`;

    const session = await createCheckoutSession({
      userId: user.id,
      priceId: record.provider_price_id,
      successUrl,
      cancelUrl,
      customerId: existingSubscription?.provider_customer_id || undefined,
      metadata: {
        product_id: record.product_id,
        product_price_id: record.id,
      },
    });

    return NextResponse.redirect(session.url, { status: 303 });
  } catch (error) {
    console.error("Failed to create Stripe checkout session:", error);
    return NextResponse.json(
      { error: "Unable to create checkout session." },
      { status: 500 }
    );
  }
}
