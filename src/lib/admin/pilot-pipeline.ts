import { getOrderAccountEmail, normalizeAdminEmail, type AccountManagementRow, type EmailSignupRow, type ExportOrderRow, type UserRow } from "@/lib/admin/metrics";
import type { Tables } from "@/types/supabase";

export type PilotLeadSegment =
  | "print_shop"
  | "marketing_team"
  | "designer"
  | "checklist_reader"
  | "account_signup"
  | "general_launch";

export type PilotFollowUpStatus = "needs_follow_up" | "contacted" | "customer" | "vip" | "blocked";
export type PilotPipelineOrigin = "signup" | "prospect" | "signup_and_prospect";
export type PilotProspectRow = Tables<"pilot_prospects">;

export interface PilotPipelineLead {
  email: string;
  source: string;
  origin: PilotPipelineOrigin;
  segment: PilotLeadSegment;
  segmentLabel: string;
  useCase: string;
  companyName?: string;
  contactName?: string;
  role?: string;
  monthlyPrintJobs?: string;
  planInterest?: string;
  firstSupportedJob?: string;
  likelyPain?: string;
  publicContactPath?: string;
  prospectNotes?: string;
  followUpStatus: PilotFollowUpStatus;
  followUpLabel: string;
  priorityScore: number;
  priorityLabel: "High" | "Medium" | "Low";
  lastSignalAt: string;
  lastContactAt?: string;
}

export interface PilotPipelineInput {
  signups: EmailSignupRow[];
  users: UserRow[];
  management?: AccountManagementRow[];
  prospects?: PilotProspectRow[];
  orders: ExportOrderRow[];
}

interface SourceProfile {
  segment: PilotLeadSegment;
  segmentLabel: string;
  useCase: string;
  priorityScore: number;
}

const sourceProfiles: Record<string, SourceProfile> = {
  print_shop_page: {
    segment: "print_shop",
    segmentLabel: "Print shop",
    useCase: "Pilot outreach for customer-file cleanup and first-proof workflow.",
    priorityScore: 92
  },
  marketer_page: {
    segment: "marketing_team",
    segmentLabel: "Marketing team",
    useCase: "Recurring local collateral and brand-safe print handoff.",
    priorityScore: 72
  },
  designer_page: {
    segment: "designer",
    segmentLabel: "Designer",
    useCase: "Production safety layer for small client print jobs.",
    priorityScore: 68
  },
  prepress_checklist: {
    segment: "checklist_reader",
    segmentLabel: "Checklist reader",
    useCase: "Educational prepress demand; qualify for supported product workflow.",
    priorityScore: 58
  },
  account_demo: {
    segment: "account_signup",
    segmentLabel: "Account signup",
    useCase: "Free dummy-proof account; nudge toward first generated proof.",
    priorityScore: 62
  },
  account_single_export: {
    segment: "account_signup",
    segmentLabel: "Account signup",
    useCase: "Single-export account; follow up on paid-job readiness.",
    priorityScore: 76
  },
  account_pro: {
    segment: "account_signup",
    segmentLabel: "Account signup",
    useCase: "Pro-interest account; qualify repeat print volume.",
    priorityScore: 84
  },
  marketing_home: {
    segment: "general_launch",
    segmentLabel: "General launch",
    useCase: "Launch-list interest; qualify segment and first supported job.",
    priorityScore: 48
  },
  pilot_print_shop: {
    segment: "print_shop",
    segmentLabel: "Print shop",
    useCase: "Manual 10-credit print-shop pilot.",
    priorityScore: 96
  },
  pilot_application: {
    segment: "print_shop",
    segmentLabel: "Pilot application",
    useCase: "Structured public pilot application with first-job context and handoff pain.",
    priorityScore: 88
  },
  manual_target_list: {
    segment: "general_launch",
    segmentLabel: "Manual target",
    useCase: "Founder-sourced pilot target; qualify first supported print job.",
    priorityScore: 55
  },
  google_maps: {
    segment: "print_shop",
    segmentLabel: "Print shop",
    useCase: "Local print-shop target sourced from public business listings.",
    priorityScore: 82
  },
  linkedin: {
    segment: "designer",
    segmentLabel: "Designer",
    useCase: "Founder-sourced designer or marketer target from public professional context.",
    priorityScore: 66
  },
  referral: {
    segment: "general_launch",
    segmentLabel: "Referral",
    useCase: "Warm referral target; qualify first supported print job.",
    priorityScore: 74
  },
  community_post: {
    segment: "general_launch",
    segmentLabel: "Community",
    useCase: "Community-sourced target; qualify segment and first supported print job.",
    priorityScore: 60
  }
};

