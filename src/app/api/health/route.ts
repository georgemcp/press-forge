import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "trimproof",
    checks: {
      next: "ready",
      prepress: "available",
      stripeConfigured: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_EXPORT_PRICE_ID),
      supabaseConfigured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
    },
    timestamp: new Date().toISOString()
  });
}
