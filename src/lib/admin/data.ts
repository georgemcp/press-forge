import fs from "node:fs/promises";
import path from "node:path";
import { isServerAnalyticsConfigured } from "@/lib/analytics/server-events";
import { getStripeClient } from "@/lib/billing/stripe";
import { createServiceSupabaseClient } from "@/lib/db/supabase";
import { resolveEmailConfig } from "@/lib/email/transactional";
import { deliveryManifestFileName, type ProofDeliveryManifest } from "@/lib/print/delivery-manifest";
import { getCreativeProviderStatus } from "@/lib/providers/model-config";
import type { DataForSeoResearchFile } from "@/lib/seo/dataforseo-research";
import type { Tables } from "@/types/supabase";
import {
  buildAdminAccountSummaries,
  getAdminEconomicsConfig,
  summarizeAdminMetrics,
  getOrderAccountEmail,
  normalizeAdminEmail,
  type AccountManagementRow,
  type AdminAccountSummary,
  type AdminSummary,
  type ExportOrderRow,
  type GeneratedProofJob
} from "./metrics";

type CreditUsageRow = Tables<"credits_usage">;
type EmailSignupRow = Tables<"email_signups">;
type UserRow = Tables<"users">;
type ProjectRow = Tables<"projects">;
type ExportRow = Tables<"exports">;
type AssetRow = Tables<"assets">;
type AdminAuditEventRow = Tables<"admin_audit_events">;

export type AdminRange = "7d" | "30d" | "90d" | "all";

export const adminRanges: Array<{ value: AdminRange; label: string; days?: number }> = [
  { value: "7d", label: "7 days", days: 7 },
  { value: "30d", label: "30 days", days: 30 },
  { value: "90d", label: "90 days", days: 90 },
  { value: "all", label: "All time" }
];

export interface AdminCenterData {
  range: AdminRange;
  summary: AdminSummary;
  accounts: AdminAccountSummary[];
  orders: ExportOrderRow[];
  subscriptions: ExportOrderRow[];
  signups: EmailSignupRow[];
  users: UserRow[];
  accountManagement: AccountManagementRow[];
  auditEvents: AdminAuditEventRow[];
  generatedProofs: GeneratedProofJob[];
  credits: CreditUsageRow[];
  projects: ProjectRow[];
  exports: ExportRow[];
  assets: AssetRow[];
  sourceErrors: string[];
  seoResearch?: DataForSeoResearchFile;
  readiness: {
    supabaseConfigured: boolean;
    stripeConfigured: boolean;
    analyticsConfigured: boolean;
    emailConfigured: boolean;
    emailProvider?: string;
    creativeProviderMode: string;
    openaiConfigured: boolean;
    geminiConfigured: boolean;
  };
  economics: ReturnType<typeof getAdminEconomicsConfig>;
}

export interface AdminAccountDetailData {
  email: string;
  summary?: AdminAccountSummary;
  management?: AccountManagementRow;
  orders: ExportOrderRow[];
  subscriptions: ExportOrderRow[];
  signups: EmailSignupRow[];
  users: UserRow[];
  credits: CreditUsageRow[];
  projects: ProjectRow[];
  exports: ExportRow[];
  assets: AssetRow[];
  auditEvents: AdminAuditEventRow[];
  sourceErrors: string[];
  economics: ReturnType<typeof getAdminEconomicsConfig>;
}

function rangeDays(range: AdminRange) {
  return adminRanges.find((item) => item.value === range)?.days;
}

async function readJsonFile<T>(filePath: string) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8")) as T;
  } catch {
    return undefined;
  }
}

function statusFromReport(value: unknown): GeneratedProofJob["status"] {
  if (value === "passed" || value === "needs_attention" || value === "failed") {
    return value;
  }
  return "unknown";
}

function providerFromReport(report: { checks?: Array<{ id?: string; evidence?: string }> } | undefined) {
  const evidence = report?.checks?.find((check) => check.id === "raster_dpi")?.evidence;
  return evidence?.match(/background-art\s+([a-z_]+)/i)?.[1];
}

