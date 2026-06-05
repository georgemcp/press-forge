import type { Tables } from "@/types/supabase";

export type ExportOrderRow = Tables<"export_orders">;
export type EmailSignupRow = Tables<"email_signups">;
export type UserRow = Tables<"users">;
export type AccountManagementRow = Tables<"account_management">;

export interface GeneratedProofJob {
  id: string;
  createdAt: string;
  mode: "dummy" | "advanced" | "unknown";
  status: "passed" | "needs_attention" | "failed" | "unknown";
  productType?: string;
  provider?: string;
  assetCount: number;
  fileCount: number;
  totalBytes: number;
}

export interface AdminEconomicsConfig {
  exportPriceCents: number;
  subscriptionPriceCents: number;
  stripeFeeBps: number;
  stripeFixedFeeCents: number;
  estimatedProofCostCents: number;
}

export interface AdminAccountSummary {
  email: string;
  accountSource: "user" | "signup" | "order" | "managed";
  createdAt?: string;
  lastActivityAt?: string;
  stripeCustomerId?: string;
  managementStatus?: string;
  managementNotes?: string;
  lastContactAt?: string;
  revenueCents: number;
  orderCount: number;
  activeSubscription: boolean;
  unusedCredits: number;
  consumedExports: number;
  refundedOrders: number;
}

export interface AdminSummary {
  periodLabel: string;
  periodDays?: number;
  generatedAt: string;
  grossRevenueCents: number;
  exportRevenueCents: number;
  subscriptionRevenueCents: number;
  estimatedStripeFeesCents: number;
  estimatedProofCostsCents: number;
  contributionProfitCents: number;
  contributionMargin: number | null;
  activeSubscriptions: number;
  mrrCents: number;
  totalAccounts: number;
  paidAccounts: number;
  emailSignups: number;
  newEmailSignups: number;
  paidConversionRate: number | null;
  averageRevenuePerPaidAccountCents: number;
  orders: number;
  paidOrders: number;
  refundedOrders: number;
  expiredOrders: number;
  unusedCredits: number;
  consumedExports: number;
  generatedProofs: number;
  passedProofs: number;
  failedProofs: number;
}

export interface AdminMetricsInput {
  orders: ExportOrderRow[];
  signups: EmailSignupRow[];
  users: UserRow[];
  management?: AccountManagementRow[];
  generatedProofs: GeneratedProofJob[];
  economics: AdminEconomicsConfig;
  periodDays?: number;
  now?: Date;
}

const revenueStatuses = new Set(["paid", "processing", "consumed"]);

function parsePositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : fallback;
}

export function getAdminEconomicsConfig(): AdminEconomicsConfig {
  return {
    exportPriceCents: parsePositiveInteger(process.env.TRIMPROOF_EXPORT_PRICE_CENTS, 900),
    subscriptionPriceCents: parsePositiveInteger(process.env.TRIMPROOF_SUBSCRIPTION_PRICE_CENTS, 2900),
    stripeFeeBps: parsePositiveInteger(process.env.TRIMPROOF_STRIPE_FEE_BPS, 290),
    stripeFixedFeeCents: parsePositiveInteger(process.env.TRIMPROOF_STRIPE_FIXED_FEE_CENTS, 30),
    estimatedProofCostCents: parsePositiveInteger(process.env.TRIMPROOF_ESTIMATED_PROOF_COST_CENTS, 18)
  };
}

export function getOrderRevenueCents(order: Pick<ExportOrderRow, "amount_total_cents" | "entitlement" | "status">, economics: AdminEconomicsConfig) {
  if (!revenueStatuses.has(order.status)) {
    return 0;
  }
  if (typeof order.amount_total_cents === "number" && order.amount_total_cents >= 0) {
    return order.amount_total_cents;
  }
  return order.entitlement === "subscription" ? economics.subscriptionPriceCents : economics.exportPriceCents;
}

