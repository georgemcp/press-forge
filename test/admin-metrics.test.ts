import { describe, expect, it } from "vitest";
import {
  buildAdminAccountSummaries,
  getEstimatedStripeFeeCents,
  getOrderRevenueCents,
  summarizeAdminMetrics,
  type AdminEconomicsConfig,
  type ExportOrderRow,
  type GeneratedProofJob
} from "@/lib/admin/metrics";

const economics: AdminEconomicsConfig = {
  exportPriceCents: 900,
  subscriptionPriceCents: 2900,
  stripeFeeBps: 290,
  stripeFixedFeeCents: 30,
  estimatedProofCostCents: 20
};

function order(overrides: Partial<ExportOrderRow>): ExportOrderRow {
  return {
    id: overrides.id ?? "order-id",
    stripe_session_id: overrides.stripe_session_id ?? "cs_test",
    stripe_customer_id: overrides.stripe_customer_id ?? "cus_test",
    stripe_payment_intent_id: overrides.stripe_payment_intent_id ?? null,
    stripe_subscription_id: overrides.stripe_subscription_id ?? null,
    customer_email: overrides.customer_email ?? "buyer@example.com",
    entitlement: overrides.entitlement ?? "export_credit",
    checkout_mode: overrides.checkout_mode ?? "payment",
    status: overrides.status ?? "paid",
    proof_job_id: overrides.proof_job_id ?? null,
    consumed_at: overrides.consumed_at ?? null,
    created_at: overrides.created_at ?? "2026-06-04T12:00:00Z",
    updated_at: overrides.updated_at ?? "2026-06-04T12:00:00Z"
  };
}

function proof(overrides: Partial<GeneratedProofJob>): GeneratedProofJob {
  return {
    id: overrides.id ?? "proof-id",
    createdAt: overrides.createdAt ?? "2026-06-04T12:00:00Z",
    mode: overrides.mode ?? "dummy",
    status: overrides.status ?? "passed",
    productType: overrides.productType ?? "business_card",
    provider: overrides.provider ?? "gemini",
    assetCount: overrides.assetCount ?? 1,
    fileCount: overrides.fileCount ?? 6,
    totalBytes: overrides.totalBytes ?? 1024
  };
}

describe("admin metrics", () => {
  it("maps order revenue and estimated Stripe fees from configured economics", () => {
    expect(getOrderRevenueCents(order({ entitlement: "export_credit", status: "paid" }), economics)).toBe(900);
    expect(getOrderRevenueCents(order({ entitlement: "subscription", status: "paid" }), economics)).toBe(2900);
    expect(getOrderRevenueCents(order({ entitlement: "subscription", status: "expired" }), economics)).toBe(0);
    expect(getEstimatedStripeFeeCents(900, economics)).toBe(56);
  });

  it("summarizes revenue, margin, subscriptions, accounts, and proof usage", () => {
    const summary = summarizeAdminMetrics({
      economics,
      now: new Date("2026-06-05T12:00:00Z"),
      periodDays: 30,
      orders: [
        order({ id: "credit", stripe_session_id: "cs_credit", entitlement: "export_credit", status: "consumed", customer_email: "buyer@example.com" }),
        order({ id: "subscription", stripe_session_id: "cs_sub", entitlement: "subscription", checkout_mode: "subscription", status: "paid", customer_email: "pro@example.com" }),
        order({ id: "refund", stripe_session_id: "cs_refund", entitlement: "export_credit", status: "refunded", customer_email: "refund@example.com" })
      ],
      signups: [
        { id: "signup-1", email: "buyer@example.com", source: "launch", created_at: "2026-06-03T12:00:00Z", updated_at: "2026-06-03T12:00:00Z" },
        { id: "signup-2", email: "lead@example.com", source: "launch", created_at: "2026-06-01T12:00:00Z", updated_at: "2026-06-01T12:00:00Z" }
      ],
      users: [],
      generatedProofs: [proof({ id: "passed" }), proof({ id: "failed", status: "failed" })]
    });

    expect(summary.grossRevenueCents).toBe(3800);
    expect(summary.exportRevenueCents).toBe(900);
    expect(summary.subscriptionRevenueCents).toBe(2900);
    expect(summary.activeSubscriptions).toBe(1);
    expect(summary.mrrCents).toBe(2900);
    expect(summary.generatedProofs).toBe(2);
    expect(summary.failedProofs).toBe(1);
    expect(summary.estimatedProofCostsCents).toBe(40);
    expect(summary.contributionProfitCents).toBe(3590);
  });

  it("builds account rows from users, signups, and orders", () => {
    const accounts = buildAdminAccountSummaries({
      economics,
      users: [
        {
          id: "user-1",
          email: "buyer@example.com",
          stripe_customer_id: "cus_existing",
          subscription_status: "none",
          created_at: "2026-06-01T12:00:00Z",
          updated_at: "2026-06-01T12:00:00Z"
        }
      ],
      signups: [{ id: "signup-1", email: "lead@example.com", source: "launch", created_at: "2026-06-03T12:00:00Z", updated_at: "2026-06-03T12:00:00Z" }],
      orders: [order({ customer_email: "buyer@example.com", status: "paid" })]
    });

    expect(accounts.find((account) => account.email === "buyer@example.com")).toMatchObject({
      accountSource: "user",
      revenueCents: 900,
      unusedCredits: 1,
      stripeCustomerId: "cus_test"
    });
    expect(accounts.find((account) => account.email === "lead@example.com")).toMatchObject({
      accountSource: "signup",
      revenueCents: 0
    });
  });
});
