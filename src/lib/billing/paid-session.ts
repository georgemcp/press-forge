import type Stripe from "stripe";
import type { AccountSession } from "@/lib/auth/account-session";
import { createServiceSupabaseClient } from "@/lib/db/supabase";
import { getStripeClient } from "@/lib/billing/stripe";
import { stripeObjectId } from "@/lib/billing/order-lifecycle";

export interface PaidCheckoutSession {
  id: string;
  entitlement: "export_credit" | "subscription";
  mode: "payment" | "subscription";
  customerId?: string;
  customerEmail?: string;
  accountUserId?: string;
  subscriptionId?: string;
  subscriptionStatus?: string;
  subscriptionPeriodStart?: string;
  subscriptionPeriodEnd?: string;
  consumed?: boolean;
}

const activeSubscriptionStatuses = new Set(["active", "trialing"]);
const unavailableExportCreditStatuses = new Set(["processing", "consumed", "refunded", "expired"]);

function parsePositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : fallback;
}

export function getSubscriptionMonthlyExportLimit() {
  return parsePositiveInteger(process.env.TRIMPROOF_PRO_MONTHLY_EXPORT_LIMIT, 15);
}

function getSessionCustomerEmail(session: Stripe.Checkout.Session) {
  return session.customer_details?.email ?? session.customer_email ?? undefined;
}

function normalizeEmail(value: string | undefined) {
  return value?.trim().toLowerCase();
}

function getSessionAccountUserId(session: Stripe.Checkout.Session) {
  return session.client_reference_id ?? session.metadata?.user_id ?? undefined;
}

export function paidCheckoutSessionBelongsToAccount(session: PaidCheckoutSession, account: Pick<AccountSession, "userId" | "email">) {
  return Boolean(
    session.accountUserId &&
    session.accountUserId === account.userId &&
    normalizeEmail(session.customerEmail) &&
    normalizeEmail(session.customerEmail) === normalizeEmail(account.email)
  );
}

function unixTimestampToIso(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? new Date(value * 1000).toISOString() : undefined;
}

function fallbackMonthlyPeriod(now = new Date()) {
  const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return {
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString()
  };
}

function subscriptionPeriod(subscription: Stripe.Subscription) {
  const record = subscription as unknown as Record<string, unknown>;
  const periodStart = unixTimestampToIso(record.current_period_start);
  const periodEnd = unixTimestampToIso(record.current_period_end);
  if (periodStart && periodEnd) {
    return { periodStart, periodEnd };
  }
  return fallbackMonthlyPeriod();
}

export async function verifyPaidCheckoutSession(
  sessionId?: string,
  expectedAccount?: Pick<AccountSession, "userId" | "email">
): Promise<PaidCheckoutSession | undefined> {
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
  const customerEmail = getSessionCustomerEmail(session);
  const accountUserId = getSessionAccountUserId(session);
  let subscriptionId: string | undefined;
  let subscriptionStatus: string | undefined;
  let subscriptionPeriodStart: string | undefined;
  let subscriptionPeriodEnd: string | undefined;
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
    const period = subscriptionPeriod(subscription);
    subscriptionPeriodStart = period.periodStart;
    subscriptionPeriodEnd = period.periodEnd;
  }

  const paidSession: PaidCheckoutSession = {
    id: session.id,
    entitlement,
    mode: session.mode,
    customerId,
    customerEmail,
    accountUserId,
    subscriptionId,
    subscriptionStatus,
    subscriptionPeriodStart,
    subscriptionPeriodEnd,
    consumed: false
  };
  if (expectedAccount && !paidCheckoutSessionBelongsToAccount(paidSession, expectedAccount)) {
    throw new Error("Checkout session does not belong to this account.");
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
      return { ...paidSession, consumed };
    }

    await supabase.from("export_orders").upsert(
      {
        stripe_session_id: session.id,
        stripe_customer_id: customerId ?? null,
        stripe_payment_intent_id: stripeObjectId(session.payment_intent),
        stripe_subscription_id: subscriptionId ?? null,
        amount_total_cents: session.amount_total ?? null,
        currency: session.currency?.toUpperCase() ?? null,
        customer_email: customerEmail ?? null,
        entitlement,
        checkout_mode: session.mode,
        status: consumed ? "consumed" : "paid"
      },
      {
        onConflict: "stripe_session_id"
      }
    );
  }

  return { ...paidSession, consumed };
}

export async function claimSubscriptionExport(session: PaidCheckoutSession, userId: string, proofJobId: string) {
  const supabase = createServiceSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase service client is required to claim subscription exports.");
  }
  if (!session.subscriptionId) {
    throw new Error("Subscription export is missing a Stripe subscription ID.");
  }

  const fallbackPeriod = fallbackMonthlyPeriod();
  const periodStart = session.subscriptionPeriodStart ?? fallbackPeriod.periodStart;
  const periodEnd = session.subscriptionPeriodEnd ?? fallbackPeriod.periodEnd;
  const limit = getSubscriptionMonthlyExportLimit();
  const { error } = await supabase.rpc("claim_subscription_export", {
    p_user_id: userId,
    p_stripe_subscription_id: session.subscriptionId,
    p_stripe_session_id: session.id,
    p_proof_job_id: proofJobId,
    p_period_start: periodStart,
    p_period_end: periodEnd,
    p_limit: limit
  });

  if (error) {
    if (error.message.toLowerCase().includes("limit reached")) {
      throw new Error(`This Pro subscription has reached its ${limit} advanced exports for the current billing month.`);
    }
    throw new Error(error.message);
  }
}

export async function finalizeSubscriptionExport(proofJobId: string) {
  const supabase = createServiceSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase service client is required to finalize subscription exports.");
  }

  const { error } = await supabase
    .from("subscription_export_usage")
    .update({
      status: "completed"
    })
    .eq("proof_job_id", proofJobId)
    .eq("status", "processing");

  if (error) {
    throw new Error(error.message);
  }
}

export async function releaseSubscriptionExport(proofJobId: string) {
  const supabase = createServiceSupabaseClient();
  if (!supabase) {
    return;
  }

  await supabase
    .from("subscription_export_usage")
    .update({
      status: "failed"
    })
    .eq("proof_job_id", proofJobId)
    .eq("status", "processing");
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
