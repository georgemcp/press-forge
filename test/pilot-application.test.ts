import { readFileSync } from "node:fs";

import { describe, expect, it, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/pilot-application/route";
import sitemap from "@/app/sitemap";
import { getSiteOrigin } from "@/lib/seo/site-url";

const mocks = vi.hoisted(() => ({
  tableUpserts: {} as Record<string, unknown[][]>,
  sendServerAnalyticsEvent: vi.fn(async () => ({
    status: "sent",
    configured: true,
    provider: "ga4_measurement_protocol"
  }))
}));

vi.mock("@/lib/db/supabase", () => ({
  createServiceSupabaseClient: () => ({
    from: (table: string) => ({
      upsert: async (...args: unknown[]) => {
        mocks.tableUpserts[table] = mocks.tableUpserts[table] ?? [];
        mocks.tableUpserts[table].push(args);
        return { error: null };
      }
    })
  })
}));

vi.mock("@/lib/analytics/server-events", () => ({
  sendServerAnalyticsEvent: (...args: Parameters<typeof mocks.sendServerAnalyticsEvent>) =>
    mocks.sendServerAnalyticsEvent(...args)
}));

const pageSource = readFileSync("src/app/pilot-application/page.tsx", "utf8");
const formSource = readFileSync("src/components/pilot-application-form.tsx", "utf8");
const marketingSiteSource = readFileSync("src/components/marketing-site.tsx", "utf8");
const pipelineSource = readFileSync("src/lib/admin/pilot-pipeline.ts", "utf8");
const launchPlan = readFileSync("docs/superpowers/plans/2026-06-15-trim-proof-business-launch.md", "utf8");
const businessBlueprint = readFileSync("docs/business/trim-proof-business-blueprint.md", "utf8");

describe("pilot application flow", () => {
  beforeEach(() => {
    mocks.tableUpserts = {};
    mocks.sendServerAnalyticsEvent.mockClear();
  });

  it("stores structured pilot applications in the admin prospect pipeline", async () => {
    const response = await POST(
      new Request("https://trimproof.com/api/pilot-application", {
        method: "POST",
        body: JSON.stringify({
          email: "Lead@PrintShop.com",
          companyName: "Bay Proof Co.",
          contactName: "Riley",
          role: "Owner",
          segment: "print_shop",
          firstSupportedJob: "menu",
          likelyPain: "Customers send Canva menus without bleed, safe area, or the correct export settings.",
          publicContactPath: "https://example.com/contact",
          printerSpec: "12 x 18 sheet, 0.125 in bleed, SWOP CMYK",
          monthlyPrintJobs: "51_200",
          consentToContact: true,
          analytics: {
            gaClientId: "123.456",
            gaSessionId: "789",
            pagePath: "/pilot-application"
          }
        })
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      persisted: true,
      source: "pilot_application"
    });

    const prospectUpsert = mocks.tableUpserts.pilot_prospects?.[0];
    expect(prospectUpsert?.[1]).toEqual({ onConflict: "email" });
    expect(prospectUpsert?.[0]).toMatchObject({
      email: "lead@printshop.com",
      company_name: "Bay Proof Co.",
      contact_name: "Riley",
      role: "Owner",
      segment: "print_shop",
      source: "pilot_application",
      first_supported_job: "menu",
      likely_pain: "Customers send Canva menus without bleed, safe area, or the correct export settings.",
      public_contact_path: "https://example.com/contact",
      status: "needs_follow_up"
    });
    expect(String((prospectUpsert?.[0] as { notes?: string }).notes)).toContain("Monthly print jobs: 51-200");
    expect(String((prospectUpsert?.[0] as { notes?: string }).notes)).toContain("Printer spec: 12 x 18 sheet");
    expect((prospectUpsert?.[0] as { priority_score?: number }).priority_score).toBeGreaterThanOrEqual(88);

    expect(mocks.tableUpserts.email_signups?.[0]?.[0]).toEqual({
      email: "lead@printshop.com",
      source: "pilot_application"
    });
    expect(mocks.tableUpserts.email_signups?.[0]?.[1]).toEqual({ onConflict: "email" });

    expect(mocks.sendServerAnalyticsEvent).toHaveBeenCalledWith({
      name: "generate_lead",
      clientId: "123.456",
      params: {
        source: "pilot_application",
        segment: "print_shop",
        first_supported_job: "menu",
        page_path: "/pilot-application",
        session_id: 789,
        currency: "USD",
        value: 0
      }
    });
  });

  it("rejects incomplete applications before persistence or analytics", async () => {
    const response = await POST(
      new Request("https://trimproof.com/api/pilot-application", {
        method: "POST",
        body: JSON.stringify({
          email: "lead@example.com",
          segment: "print_shop",
          firstSupportedJob: "menu",
          likelyPain: "too short",
          consentToContact: false
        })
      })
    );

    expect(response.status).toBe(400);
    expect(mocks.tableUpserts).toEqual({});
    expect(mocks.sendServerAnalyticsEvent).not.toHaveBeenCalled();
  });

  it("silently acknowledges honeypot submissions without polluting the lead pipeline", async () => {
    const response = await POST(
      new Request("https://trimproof.com/api/pilot-application", {
        method: "POST",
        body: JSON.stringify({
          email: "bot@example.com",
          segment: "print_shop",
          firstSupportedJob: "menu",
          likelyPain: "Customers send print files without production details.",
          consentToContact: true,
          website: "https://spam.example"
        })
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ ok: true, persisted: false });
    expect(mocks.tableUpserts).toEqual({});
    expect(mocks.sendServerAnalyticsEvent).not.toHaveBeenCalled();
  });

  it("ships a public, bounded application page and business docs", () => {
    const urls = sitemap().map((entry) => entry.url);
    const origin = getSiteOrigin();

    expect(urls).toContain(`${origin}/pilot-application`);
    expect(pageSource).toContain("Apply for the Trim Proof pilot");
    expect(pageSource).toContain("No private customer files");
    expect(pageSource).toContain("Printer specifications still control final acceptance");
    expect(pageSource).toContain('"@type": "WebPage"');
    expect(formSource).toContain('fetch("/api/pilot-application"');
    expect(formSource).toContain("consentToContact");
    expect(marketingSiteSource).toContain("/pilot-application");
    expect(pipelineSource).toContain("pilot_application");
    expect(launchPlan).toContain("structured public pilot application");
    expect(businessBlueprint).toContain("/pilot-application");
  });
});
