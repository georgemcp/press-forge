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
const pilotProspectSegments = new Set(["print_shop", "marketing_team", "designer", "checklist_reader", "account_signup", "general_launch"]);
const pilotProspectStatuses = new Set(["needs_follow_up", "contacted", "customer", "vip", "blocked"]);
const pilotOutreachEventTypes = new Set(["first_touch_sent", "follow_up_sent", "reply_received", "pilot_agreed", "pilot_declined", "blocked"]);
const pilotOutreachChannels = new Set(["email", "contact_form", "phone", "linkedin", "in_person", "other"]);
const supportedPilotJobs = new Set(["flyer", "poster", "menu", "brochure", "business_card", "postcard", "letterhead"]);
const pilotEvidenceOutcomes = new Set(["review_only", "needs_revision", "used_after_review", "not_fit", "blocked"]);
const pilotQuotePermissions = new Set(["none", "anonymous", "attributed"]);
const pilotPublicClaimStatuses = new Set(["not_approved", "approved_internal", "approved_public"]);
const pilotTestedPaths = new Set(["dummy_proof", "export_credit", "pro", "unknown"]);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

function parsePriorityScore(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 55;
  }
  return Math.min(100, Math.max(0, Math.round(parsed)));
}

function parseEventAt(value: string) {
  const parsed = new Date(value || Date.now());
  if (!Number.isFinite(parsed.getTime())) {
    return undefined;
  }
  return parsed.toISOString();
}

function pilotProspectStatusForOutreachEvent(eventType: string) {
  if (eventType === "pilot_agreed") {
    return "vip";
  }
  if (eventType === "pilot_declined" || eventType === "blocked") {
    return "blocked";
  }
  return "contacted";
}

