import { NextResponse } from "next/server";
import { getAppUrl, getStripeClient } from "@/lib/billing/stripe";

export const runtime = "nodejs";

type CheckoutMode = "payment" | "subscription";

function resolvePriceId(mode: CheckoutMode) {
  if (mode === "subscription") {
    return process.env.STRIPE_SUBSCRIPTION_PRICE_ID;
  }
  return process.env.STRIPE_EXPORT_PRICE_ID;
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

  const payload = (await request.json().catch(() => ({}))) as { mode?: CheckoutMode; userId?: string; email?: string };
  const mode: CheckoutMode = payload.mode === "subscription" ? "subscription" : "payment";
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
    client_reference_id: payload.userId,
    customer_email: payload.email,
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
      product: "trimproof",
      entitlement: mode === "subscription" ? "subscription" : "export_credit"
    }
  });

  return NextResponse.json({
    url: session.url
  });
}
