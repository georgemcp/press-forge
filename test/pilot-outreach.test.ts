import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { buildPilotFirstTouchBatch, buildPilotFirstTouchMessage } from "@/lib/admin/pilot-outreach";
import type { PilotPipelineLead } from "@/lib/admin/pilot-pipeline";

const adminCenterSource = readFileSync("src/components/admin/admin-center.tsx", "utf8");
const day2Batch = readFileSync("docs/sales/trim-proof-day-2-first-touch-batch-2026-06-15.md", "utf8");

function lead(overrides: Partial<PilotPipelineLead>): PilotPipelineLead {
  return {
    email: overrides.email ?? "owner@example.com",
    source: overrides.source ?? "manual_target_list",
    origin: overrides.origin ?? "prospect",
    segment: overrides.segment ?? "print_shop",
    segmentLabel: overrides.segmentLabel ?? "Print shop",
    useCase: overrides.useCase ?? "flyer pilot target: Customer files arrive without bleed.",
    companyName: overrides.companyName ?? "North Print",
    contactName: overrides.contactName,
    role: overrides.role,
    monthlyPrintJobs: overrides.monthlyPrintJobs,
    planInterest: overrides.planInterest,
    firstSupportedJob: overrides.firstSupportedJob ?? "flyer",
    likelyPain: overrides.likelyPain ?? "Customer files arrive without bleed.",
    publicContactPath: overrides.publicContactPath ?? "https://example.com/contact",
    prospectNotes: overrides.prospectNotes,
    followUpStatus: overrides.followUpStatus ?? "needs_follow_up",
    followUpLabel: overrides.followUpLabel ?? "Needs follow up",
    priorityScore: overrides.priorityScore ?? 82,
    priorityLabel: overrides.priorityLabel ?? "High",
    lastSignalAt: overrides.lastSignalAt ?? "2026-06-15T10:00:00Z",
    lastContactAt: overrides.lastContactAt
  };
}

describe("pilot outreach generation", () => {
  it("builds a safe print-shop first-touch message from lead context", () => {
    const message = buildPilotFirstTouchMessage(
      lead({
        email: "owner@quickprint.test",
        companyName: "Quick Print Center",
        firstSupportedJob: "business_card",
        likelyPain: "Customer-supplied files may need trim, bleed, low-resolution image, and handoff checks."
      })
    );

    expect(message.subject).toBe("Pilot: checked PDF/X proofs for business card jobs");
    expect(message.body).toContain("Hi Quick Print Center team,");
    expect(message.body).toContain("business card");
    expect(message.body).toContain("Customer-supplied files may need trim, bleed, low-resolution image, and handoff checks.");
    expect(message.body).toContain("It does not guarantee printer acceptance");
    expect(message.body).not.toContain("saves time");
    expect(message.body).not.toContain("accepted by every printer");
  });

  it("builds a top-ten first-touch batch without marking leads as contacted", () => {
    const leads = [
      lead({ email: "contacted@example.com", followUpStatus: "contacted", priorityScore: 100 }),
      lead({ email: "blocked@example.com", followUpStatus: "blocked", priorityScore: 100 }),
      ...Array.from({ length: 12 }, (_, index) =>
        lead({
          email: `lead-${index}@example.com`,
          companyName: `Lead ${index}`,
          priorityScore: 90 - index,
          segment: index % 2 === 0 ? "designer" : "marketing_team",
          segmentLabel: index % 2 === 0 ? "Designer" : "Marketing team"
        })
      )
    ];

    const batch = buildPilotFirstTouchBatch(leads, 10);

    expect(batch).toHaveLength(10);
    expect(batch.map((item) => item.lead.email)).toEqual([
      "lead-0@example.com",
      "lead-1@example.com",
      "lead-2@example.com",
      "lead-3@example.com",
      "lead-4@example.com",
      "lead-5@example.com",
      "lead-6@example.com",
      "lead-7@example.com",
      "lead-8@example.com",
      "lead-9@example.com"
    ]);
    expect(batch.every((item) => item.lead.followUpStatus === "needs_follow_up")).toBe(true);
    expect(batch.every((item) => item.message.body.includes("Reply with the first supported job"))).toBe(true);
  });

  it("exposes a copy-ready first-touch batch in the admin pipeline", () => {
    expect(adminCenterSource).toContain("First-touch batch");
    expect(adminCenterSource).toContain("buildPilotFirstTouchBatch");
    expect(adminCenterSource).toContain("mailto:");
    expect(adminCenterSource).toContain("encodeURIComponent(item.message.subject)");
  });

  it("documents the Day 2 first-touch batch without claiming sends", () => {
    expect(day2Batch).toContain("# Trim Proof Day 2 First-Touch Batch - 2026-06-15");
    expect(day2Batch).toContain("No outreach has been sent from this artifact.");
    expect(day2Batch).toContain("Do not mark any lead as `contacted` until the email is actually sent.");
    expect(day2Batch).toContain("Quick Print Center Printing & Signs");
    expect(day2Batch).toContain("Zip Mailing Florida");
    expect(day2Batch).toContain("No Hostinger contact was created unless the recipient opted in.");
    expect(day2Batch).not.toContain("Ten first touches were sent");
  });
});