function pilotProspectStatusForEvidenceOutcome(outcome: string) {
  if (outcome === "blocked" || outcome === "not_fit") {
    return "blocked";
  }
  return "vip";
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

export async function upsertPilotProspect(formData: FormData) {
  await requireAdminAction();
  const returnPath = safeReturnPath(textField(formData, "returnPath") || "/admin");
  const email = normalizeAdminEmail(textField(formData, "email"));
  if (!email || !emailPattern.test(email)) {
    redirectWithMessage(returnPath, "adminError", "A valid prospect email is required.");
  }

  const segment = textField(formData, "segment") || "general_launch";
  if (!pilotProspectSegments.has(segment)) {
    redirectWithMessage(returnPath, "adminError", "Prospect segment is not valid.");
  }

  const firstSupportedJob = textField(formData, "firstSupportedJob") || "flyer";
  if (!supportedPilotJobs.has(firstSupportedJob)) {
    redirectWithMessage(returnPath, "adminError", "First supported job is not valid.");
  }

  const status = textField(formData, "status") || "needs_follow_up";
  if (!pilotProspectStatuses.has(status)) {
    redirectWithMessage(returnPath, "adminError", "Prospect status is not valid.");
  }

  const lastContactAt = parseLastContactAt(textField(formData, "lastContactAt"));
  if (lastContactAt === undefined) {
    redirectWithMessage(returnPath, "adminError", "Last contact date is not valid.");
  }

  const supabase = await getSupabaseForAction(returnPath);
  const priorityScore = parsePriorityScore(textField(formData, "priorityScore"));
  const { error } = await supabase.from("pilot_prospects").upsert(
    {
      email,
      company_name: textField(formData, "companyName").slice(0, 160) || null,
      contact_name: textField(formData, "contactName").slice(0, 120) || null,
      role: textField(formData, "role").slice(0, 120) || null,
      segment,
      source: textField(formData, "source").slice(0, 80) || "manual_target_list",
      first_supported_job: firstSupportedJob,
      likely_pain: textField(formData, "likelyPain").slice(0, 500),
      public_contact_path: textField(formData, "publicContactPath").slice(0, 500),
      status,
      priority_score: priorityScore,
      notes: textField(formData, "notes").slice(0, 3000),
      last_signal_at: new Date().toISOString(),
      last_contact_at: lastContactAt
    },
    { onConflict: "email" }
  );
  if (error) {
    redirectWithMessage(returnPath, "adminError", error.message);
  }

  await recordAdminAuditEvent({
    supabase,
    action: "pilot_prospect.upsert",
    targetType: "pilot_prospect",
    targetId: email,
    metadata: {
      segment,
      status,
      firstSupportedJob,
      priorityScore
    }
  });

  revalidatePath("/admin");
  redirectWithMessage(returnPath, "saved", "Pilot prospect saved.");
}

export async function logPilotOutreachEvent(formData: FormData) {
  await requireAdminAction();
  const returnPath = safeReturnPath(textField(formData, "returnPath") || "/admin");
  const email = normalizeAdminEmail(textField(formData, "email"));
  if (!email || !emailPattern.test(email)) {
    redirectWithMessage(returnPath, "adminError", "A valid prospect email is required.");
  }

  const eventType = textField(formData, "eventType") || "first_touch_sent";
  if (!pilotOutreachEventTypes.has(eventType)) {
    redirectWithMessage(returnPath, "adminError", "Outreach event type is not valid.");
  }

  const channel = textField(formData, "channel") || "email";
  if (!pilotOutreachChannels.has(channel)) {
    redirectWithMessage(returnPath, "adminError", "Outreach channel is not valid.");
  }

  const firstSupportedJobValue = textField(formData, "firstSupportedJob");
  const firstSupportedJob = firstSupportedJobValue || null;
  if (firstSupportedJob && !supportedPilotJobs.has(firstSupportedJob)) {
    redirectWithMessage(returnPath, "adminError", "First supported job is not valid.");
  }

  const eventAt = parseEventAt(textField(formData, "eventAt"));
  if (!eventAt) {
    redirectWithMessage(returnPath, "adminError", "Outreach event date is not valid.");
  }

  const subject = textField(formData, "subject").slice(0, 240);
  const notes = textField(formData, "notes").slice(0, 3000);
  const nextStep = textField(formData, "nextStep").slice(0, 500);
  const supabase = await getSupabaseForAction(returnPath);
  const { error: insertError } = await supabase.from("pilot_outreach_events").insert({
    prospect_email: email,
    event_type: eventType,
    channel,
    subject,
    notes,
    next_step: nextStep,
    first_supported_job: firstSupportedJob,
    event_at: eventAt
  });
  if (insertError) {
    redirectWithMessage(returnPath, "adminError", insertError.message);
  }

  const prospectUpdate = supabase.from("pilot_prospects").update({
    status: pilotProspectStatusForOutreachEvent(eventType),
    last_contact_at: eventAt,
    last_signal_at: eventAt
  });
  const { error: prospectError } = await prospectUpdate.eq("email", email);
  if (prospectError) {
    redirectWithMessage(returnPath, "adminError", prospectError.message);
  }

  await recordAdminAuditEvent({
    supabase,
    action: "pilot_outreach.log_event",
    targetType: "pilot_prospect",
    targetId: email,
    metadata: {
      eventType,
      channel,
      firstSupportedJob,
      subjectLength: subject.length,
      notesLength: notes.length,
      nextStepLength: nextStep.length,
      eventAt
    }
  });

  revalidatePath("/admin");
  redirectWithMessage(returnPath, "saved", "Pilot outreach event logged.");
}

export async function recordPilotEvidence(formData: FormData) {
  await requireAdminAction();
  const returnPath = safeReturnPath(textField(formData, "returnPath") || "/admin");
  const email = normalizeAdminEmail(textField(formData, "email"));
  if (!email || !emailPattern.test(email)) {
    redirectWithMessage(returnPath, "adminError", "A valid prospect email is required.");
  }

  const jobType = textField(formData, "jobType") || "flyer";
  if (!supportedPilotJobs.has(jobType)) {
    redirectWithMessage(returnPath, "adminError", "Pilot evidence job type is not valid.");
  }

  const testedPath = textField(formData, "testedPath") || "unknown";
  if (!pilotTestedPaths.has(testedPath)) {
    redirectWithMessage(returnPath, "adminError", "Pilot evidence tested path is not valid.");
  }

  const outcome = textField(formData, "outcome") || "review_only";
  if (!pilotEvidenceOutcomes.has(outcome)) {
    redirectWithMessage(returnPath, "adminError", "Pilot evidence outcome is not valid.");
  }

  const quotePermission = textField(formData, "quotePermission") || "none";
  if (!pilotQuotePermissions.has(quotePermission)) {
    redirectWithMessage(returnPath, "adminError", "Quote permission is not valid.");
  }

  const publicClaimStatus = textField(formData, "publicClaimStatus") || "not_approved";
  if (!pilotPublicClaimStatuses.has(publicClaimStatus)) {
    redirectWithMessage(returnPath, "adminError", "Public claim status is not valid.");
  }

  const evidenceAt = parseEventAt(textField(formData, "evidenceAt"));
  if (!evidenceAt) {
    redirectWithMessage(returnPath, "adminError", "Pilot evidence date is not valid.");
  }

  const sourceMaterial = textField(formData, "sourceMaterial").slice(0, 500);
  const printerSpec = textField(formData, "printerSpec").slice(0, 500);
  const checksSummary = textField(formData, "checksSummary").slice(0, 1200);
  const reportClarity = textField(formData, "reportClarity").slice(0, 1200);
  const productVersion = textField(formData, "productVersion").slice(0, 160);
  const notes = textField(formData, "notes").slice(0, 3000);
  const supabase = await getSupabaseForAction(returnPath);
  const { error: insertError } = await supabase.from("pilot_evidence_records").insert({
    prospect_email: email,
    job_type: jobType,
    source_material: sourceMaterial,
    printer_spec: printerSpec,
    tested_path: testedPath,
    checks_summary: checksSummary,
    report_clarity: reportClarity,
    outcome,
    quote_permission: quotePermission,
    public_claim_status: publicClaimStatus,
    product_version: productVersion,
    notes,
    evidence_at: evidenceAt
  });
  if (insertError) {
    redirectWithMessage(returnPath, "adminError", insertError.message);
  }

  const { error: prospectError } = await supabase
    .from("pilot_prospects")
    .update({
      first_supported_job: jobType,
      status: pilotProspectStatusForEvidenceOutcome(outcome),
      last_signal_at: evidenceAt
    })
    .eq("email", email);
  if (prospectError) {
    redirectWithMessage(returnPath, "adminError", prospectError.message);
  }

  await recordAdminAuditEvent({
    supabase,
    action: "pilot_evidence.record",
    targetType: "pilot_prospect",
    targetId: email,
    metadata: {
      jobType,
      testedPath,
      outcome,
      quotePermission,
      publicClaimStatus,
      sourceMaterialLength: sourceMaterial.length,
      printerSpecLength: printerSpec.length,
      checksSummaryLength: checksSummary.length,
      reportClarityLength: reportClarity.length,
      notesLength: notes.length,
      evidenceAt
    }
  });

  revalidatePath("/admin");
  redirectWithMessage(returnPath, "saved", "Pilot evidence recorded.");
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