export function getEstimatedStripeFeeCents(amountCents: number, economics: AdminEconomicsConfig) {
  if (amountCents <= 0) {
    return 0;
  }
  return Math.round(amountCents * (economics.stripeFeeBps / 10000) + economics.stripeFixedFeeCents);
}

function isWithinPeriod(value: string, start?: Date) {
  if (!start) {
    return true;
  }
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date >= start;
}

function uniqueKey(...values: Array<string | null | undefined>) {
  return values.find((value) => value && value.trim().length > 0)?.trim().toLowerCase();
}

export function normalizeAdminEmail(value: string) {
  return value.trim().toLowerCase();
}

export function getOrderAccountEmail(order: Pick<ExportOrderRow, "customer_email" | "stripe_customer_id" | "stripe_session_id">) {
  const key = uniqueKey(order.customer_email, order.stripe_customer_id, order.stripe_session_id);
  if (!key) {
    return undefined;
  }
  return order.customer_email ? normalizeAdminEmail(order.customer_email) : `${key}@stripe.trimproof`;
}

export function buildAdminAccountSummaries(input: Pick<AdminMetricsInput, "orders" | "signups" | "users" | "management" | "economics">) {
  const accounts = new Map<string, AdminAccountSummary>();

  function ensureAccount(email: string, source: AdminAccountSummary["accountSource"], createdAt?: string) {
    const normalized = normalizeAdminEmail(email);
    const existing = accounts.get(normalized);
    if (existing) {
      if (source === "user") {
        existing.accountSource = "user";
      } else if (source === "signup" && existing.accountSource === "order") {
        existing.accountSource = "signup";
      } else if (source === "order" && existing.accountSource === "managed") {
        existing.accountSource = "order";
      }
      if (!existing.createdAt || (createdAt && createdAt < existing.createdAt)) {
        existing.createdAt = createdAt;
      }
      return existing;
    }
    const account: AdminAccountSummary = {
      email: normalized,
      accountSource: source,
      createdAt,
      lastActivityAt: createdAt,
      revenueCents: 0,
      orderCount: 0,
      activeSubscription: false,
      unusedCredits: 0,
      consumedExports: 0,
      refundedOrders: 0
    };
    accounts.set(normalized, account);
    return account;
  }

  for (const user of input.users) {
    const account = ensureAccount(user.email, "user", user.created_at);
    account.stripeCustomerId = user.stripe_customer_id ?? account.stripeCustomerId;
    account.activeSubscription ||= user.subscription_status === "active";
  }

  for (const signup of input.signups) {
    ensureAccount(signup.email, "signup", signup.created_at);
  }

  for (const order of input.orders) {
    const accountEmail = getOrderAccountEmail(order);
    if (!accountEmail) {
      continue;
    }
    const account = ensureAccount(accountEmail, "order", order.created_at);
    account.stripeCustomerId = order.stripe_customer_id ?? account.stripeCustomerId;
    account.orderCount += 1;
    account.revenueCents += getOrderRevenueCents(order, input.economics);
    account.activeSubscription ||= order.entitlement === "subscription" && order.status === "paid";
    account.unusedCredits += order.entitlement === "export_credit" && order.status === "paid" ? 1 : 0;
    account.consumedExports += order.entitlement === "export_credit" && order.status === "consumed" ? 1 : 0;
    account.refundedOrders += order.status === "refunded" ? 1 : 0;
    if (!account.lastActivityAt || order.updated_at > account.lastActivityAt) {
      account.lastActivityAt = order.updated_at;
    }
  }

  for (const management of input.management ?? []) {
    const account = ensureAccount(management.email, "managed", management.created_at);
    account.managementStatus = management.status;
    account.managementNotes = management.notes;
    account.lastContactAt = management.last_contact_at ?? undefined;
    if (!account.lastActivityAt || management.updated_at > account.lastActivityAt) {
      account.lastActivityAt = management.updated_at;
    }
  }

  return [...accounts.values()].sort((left, right) => {
    if (right.revenueCents !== left.revenueCents) {
      return right.revenueCents - left.revenueCents;
    }
    return (right.lastActivityAt ?? "").localeCompare(left.lastActivityAt ?? "");
  });
}

