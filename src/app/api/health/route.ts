import { NextResponse } from "next/server";
import { isServerAnalyticsConfigured } from "@/lib/analytics/server-events";
import { resolveEmailConfig } from "@/lib/email/transactional";

export async function GET() {
  const emailConfig = resolveEmailConfig();

  return NextResponse.json({
    ok: true,
    service: "trimproof",
    checks: {
      next: "ready",
      prepress: "available",
      stripeConfigured: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_EXPORT_PRICE_ID && process.env.STRIPE_SUBSCRIPTION_PRICE_ID),
      supabaseConfigured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
      serverAnalyticsConfigured: isServerAnalyticsConfigured(),
      emailConfigured: Boolean(emailConfig),
      emailProvider: emailConfig?.provider ?? null
    },
    timestamp: new Date().toISOString()
  });
}
