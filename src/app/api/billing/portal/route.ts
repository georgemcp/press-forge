import { z } from "zod";
import { NextResponse } from "next/server";
import { getAccountSessionFromCookies } from "@/lib/auth/account-server";
import { verifyPaidCheckoutSession } from "@/lib/billing/paid-session";
import { getAppUrl, getStripeClient } from "@/lib/billing/stripe";
import { checkRateLimit, getRequestIp, rateLimitResponse } from "@/lib/security/request";

export const runtime = "nodejs";

const portalSchema = z.object({
  sessionId: z.string().min(1)
});

function getPortalErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.toLowerCase().includes("configuration")) {
    return "Stripe Customer Portal is not configured yet. Add a portal configuration in Stripe, then try again.";
  }
  return error instanceof Error ? error.message : "Stripe Customer Portal could not start.";
}

function getPortalErrorStatus(error: unknown) {
  if (error instanceof Error && error.message.toLowerCase().includes("configuration")) {
    return 503;
  }
  return 402;
}

export async function POST(request: Request) {
  const account = await getAccountSessionFromCookies();
  if (!account) {
    return NextResponse.json({ error: "Sign in before opening subscription management." }, { status: 401 });
  }
  const rateLimit = checkRateLimit({
    namespace: "billing-portal",
    key: `${account.userId}:${getRequestIp(request)}`,
    limit: 10,
    windowMs: 60 * 60 * 1000
  });
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit, "Portal request limit reached. Try again later.");
  }

  const stripe = getStripeClient();
  if (!stripe) {
    return NextResponse.json(
      {
        error: "Stripe is not configured. Set STRIPE_SECRET_KEY before opening subscription management."
      },
      { status: 503 }
    );
  }

  const payload = await request.json().catch(() => ({}));
  const parsed = portalSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Missing checkout session ID." }, { status: 400 });
  }

  try {
    const paidSession = await verifyPaidCheckoutSession(parsed.data.sessionId, account);
    if (!paidSession) {
      return NextResponse.json({ error: "Checkout session could not be verified." }, { status: 402 });
    }
    if (paidSession.entitlement !== "subscription") {
      return NextResponse.json({ error: "Subscription management is only available for Trim Proof Pro customers." }, { status: 403 });
    }
    if (!paidSession.customerId) {
      return NextResponse.json({ error: "This subscription is missing a Stripe customer record." }, { status: 409 });
    }

    const appUrl = getAppUrl();
    const portalConfigurationId = process.env.STRIPE_PORTAL_CONFIGURATION_ID;
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: paidSession.customerId,
      ...(portalConfigurationId ? { configuration: portalConfigurationId } : {}),
      return_url: `${appUrl}/app?mode=advanced&checkout=success&session_id=${encodeURIComponent(paidSession.id)}`
    });

    return NextResponse.json({
      url: portalSession.url
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: getPortalErrorMessage(error)
      },
      { status: getPortalErrorStatus(error) }
    );
  }
}
