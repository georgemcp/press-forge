import { z } from "zod";
import { NextResponse } from "next/server";
import { getAppUrl, getStripeClient } from "@/lib/billing/stripe";

export const runtime = "nodejs";

type CheckoutMode = "payment" | "subscription";

const analyticsSchema = z
  .object({
    gaClientId: z.string().min(1).max(120).optional(),
    gaSessionId: z.string().min(1).max(120).optional(),
    pagePath: z.string().min(1).max(240).optional()
  })
  .optional();

const checkoutSchema = z.object({
  mode: z.enum(["payment", "subscription"]).optional(),
  userId: z.string().min(1).optional(),
  email: z.string().email(),
  analytics: analyticsSchema
});

function resolvePriceId(mode: CheckoutMode) {
  if (mode === "subscription") {
    return process.env.STRIPE_SUBSCRIPTION_PRICE_ID;
  }
  return process.env.STRIPE_EXPORT_PRICE_ID;
}

function stringMetadata(metadata: Record<string, string | undefined>) {
  return Object.fromEntries(Object.entries(metadata).filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].length > 0));
}

export async function POST(request: Request) {
  const stripe = getStripeClient();
  if (!stripe) {
    return NextResponse.json(
      {
        error: "Stripe is not configured. Set STRIPE_SECRET_KEY plus a Price ID before taking payments."
      },
      { status: 503 }
    );
  }

  const payload = await request.json().catch(() => ({}));
  const parsed = checkoutSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid billing email before checkout." }, { status: 400 });
  }
  const mode: CheckoutMode = parsed.data.mode === "subscription" ? "subscription" : "payment";
  const priceId = resolvePriceId(mode);
  if (!priceId) {
    return NextResponse.json(
      {
        error: `Missing ${mode === "subscription" ? "STRIPE_SUBSCRIPTION_PRICE_ID" : "STRIPE_EXPORT_PRICE_ID"}.`
      },
      { status: 503 }
    );
  }

  const appUrl = getAppUrl();
  const metadata = {
    product: "trimproof",
    entitlement: mode === "subscription" ? "subscription" : "export_credit",
    ga_client_id: parsed.data.analytics?.gaClientId,
    ga_session_id: parsed.data.analytics?.gaSessionId,
    page_path: parsed.data.analytics?.pagePath
  };
  const session = await stripe.checkout.sessions.create({
    mode,
    line_items: [
      {
        price: priceId,
        quantity: 1
      }
    ],
    success_url: `${appUrl}/app?mode=advanced&checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/app?mode=advanced&checkout=cancelled`,
    client_reference_id: parsed.data.userId,
    customer_email: parsed.data.email?.trim().toLowerCase(),
    branding_settings: {
      display_name: "Trim Proof"
    },
    wallet_options: {
      link: {
        display: "never"
      }
    },
    custom_text: {
      submit: {
        message:
          mode === "subscription"
            ? "Trim Proof Pro unlocks recurring advanced PDF/X exports at trimproof.com."
            : "This checkout unlocks one Trim Proof advanced PDF/X export at trimproof.com."
      }
    },
    metadata: {
      ...stringMetadata(metadata)
    }
  });

  return NextResponse.json({
    url: session.url
  });
}
