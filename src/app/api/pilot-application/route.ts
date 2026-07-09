import { z } from "zod";
import { NextResponse } from "next/server";
import { sendServerAnalyticsEvent } from "@/lib/analytics/server-events";
import { createServiceSupabaseClient } from "@/lib/db/supabase";

const pilotSegments = ["print_shop", "marketing_team", "designer", "checklist_reader", "account_signup", "general_launch"] as const;
const supportedPilotJobs = ["flyer", "poster", "menu", "brochure", "business_card", "postcard", "letterhead"] as const;
const monthlyPrintJobs = ["under_10", "10_50", "51_200", "200_plus", "unknown"] as const;

const analyticsSchema = z
  .object({
    gaClientId: z.string().min(1).max(120).optional(),
    gaSessionId: z.string().min(1).max(120).optional(),
    pagePath: z.string().min(1).max(240).optional()
  })
  .optional();

const pilotApplicationSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  companyName: z.string().trim().max(160).optional().default(""),
  contactName: z.string().trim().max(120).optional().default(""),
  role: z.string().trim().max(120).optional().default(""),
  segment: z.enum(pilotSegments).default("print_shop"),
  firstSupportedJob: z.enum(supportedPilotJobs).default("flyer"),
  likelyPain: z.string().trim().min(20).max(500),
  publicContactPath: z.string().trim().max(500).optional().default(""),
  printerSpec: z.string().trim().max(500).optional().default(""),
  monthlyPrintJobs: z.enum(monthlyPrintJobs).default("unknown"),
  consentToContact: z.boolean().refine((value) => value, "Pilot contact consent is required."),
  website: z.string().trim().max(200).optional().default(""),
  analytics: analyticsSchema
});

type MonthlyPrintJobs = (typeof monthlyPrintJobs)[number];
type PilotSegment = (typeof pilotSegments)[number];

const monthlyPrintJobLabels: Record<MonthlyPrintJobs, string> = {
  under_10: "Under 10",
  "10_50": "10-50",
  "51_200": "51-200",
  "200_plus": "200+",
  unknown: "Not sure"
};

const segmentPriority: Record<PilotSegment, number> = {
  print_shop: 84,
  marketing_team: 72,
  designer: 68,
  checklist_reader: 56,
  account_signup: 60,
  general_launch: 52
};

const monthlyVolumeBumps: Record<MonthlyPrintJobs, number> = {
  under_10: 0,
  "10_50": 4,
  "51_200": 8,
  "200_plus": 10,
  unknown: 0
};

function numericSessionId(value?: string) {
  const sessionId = Number(value);
  return Number.isFinite(sessionId) && sessionId > 0 ? sessionId : undefined;
}

function priorityScore(input: z.infer<typeof pilotApplicationSchema>) {
  const specSignal = input.printerSpec ? 4 : 0;
  const contactSignal = input.publicContactPath ? 2 : 0;
  const detailSignal = input.likelyPain.length >= 80 ? 2 : 0;
  return Math.min(100, segmentPriority[input.segment] + monthlyVolumeBumps[input.monthlyPrintJobs] + specSignal + contactSignal + detailSignal);
}

function nullableText(value: string) {
  return value ? value : null;
}

function applicationNotes(input: z.infer<typeof pilotApplicationSchema>) {
  return [
    "Structured public pilot application.",
    `Monthly print jobs: ${monthlyPrintJobLabels[input.monthlyPrintJobs]}`,
    input.printerSpec ? `Printer spec: ${input.printerSpec}` : "",
    "Consent to contact: yes",
    "No private customer files were requested in this public application."
  ]
    .filter(Boolean)
    .join("\n");
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => undefined);
  const parsed = pilotApplicationSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid pilot application payload." }, { status: 400 });
  }

  if (parsed.data.website) {
    return NextResponse.json({
      ok: true,
      persisted: false,
      source: "pilot_application"
    });
  }

  const supabase = createServiceSupabaseClient();
  const score = priorityScore(parsed.data);
  const lastSignalAt = new Date().toISOString();
  if (supabase) {
    const { error: prospectError } = await supabase.from("pilot_prospects").upsert(
      {
        email: parsed.data.email,
        company_name: nullableText(parsed.data.companyName),
        contact_name: nullableText(parsed.data.contactName),
        role: nullableText(parsed.data.role),
        segment: parsed.data.segment,
        source: "pilot_application",
        first_supported_job: parsed.data.firstSupportedJob,
        likely_pain: parsed.data.likelyPain,
        public_contact_path: parsed.data.publicContactPath,
        status: "needs_follow_up",
        priority_score: score,
        notes: applicationNotes(parsed.data),
        last_signal_at: lastSignalAt
      },
      { onConflict: "email" }
    );
    if (prospectError) {
      console.error("Trim Proof pilot application prospect upsert failed", {
        reason: prospectError.message
      });
      return NextResponse.json({ error: "Unable to save pilot application." }, { status: 500 });
    }

    const { error: signupError } = await supabase.from("email_signups").upsert(
      {
        email: parsed.data.email,
        source: "pilot_application"
      },
      { onConflict: "email" }
    );
    if (signupError) {
      console.error("Trim Proof pilot application signup upsert failed", {
        reason: signupError.message
      });
    }
  }

  const analytics = await sendServerAnalyticsEvent({
    name: "generate_lead",
    clientId: parsed.data.analytics?.gaClientId,
    params: {
      source: "pilot_application",
      segment: parsed.data.segment,
      first_supported_job: parsed.data.firstSupportedJob,
      page_path: parsed.data.analytics?.pagePath,
      session_id: numericSessionId(parsed.data.analytics?.gaSessionId),
      currency: "USD",
      value: 0
    }
  });
  if (analytics.status === "failed") {
    console.error("Trim Proof pilot application analytics event failed", {
      event: "generate_lead",
      provider: analytics.provider,
      reason: analytics.reason
    });
  }

  return NextResponse.json({
    ok: true,
    persisted: Boolean(supabase),
    source: "pilot_application",
    analytics
  });
}
