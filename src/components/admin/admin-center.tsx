import Link from "next/link";
import {
  Activity,
  BadgeDollarSign,
  Banknote,
  CreditCard,
  Database,
  ExternalLink,
  FileCheck2,
  Gauge,
  Layers3,
  LogOut,
  Mail,
  NotebookPen,
  ReceiptText,
  ShieldCheck,
  TrendingUp,
  Users,
  WalletCards
} from "lucide-react";
import { logoutAdmin } from "@/app/admin/actions";
import { adminRanges, type AdminCenterData, type AdminRange } from "@/lib/admin/data";
import { getOrderRevenueCents } from "@/lib/admin/metrics";

function money(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2
  }).format(cents / 100);
}

function number(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function percent(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "n/a";
  }
  return `${Math.round(value * 1000) / 10}%`;
}

function date(value?: string | null) {
  if (!value) {
    return "n/a";
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function bytes(value: number) {
  if (value >= 1024 * 1024) {
    return `${(value / 1024 / 1024).toFixed(1)} MB`;
  }
  if (value >= 1024) {
    return `${Math.round(value / 1024)} KB`;
  }
  return `${value} B`;
}

function label(value: string) {
  return value.replaceAll("_", " ");
}

function statusClass(status: string) {
  if (status === "paid" || status === "consumed" || status === "passed" || status === "active" || status === "customer" || status === "vip") {
    return "border-success/30 bg-success/10 text-success";
  }
  if (status === "refunded" || status === "failed" || status === "expired" || status === "blocked" || status === "churn_risk") {
    return "border-danger/30 bg-danger/10 text-danger";
  }
  return "border-warning/30 bg-warning/10 text-surface-ink";
}

function Badge({ children, status }: { children: React.ReactNode; status: string }) {
  return <span className={`inline-flex rounded-[6px] border px-2 py-1 text-[11px] font-bold uppercase ${statusClass(status)}`}>{children}</span>;
}

function KpiCard({ title, value, detail, icon: Icon, tone = "neutral" }: { title: string; value: string; detail: string; icon: typeof Banknote; tone?: "neutral" | "money" | "warn" }) {
  const iconTone = tone === "money" ? "text-brand" : tone === "warn" ? "text-warning" : "text-accent";
  return (
    <article className="rounded-[8px] border border-border bg-surface p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-muted">{title}</p>
          <p className="mt-2 font-display text-3xl font-bold text-surface-ink">{value}</p>
        </div>
        <Icon aria-hidden className={`h-5 w-5 ${iconTone}`} />
      </div>
      <p className="mt-3 text-sm leading-5 text-muted">{detail}</p>
    </article>
  );
}

function Section({ id, title, children, aside }: { id: string; title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="border-t border-border bg-background" id={id}>
      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="font-display text-2xl font-bold text-surface-ink">{title}</h2>
          {aside ? <div className="text-sm text-muted">{aside}</div> : null}
        </div>
        {children}
      </div>
    </section>
  );
}

function StripeLink({ kind, id }: { kind: "customers" | "checkout/sessions" | "subscriptions"; id?: string | null }) {
  if (!id) {
    return null;
  }
  const prefix = process.env.STRIPE_SECRET_KEY?.startsWith("sk_test") ? "https://dashboard.stripe.com/test" : "https://dashboard.stripe.com";
  return (
    <a className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline" href={`${prefix}/${kind}/${id}`} rel="noreferrer" target="_blank">
      Stripe <ExternalLink aria-hidden className="h-3 w-3" />
    </a>
  );
}

export function AdminCenter({ data, range }: { data: AdminCenterData; range: AdminRange }) {
  const summary = data.summary;
  const recentOrders = data.orders.slice(0, 12);
  const recentProofs = data.generatedProofs.slice(0, 12);
  const recentAccounts = data.accounts.slice(0, 12);
  const activeSubscriptions = data.subscriptions.filter((subscription) => subscription.status === "paid");

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-[8px] bg-surface-ink text-white">
              <Gauge aria-hidden className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-brand">Trim Proof Admin</p>
              <h1 className="font-display text-2xl font-bold text-surface-ink">Management center</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {adminRanges.map((item) => (
              <Link
                className={`rounded-[8px] border px-3 py-2 text-sm font-semibold ${item.value === range ? "border-brand bg-brand-soft text-brand" : "border-border bg-background text-muted"}`}
                href={`/admin?range=${item.value}`}
                key={item.value}
              >
                {item.label}
              </Link>
            ))}
            <form action={logoutAdmin}>
              <button className="inline-flex items-center gap-2 rounded-[8px] border border-border bg-background px-3 py-2 text-sm font-semibold text-surface-ink" type="submit">
                <LogOut aria-hidden className="h-4 w-4" />
                Log out
              </button>
            </form>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-5 px-4 py-6">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
          <p className="max-w-3xl text-sm leading-6 text-muted">
            Live operating view for accounts, paid access, proof usage, estimated contribution margin, and production readiness. Revenue uses current product prices; profit is contribution profit after estimated Stripe fees and proof-generation COGS.
          </p>
          <nav className="flex flex-wrap gap-2 text-sm font-semibold">
            {["KPIs", "Accounts", "Subscriptions", "Orders", "Usage", "Audit", "Readiness"].map((item) => (
              <a className="rounded-[8px] border border-border bg-surface px-3 py-2 text-muted hover:text-surface-ink" href={`#${item.toLowerCase()}`} key={item}>
                {item}
              </a>
            ))}
          </nav>
        </div>

        {data.sourceErrors.length ? (
          <div className="rounded-[8px] border border-danger/30 bg-danger/10 p-4 text-sm font-semibold text-danger">
            {data.sourceErrors.map((error) => (
              <p key={error}>{error}</p>
            ))}
          </div>
        ) : null}
      </section>

      <Section id="kpis" title="KPIs" aside={`Generated ${date(summary.generatedAt)} · ${summary.periodLabel}`}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard detail={`${money(summary.exportRevenueCents)} export + ${money(summary.subscriptionRevenueCents)} subscription checkout revenue`} icon={Banknote} title="Gross revenue" tone="money" value={money(summary.grossRevenueCents)} />
          <KpiCard detail={`${money(summary.estimatedStripeFeesCents)} fees + ${money(summary.estimatedProofCostsCents)} estimated proof COGS`} icon={TrendingUp} title="Contribution profit" tone="money" value={money(summary.contributionProfitCents)} />
          <KpiCard detail={`${percent(summary.contributionMargin)} contribution margin using configured cost assumptions`} icon={BadgeDollarSign} title="Margin" value={percent(summary.contributionMargin)} />
          <KpiCard detail={`${money(summary.mrrCents)} monthly run-rate from active subscription customers`} icon={WalletCards} title="Active subscriptions" value={number(summary.activeSubscriptions)} />
          <KpiCard detail={`${number(summary.paidAccounts)} paid accounts · ${percent(summary.paidConversionRate)} signup-to-paid conversion`} icon={Users} title="Accounts" value={number(summary.totalAccounts)} />
          <KpiCard detail={`${number(summary.unusedCredits)} unused export credits still outstanding`} icon={CreditCard} title="Consumed exports" value={number(summary.consumedExports)} />
          <KpiCard detail={`${number(summary.passedProofs)} passed · ${number(summary.failedProofs)} failed in selected period`} icon={FileCheck2} title="Generated proofs" value={number(summary.generatedProofs)} />
          <KpiCard detail={`${number(summary.refundedOrders)} refunded · ${number(summary.expiredOrders)} expired orders`} icon={ReceiptText} title="Paid orders" value={number(summary.paidOrders)} />
        </div>
      </Section>

      <Section id="accounts" title="Accounts" aside={`${number(data.accounts.length)} known emails from users, signups, and orders`}>
        <div className="max-w-full overflow-x-auto rounded-[8px] border border-border bg-surface">
          <table className="w-full min-w-[920px] border-collapse text-sm">
            <thead className="bg-surface-strong text-left text-xs uppercase text-muted">
              <tr>
                <th className="px-3 py-3">Account</th>
                <th className="px-3 py-3">Revenue</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Subscription</th>
                <th className="px-3 py-3">Credits</th>
                <th className="px-3 py-3">Orders</th>
                <th className="px-3 py-3">Last activity</th>
                <th className="px-3 py-3">Manage</th>
              </tr>
            </thead>
            <tbody>
              {recentAccounts.map((account) => (
                <tr className="border-t border-border" key={account.email}>
                  <td className="px-3 py-3">
                    <div className="font-semibold text-surface-ink">{account.email}</div>
                    <div className="text-xs text-muted">{account.companyName ?? account.accountSource}</div>
                    {account.role || account.monthlyPrintJobs ? <div className="text-xs text-muted">{[account.role, account.monthlyPrintJobs ? `${account.monthlyPrintJobs} jobs/mo` : undefined].filter(Boolean).join(" · ")}</div> : null}
                  </td>
                  <td className="px-3 py-3 font-semibold">{money(account.revenueCents)}</td>
                  <td className="px-3 py-3">
                    <Badge status={account.managementStatus ?? (account.activeSubscription ? "customer" : "lead")}>{label(account.managementStatus ?? (account.activeSubscription ? "customer" : "lead"))}</Badge>
                  </td>
                  <td className="px-3 py-3">
                    <Badge status={account.activeSubscription ? "active" : "expired"}>{account.activeSubscription ? "active" : "none"}</Badge>
                  </td>
                  <td className="px-3 py-3">{account.unusedCredits} unused · {account.consumedExports} used</td>
                  <td className="px-3 py-3">{account.orderCount}</td>
                  <td className="px-3 py-3">{date(account.lastActivityAt)}</td>
                  <td className="px-3 py-3">
                    <div className="flex flex-col gap-1">
                      <Link className="text-xs font-semibold text-brand hover:underline" href={`/admin/accounts/${encodeURIComponent(account.email)}`}>Open account</Link>
                      <StripeLink id={account.stripeCustomerId} kind="customers" />
                      <a className="text-xs font-semibold text-brand hover:underline" href={`mailto:${account.email}`}>Email</a>
                    </div>
                  </td>
                </tr>
              ))}
              {!recentAccounts.length ? (
                <tr>
                  <td className="px-3 py-6 text-muted" colSpan={8}>No accounts yet.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="subscriptions" title="Subscriptions" aside={`${number(activeSubscriptions.length)} active subscription checkout records`}>
        <div className="grid gap-3 lg:grid-cols-3">
          <div className="rounded-[8px] border border-border bg-surface p-4">
            <p className="text-xs font-semibold uppercase text-muted">Monthly run-rate</p>
            <p className="mt-2 font-display text-3xl font-bold text-surface-ink">{money(summary.mrrCents)}</p>
            <p className="mt-2 text-sm text-muted">Based on active subscription rows at {money(data.economics.subscriptionPriceCents)} each.</p>
          </div>
          <div className="rounded-[8px] border border-border bg-surface p-4">
            <p className="text-xs font-semibold uppercase text-muted">Subscription revenue</p>
            <p className="mt-2 font-display text-3xl font-bold text-surface-ink">{money(summary.subscriptionRevenueCents)}</p>
            <p className="mt-2 text-sm text-muted">Selected-period checkout revenue, not recurring invoice backfill.</p>
          </div>
          <div className="rounded-[8px] border border-border bg-surface p-4">
            <p className="text-xs font-semibold uppercase text-muted">Access state</p>
            <p className="mt-2 font-display text-3xl font-bold text-surface-ink">{number(data.subscriptions.filter((order) => order.status === "expired").length)}</p>
            <p className="mt-2 text-sm text-muted">Expired or failed subscription access records.</p>
          </div>
        </div>
        <OrderTable economics={data.economics} orders={data.subscriptions.slice(0, 10)} />
      </Section>

      <Section id="orders" title="Order Ledger" aside={`${number(data.orders.length)} checkout records`}>
        <OrderTable economics={data.economics} orders={recentOrders} />
      </Section>

      <Section id="usage" title="Usage" aside={`${number(data.generatedProofs.length)} generated proof folders on this server`}>
        <div className="grid gap-3 lg:grid-cols-4">
          <KpiCard detail={`${number(data.projects.length)} saved projects · ${number(data.exports.length)} database exports`} icon={Layers3} title="Database usage" value={number(data.assets.length)} />
          <KpiCard detail="Generated file storage inside TRIMPROOF_GENERATED_DIR" icon={Database} title="Proof storage" value={bytes(data.generatedProofs.reduce((total, proof) => total + proof.totalBytes, 0))} />
          <KpiCard detail={`Estimated ${money(data.economics.estimatedProofCostCents)} per generated proof`} icon={Activity} title="Estimated proof COGS" value={money(summary.estimatedProofCostsCents)} />
          <KpiCard detail={`${number(data.credits.length)} ledger rows`} icon={CreditCard} title="Credit ledger" value={number(summary.unusedCredits)} />
        </div>
        <div className="max-w-full overflow-x-auto rounded-[8px] border border-border bg-surface">
          <table className="w-full min-w-[850px] border-collapse text-sm">
            <thead className="bg-surface-strong text-left text-xs uppercase text-muted">
              <tr>
                <th className="px-3 py-3">Proof job</th>
                <th className="px-3 py-3">Mode</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Product</th>
                <th className="px-3 py-3">Provider</th>
                <th className="px-3 py-3">Files</th>
                <th className="px-3 py-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {recentProofs.map((proof) => (
                <tr className="border-t border-border" key={proof.id}>
                  <td className="px-3 py-3 font-mono text-xs">{proof.id}</td>
                  <td className="px-3 py-3">{proof.mode}</td>
                  <td className="px-3 py-3"><Badge status={proof.status}>{proof.status}</Badge></td>
                  <td className="px-3 py-3">{proof.productType ?? "unknown"}</td>
                  <td className="px-3 py-3">{proof.provider ?? "unknown"}</td>
                  <td className="px-3 py-3">{proof.fileCount} · {bytes(proof.totalBytes)}</td>
                  <td className="px-3 py-3">{date(proof.createdAt)}</td>
                </tr>
              ))}
              {!recentProofs.length ? (
                <tr>
                  <td className="px-3 py-6 text-muted" colSpan={7}>No generated proofs found on this server.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="audit" title="Audit" aside={`${number(data.auditEvents.length)} recent admin events`}>
        <div className="max-w-full overflow-x-auto rounded-[8px] border border-border bg-surface">
          <table className="w-full min-w-[820px] border-collapse text-sm">
            <thead className="bg-surface-strong text-left text-xs uppercase text-muted">
              <tr>
                <th className="px-3 py-3">Action</th>
                <th className="px-3 py-3">Target</th>
                <th className="px-3 py-3">Actor</th>
                <th className="px-3 py-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {data.auditEvents.slice(0, 12).map((event) => (
                <tr className="border-t border-border" key={event.id}>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2 font-semibold text-surface-ink">
                      <NotebookPen aria-hidden className="h-4 w-4 text-brand" />
                      {event.action}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div>{event.target_type}</div>
                    <div className="font-mono text-xs text-muted">{event.target_id}</div>
                  </td>
                  <td className="px-3 py-3">{event.actor}</td>
                  <td className="px-3 py-3">{date(event.created_at)}</td>
                </tr>
              ))}
              {!data.auditEvents.length ? (
                <tr>
                  <td className="px-3 py-6 text-muted" colSpan={4}>No admin actions have been logged yet.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="readiness" title="Readiness" aside="Operational configuration state">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <ReadinessItem active={data.readiness.supabaseConfigured} detail="Service-role reads for admin metrics" label="Supabase" />
          <ReadinessItem active={data.readiness.stripeConfigured} detail="Checkout, lifecycle, and Stripe dashboard links" label="Stripe" />
          <ReadinessItem active={data.readiness.analyticsConfigured} detail="Server-side GA4 Measurement Protocol" label="GA4 events" />
          <ReadinessItem active={data.readiness.emailConfigured} detail={data.readiness.emailProvider ?? "No provider"} label="Email" />
          <ReadinessItem active={data.readiness.openaiConfigured} detail="GPT Image 2 route available" label="OpenAI" />
          <ReadinessItem active={data.readiness.geminiConfigured} detail="Nano Banana Pro route available" label="Gemini" />
          <ReadinessItem active detail={`Export ${money(data.economics.exportPriceCents)} · Pro ${money(data.economics.subscriptionPriceCents)} · ${number(data.economics.proMonthlyExportLimit)} exports/mo`} label="Pricing model" />
          <ReadinessItem active detail={`Stripe ${data.economics.stripeFeeBps / 100}% + ${money(data.economics.stripeFixedFeeCents)} · proof ${money(data.economics.estimatedProofCostCents)}`} label="Margin assumptions" />
        </div>
      </Section>
    </main>
  );
}

function ReadinessItem({ active, label, detail }: { active: boolean; label: string; detail: string }) {
  return (
    <div className="rounded-[8px] border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {active ? <ShieldCheck aria-hidden className="h-4 w-4 text-success" /> : <Mail aria-hidden className="h-4 w-4 text-warning" />}
          <p className="font-display text-base font-bold text-surface-ink">{label}</p>
        </div>
        <Badge status={active ? "active" : "needs_attention"}>{active ? "ready" : "check"}</Badge>
      </div>
      <p className="mt-2 text-sm leading-5 text-muted">{detail}</p>
    </div>
  );
}

function OrderTable({ economics, orders }: { economics: AdminCenterData["economics"]; orders: AdminCenterData["orders"] }) {
  return (
    <div className="max-w-full overflow-x-auto rounded-[8px] border border-border bg-surface">
      <table className="w-full min-w-[900px] border-collapse text-sm">
        <thead className="bg-surface-strong text-left text-xs uppercase text-muted">
          <tr>
            <th className="px-3 py-3">Customer</th>
            <th className="px-3 py-3">Type</th>
            <th className="px-3 py-3">Amount</th>
            <th className="px-3 py-3">Status</th>
            <th className="px-3 py-3">Session</th>
            <th className="px-3 py-3">Proof job</th>
            <th className="px-3 py-3">Created</th>
            <th className="px-3 py-3">Stripe</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr className="border-t border-border" key={order.id}>
              <td className="px-3 py-3">
                <div className="font-semibold text-surface-ink">{order.customer_email ?? "No email"}</div>
                <div className="text-xs text-muted">{order.stripe_customer_id ?? "No customer ID"}</div>
              </td>
              <td className="px-3 py-3">{order.entitlement}</td>
              <td className="px-3 py-3 font-semibold">{money(getOrderRevenueCents(order, economics), order.currency ?? "USD")}</td>
              <td className="px-3 py-3"><Badge status={order.status}>{order.status}</Badge></td>
              <td className="px-3 py-3 font-mono text-xs">{order.stripe_session_id}</td>
              <td className="px-3 py-3 font-mono text-xs">{order.proof_job_id ?? "n/a"}</td>
              <td className="px-3 py-3">{date(order.created_at)}</td>
              <td className="px-3 py-3">
                <div className="flex flex-col gap-1">
                  <StripeLink id={order.stripe_session_id} kind="checkout/sessions" />
                  <StripeLink id={order.stripe_subscription_id} kind="subscriptions" />
                </div>
              </td>
            </tr>
          ))}
          {!orders.length ? (
            <tr>
              <td className="px-3 py-6 text-muted" colSpan={8}>No orders yet.</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
