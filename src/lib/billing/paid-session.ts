import type Stripe from "stripe";
import { createServiceSupabaseClient } from "@/lib/db/supabase";
import { getStripeClient } from "@/lib/billing/stripe";

export interface PaidCheckoutSession {
  id: string;
  entitlement: "export_credit" | "subscription";
  mode: "payment" | "subscription";
  customerId?: string;
  customerEmail?: string;
  subscriptionId?: string;
  subscriptionStatus?: string;
  consumed?: boolean;
}

const activeSubscriptionStatuses = new Set(["active", "trialing"]);

function getSessionCustomerEmail(session: Stripe.Checkout.Session) {
  return session.customer_details?.email ?? session.customer_email ?? undefined;
}

export async function verifyPaidCheckoutSession(sessionId?: string): Promise<PaidCheckoutSession | undefined> {
  if (!sessionId) {
    return undefined;
  }
  const stripe = getStripeClient();
  if (!stripe) {
    throw new Error("Stripe is not configured.");
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const entitlement = session.metadata?.entitlement;
  if (session.metadata?.product !== "trimproof" || (entitlement !== "export_credit" && entitlement !== "subscription")) {
    throw new Error("Checkout session is not valid for Trim Proof.");
  }
  if (session.mode !== "payment" && session.mode !== "subscription") {
    throw new Error("Checkout session mode is not valid for Trim Proof.");
  }
  if (session.status !== "complete" || session.payment_status !== "paid") {
    throw new Error("Checkout session is not paid.");
  }
  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
  let subscriptionId: string | undefined;
  let subscriptionStatus: string | undefined;
  if (session.mode === "subscription") {
    subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
    if (!subscriptionId) {
      throw new Error("Checkout session subscription is missing.");
    }
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    subscriptionStatus = subscription.status;
    if (!activeSubscriptionStatuses.has(subscription.status)) {
      throw new Error("Subscription is not active.");
    }
  }

  const supabase = createServiceSupabaseClient();
  let consumed = false;
  if (supabase) {
    const { data: existingOrder } = await supabase
      .from("export_orders")
      .select("status")
      .eq("stripe_session_id", session.id)
      .maybeSingle();
    consumed = existingOrder?.status === "consumed";

    await supabase.from("export_orders").upsert(
      {
        stripe_session_id: session.id,
        stripe_customer_id: customerId ?? null,
        customer_email: getSessionCustomerEmail(session) ?? null,
        entitlement,
        checkout_mode: session.mode,
        status: consumed ? "consumed" : "paid"
      },
      {
        onConflict: "stripe_session_id"
      }
    );
  }

  return {
    id: session.id,
    entitlement,
    mode: session.mode,
    customerId,
    customerEmail: getSessionCustomerEmail(session),
    subscriptionId,
    subscriptionStatus,
    consumed
  };
}

export async function consumeExportCredit(sessionId: string, proofJobId: string) {
  const supabase = createServiceSupabaseClient();
  if (!supabase) {
    return;
  }

  await supabase
    .from("export_orders")
    .update({
      status: "consumed",
      proof_job_id: proofJobId,
      consumed_at: new Date().toISOString()
    })
    .eq("stripe_session_id", sessionId)
    .eq("entitlement", "export_credit")
    .eq("status", "paid");
}
