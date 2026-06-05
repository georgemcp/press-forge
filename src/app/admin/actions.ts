"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { recordAdminAuditEvent } from "@/lib/admin/audit";
import {
  ADMIN_SESSION_COOKIE,
  createAdminSessionValue,
  getAdminSessionCookieOptions,
  isAdminAuthConfigured,
  validateAdminCredentials,
  verifyAdminSessionValue
} from "@/lib/admin/auth";
import { getOrderAccountEmail, normalizeAdminEmail, type ExportOrderRow } from "@/lib/admin/metrics";
import { buildAccessLinkEmail } from "@/lib/billing/access-link-email";
import { getAppUrl, getStripeClient } from "@/lib/billing/stripe";
import { createServiceSupabaseClient } from "@/lib/db/supabase";
import { sendTransactionalEmail } from "@/lib/email/transactional";

export interface AdminLoginState {
  error?: string;
  email?: string;
}

export async function loginAdmin(_state: AdminLoginState, formData: FormData): Promise<AdminLoginState> {
  const email = String(formData.get("email") ?? "");
  if (!isAdminAuthConfigured()) {
    return {
      email,
      error: "Admin login is not configured. Set TRIMPROOF_ADMIN_EMAIL, TRIMPROOF_ADMIN_PASSWORD, and TRIMPROOF_ADMIN_SESSION_SECRET."
    };
  }

  const password = String(formData.get("password") ?? "");
  if (!validateAdminCredentials(email, password)) {
    return {
      email,
      error: "That super admin login did not match."
    };
  }

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, createAdminSessionValue(), getAdminSessionCookieOptions());
  redirect("/admin");
}

export async function logoutAdmin() {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, "", {
    ...getAdminSessionCookieOptions(),
    maxAge: 0
  });
  redirect("/admin/login");
}

const accountStatuses = new Set(["lead", "customer", "vip", "churn_risk", "blocked"]);

function textField(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function adminPathForAccount(email: string) {
  return `/admin/accounts/${encodeURIComponent(email)}`;
}

function safeReturnPath(value: string) {
  return value.startsWith("/admin") && !value.startsWith("//") ? value : "/admin";
}

function redirectWithMessage(path: string, key: "saved" | "adminError", message: string): never {
  const separator = path.includes("?") ? "&" : "?";
  redirect(`${path}${separator}${key}=${encodeURIComponent(message)}`);
}

async function requireAdminAction() {
  const cookieStore = await cookies();
  if (!isAdminAuthConfigured() || !verifyAdminSessionValue(cookieStore.get(ADMIN_SESSION_COOKIE)?.value)) {
    redirect("/admin/login");
  }
}

function parseLastContactAt(value: string) {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) {
    return undefined;
  }
  return parsed.toISOString();
}

function orderReturnPath(order: Pick<ExportOrderRow, "customer_email" | "stripe_customer_id" | "stripe_session_id">, fallback: string) {
  const email = getOrderAccountEmail(order);
  return email ? adminPathForAccount(email) : fallback;
}

async function getSupabaseForAction(returnPath: string) {
  const supabase = createServiceSupabaseClient();
  if (!supabase) {
    redirectWithMessage(returnPath, "adminError", "Supabase service role is not configured.");
  }
  return supabase;
}

async function getOrderForAction(orderId: string, returnPath: string) {
  const supabase = await getSupabaseForAction(returnPath);
  const { data, error } = await supabase.from("export_orders").select("*").eq("id", orderId).maybeSingle();
  if (error) {
    redirectWithMessage(returnPath, "adminError", error.message);
  }
  if (!data) {
    redirectWithMessage(returnPath, "adminError", "Order was not found.");
  }
  return { supabase, order: data as ExportOrderRow };
}

