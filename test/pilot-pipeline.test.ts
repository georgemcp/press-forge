import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { buildPilotPipelineLeads } from "@/lib/admin/pilot-pipeline";
import type { PilotProspectRow } from "@/lib/admin/pilot-pipeline";
import type { AccountManagementRow, EmailSignupRow, ExportOrderRow, UserRow } from "@/lib/admin/metrics";

const adminCenterSource = readFileSync("src/components/admin/admin-center.tsx", "utf8");

function signup(overrides: Partial<EmailSignupRow>): EmailSignupRow {
  return {
    id: overrides.id ?? "signup-id",
    email: overrides.email ?? "lead@example.com",
    source: overrides.source ?? "marketing_home",
    created_at: overrides.created_at ?? "2026-06-15T10:00:00Z",
    updated_at: overrides.updated_at ?? "2026-06-15T10:00:00Z"
  };
}

function user(overrides: Partial<UserRow>): UserRow {
  return {
    id: overrides.id ?? "user-id",
    email: overrides.email ?? "lead@example.com",
    stripe_customer_id: overrides.stripe_customer_id ?? null,
    subscription_status: overrides.subscription_status ?? "none",
    full_name: overrides.full_name ?? null,
    company_name: overrides.company_name ?? null,
    role: overrides.role ?? null,
    company_website: overrides.company_website ?? null,
    phone: overrides.phone ?? null,
    monthly_print_jobs: overrides.monthly_print_jobs ?? null,
    primary_use_case: overrides.primary_use_case ?? null,
    plan_interest: overrides.plan_interest ?? null,
    marketing_consent: overrides.marketing_consent ?? true,
    onboarding_completed_at: overrides.onboarding_completed_at ?? null,
    created_at: overrides.created_at ?? "2026-06-15T11:00:00Z",
    updated_at: overrides.updated_at ?? "2026-06-15T11:00:00Z"
  };
}

function management(overrides: Partial<AccountManagementRow>): AccountManagementRow {
  return {
    email: overrides.email ?? "lead@example.com",
    status: overrides.status ?? "lead",
    notes: overrides.notes ?? "",
    last_contact_at: overrides.last_contact_at ?? null,
    created_at: overrides.created_at ?? "2026-06-15T12:00:00Z",
    updated_at: overrides.updated_at ?? "2026-06-15T12:00:00Z"
  };
}

function order(overrides: Partial<ExportOrderRow>): ExportOrderRow {
  return {
    id: overrides.id ?? "order-id",
    stripe_session_id: overrides.stripe_session_id ?? "cs_test",
    stripe_customer_id: overrides.stripe_customer_id ?? "cus_test",
    stripe_payment_intent_id: overrides.stripe_payment_intent_id ?? null,
    stripe_subscription_id: overrides.stripe_subscription_id ?? null,
    amount_total_cents: overrides.amount_total_cents ?? null,
    currency: overrides.currency ?? "USD",
    customer_email: overrides.customer_email ?? "buyer@example.com",
    entitlement: overrides.entitlement ?? "export_credit",
    checkout_mode: overrides.checkout_mode ?? "payment",
    status: overrides.status ?? "paid",
    proof_job_id: overrides.proof_job_id ?? null,
    consumed_at: overrides.consumed_at ?? null,
    created_at: overrides.created_at ?? "2026-06-15T13:00:00Z",
    updated_at: overrides.updated_at ?? "2026-06-15T13:00:00Z"
  };
}

function prospect(overrides: Partial<PilotProspectRow>): PilotProspectRow {
  return {
    id: overrides.id ?? "prospect-id",
    email: overrides.email ?? "prospect@example.com",
    company_name: overrides.company_name ?? null,
    contact_name: overrides.contact_name ?? null,
    role: overrides.role ?? null,
    segment: overrides.segment ?? "print_shop",
    source: overrides.source ?? "manual_target_list",
    first_supported_job: overrides.first_supported_job ?? "flyer",
    likely_pain: overrides.likely_pain ?? "",
    public_contact_path: overrides.public_contact_path ?? "",
    status: overrides.status ?? "needs_follow_up",
    priority_score: overrides.priority_score ?? 55,
    notes: overrides.notes ?? "",
    last_signal_at: overrides.last_signal_at ?? null,
    last_contact_at: overrides.last_contact_at ?? null,
    created_at: overrides.created_at ?? "2026-06-15T08:00:00Z",
    updated_at: overrides.updated_at ?? "2026-06-15T08:00:00Z"
  };
}

