import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/db/supabase";
import { getStripeClient } from "@/lib/billing/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const stripe = getStripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: "Stripe webhook is not configured." }, { status: 503 });
  }

  const signature = (await headers()).get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  const body = await request.text();
  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Invalid webhook signature."
      },
      { status: 400 }
    );
  }

  const supabase = createServiceSupabaseClient();
  if (!supabase) {
    return NextResponse.json({
      received: true,
      persisted: false,
      reason: "Supabase service client is not configured."
    });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const entitlement = session.metadata?.entitlement;
    const userId = session.client_reference_id;
    if (userId && entitlement === "export_credit") {
      await supabase.from("credits_usage").insert({
        user_id: userId,
        delta: 1,
        reason: "purchase",
        stripe_session_id: session.id
      });
    }
    if (userId && entitlement === "subscription") {
      await supabase
        .from("users")
        .update({
          subscription_status: "active",
          stripe_customer_id: typeof session.customer === "string" ? session.customer : undefined
        })
        .eq("id", userId);
    }
  }

  return NextResponse.json({ received: true, persisted: true });
}