export async function updateAccountManagement(formData: FormData) {
  await requireAdminAction();
  const email = normalizeAdminEmail(textField(formData, "email"));
  const returnPath = safeReturnPath(textField(formData, "returnPath") || adminPathForAccount(email));
  if (!email) {
    redirectWithMessage(returnPath, "adminError", "Account email is required.");
  }

  const status = textField(formData, "status") || "lead";
  if (!accountStatuses.has(status)) {
    redirectWithMessage(returnPath, "adminError", "Account status is not valid.");
  }

  const lastContactAt = parseLastContactAt(textField(formData, "lastContactAt"));
  if (lastContactAt === undefined) {
    redirectWithMessage(returnPath, "adminError", "Last contact date is not valid.");
  }

  const notes = textField(formData, "notes").slice(0, 5000);
  const supabase = await getSupabaseForAction(returnPath);
  const { error } = await supabase.from("account_management").upsert(
    {
      email,
      status,
      notes,
      last_contact_at: lastContactAt
    },
    { onConflict: "email" }
  );
  if (error) {
    redirectWithMessage(returnPath, "adminError", error.message);
  }

  await recordAdminAuditEvent({
    supabase,
    action: "account.update",
    targetType: "account",
    targetId: email,
    metadata: {
      status,
      notesLength: notes.length,
      lastContactAt
    }
  });

  revalidatePath("/admin");
  revalidatePath(returnPath);
  redirectWithMessage(returnPath, "saved", "Account management notes saved.");
}

export async function openStripeCustomerPortal(formData: FormData) {
  await requireAdminAction();
  const returnPath = safeReturnPath(textField(formData, "returnPath") || "/admin");
  const customerId = textField(formData, "stripeCustomerId");
  if (!customerId) {
    redirectWithMessage(returnPath, "adminError", "Stripe customer ID is required.");
  }

  const stripe = getStripeClient();
  if (!stripe) {
    redirectWithMessage(returnPath, "adminError", "Stripe is not configured.");
  }

  const portalConfigurationId = process.env.STRIPE_PORTAL_CONFIGURATION_ID;
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: new URL(returnPath, getAppUrl()).toString(),
    ...(portalConfigurationId ? { configuration: portalConfigurationId } : {})
  });
  redirect(session.url);
}

export async function sendOrderAccessLink(formData: FormData) {
  await requireAdminAction();
  const fallbackReturnPath = safeReturnPath(textField(formData, "returnPath") || "/admin");
  const orderId = textField(formData, "orderId");
  const { supabase, order } = await getOrderForAction(orderId, fallbackReturnPath);
  const returnPath = orderReturnPath(order, fallbackReturnPath);
  const email = normalizeAdminEmail(textField(formData, "email") || order.customer_email || "");
  if (!email) {
    redirectWithMessage(returnPath, "adminError", "A billing email is required to send an access link.");
  }
  if (order.status !== "paid") {
    redirectWithMessage(returnPath, "adminError", "Only active paid orders can receive access links.");
  }

  const accessUrl = `${getAppUrl()}/app?mode=advanced&checkout=success&session_id=${encodeURIComponent(order.stripe_session_id)}`;
  const delivery = await sendTransactionalEmail(buildAccessLinkEmail(email, order, accessUrl));
  await recordAdminAuditEvent({
    supabase,
    action: "order.access_link_sent",
    targetType: "order",
    targetId: order.id,
    metadata: {
      email,
      deliveryStatus: delivery.status,
      provider: delivery.provider ?? null
    }
  });
  if (delivery.status !== "sent") {
    redirectWithMessage(returnPath, "adminError", delivery.reason ?? "Access link email was not sent.");
  }

  redirectWithMessage(returnPath, "saved", "Access link sent.");
}

export async function expireOrderAccess(formData: FormData) {
  await requireAdminAction();
  const fallbackReturnPath = safeReturnPath(textField(formData, "returnPath") || "/admin");
  const { supabase, order } = await getOrderForAction(textField(formData, "orderId"), fallbackReturnPath);
  const returnPath = orderReturnPath(order, fallbackReturnPath);

  const { error } = await supabase
    .from("export_orders")
    .update({
      status: "expired",
      proof_job_id: null,
      consumed_at: null
    })
    .eq("id", order.id);
  if (error) {
    redirectWithMessage(returnPath, "adminError", error.message);
  }

  await recordAdminAuditEvent({
    supabase,
    action: "order.expire_access",
    targetType: "order",
    targetId: order.id,
    metadata: {
      previousStatus: order.status,
      stripeSessionId: order.stripe_session_id
    }
  });

  revalidatePath("/admin");
  revalidatePath(returnPath);
  redirectWithMessage(returnPath, "saved", "Order access expired.");
}