const segmentProfiles: Record<PilotLeadSegment, SourceProfile> = {
  print_shop: {
    segment: "print_shop",
    segmentLabel: "Print shop",
    useCase: "Manual print-shop pilot target for customer-file cleanup and first-proof workflow.",
    priorityScore: 82
  },
  marketing_team: {
    segment: "marketing_team",
    segmentLabel: "Marketing team",
    useCase: "Manual marketing-team pilot target for recurring local collateral.",
    priorityScore: 66
  },
  designer: {
    segment: "designer",
    segmentLabel: "Designer",
    useCase: "Manual designer pilot target for small client print-job handoff.",
    priorityScore: 64
  },
  checklist_reader: {
    segment: "checklist_reader",
    segmentLabel: "Checklist reader",
    useCase: "Manual checklist-reader target; qualify for supported product workflow.",
    priorityScore: 54
  },
  account_signup: {
    segment: "account_signup",
    segmentLabel: "Account signup",
    useCase: "Manual account follow-up target; nudge toward first generated proof.",
    priorityScore: 58
  },
  general_launch: {
    segment: "general_launch",
    segmentLabel: "General launch",
    useCase: "Manual launch-list target; qualify segment and first supported print job.",
    priorityScore: 48
  }
};

const leadSegments = new Set<PilotLeadSegment>(["print_shop", "marketing_team", "designer", "checklist_reader", "account_signup", "general_launch"]);
const followUpStatuses = new Set<PilotFollowUpStatus>(["needs_follow_up", "contacted", "customer", "vip", "blocked"]);

function normalizeSegment(value: string): PilotLeadSegment {
  return leadSegments.has(value as PilotLeadSegment) ? (value as PilotLeadSegment) : "general_launch";
}

function normalizeFollowUpStatus(value: string): PilotFollowUpStatus {
  return followUpStatuses.has(value as PilotFollowUpStatus) ? (value as PilotFollowUpStatus) : "needs_follow_up";
}

function sourceProfile(source: string, fallbackSegment?: PilotLeadSegment): SourceProfile {
  if (source === "manual_target_list" && fallbackSegment) {
    return segmentProfiles[fallbackSegment];
  }
  return sourceProfiles[source] ?? {
    ...(fallbackSegment ? segmentProfiles[fallbackSegment] : segmentProfiles[source.startsWith("account_") ? "account_signup" : "general_launch"]),
    priorityScore: Math.max(fallbackSegment ? segmentProfiles[fallbackSegment].priorityScore : 0, source.startsWith("account_") ? 60 : 42)
  };
}

function latestTimestamp(...values: Array<string | null | undefined>) {
  return values.filter((value): value is string => Boolean(value)).sort().at(-1) ?? new Date(0).toISOString();
}

function priorityLabel(score: number): PilotPipelineLead["priorityLabel"] {
  if (score >= 80) {
    return "High";
  }
  if (score >= 55) {
    return "Medium";
  }
  return "Low";
}

function labelStatus(status: PilotFollowUpStatus) {
  return status.replaceAll("_", " ").replace(/^\w/, (value) => value.toUpperCase());
}

function leadFollowUpStatus(options: {
  hasPaidOrder: boolean;
  management?: AccountManagementRow;
  prospectStatus?: PilotFollowUpStatus;
  prospectLastContactAt?: string | null;
}): PilotFollowUpStatus {
  if (options.management?.status === "blocked") {
    return "blocked";
  }
  if (options.management?.status === "vip") {
    return "vip";
  }
  if (options.hasPaidOrder || options.management?.status === "customer") {
    return "customer";
  }
  if (options.prospectStatus && options.prospectStatus !== "needs_follow_up") {
    return options.prospectStatus;
  }
  if (options.management?.last_contact_at || options.prospectLastContactAt) {
    return "contacted";
  }
  return "needs_follow_up";
}

function sortStatusWeight(status: PilotFollowUpStatus) {
  switch (status) {
    case "needs_follow_up":
      return 0;
    case "vip":
      return 1;
    case "contacted":
      return 2;
    case "customer":
      return 3;
    case "blocked":
      return 4;
  }
}

function mergeFollowUpStatus(left: PilotFollowUpStatus | undefined, right: PilotFollowUpStatus) {
  if (!left) {
    return right;
  }
  const authorityWeight: Record<PilotFollowUpStatus, number> = {
    needs_follow_up: 0,
    contacted: 1,
    customer: 2,
    vip: 3,
    blocked: 4
  };
  return authorityWeight[left] > authorityWeight[right] ? left : right;
}

function productLabel(value: string) {
  return value.replaceAll("_", " ");
}

function prospectUseCase(prospect: PilotProspectRow, profile: SourceProfile) {
  const product = productLabel(prospect.first_supported_job);
  const pain = prospect.likely_pain.trim();
  if (pain) {
    return `${product} pilot target: ${pain}`;
  }
  return `${product} pilot target: ${profile.useCase}`;
}

function latestOrderTimestamp(orders: ExportOrderRow[]) {
  return latestTimestamp(...orders.map((order) => order.updated_at));
}