async function readGeneratedProofJob(root: string, id: string): Promise<GeneratedProofJob | undefined> {
  const jobDir = path.join(root, id);
  try {
    const [stat, files] = await Promise.all([fs.stat(jobDir), fs.readdir(jobDir, { withFileTypes: true })]);
    const manifest = await readJsonFile<Partial<ProofDeliveryManifest>>(path.join(jobDir, deliveryManifestFileName));
    const report = await readJsonFile<{ status?: unknown; productType?: string; checks?: Array<{ id?: string; evidence?: string }> }>(path.join(jobDir, "preflight-report.json"));
    let totalBytes = 0;
    let assetCount = 0;
    await Promise.all(
      files
        .filter((file) => file.isFile())
        .map(async (file) => {
          const fileStat = await fs.stat(path.join(jobDir, file.name));
          totalBytes += fileStat.size;
          if (/^asset-.+\.png$/i.test(file.name)) {
            assetCount += 1;
          }
        })
    );
    return {
      id,
      createdAt: manifest?.createdAt ?? stat.mtime.toISOString(),
      mode: manifest?.mode === "dummy" || manifest?.mode === "advanced" ? manifest.mode : "unknown",
      status: statusFromReport(report?.status),
      productType: report?.productType,
      provider: providerFromReport(report),
      assetCount,
      fileCount: files.filter((file) => file.isFile()).length,
      totalBytes
    };
  } catch {
    return undefined;
  }
}

