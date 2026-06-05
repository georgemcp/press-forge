import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/db/supabase";
import { sendServerAnalyticsEvent } from "@/lib/analytics/server-events";
import {
  exportOrderStatusForSubscription,
  stripeObjectId,
  updateExportOrderBySessionId,
  updateExportOrdersByPaymentIntentId,
  updateExportOrdersBySubscriptionId
} from "@/lib/billing/order-lifecycle";
import { getStripeClient } from "@/lib/billing/stripe";

export const runtime = "nodejs";

function centsToValue(amount?: number | null) {
  return typeof amount === "number" ? Number((amount / 100).toFixed(2)) : undefined;
}

function numericSessionId(value?: string) {
  const sessionId = Number(value);
  return Number.isFinite(sessionId) && sessionId > 0 ? sessionId : undefined;
}

function invoiceSubscriptionId(invoice: { subscription?: string | { id?: string | null } | null; parent?: { subscription_details?: { subscription?: string | { id?: string | null } | null } | null } | null }) {
  return stripeObjectId(invoice.parent?.subscription_details?.subscription ?? invoice.subscription);
}

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
    if (entitlement === "export_credit" || entitlement === "subscription") {
      await supabase.from("export_orders").upsert(
        {
          stripe_session_id: session.id,
          stripe_customer_id: typeof session.customer === "string" ? session.customer : null,
          stripe_payment_intent_id: stripeObjectId(session.payment_intent),
          stripe_subscription_id: stripeObjectId(session.subscription),
          amount_total_cents: session.amount_total ?? null,
          currency: session.currency?.toUpperCase() ?? null,
          customer_email: session.customer_details?.email ?? session.customer_email ?? null,
          entitlement,
          checkout_mode: session.mode,
          status: "paid"
        },
        {
          onConflict: "stripe_session_id"
        }
      );
      const analytics = await sendServerAnalyticsEvent({
        name: "purchase",
        clientId: session.metadata?.ga_client_id,
        userId,
        params: {
          transaction_id: session.id,
          affiliation: "trimproof.com",
          value: centsToValue(session.amount_total),
          currency: session.currency?.toUpperCase() ?? "USD",
          entitlement,
          checkout_mode: session.mode,
          session_id: numericSessionId(session.metadata?.ga_session_id),
          page_path: session.metadata?.page_path,
          items: [
            {
              item_id: entitlement === "subscription" ? "trimproof_pro_monthly" : "trimproof_export_credit",
              item_name: entitlement === "subscription" ? "Trim Proof Pro" : "Trim Proof Export Credit",
              price: centsToValue(session.amount_total) ?? 0,
              quantity: 1
            }
          ]
        }
      });
      if (analytics.status === "failed") {
        console.error("Trim Proof server analytics event failed", {
          event: "purchase",
          provider: analytics.provider,
          reason: analytics.reason
        });
      }
    }
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

  } else if (event.type === "checkout.session.expired" || event.type === "checkout.session.async_payment_failed") {
    const session = event.data.object;
    await updateExportOrderBySessionId(supabase, session.id, "expired");
  } else if (event.type === "charge.refunded") {
    const charge = event.data.object;
    const paymentIntentId = stripeObjectId(charge.payment_intent);
    if (charge.refunded && paymentIntentId) {
      await updateExportOrdersByPaymentIntentId(supabase, paymentIntentId, "refunded");
    }
  } else if (event.type === "invoice.payment_failed") {
    const invoice = event.data.object;
    const subscriptionId = invoiceSubscriptionId(invoice);
    if (subscriptionId) {
      await updateExportOrdersBySubscriptionId(supabase, subscriptionId, "expired");
    }
  } else if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const subscription = event.data.object;
    await updateExportOrdersBySubscriptionId(supabase, subscription.id, exportOrderStatusForSubscription(subscription.status));
  }

  return NextResponse.json({ received: true, persisted: true });
}
