import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const migration = readFileSync("supabase/migrations/20260615170000_add_pilot_evidence_records.sql", "utf8");
const adminActions = readFileSync("src/app/admin/actions.ts", "utf8");
const adminCenter = readFileSync("src/components/admin/admin-center.tsx", "utf8");
const adminData = readFileSync("src/lib/admin/data.ts", "utf8");
const supabaseTypes = readFileSync("src/types/supabase.ts", "utf8");
const evidenceRegister = readFileSync("docs/business/claim-evidence-register.md", "utf8");
const outreachPlaybook = readFileSync("docs/sales/trim-proof-pilot-outreach-playbook.md", "utf8");

describe("pilot evidence records", () => {
  it("creates a Supabase table for real pilot job evidence with claim-safety gates", () => {
    expect(migration).toContain("create table if not exists public.pilot_evidence_records");
    expect(migration).toContain("prospect_email text not null");
    expect(migration).toContain("job_type text not null check");
    expect(migration).toContain("outcome text not null check");
    expect(migration).toContain("quote_permission text not null default 'none' check");
    expect(migration).toContain("public_claim_status text not null default 'not_approved' check");
    expect(migration).toContain("create index if not exists pilot_evidence_records_email_evidence_at_idx");
    expect(migration).toContain("alter table public.pilot_evidence_records enable row level security");
  });

  it("adds typed admin data loading for pilot evidence records", () => {
    expect(supabaseTypes).toContain("pilot_evidence_records");
    expect(adminData).toContain('type PilotEvidenceRecordRow = Tables<"pilot_evidence_records">');
    expect(adminData).toContain("pilotEvidenceRecords");
    expect(adminData).toContain('supabase.from("pilot_evidence_records").select("*")');
  });

  it("records pilot evidence through an admin-only action with validation and audit logging", () => {
    expect(adminActions).toContain("export async function recordPilotEvidence");
    expect(adminActions).toContain("await requireAdminAction()");
    expect(adminActions).toContain("pilotEvidenceOutcomes.has(outcome)");
    expect(adminActions).toContain("pilotQuotePermissions.has(quotePermission)");
    expect(adminActions).toContain("pilotPublicClaimStatuses.has(publicClaimStatus)");
    expect(adminActions).toContain('supabase.from("pilot_evidence_records").insert');
    expect(adminActions).toContain('action: "pilot_evidence.record"');
  });

  it("exposes an admin evidence form and recent evidence table", () => {
    expect(adminCenter).toContain("recordPilotEvidence");
    expect(adminCenter).toContain("Record pilot evidence");
    expect(adminCenter).toContain("Pilot evidence");
    expect(adminCenter).toContain("Do not use as public proof until permission and claim status allow it.");
  });

  it("documents how evidence records become bounded public proof", () => {
    expect(evidenceRegister).toContain("pilot_evidence_records");
    expect(evidenceRegister).toContain("public_claim_status");
    expect(evidenceRegister).toContain("approved_public");
    expect(outreachPlaybook).toContain("Record pilot evidence");
    expect(outreachPlaybook).toContain("quote permission and public claim status");
  });
});
