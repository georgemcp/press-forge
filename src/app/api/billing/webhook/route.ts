import type Stripe from "stripe";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/db/supabase";
import { sendServerAnalyticsEvent } from "@/lib/analytics/server-events";
import {
  exportOrderStatusForSubscription,
  recordPaidExportOrder,
  stripeObjectId,
  updateExportOrderBySessionId,
  updateExportOrdersByPaymentIntentId,
  updateExportOrdersBySubscriptionId
} from "@/lib/billing/order-lifecycle";
import { getStripeClient } from "@/lib/billing/stripe";
import { describeServerError } from "@/lib/security/server-error";

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

type SupabaseClient = NonNullable<ReturnType<typeof createServiceSupabaseClient>>;

// credits_usage has a unique index on stripe_session_id, so a redelivered event hits this on the second insert.
function isDuplicateInsert(error: { code?: string; message?: string }) {
  return error.code === "23505" || /duplicate key|already exists/i.test(error.message ?? "");
}

/** Runs a write the paid order depends on. Returns false (after a redacted log) when it failed, so the caller can answer 500. */
async function runOrderWrite(
  label: string,
  eventType: string,
  write: () => PromiseLike<{ error: { code?: string; message?: string } | null }>,
  options: { ignoreDuplicate?: boolean } = {}
) {
  try {
    const { error } = await write();
    if (!error || (options.ignoreDuplicate && isDuplicateInsert(error))) {
      return true;
    }
    console.error("Trim Proof Stripe webhook order write failed", { write: label, eventType, error: describeServerError(error.message) });
  } catch (error) {
    console.error("Trim Proof Stripe webhook order write failed", { write: label, eventType, error: describeServerError(error) });
  }
  return false;
}

async function handleLifecycleEvent(supabase: SupabaseClient, event: Stripe.Event) {
  if (event.type === "checkout.session.expired" || event.type === "checkout.session.async_payment_failed") {
    const session = event.data.object;
    await updateExportOrderBySessionId(supabase, session.id, "expired");
  } else if (event.type === "charge.refunded") {
    const charge = event.data.object;
    const paymentIntentId = stripeObjectId(charge.payment_intent);
    if (charge.refunded && paymentIntentId) {
      await updateExportOrdersByPaymentIntentId(supabase, paymentIntentId, "refunded");
    }
  } else if (event.type === "invoice.paid") {
    const invoice = event.data.object;
    const subscriptionId = invoiceSubscriptionId(invoice);
    if (subscriptionId) {
      await updateExportOrdersBySubscriptionId(supabase, subscriptionId, "paid", { reactivate: true });
    }
  } else if (event.type === "invoice.payment_failed") {
    const invoice = event.data.object;
    const subscriptionId = invoiceSubscriptionId(invoice);
    if (subscriptionId) {
      await updateExportOrdersBySubscriptionId(supabase, subscriptionId, "expired");
    }
  } else if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const subscription = event.data.object;
    await updateExportOrdersBySubscriptionId(supabase, subscription.id, exportOrderStatusForSubscription(subscription.status));
  }
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
    console.error("Trim Proof Stripe webhook signature verification failed", {
      error: describeServerError(error)
    });
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
  }

  const supabase = createServiceSupabaseClient();
  if (!supabase) {
    // The signature already verified, so the event is genuine; answering 2xx would make Stripe drop a paid event.
    console.error("Trim Proof Stripe webhook cannot persist: Supabase service client is not configured", {
      eventType: event.type
    });
    return NextResponse.json({ error: "Order storage is not configured." }, { status: 503 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const entitlement = session.metadata?.entitlement;
    const userId = session.client_reference_id;
    let order: Awaited<ReturnType<typeof recordPaidExportOrder>> | undefined;
    if (entitlement === "export_credit" || entitlement === "subscription") {
      try {
        order = await recordPaidExportOrder(supabase, {
          stripe_session_id: session.id,
          stripe_customer_id: typeof session.customer === "string" ? session.customer : null,
          stripe_payment_intent_id: stripeObjectId(session.payment_intent),
          stripe_subscription_id: stripeObjectId(session.subscription),
          amount_total_cents: session.amount_total ?? null,
          currency: session.currency?.toUpperCase() ?? null,
          customer_email: session.customer_details?.email ?? session.customer_email ?? null,
          entitlement,
          checkout_mode: session.mode
        });
      } catch (error) {
        // 500 keeps Stripe retrying the delivery; the log is the only place the cause is visible.
        console.error("Trim Proof Stripe webhook order record failed", {
          eventType: event.type,
          error: describeServerError(error)
        });
        return NextResponse.json({ error: "Checkout order could not be recorded." }, { status: 500 });
      }
      // Duplicate deliveries and orders that landed refunded must not send another purchase event.
      if (order?.created && !order.refunded) {
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
            reason: describeServerError(analytics.reason)
          });
        }
      }
    }
    // A failed write returns 500 so Stripe redelivers. Redelivery is safe: the order upsert ignores duplicates,
    // the credit insert is unique on stripe_session_id (a duplicate counts as done) and the user update is a plain set.
    if (userId && entitlement === "export_credit" && !order?.refunded) {
      const credited = await runOrderWrite(
        "credits_usage.insert",
        event.type,
        () =>
          supabase.from("credits_usage").insert({
            user_id: userId,
            delta: 1,
            reason: "purchase",
            stripe_session_id: session.id
          }),
        { ignoreDuplicate: true }
      );
      if (!credited) {
        return NextResponse.json({ error: "Checkout credit could not be recorded." }, { status: 500 });
      }
    }
    if (userId && entitlement === "subscription") {
      const activated = await runOrderWrite("users.update", event.type, () =>
        supabase
          .from("users")
          .update({
            subscription_status: "active",
            stripe_customer_id: typeof session.customer === "string" ? session.customer : undefined
          })
          .eq("id", userId)
      );
      if (!activated) {
        return NextResponse.json({ error: "Subscription could not be activated." }, { status: 500 });
      }
    }
  } else {
    try {
      await handleLifecycleEvent(supabase, event);
    } catch (error) {
      // A 0-row lifecycle update is a logged no-op; only database failures reach here, and Stripe should retry them.
      console.error("Trim Proof Stripe webhook lifecycle update failed", {
        eventType: event.type,
        error: describeServerError(error)
      });
      return NextResponse.json({ error: "Order lifecycle update failed." }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true, persisted: true });
}
