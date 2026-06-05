import type Stripe from "stripe";
import type { createServiceSupabaseClient } from "@/lib/db/supabase";

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

export async function updateExportOrderBySessionId(supabase: SupabaseClient, sessionId: string, status: ExportOrderStatus) {
  await supabase
    .from("export_orders")
    .update({
      status,
      proof_job_id: null,
      consumed_at: null
    })
    .eq("stripe_session_id", sessionId);
}

export async function updateExportOrdersByPaymentIntentId(supabase: SupabaseClient, paymentIntentId: string, status: Extract<ExportOrderStatus, "refunded" | "expired">) {
  await supabase
    .from("export_orders")
    .update({
      status,
      proof_job_id: null,
      consumed_at: null
    })
    .eq("stripe_payment_intent_id", paymentIntentId);
}

export async function updateExportOrdersBySubscriptionId(supabase: SupabaseClient, subscriptionId: string, status: Extract<ExportOrderStatus, "paid" | "expired">) {
  await supabase
    .from("export_orders")
    .update({
      status,
      proof_job_id: null,
      consumed_at: null
    })
    .eq("stripe_subscription_id", subscriptionId);
}
