import type Stripe from "stripe";
import type { createServiceSupabaseClient } from "@/lib/db/supabase";
import type { TablesInsert } from "@/types/supabase";

type SupabaseClient = NonNullable<ReturnType<typeof createServiceSupabaseClient>>;
export type ExportOrderStatus = "paid" | "processing" | "consumed" | "refunded" | "expired";
export type SubscriptionOrderStatus = Extract<ExportOrderStatus, "paid" | "expired">;

const activeSubscriptionStatuses = new Set(["active", "trialing"]);

export function stripeObjectId(value: string | { id?: string | null } | null | undefined) {
  if (typeof value === "string") {
    return value;
  }
  return value?.id ?? undefined;
}

export function exportOrderStatusForSubscription(status?: Stripe.Subscription.Status | string | null): SubscriptionOrderStatus {
  return activeSubscriptionStatuses.has(status ?? "") ? "paid" : "expired";
}

/**
 * Webhooks are delivered at-least-once and out of order, so every write is a conditional
 * update that names the prior states it may leave. "refunded" is terminal: nothing moves out of it.
 */
export type LifecycleResult = "updated" | "terminal" | "missing";

type OrderColumn = "id" | "stripe_session_id" | "stripe_payment_intent_id" | "stripe_subscription_id";

const refundableStatuses: ExportOrderStatus[] = ["paid", "processing", "consumed", "expired"];
const expirableStatuses: ExportOrderStatus[] = ["paid"];
// An operator may also cut off an order that is mid-export or already spent, but never a refunded one.
const adminExpirableStatuses: ExportOrderStatus[] = ["paid", "processing", "consumed"];

const TOMBSTONE_PREFIX = "refund-tombstone:";

function tombstoneSessionId(paymentIntentId: string) {
  return `${TOMBSTONE_PREFIX}${paymentIntentId}`;
}

async function transitionExportOrders(
  supabase: SupabaseClient,
  column: OrderColumn,
  value: string,
  status: ExportOrderStatus,
  allowedPriorStatuses: ExportOrderStatus[]
): Promise<LifecycleResult> {
  const { data, error } = await supabase
    .from("export_orders")
    .update({
      status,
      proof_job_id: null,
      consumed_at: null
    })
    .eq(column, value)
    .in("status", allowedPriorStatuses)
    .select("id");
  if (error) {
    throw new Error(error.message);
  }
  if (data && data.length > 0) {
    return "updated";
  }

  // A 0-row update is a late, duplicate or stale delivery, not a failure.
  const { data: existing, error: existingError } = await supabase.from("export_orders").select("id").eq(column, value).limit(1);
  if (existingError) {
    throw new Error(existingError.message);
  }
  const result: LifecycleResult = existing && existing.length > 0 ? "terminal" : "missing";
  console.info("Trim Proof order lifecycle write skipped", { column, value, status, result });
  return result;
}

export async function updateExportOrderBySessionId(supabase: SupabaseClient, sessionId: string, status: Extract<ExportOrderStatus, "expired">) {
  return transitionExportOrders(supabase, "stripe_session_id", sessionId, status, expirableStatuses);
}

export async function expireExportOrderById(supabase: SupabaseClient, orderId: string) {
  return transitionExportOrders(supabase, "id", orderId, "expired", adminExpirableStatuses);
}

async function hasRefundTombstone(supabase: SupabaseClient, paymentIntentId: string) {
  const { data, error } = await supabase
    .from("export_orders")
    .select("id")
    .eq("stripe_session_id", tombstoneSessionId(paymentIntentId))
    .limit(1);
  if (error) {
    throw new Error(error.message);
  }
  return Boolean(data && data.length > 0);
}

async function deleteRefundTombstone(supabase: SupabaseClient, paymentIntentId: string) {
  const { error } = await supabase.from("export_orders").delete().eq("stripe_session_id", tombstoneSessionId(paymentIntentId));
  if (error) {
    throw new Error(error.message);
  }
}