export async function refundOrder(formData: FormData) {
  await requireAdminAction();
  const fallbackReturnPath = safeReturnPath(textField(formData, "returnPath") || "/admin");
  const { supabase, order } = await getOrderForAction(textField(formData, "orderId"), fallbackReturnPath);
  const returnPath = orderReturnPath(order, fallbackReturnPath);
  if (!order.stripe_payment_intent_id) {
    redirectWithMessage(returnPath, "adminError", "This order does not have a Stripe payment intent to refund.");
  }
  if (order.status === "refunded") {
    redirectWithMessage(returnPath, "saved", "Order was already refunded.");
  }

  const stripe = getStripeClient();
  if (!stripe) {
    redirectWithMessage(returnPath, "adminError", "Stripe is not configured.");
  }

  let refundId = "";
  try {
    const refund = await stripe.refunds.create({
      payment_intent: order.stripe_payment_intent_id,
      metadata: {
        product: "trimproof",
        admin_action: "refund_order",
        export_order_id: order.id
      }
    });
    refundId = refund.id;
  } catch (error) {
    await recordAdminAuditEvent({
      supabase,
      action: "order.refund_failed",
      targetType: "order",
      targetId: order.id,
      metadata: {
        reason: error instanceof Error ? error.message : "Stripe refund failed."
      }
    });
    redirectWithMessage(returnPath, "adminError", error instanceof Error ? error.message : "Stripe refund failed.");
  }

  const { error } = await supabase
    .from("export_orders")
    .update({
      status: "refunded",
      proof_job_id: null,
      consumed_at: null
    })
    .eq("id", order.id);
  if (error) {
    redirectWithMessage(returnPath, "adminError", error.message);
  }

  await recordAdminAuditEvent({
    supabase,
    action: "order.refund",
    targetType: "order",
    targetId: order.id,
    metadata: {
      refundId,
      amountTotalCents: order.amount_total_cents,
      stripePaymentIntentId: order.stripe_payment_intent_id
    }
  });

  revalidatePath("/admin");
  revalidatePath(returnPath);
  redirectWithMessage(returnPath, "saved", "Stripe refund created and order marked refunded.");
}

export async function cancelSubscription(formData: FormData) {
  await requireAdminAction();
  const fallbackReturnPath = safeReturnPath(textField(formData, "returnPath") || "/admin");
  const { supabase, order } = await getOrderForAction(textField(formData, "orderId"), fallbackReturnPath);
  const returnPath = orderReturnPath(order, fallbackReturnPath);
  if (!order.stripe_subscription_id) {
    redirectWithMessage(returnPath, "adminError", "This order does not have a Stripe subscription ID.");
  }

  const stripe = getStripeClient();
  if (!stripe) {
    redirectWithMessage(returnPath, "adminError", "Stripe is not configured.");
  }

  let subscriptionStatus = "canceled";
  try {
    const subscription = await stripe.subscriptions.cancel(order.stripe_subscription_id);
    subscriptionStatus = subscription.status;
  } catch (error) {
    await recordAdminAuditEvent({
      supabase,
      action: "subscription.cancel_failed",
      targetType: "order",
      targetId: order.id,
      metadata: {
        stripeSubscriptionId: order.stripe_subscription_id,
        reason: error instanceof Error ? error.message : "Stripe cancellation failed."
      }
    });
    redirectWithMessage(returnPath, "adminError", error instanceof Error ? error.message : "Stripe cancellation failed.");
  }

  const { error } = await supabase
    .from("export_orders")
    .update({
      status: "expired",
      proof_job_id: null,
      consumed_at: null
    })
    .eq("stripe_subscription_id", order.stripe_subscription_id);
  if (error) {
    redirectWithMessage(returnPath, "adminError", error.message);
  }

  await recordAdminAuditEvent({
    supabase,
    action: "subscription.cancel",
    targetType: "order",
    targetId: order.id,
    metadata: {
      stripeSubscriptionId: order.stripe_subscription_id,
      subscriptionStatus
    }
  });

  revalidatePath("/admin");
  revalidatePath(returnPath);
  redirectWithMessage(returnPath, "saved", "Subscription canceled and access expired.");
}
