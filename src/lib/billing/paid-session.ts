import type Stripe from "stripe";
import { createServiceSupabaseClient } from "@/lib/db/supabase";
import { getStripeClient } from "@/lib/billing/stripe";
import { stripeObjectId } from "@/lib/billing/order-lifecycle";

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
const unavailableExportCreditStatuses = new Set(["processing", "consumed", "refunded", "expired"]);

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
    const { data: existingOrder, error: existingOrderError } = await supabase
      .from("export_orders")
      .select("status")
      .eq("stripe_session_id", session.id)
      .maybeSingle();
    if (existingOrderError) {
      throw new Error(existingOrderError.message);
    }

    consumed = entitlement === "export_credit" && unavailableExportCreditStatuses.has(existingOrder?.status ?? "");
    if (consumed) {
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

    await supabase.from("export_orders").upsert(
      {
        stripe_session_id: session.id,
        stripe_customer_id: customerId ?? null,
        stripe_payment_intent_id: stripeObjectId(session.payment_intent),
        stripe_subscription_id: subscriptionId ?? null,
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

export async function claimExportCredit(sessionId: string, proofJobId: string) {
  const supabase = createServiceSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase service client is required to claim export credits.");
  }

  const { data, error } = await supabase
    .from("export_orders")
    .update({
      status: "processing",
      proof_job_id: proofJobId,
      consumed_at: null
    })
    .eq("stripe_session_id", sessionId)
    .eq("entitlement", "export_credit")
    .eq("status", "paid")
    .select("stripe_session_id")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error("This export credit has already been used.");
  }
}

export async function finalizeExportCredit(sessionId: string, proofJobId: string) {
  const supabase = createServiceSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase service client is required to finalize export credits.");
  }

  const { data, error } = await supabase
    .from("export_orders")
    .update({
      status: "consumed",
      consumed_at: new Date().toISOString()
    })
    .eq("stripe_session_id", sessionId)
    .eq("entitlement", "export_credit")
    .eq("status", "processing")
    .eq("proof_job_id", proofJobId)
    .select("stripe_session_id")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error("Export credit could not be finalized.");
  }
}

export async function releaseExportCredit(sessionId: string, proofJobId: string) {
  const supabase = createServiceSupabaseClient();
  if (!supabase) {
    return;
  }

  await supabase
    .from("export_orders")
    .update({
      status: "paid",
      proof_job_id: null,
      consumed_at: null
    })
    .eq("stripe_session_id", sessionId)
    .eq("entitlement", "export_credit")
    .eq("status", "processing")
    .eq("proof_job_id", proofJobId);
}