export async function updateExportOrdersByPaymentIntentId(supabase: SupabaseClient, paymentIntentId: string, status: Extract<ExportOrderStatus, "refunded" | "expired">) {
  const prior = status === "refunded" ? refundableStatuses : expirableStatuses;
  const result = await transitionExportOrders(supabase, "stripe_payment_intent_id", paymentIntentId, status, prior);
  if (result !== "missing" || status !== "refunded") {
    return result;
  }

  // Refund arrived before the order row exists. Leave a refunded tombstone (keyed by the payment intent,
  // using the existing not-null columns) so recordPaidExportOrder lands the later checkout as refunded.
  const { error } = await supabase.from("export_orders").upsert(
    {
      stripe_session_id: tombstoneSessionId(paymentIntentId),
      stripe_payment_intent_id: paymentIntentId,
      entitlement: "export_credit",
      checkout_mode: "payment",
      status: "refunded"
    },
    { onConflict: "stripe_session_id", ignoreDuplicates: true }
  );
  if (error) {
    throw new Error(error.message);
  }
  // The checkout may have been recorded between the first update and the tombstone write.
  const retry = await transitionExportOrders(supabase, "stripe_payment_intent_id", paymentIntentId, "refunded", refundableStatuses);
  if (retry === "updated") {
    await deleteRefundTombstone(supabase, paymentIntentId);
    return retry;
  }
  return "missing" as const;
}

export async function updateExportOrdersBySubscriptionId(
  supabase: SupabaseClient,
  subscriptionId: string,
  status: Extract<ExportOrderStatus, "paid" | "expired">,
  options: { reactivate?: boolean } = {}
) {
  // Only a paid invoice is evidence enough to bring an expired subscription order back; a replayed
  // subscription.created/updated event cannot.
  const prior: ExportOrderStatus[] = status === "paid" ? (options.reactivate ? ["paid", "expired"] : ["paid"]) : expirableStatuses;
  return transitionExportOrders(supabase, "stripe_subscription_id", subscriptionId, status, prior);
}

type PaidExportOrderRow = Omit<TablesInsert<"export_orders">, "status">;

/**
 * Records a verified checkout. Never moves an existing order. Returns whether this call created the row
 * (so side effects such as the GA purchase event fire once) and whether it landed refunded.
 */
export async function recordPaidExportOrder(
  supabase: SupabaseClient,
  row: PaidExportOrderRow
) {
  const paymentIntentId = typeof row.stripe_payment_intent_id === "string" ? row.stripe_payment_intent_id : undefined;
  const tombstoned = paymentIntentId ? await hasRefundTombstone(supabase, paymentIntentId) : false;

  const { data, error } = await supabase
    .from("export_orders")
    .upsert(
      { ...row, status: tombstoned ? "refunded" : "paid" },
      {
        onConflict: "stripe_session_id",
        // Retries and verification races must not revive a processing, consumed, or refunded credit.
        ignoreDuplicates: true
      }
    )
    .select("id");
  if (error) {
    throw new Error(error.message);
  }
  const created = Boolean(data && data.length > 0);

  let refunded = tombstoned;
  if (paymentIntentId && (tombstoned || (created && (await hasRefundTombstone(supabase, paymentIntentId))))) {
    // Covers a refund that raced this insert and an existing row the tombstone could not cover.
    await transitionExportOrders(supabase, "stripe_payment_intent_id", paymentIntentId, "refunded", refundableStatuses);
    await deleteRefundTombstone(supabase, paymentIntentId);
    refunded = true;
  }
  if (!created && !refunded) {
    // A duplicate delivery finds the existing row: report it refunded so callers do not grant credit for a refunded order.
    const { data: existing, error: existingError } = await supabase
      .from("export_orders")
      .select("status")
      .eq("stripe_session_id", row.stripe_session_id)
      .maybeSingle();
    if (existingError) {
      throw new Error(existingError.message);
    }
    refunded = existing?.status === "refunded";
  }
  return { created, refunded };
}