export function summarizeAdminMetrics(input: AdminMetricsInput): AdminSummary {
  const now = input.now ?? new Date();
  const start = input.periodDays ? new Date(now.getTime() - input.periodDays * 24 * 60 * 60 * 1000) : undefined;
  const periodOrders = input.orders.filter((order) => isWithinPeriod(order.created_at, start));
  const periodRevenueOrders = periodOrders.filter((order) => getOrderRevenueCents(order, input.economics) > 0);
  const periodProofs = input.generatedProofs.filter((proof) => isWithinPeriod(proof.createdAt, start));
  const accounts = buildAdminAccountSummaries(input);
  const paidAccounts = accounts.filter((account) => account.revenueCents > 0);
  const grossRevenueCents = periodRevenueOrders.reduce((total, order) => total + getOrderRevenueCents(order, input.economics), 0);
  const exportRevenueCents = periodRevenueOrders
    .filter((order) => order.entitlement === "export_credit")
    .reduce((total, order) => total + getOrderRevenueCents(order, input.economics), 0);
  const subscriptionRevenueCents = grossRevenueCents - exportRevenueCents;
  const estimatedStripeFeesCents = periodRevenueOrders.reduce((total, order) => total + getEstimatedStripeFeeCents(getOrderRevenueCents(order, input.economics), input.economics), 0);
  const estimatedProofCostsCents = periodProofs.length * input.economics.estimatedProofCostCents;
  const contributionProfitCents = grossRevenueCents - estimatedStripeFeesCents - estimatedProofCostsCents;
  const activeSubscriptions = accounts.filter((account) => account.activeSubscription).length;
  const activeSubscriptionRunRate = input.orders
    .filter((order) => order.entitlement === "subscription" && order.status === "paid")
    .reduce((total, order) => total + getOrderRevenueCents(order, input.economics), 0);
  const newEmailSignups = input.signups.filter((signup) => isWithinPeriod(signup.created_at, start)).length;

  return {
    periodLabel: input.periodDays ? `Last ${input.periodDays} days` : "All time",
    periodDays: input.periodDays,
    generatedAt: now.toISOString(),
    grossRevenueCents,
    exportRevenueCents,
    subscriptionRevenueCents,
    estimatedStripeFeesCents,
    estimatedProofCostsCents,
    contributionProfitCents,
    contributionMargin: grossRevenueCents > 0 ? contributionProfitCents / grossRevenueCents : null,
    activeSubscriptions,
    mrrCents: activeSubscriptionRunRate || activeSubscriptions * input.economics.subscriptionPriceCents,
    totalAccounts: accounts.length,
    paidAccounts: paidAccounts.length,
    emailSignups: input.signups.length,
    newEmailSignups,
    paidConversionRate: input.signups.length > 0 ? paidAccounts.length / input.signups.length : null,
    averageRevenuePerPaidAccountCents: paidAccounts.length > 0 ? Math.round(accounts.reduce((total, account) => total + account.revenueCents, 0) / paidAccounts.length) : 0,
    orders: periodOrders.length,
    paidOrders: periodRevenueOrders.length,
    refundedOrders: periodOrders.filter((order) => order.status === "refunded").length,
    expiredOrders: periodOrders.filter((order) => order.status === "expired").length,
    unusedCredits: input.orders.filter((order) => order.entitlement === "export_credit" && order.status === "paid").length,
    consumedExports: input.orders.filter((order) => order.entitlement === "export_credit" && order.status === "consumed").length,
    generatedProofs: periodProofs.length,
    passedProofs: periodProofs.filter((proof) => proof.status === "passed").length,
    failedProofs: periodProofs.filter((proof) => proof.status === "failed").length
  };
}