describe("pilot pipeline", () => {
  it("prioritizes uncontacted print-shop pilot signups with source and use-case context", () => {
    const leads = buildPilotPipelineLeads({
      signups: [
        signup({
          email: "owner@northprint.test",
          source: "print_shop_page",
          created_at: "2026-06-15T09:00:00Z",
          updated_at: "2026-06-15T09:00:00Z"
        }),
        signup({
          email: "designer@example.com",
          source: "designer_page",
          created_at: "2026-06-15T10:00:00Z",
          updated_at: "2026-06-15T10:00:00Z"
        })
      ],
      users: [
        user({
          email: "owner@northprint.test",
          company_name: "North Print",
          role: "Owner",
          monthly_print_jobs: "50+",
          primary_use_case: "Clean up customer flyer files",
          plan_interest: "pro"
        })
      ],
      management: [],
      orders: []
    });

    expect(leads[0]).toMatchObject({
      email: "owner@northprint.test",
      segment: "print_shop",
      segmentLabel: "Print shop",
      companyName: "North Print",
      useCase: "Clean up customer flyer files",
      followUpStatus: "needs_follow_up",
      priorityLabel: "High",
      source: "print_shop_page",
      origin: "signup"
    });
    expect(leads[0].priorityScore).toBeGreaterThan(leads[1].priorityScore);
  });

  it("includes founder-sourced pilot prospects before they sign up", () => {
    const leads = buildPilotPipelineLeads({
      signups: [],
      users: [],
      management: [],
      prospects: [
        prospect({
          email: "owner@target-print.test",
          company_name: "Target Print",
          contact_name: "Sam Owner",
          role: "Owner",
          segment: "print_shop",
          source: "google_maps",
          first_supported_job: "menu",
          likely_pain: "Customer menus arrive without bleed or crop marks.",
          public_contact_path: "Public website contact form",
          priority_score: 88
        })
      ],
      orders: []
    });

    expect(leads[0]).toMatchObject({
      email: "owner@target-print.test",
      origin: "prospect",
      segment: "print_shop",
      segmentLabel: "Print shop",
      companyName: "Target Print",
      contactName: "Sam Owner",
      firstSupportedJob: "menu",
      publicContactPath: "Public website contact form",
      useCase: "menu pilot target: Customer menus arrive without bleed or crop marks.",
      priorityLabel: "High"
    });
  });

  it("keeps the explicit segment for manual target-list prospects", () => {
    const leads = buildPilotPipelineLeads({
      signups: [],
      users: [],
      management: [],
      prospects: [
        prospect({
          email: "designer@studio.test",
          company_name: "Studio Target",
          segment: "designer",
          source: "manual_target_list",
          first_supported_job: "business_card",
          priority_score: 72
        }),
        prospect({
          email: "national-chain@example.test",
          company_name: "National Chain",
          segment: "print_shop",
          source: "manual_target_list",
          first_supported_job: "flyer",
          priority_score: 55
        })
      ],
      orders: []
    });

    expect(leads[0]).toMatchObject({
      email: "designer@studio.test",
      segment: "designer",
      segmentLabel: "Designer",
      priorityScore: 72,
      useCase: "business card pilot target: Manual designer pilot target for small client print-job handoff."
    });
    expect(leads.find((lead) => lead.email === "national-chain@example.test")).toMatchObject({
      segment: "print_shop",
      segmentLabel: "Print shop",
      priorityScore: 55,
      priorityLabel: "Medium"
    });
  });

  it("merges a manual prospect with signup and account signals by email", () => {
    const leads = buildPilotPipelineLeads({
      signups: [
        signup({
          email: "designer@example.com",
          source: "designer_page",
          updated_at: "2026-06-15T10:00:00Z"
        })
      ],
      users: [
        user({
          email: "designer@example.com",
          company_name: "Design Studio",
          primary_use_case: "Postcard handoff for local clients",
          plan_interest: "pro",
          updated_at: "2026-06-15T11:00:00Z"
        })
      ],
      management: [
        management({
          email: "designer@example.com",
          status: "vip",
          updated_at: "2026-06-15T12:00:00Z"
        })
      ],
      prospects: [
        prospect({
          email: "designer@example.com",
          segment: "designer",
          source: "linkedin",
          first_supported_job: "postcard",
          priority_score: 70
        })
      ],
      orders: []
    });

    expect(leads).toHaveLength(1);
    expect(leads[0]).toMatchObject({
      email: "designer@example.com",
      origin: "signup_and_prospect",
      companyName: "Design Studio",
      useCase: "Postcard handoff for local clients",
      firstSupportedJob: "postcard",
      followUpStatus: "vip",
      priorityLabel: "High"
    });
    expect(leads[0].source).toContain("designer_page");
    expect(leads[0].source).toContain("linkedin");
  });

  it("marks contacted, customer, and blocked leads from management and order state", () => {
    const leads = buildPilotPipelineLeads({
      signups: [
        signup({ email: "contacted@example.com", source: "marketer_page" }),
        signup({ email: "customer@example.com", source: "prepress_checklist" }),
        signup({ email: "blocked@example.com", source: "marketing_home" })
      ],
      users: [],
      management: [
        management({
          email: "contacted@example.com",
          status: "lead",
          last_contact_at: "2026-06-15T12:00:00Z"
        }),
        management({
          email: "blocked@example.com",
          status: "blocked",
          last_contact_at: "2026-06-15T12:00:00Z"
        })
      ],
      orders: [order({ customer_email: "customer@example.com", status: "paid" })]
    });

    expect(leads.find((lead) => lead.email === "contacted@example.com")).toMatchObject({
      followUpStatus: "contacted",
      followUpLabel: "Contacted"
    });
    expect(leads.find((lead) => lead.email === "customer@example.com")).toMatchObject({
      followUpStatus: "customer",
      followUpLabel: "Customer"
    });
    expect(leads.find((lead) => lead.email === "blocked@example.com")).toMatchObject({
      followUpStatus: "blocked",
      followUpLabel: "Blocked"
    });
  });

  it("exposes the pilot pipeline in the admin dashboard", () => {
    expect(adminCenterSource).toContain('<Section id="pipeline" title="Pilot pipeline"');
    expect(adminCenterSource).toContain("data.pilotLeads");
    expect(adminCenterSource).toContain("data.pilotProspects");
    expect(adminCenterSource).toContain("upsertPilotProspect");
  });
});