export function buildPilotPipelineLeads(input: PilotPipelineInput): PilotPipelineLead[] {
  const usersByEmail = new Map(input.users.map((user) => [normalizeAdminEmail(user.email), user]));
  const managementByEmail = new Map((input.management ?? []).map((management) => [normalizeAdminEmail(management.email), management]));
  const ordersByEmail = new Map<string, ExportOrderRow[]>();

  for (const order of input.orders) {
    const email = getOrderAccountEmail(order);
    if (!email) {
      continue;
    }
    const normalized = normalizeAdminEmail(email);
    ordersByEmail.set(normalized, [...(ordersByEmail.get(normalized) ?? []), order]);
  }

  const leads = new Map<string, PilotPipelineLead>();

  for (const prospect of input.prospects ?? []) {
    const email = normalizeAdminEmail(prospect.email);
    const segment = normalizeSegment(prospect.segment);
    const profile = sourceProfile(prospect.source, segment);
    const user = usersByEmail.get(email);
    const management = managementByEmail.get(email);
    const orders = ordersByEmail.get(email) ?? [];
    const hasPaidOrder = orders.some((order) => order.status === "paid" || order.status === "consumed");
    const followUpStatus = leadFollowUpStatus({
      hasPaidOrder,
      management,
      prospectStatus: normalizeFollowUpStatus(prospect.status),
      prospectLastContactAt: prospect.last_contact_at
    });
    const lastSignalAt = latestTimestamp(prospect.last_signal_at, prospect.updated_at, user?.updated_at, management?.updated_at, latestOrderTimestamp(orders));
    const profilePriorityScore = prospect.source === "manual_target_list" ? 0 : profile.priorityScore;
    const score = Math.max(
      profilePriorityScore,
      prospect.priority_score,
      management?.status === "vip" ? 100 : 0,
      user?.plan_interest === "pro" ? 84 : 0,
      hasPaidOrder ? 35 : 0
    );

    leads.set(email, {
      email,
      source: prospect.source,
      origin: "prospect",
      segment: profile.segment,
      segmentLabel: profile.segmentLabel,
      useCase: user?.primary_use_case ?? prospectUseCase(prospect, profile),
      companyName: user?.company_name ?? prospect.company_name ?? undefined,
      contactName: prospect.contact_name ?? undefined,
      role: user?.role ?? prospect.role ?? undefined,
      monthlyPrintJobs: user?.monthly_print_jobs ?? undefined,
      planInterest: user?.plan_interest ?? undefined,
      firstSupportedJob: prospect.first_supported_job,
      likelyPain: prospect.likely_pain || undefined,
      publicContactPath: prospect.public_contact_path || undefined,
      prospectNotes: prospect.notes || undefined,
      followUpStatus,
      followUpLabel: labelStatus(followUpStatus),
      priorityScore: score,
      priorityLabel: priorityLabel(score),
      lastSignalAt,
      lastContactAt: management?.last_contact_at ?? prospect.last_contact_at ?? undefined
    });
  }

  for (const signup of input.signups) {
    const email = normalizeAdminEmail(signup.email);
    const profile = sourceProfile(signup.source);
    const user = usersByEmail.get(email);
    const management = managementByEmail.get(email);
    const orders = ordersByEmail.get(email) ?? [];
    const hasPaidOrder = orders.some((order) => order.status === "paid" || order.status === "consumed");
    const followUpStatus = leadFollowUpStatus({ hasPaidOrder, management });
    const latestOrderAt = latestOrderTimestamp(orders);
    const lastSignalAt = latestTimestamp(signup.updated_at, user?.updated_at, management?.updated_at, latestOrderAt);
    const score = Math.max(
      profile.priorityScore,
      management?.status === "vip" ? 100 : 0,
      user?.plan_interest === "pro" ? 84 : 0,
      hasPaidOrder ? 35 : 0
    );
    const existing = leads.get(email);

    leads.set(email, {
      ...existing,
      email,
      source: existing && existing.source !== signup.source ? `${signup.source} + ${existing.source}` : signup.source,
      origin: existing ? "signup_and_prospect" : "signup",
      segment: existing && existing.priorityScore > score ? existing.segment : profile.segment,
      segmentLabel: existing && existing.priorityScore > score ? existing.segmentLabel : profile.segmentLabel,
      useCase: user?.primary_use_case ?? existing?.useCase ?? profile.useCase,
      companyName: user?.company_name ?? existing?.companyName,
      role: user?.role ?? existing?.role,
      monthlyPrintJobs: user?.monthly_print_jobs ?? existing?.monthlyPrintJobs,
      planInterest: user?.plan_interest ?? existing?.planInterest,
      followUpStatus: mergeFollowUpStatus(existing?.followUpStatus, followUpStatus),
      followUpLabel: labelStatus(mergeFollowUpStatus(existing?.followUpStatus, followUpStatus)),
      priorityScore: Math.max(score, existing?.priorityScore ?? 0),
      priorityLabel: priorityLabel(Math.max(score, existing?.priorityScore ?? 0)),
      lastSignalAt: latestTimestamp(existing?.lastSignalAt, lastSignalAt),
      lastContactAt: management?.last_contact_at ?? existing?.lastContactAt
    });
  }

  return [...leads.values()].sort((left, right) => {
    const statusDelta = sortStatusWeight(left.followUpStatus) - sortStatusWeight(right.followUpStatus);
    if (statusDelta !== 0) {
      return statusDelta;
    }
    if (right.priorityScore !== left.priorityScore) {
      return right.priorityScore - left.priorityScore;
    }
    return right.lastSignalAt.localeCompare(left.lastSignalAt);
  });
}
