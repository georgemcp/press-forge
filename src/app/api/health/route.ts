import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { isServerAnalyticsConfigured } from "@/lib/analytics/server-events";
import { resolveEmailConfig } from "@/lib/email/transactional";
import { getCreativeProviderStatus } from "@/lib/providers/model-config";

function isStripeCheckoutConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_EXPORT_PRICE_ID && process.env.STRIPE_SUBSCRIPTION_PRICE_ID);
}

function safeEqual(left: string, right: string) {
  const leftHash = createHmac("sha256", "trimproof-health-compare").update(left).digest();
  const rightHash = createHmac("sha256", "trimproof-health-compare").update(right).digest();
  return timingSafeEqual(leftHash, rightHash);
}

function isDetailedHealthAuthorized(request: Request) {
  const expected = process.env.TRIMPROOF_HEALTH_TOKEN;
  if (!expected) {
    return false;
  }
  const authorization = request.headers.get("authorization");
  const candidate = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : request.headers.get("x-trimproof-health-token");
  return Boolean(candidate && safeEqual(candidate, expected));
}

export async function GET(request: Request) {
  const base = {
    ok: true,
    service: "trimproof",
    timestamp: new Date().toISOString()
  };
  if (!isDetailedHealthAuthorized(request)) {
    return NextResponse.json(base, {
      headers: { "Cache-Control": "no-store" }
    });
  }

  const emailConfig = resolveEmailConfig();
  const stripeCheckoutConfigured = isStripeCheckoutConfigured();

  return NextResponse.json({
    ...base,
    checks: {
      next: "ready",
      prepress: "available",
      stripeConfigured: stripeCheckoutConfigured,
      stripeCheckoutConfigured,
      stripeWebhookConfigured: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET),
      stripePortalConfigured: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PORTAL_CONFIGURATION_ID),
      supabaseConfigured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
      serverAnalyticsConfigured: isServerAnalyticsConfigured(),
      emailConfigured: Boolean(emailConfig),
      emailProvider: emailConfig?.provider ?? null,
      creativeProviders: getCreativeProviderStatus()
    }
  }, {
    headers: { "Cache-Control": "no-store" }
  });
}