export async function readGeneratedProofInventory(limit = 250) {
  const root = process.env.TRIMPROOF_GENERATED_DIR ?? path.join(process.cwd(), ".trimproof-generated");
  let entries;
  try {
    entries = await fs.readdir(root, { withFileTypes: true });
  } catch {
    return [] satisfies GeneratedProofJob[];
  }
  const jobs = (
    await Promise.all(
      entries
        .filter((entry) => entry.isDirectory())
        .slice(0, limit)
        .map((entry) => readGeneratedProofJob(root, entry.name))
    )
  ).filter((job): job is GeneratedProofJob => Boolean(job));
  return jobs.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

async function fetchTable<T>(promise: PromiseLike<{ data: T[] | null; error: { message: string } | null }>, label: string, sourceErrors: string[]) {
  const result = await promise;
  if (result.error) {
    sourceErrors.push(`${label}: ${result.error.message}`);
  }
  return result.data ?? [];
}

export function parseAdminRange(value: string | string[] | undefined): AdminRange {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate === "7d" || candidate === "90d" || candidate === "all" ? candidate : "30d";
}

export async function getAdminCenterData(range: AdminRange): Promise<AdminCenterData> {
  const economics = getAdminEconomicsConfig();
  const sourceErrors: string[] = [];
  const seoResearch = await readJsonFile<DataForSeoResearchFile>(path.join(process.cwd(), "src/data/seo/dataforseo-live-research.json"));
  const supabase = createServiceSupabaseClient();
  const generatedProofs = await readGeneratedProofInventory();
  const emailConfig = resolveEmailConfig();
  const creative = getCreativeProviderStatus();

  if (!supabase) {
    const summary = summarizeAdminMetrics({
      orders: [],
      signups: [],
      users: [],
      generatedProofs,
      economics,
      periodDays: rangeDays(range)
    });
    return {
      range,
      summary,
      accounts: [],
      orders: [],
      subscriptions: [],
      signups: [],
      users: [],
      accountManagement: [],
      auditEvents: [],
      generatedProofs,
      credits: [],
      projects: [],
      exports: [],
      assets: [],
      sourceErrors: ["Supabase service client is not configured."],
      seoResearch,
      readiness: {
        supabaseConfigured: false,
        stripeConfigured: Boolean(getStripeClient()),
        analyticsConfigured: isServerAnalyticsConfigured(),
        emailConfigured: Boolean(emailConfig),
        emailProvider: emailConfig?.provider,
        creativeProviderMode: creative.mode,
        openaiConfigured: creative.openaiConfigured,
        geminiConfigured: creative.geminiConfigured
      },
      economics
    };
  }

  const [orders, signups, users, credits, projects, exports, assets, accountManagement, auditEvents] = await Promise.all([
    fetchTable<ExportOrderRow>(supabase.from("export_orders").select("*").order("created_at", { ascending: false }).limit(5000), "export_orders", sourceErrors),
    fetchTable<EmailSignupRow>(supabase.from("email_signups").select("*").order("created_at", { ascending: false }).limit(5000), "email_signups", sourceErrors),
    fetchTable<UserRow>(supabase.from("users").select("*").order("created_at", { ascending: false }).limit(5000), "users", sourceErrors),
    fetchTable<CreditUsageRow>(supabase.from("credits_usage").select("*").order("created_at", { ascending: false }).limit(5000), "credits_usage", sourceErrors),
    fetchTable<ProjectRow>(supabase.from("projects").select("*").order("created_at", { ascending: false }).limit(5000), "projects", sourceErrors),
    fetchTable<ExportRow>(supabase.from("exports").select("*").order("created_at", { ascending: false }).limit(5000), "exports", sourceErrors),
    fetchTable<AssetRow>(supabase.from("assets").select("*").order("created_at", { ascending: false }).limit(5000), "assets", sourceErrors),
    fetchTable<AccountManagementRow>(supabase.from("account_management").select("*").order("updated_at", { ascending: false }).limit(5000), "account_management", sourceErrors),
    fetchTable<AdminAuditEventRow>(supabase.from("admin_audit_events").select("*").order("created_at", { ascending: false }).limit(1000), "admin_audit_events", sourceErrors)
  ]);

  const summary = summarizeAdminMetrics({
    orders,
    signups,
    users,
    management: accountManagement,
    generatedProofs,
    economics,
    periodDays: rangeDays(range)
  });

  return {
    range,
    summary,
    accounts: buildAdminAccountSummaries({ orders, signups, users, management: accountManagement, economics }),
    orders,
    subscriptions: orders.filter((order) => order.entitlement === "subscription"),
    signups,
    users,
    accountManagement,
    auditEvents,
    generatedProofs,
    credits,
    projects,
    exports,
    assets,
    sourceErrors,
    seoResearch,
    readiness: {
      supabaseConfigured: true,
      stripeConfigured: Boolean(getStripeClient()),
      analyticsConfigured: isServerAnalyticsConfigured(),
      emailConfigured: Boolean(emailConfig),
      emailProvider: emailConfig?.provider,
      creativeProviderMode: creative.mode,
      openaiConfigured: creative.openaiConfigured,
      geminiConfigured: creative.geminiConfigured
    },
    economics
  };
}

function accountDetailTargets(email: string, orders: ExportOrderRow[]) {
  const orderMatches = orders.filter((order) => getOrderAccountEmail(order) === email);
  const targets = new Set<string>([email]);
  for (const order of orderMatches) {
    targets.add(order.id);
    targets.add(order.stripe_session_id);
    if (order.stripe_customer_id) {
      targets.add(order.stripe_customer_id);
    }
    if (order.stripe_payment_intent_id) {
      targets.add(order.stripe_payment_intent_id);
    }
    if (order.stripe_subscription_id) {
      targets.add(order.stripe_subscription_id);
    }
  }
  return targets;
}

export async function getAdminAccountDetailData(rawEmail: string): Promise<AdminAccountDetailData> {
  const email = normalizeAdminEmail(rawEmail);
  const data = await getAdminCenterData("all");
  const users = data.users.filter((user) => normalizeAdminEmail(user.email) === email);
  const userIds = new Set(users.map((user) => user.id));
  const orders = data.orders.filter((order) => getOrderAccountEmail(order) === email);
  const projectRows = data.projects.filter((project) => userIds.has(project.user_id));
  const projectIds = new Set(projectRows.map((project) => project.id));
  const exportRows = data.exports.filter((exportRow) => projectIds.has(exportRow.project_id));
  const assetRows = data.assets.filter((asset) => projectIds.has(asset.project_id));
  const targets = accountDetailTargets(email, orders);

  return {
    email,
    summary: data.accounts.find((account) => account.email === email),
    management: data.accountManagement.find((management) => normalizeAdminEmail(management.email) === email),
    orders,
    subscriptions: orders.filter((order) => order.entitlement === "subscription"),
    signups: data.signups.filter((signup) => normalizeAdminEmail(signup.email) === email),
    users,
    credits: data.credits.filter((credit) => userIds.has(credit.user_id)),
    projects: projectRows,
    exports: exportRows,
    assets: assetRows,
    auditEvents: data.auditEvents.filter((event) => targets.has(event.target_id)).slice(0, 100),
    sourceErrors: data.sourceErrors,
    economics: data.economics
  };
}
