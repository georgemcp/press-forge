import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const migration = readFileSync("supabase/migrations/20260615093000_add_pilot_prospects.sql", "utf8");
const outreachMigration = readFileSync("supabase/migrations/20260615141500_add_pilot_outreach_events.sql", "utf8");
const adminActions = readFileSync("src/app/admin/actions.ts", "utf8");
const adminCenter = readFileSync("src/components/admin/admin-center.tsx", "utf8");
const adminData = readFileSync("src/lib/admin/data.ts", "utf8");

describe("pilot prospect operations", () => {
  it("creates a Supabase table for founder-sourced pilot targets with RLS enabled", () => {
    expect(migration).toContain("create table if not exists public.pilot_prospects");
    expect(migration).toContain("email text not null unique");
    expect(migration).toContain("first_supported_job text not null check");
    expect(migration).toContain("priority_score integer not null default 55 check (priority_score between 0 and 100)");
    expect(migration).toContain("alter table public.pilot_prospects enable row level security");
  });

  it("loads pilot prospects through the server-side admin data path", () => {
    expect(adminData).toContain('supabase.from("pilot_prospects").select("*")');
    expect(adminData).toContain("pilotProspects");
    expect(adminData).toContain("buildPilotPipelineLeads({ orders, signups, users, management: accountManagement, prospects: pilotProspects })");
  });

  it("adds prospects through an admin-only server action with validation and audit logging", () => {
    expect(adminActions).toContain("export async function upsertPilotProspect");
    expect(adminActions).toContain("await requireAdminAction()");
    expect(adminActions).toContain("emailPattern.test(email)");
    expect(adminActions).toContain('supabase.from("pilot_prospects").upsert');
    expect(adminActions).toContain('action: "pilot_prospect.upsert"');
  });

  it("exposes a dashboard form and target-list KPI for Week 2 recruiting", () => {
    expect(adminCenter).toContain("Add pilot prospect");
    expect(adminCenter).toContain("action={upsertPilotProspect}");
    expect(adminCenter).toContain("Target list");
    expect(adminCenter).toContain("manualProspectCount");
  });

  it("creates a Supabase ledger for manual pilot outreach events", () => {
    expect(outreachMigration).toContain("create table if not exists public.pilot_outreach_events");
    expect(outreachMigration).toContain("event_type text not null check");
    expect(outreachMigration).toContain("'first_touch_sent'");
    expect(outreachMigration).toContain("'pilot_agreed'");
    expect(outreachMigration).toContain("create index if not exists pilot_outreach_events_email_event_at_idx");
    expect(outreachMigration).toContain("alter table public.pilot_outreach_events enable row level security");
  });

  it("loads pilot outreach events through the server-side admin data path", () => {
    expect(adminData).toContain('type PilotOutreachEventRow = Tables<"pilot_outreach_events">');
    expect(adminData).toContain('supabase.from("pilot_outreach_events").select("*")');
    expect(adminData).toContain("pilotOutreachEvents");
  });

  it("logs manual outreach events through an admin-only action with validation and audit logging", () => {
    expect(adminActions).toContain("export async function logPilotOutreachEvent");
    expect(adminActions).toContain("await requireAdminAction()");
    expect(adminActions).toContain("pilotOutreachEventTypes.has(eventType)");
    expect(adminActions).toContain('supabase.from("pilot_outreach_events").insert');
    expect(adminActions).toContain('supabase.from("pilot_prospects").update');
    expect(adminActions).toContain('action: "pilot_outreach.log_event"');
  });

  it("adds admin controls for recording first touches without auto-sending email", () => {
    expect(adminCenter).toContain("logPilotOutreachEvent");
    expect(adminCenter).toContain("Log sent");
    expect(adminCenter).toContain("Outreach events");
    expect(adminCenter).toContain("No automatic email is sent.");
  });
});
