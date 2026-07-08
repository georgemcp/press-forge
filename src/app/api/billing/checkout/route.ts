import { z } from "zod";
import { NextResponse } from "next/server";
import { getAccountSessionFromCookies } from "@/lib/auth/account-server";
import { sendServerAnalyticsEvent } from "@/lib/analytics/server-events";
import { getAppUrl, getStripeClient } from "@/lib/billing/stripe";
import { createServiceSupabaseClient } from "@/lib/db/supabase";

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
  email: z.string().email().optional(),
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

function numericSessionId(value?: string) {
  const sessionId = Number(value);
  return Number.isFinite(sessionId) && sessionId > 0 ? sessionId : undefined;
}

function configuredCheckoutValue(mode: CheckoutMode) {
  const cents = Number(mode === "subscription" ? process.env.TRIMPROOF_SUBSCRIPTION_PRICE_CENTS : process.env.TRIMPROOF_EXPORT_PRICE_CENTS);
  return Number.isFinite(cents) && cents > 0 ? Number((Math.round(cents) / 100).toFixed(2)) : mode === "subscription" ? 49 : 12;
}

async function loadAccountMetadata(userId: string) {
  const supabase = createServiceSupabaseClient();
  if (!supabase) {
    return {};
  }
  const { data } = await supabase
    .from("users")
    .select("company_name, role, monthly_print_jobs, primary_use_case, plan_interest")
    .eq("id", userId)
    .maybeSingle();
  return {
    company_name: data?.company_name ?? undefined,
    role: data?.role ?? undefined,
    monthly_print_jobs: data?.monthly_print_jobs ?? undefined,
    primary_use_case: data?.primary_use_case ?? undefined,
    plan_interest: data?.plan_interest ?? undefined
  };
}

export async function POST(request: Request) {
  const account = await getAccountSessionFromCookies();
  if (!account) {
    return NextResponse.json({ error: "Create an account before starting checkout." }, { status: 401 });
  }

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
    return NextResponse.json({ error: "Checkout could not start. Refresh and try again." }, { status: 400 });
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
  const accountMetadata = await loadAccountMetadata(account.userId);
  const metadata = {
    product: "trimproof",
    entitlement: mode === "subscription" ? "subscription" : "export_credit",
    user_id: account.userId,
    account_email: account.email,
    ...accountMetadata,
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
    client_reference_id: account.userId,
    customer_email: account.email,
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
            ? "Trim Proof Pro unlocks 15 advanced PDF/X exports per month at trimproof.com."
            : "This checkout unlocks one Trim Proof advanced PDF/X export at trimproof.com."
      }
    },
    metadata: {
      ...stringMetadata(metadata)
    }
  });

  const analytics = await sendServerAnalyticsEvent({
    name: "checkout_started",
    clientId: parsed.data.analytics?.gaClientId,
    params: {
      checkout_mode: mode,
      entitlement: mode === "subscription" ? "subscription" : "export_credit",
      currency: "USD",
      value: configuredCheckoutValue(mode),
      page_path: parsed.data.analytics?.pagePath,
      session_id: numericSessionId(parsed.data.analytics?.gaSessionId)
    }
  });
  if (analytics.status === "failed") {
    console.error("Trim Proof server analytics event failed", {
      event: "checkout_started",
      provider: analytics.provider,
      reason: analytics.reason
    });
  }

  return NextResponse.json({
    url: session.url,
    analytics
  });
}
