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
  Handshake,
  Layers3,
  LogOut,
  Mail,
  NotebookPen,
  PlusCircle,
  ReceiptText,
  ShieldCheck,
  TrendingUp,
  Users,
  WalletCards
} from "lucide-react";
import { logPilotOutreachEvent, logoutAdmin, recordPilotEvidence, upsertPilotProspect } from "@/app/admin/actions";
import { adminRanges, type AdminCenterData, type AdminRange } from "@/lib/admin/data";
import { getOrderRevenueCents } from "@/lib/admin/metrics";
import { buildPilotFirstTouchBatch } from "@/lib/admin/pilot-outreach";
import { SeoResearchSection } from "@/components/admin/seo-research-section";

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
    <section className="min-w-0 border-t border-border bg-background" id={id}>
      <div className="mx-auto grid min-w-0 max-w-7xl gap-5 px-4 py-8">
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

export function AdminCenter({ data, range, saved, error }: { data: AdminCenterData; range: AdminRange; saved?: string; error?: string }) {
  const summary = data.summary;
  const recentOrders = data.orders.slice(0, 12);
  const recentProofs = data.generatedProofs.slice(0, 12);
  const recentAccounts = data.accounts.slice(0, 12);
  const pilotLeads = data.pilotLeads.slice(0, 12);
  const recentOutreachEvents = data.pilotOutreachEvents.slice(0, 8);
  const recentEvidenceRecords = data.pilotEvidenceRecords.slice(0, 8);
  const targetListLeads = data.pilotLeads.filter((lead) => lead.origin !== "signup");
  const manualProspectCount = data.pilotProspects.length;
  const firstTouchBatch = buildPilotFirstTouchBatch(data.pilotLeads, 10);
  const activeSubscriptions = data.subscriptions.filter((subscription) => subscription.status === "paid");

  return (
    <main className="min-h-screen overflow-x-hidden bg-background text-foreground">
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
            {["KPIs", "SEO", "Pipeline", "Accounts", "Subscriptions", "Orders", "Usage", "Audit", "Readiness"].map((item) => (
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
        {saved ? <div className="rounded-[8px] border border-success/30 bg-success/10 p-4 text-sm font-semibold text-success">{saved}</div> : null}
        {error ? <div className="rounded-[8px] border border-danger/30 bg-danger/10 p-4 text-sm font-semibold text-danger">{error}</div> : null}
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

      <Section id="seo" title="North America SEO demand" aside={data.seoResearch ? `Refreshed ${date(data.seoResearch.generatedAt)} · DataForSEO live search volume` : "Live DataForSEO research file missing"}>
        <SeoResearchSection research={data.seoResearch} serpResearch={data.seoSerpResearch} />
      </Section>

      <Section id="pipeline" title="Pilot pipeline" aside={`${number(data.pilotLeads.length)} launch-list leads with follow-up context`}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <KpiCard detail="Uncontacted launch-list leads, sorted by segment fit and recency" icon={Handshake} title="Needs follow-up" value={number(data.pilotLeads.filter((lead) => lead.followUpStatus === "needs_follow_up").length)} />
          <KpiCard detail="Print shops, Pro-interest accounts, or VIP-marked leads" icon={Users} title="High priority" value={number(data.pilotLeads.filter((lead) => lead.priorityLabel === "High").length)} />
          <KpiCard detail={`${number(manualProspectCount)} manual prospects plus any later signup signals merged by email`} icon={PlusCircle} title="Target list" value={number(targetListLeads.length)} />
          <KpiCard detail="Leads already moved into customer, contacted, VIP, or blocked status" icon={NotebookPen} title="Worked leads" value={number(data.pilotLeads.filter((lead) => lead.followUpStatus !== "needs_follow_up").length)} />
          <KpiCard detail="Manual sends, replies, and pilot decisions recorded by an admin" icon={Activity} title="Outreach events" value={number(data.pilotOutreachEvents.length)} />
          <KpiCard detail="Real pilot jobs, report notes, quote permission, and public-claim status" icon={FileCheck2} title="Pilot evidence" value={number(data.pilotEvidenceRecords.length)} />
        </div>
        <div className="grid gap-3 rounded-[8px] border border-border bg-surface p-4 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="font-display text-lg font-bold text-surface-ink">First-touch batch</h3>
              <p className="max-w-3xl text-sm leading-5 text-muted">Top uncontacted prospects with ready-to-copy drafts. Sending is manual; keep each row as `needs_follow_up` until the message is actually sent and logged.</p>
            </div>
            <Badge status={firstTouchBatch.length ? "vip" : "expired"}>{number(firstTouchBatch.length)} ready</Badge>
          </div>
          <div className="grid gap-3 xl:grid-cols-2">
            {firstTouchBatch.map((item, index) => (
              <article className="grid gap-3 rounded-[8px] border border-border bg-background p-3" key={item.lead.email}>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase text-muted">Touch {index + 1} · {item.lead.segmentLabel}</p>
                    <h4 className="font-display text-base font-bold text-surface-ink">{item.lead.companyName ?? item.lead.contactName ?? item.lead.email}</h4>
                    <p className="mt-1 text-xs leading-5 text-muted">{item.lead.firstSupportedJob ? label(item.lead.firstSupportedJob) : "supported print job"} · score {item.lead.priorityScore}</p>
                  </div>
                  <a
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[8px] border border-brand bg-brand-soft px-3 py-2 text-sm font-bold text-brand hover:bg-background"
                    href={`mailto:${item.lead.email}?subject=${encodeURIComponent(item.message.subject)}&body=${encodeURIComponent(item.message.body)}`}
                  >
                    <Mail aria-hidden className="h-4 w-4" />
                    Open draft
                  </a>
                </div>
                <div className="rounded-[8px] border border-border bg-surface p-3">
                  <p className="text-xs font-semibold uppercase text-muted">Subject</p>
                  <p className="mt-1 text-sm font-semibold text-surface-ink">{item.message.subject}</p>
                </div>
                <label className="grid gap-1 text-xs font-semibold uppercase text-muted">
                  Body
                  <textarea className="min-h-56 resize-y rounded-[8px] border border-border bg-surface px-3 py-2 font-mono text-xs leading-5 text-surface-ink" readOnly value={item.message.body} />
                </label>
                <form action={logPilotOutreachEvent} className="grid gap-2 rounded-[8px] border border-border bg-surface p-3 sm:grid-cols-[1fr_auto] sm:items-end">
                  <input name="returnPath" type="hidden" value={`/admin?range=${range}#pipeline`} />
                  <input name="email" type="hidden" value={item.lead.email} />
                  <input name="eventType" type="hidden" value="first_touch_sent" />
                  <input name="channel" type="hidden" value="email" />
                  <input name="subject" type="hidden" value={item.message.subject} />
                  <input name="firstSupportedJob" type="hidden" value={item.lead.firstSupportedJob ?? ""} />
                  <input name="notes" type="hidden" value="First-touch email sent manually from the admin batch." />
                  <input name="nextStep" type="hidden" value="Follow up in three business days if there is no reply." />
                  <p className="text-xs leading-5 text-muted">Log this only after the email is actually sent. No automatic email is sent.</p>
                  <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[8px] border border-brand bg-brand-soft px-3 py-2 text-sm font-bold text-brand hover:bg-background" type="submit">
                    <NotebookPen aria-hidden className="h-4 w-4" />
                    Log sent
                  </button>
                </form>
                <p className="text-xs leading-5 text-muted">{item.lead.likelyPain ?? item.lead.useCase}</p>
              </article>
            ))}
            {!firstTouchBatch.length ? <p className="rounded-[8px] border border-border bg-background p-4 text-sm text-muted">No uncontacted prospects are ready for first-touch drafting.</p> : null}
          </div>
        </div>
        <div className="grid gap-3 rounded-[8px] border border-border bg-surface p-4 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="font-display text-lg font-bold text-surface-ink">Outreach events</h3>
              <p className="max-w-3xl text-sm leading-5 text-muted">Manual evidence for founder touches, replies, and pilot decisions. This ledger is the source of truth for what actually happened.</p>
            </div>
            <Badge status={recentOutreachEvents.length ? "vip" : "expired"}>{number(recentOutreachEvents.length)} recent</Badge>
          </div>
          <div className="max-w-full overflow-x-auto rounded-[8px] border border-border bg-background">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead className="bg-surface-strong text-left text-xs uppercase text-muted">
                <tr>
                  <th className="px-3 py-3">Prospect</th>
                  <th className="px-3 py-3">Event</th>
                  <th className="px-3 py-3">Channel</th>
                  <th className="px-3 py-3">Subject</th>
                  <th className="px-3 py-3">Next step</th>
                  <th className="px-3 py-3">Logged</th>
                </tr>
              </thead>
              <tbody>
                {recentOutreachEvents.map((event) => (
                  <tr className="border-t border-border align-top" key={event.id}>
                    <td className="px-3 py-3 font-semibold text-surface-ink">{event.prospect_email}</td>
                    <td className="px-3 py-3"><Badge status={event.event_type === "pilot_agreed" ? "vip" : event.event_type === "blocked" || event.event_type === "pilot_declined" ? "blocked" : "contacted"}>{label(event.event_type)}</Badge></td>
                    <td className="px-3 py-3">{label(event.channel)}</td>
                    <td className="px-3 py-3 max-w-[240px] text-muted">{event.subject || "n/a"}</td>
                    <td className="px-3 py-3 max-w-[240px] text-muted">{event.next_step || "n/a"}</td>
                    <td className="px-3 py-3">{date(event.event_at)}</td>
                  </tr>
                ))}
                {!recentOutreachEvents.length ? (
                  <tr>
                    <td className="px-3 py-6 text-muted" colSpan={6}>No manual outreach events have been logged yet.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
        <div className="grid gap-3 rounded-[8px] border border-border bg-surface p-4 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="font-display text-lg font-bold text-surface-ink">Record pilot evidence</h3>
              <p className="max-w-3xl text-sm leading-5 text-muted">Log real supported jobs, report clarity, and permission boundaries. Do not use as public proof until permission and claim status allow it.</p>
            </div>
            <Badge status={recentEvidenceRecords.length ? "vip" : "expired"}>{number(recentEvidenceRecords.length)} recent</Badge>
          </div>
          <form action={recordPilotEvidence} className="grid gap-3 rounded-[8px] border border-border bg-background p-3">
            <input name="returnPath" type="hidden" value={`/admin?range=${range}#pipeline`} />
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <label className="grid gap-1 text-xs font-semibold uppercase text-muted">
                Email
                <input className="rounded-[8px] border border-border bg-surface px-3 py-2 text-sm font-semibold text-surface-ink" name="email" required type="email" />
              </label>
              <label className="grid gap-1 text-xs font-semibold uppercase text-muted">
                Job
                <select className="rounded-[8px] border border-border bg-surface px-3 py-2 text-sm font-semibold text-surface-ink" defaultValue="flyer" name="jobType">
                  <option value="flyer">Flyer</option>
                  <option value="poster">Poster</option>
                  <option value="menu">Menu</option>
                  <option value="brochure">Brochure</option>
                  <option value="business_card">Business card</option>
                  <option value="postcard">Postcard</option>
                  <option value="letterhead">Letterhead</option>
                </select>
              </label>
              <label className="grid gap-1 text-xs font-semibold uppercase text-muted">
                Tested path
                <select className="rounded-[8px] border border-border bg-surface px-3 py-2 text-sm font-semibold text-surface-ink" defaultValue="dummy_proof" name="testedPath">
                  <option value="dummy_proof">Dummy proof</option>
                  <option value="export_credit">Export credit</option>
                  <option value="pro">Pro</option>
                  <option value="unknown">Unknown</option>
                </select>
              </label>
              <label className="grid gap-1 text-xs font-semibold uppercase text-muted">
                Outcome
                <select className="rounded-[8px] border border-border bg-surface px-3 py-2 text-sm font-semibold text-surface-ink" defaultValue="review_only" name="outcome">
                  <option value="review_only">Reviewed only</option>
                  <option value="needs_revision">Needs revision</option>
                  <option value="used_after_review">Used after review</option>
                  <option value="not_fit">Not a fit</option>
                  <option value="blocked">Blocked</option>
                </select>
              </label>
              <label className="grid gap-1 text-xs font-semibold uppercase text-muted">
                Quote permission
                <select className="rounded-[8px] border border-border bg-surface px-3 py-2 text-sm font-semibold text-surface-ink" defaultValue="none" name="quotePermission">
                  <option value="none">None</option>
                  <option value="anonymous">Anonymous</option>
                  <option value="attributed">Attributed</option>
                </select>
              </label>
              <label className="grid gap-1 text-xs font-semibold uppercase text-muted">
                Claim status
                <select className="rounded-[8px] border border-border bg-surface px-3 py-2 text-sm font-semibold text-surface-ink" defaultValue="not_approved" name="publicClaimStatus">
                  <option value="not_approved">Not approved</option>
                  <option value="approved_internal">Internal only</option>
                  <option value="approved_public">Approved public</option>
                </select>
              </label>
              <label className="grid gap-1 text-xs font-semibold uppercase text-muted">
                Evidence date
                <input className="rounded-[8px] border border-border bg-surface px-3 py-2 text-sm font-semibold text-surface-ink" name="evidenceAt" type="datetime-local" />
              </label>
              <label className="grid gap-1 text-xs font-semibold uppercase text-muted">
                Product version
                <input className="rounded-[8px] border border-border bg-surface px-3 py-2 text-sm font-semibold text-surface-ink" name="productVersion" placeholder="commit, tag, or release" />
              </label>
              <label className="grid gap-1 text-xs font-semibold uppercase text-muted md:col-span-2">
                Source material
                <input className="rounded-[8px] border border-border bg-surface px-3 py-2 text-sm font-semibold text-surface-ink" name="sourceMaterial" placeholder="brief, screenshot, PDF, Canva export, image" />
              </label>
              <label className="grid gap-1 text-xs font-semibold uppercase text-muted md:col-span-2">
                Printer spec
                <input className="rounded-[8px] border border-border bg-surface px-3 py-2 text-sm font-semibold text-surface-ink" name="printerSpec" />
              </label>
              <label className="grid gap-1 text-xs font-semibold uppercase text-muted md:col-span-2">
                Checks summary
                <textarea className="min-h-28 resize-y rounded-[8px] border border-border bg-surface px-3 py-2 text-sm font-semibold leading-5 text-surface-ink" name="checksSummary" />
              </label>
              <label className="grid gap-1 text-xs font-semibold uppercase text-muted md:col-span-2">
                Report clarity
                <textarea className="min-h-28 resize-y rounded-[8px] border border-border bg-surface px-3 py-2 text-sm font-semibold leading-5 text-surface-ink" name="reportClarity" />
              </label>
              <label className="grid gap-1 text-xs font-semibold uppercase text-muted md:col-span-4">
                Notes
                <input className="rounded-[8px] border border-border bg-surface px-3 py-2 text-sm font-semibold text-surface-ink" name="notes" />
              </label>
            </div>
            <div className="flex justify-end">
              <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[8px] bg-brand px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-brand-dark" type="submit">
                <NotebookPen aria-hidden className="h-4 w-4" />
                Save evidence
              </button>
            </div>
          </form>
          <div className="max-w-full overflow-x-auto rounded-[8px] border border-border bg-background">
            <table className="w-full min-w-[980px] border-collapse text-sm">
              <thead className="bg-surface-strong text-left text-xs uppercase text-muted">
                <tr>
                  <th className="px-3 py-3">Prospect</th>
                  <th className="px-3 py-3">Job</th>
                  <th className="px-3 py-3">Outcome</th>
                  <th className="px-3 py-3">Permission</th>
                  <th className="px-3 py-3">Claim status</th>
                  <th className="px-3 py-3">Report clarity</th>
                  <th className="px-3 py-3">Logged</th>
                </tr>
              </thead>
              <tbody>
                {recentEvidenceRecords.map((record) => (
                  <tr className="border-t border-border align-top" key={record.id}>
                    <td className="px-3 py-3 font-semibold text-surface-ink">{record.prospect_email}</td>
                    <td className="px-3 py-3">
                      <div className="font-semibold text-surface-ink">{label(record.job_type)}</div>
                      <div className="text-xs text-muted">{label(record.tested_path)}</div>
                    </td>
                    <td className="px-3 py-3"><Badge status={record.outcome === "blocked" || record.outcome === "not_fit" ? "blocked" : "vip"}>{label(record.outcome)}</Badge></td>
                    <td className="px-3 py-3">{label(record.quote_permission)}</td>
                    <td className="px-3 py-3"><Badge status={record.public_claim_status === "approved_public" ? "vip" : record.public_claim_status === "approved_internal" ? "lead" : "needs_attention"}>{label(record.public_claim_status)}</Badge></td>
                    <td className="px-3 py-3 max-w-[320px] text-muted">{record.report_clarity || record.checks_summary || "n/a"}</td>
                    <td className="px-3 py-3">{date(record.evidence_at)}</td>
                  </tr>
                ))}
                {!recentEvidenceRecords.length ? (
                  <tr>
                    <td className="px-3 py-6 text-muted" colSpan={7}>No pilot evidence records have been logged yet.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
        <form action={upsertPilotProspect} className="grid gap-4 rounded-[8px] border border-border bg-surface p-4 shadow-sm">
          <input name="returnPath" type="hidden" value={`/admin?range=${range}#pipeline`} />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-display text-lg font-bold text-surface-ink">Add pilot prospect</h3>
              <p className="text-sm leading-5 text-muted">Use real public or signup-provided contact details only.</p>
            </div>
            <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[8px] bg-brand px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-brand-dark" type="submit">
              <PlusCircle aria-hidden className="h-4 w-4" />
              Save prospect
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="grid gap-1 text-xs font-semibold uppercase text-muted">
              Email
              <input className="rounded-[8px] border border-border bg-background px-3 py-2 text-sm font-semibold text-surface-ink" name="email" required type="email" />
            </label>
            <label className="grid gap-1 text-xs font-semibold uppercase text-muted">
              Company
              <input className="rounded-[8px] border border-border bg-background px-3 py-2 text-sm font-semibold text-surface-ink" name="companyName" />
            </label>
            <label className="grid gap-1 text-xs font-semibold uppercase text-muted">
              Contact
              <input className="rounded-[8px] border border-border bg-background px-3 py-2 text-sm font-semibold text-surface-ink" name="contactName" />
            </label>
            <label className="grid gap-1 text-xs font-semibold uppercase text-muted">
              Role
              <input className="rounded-[8px] border border-border bg-background px-3 py-2 text-sm font-semibold text-surface-ink" name="role" />
            </label>
            <label className="grid gap-1 text-xs font-semibold uppercase text-muted">
              Segment
              <select className="rounded-[8px] border border-border bg-background px-3 py-2 text-sm font-semibold text-surface-ink" defaultValue="print_shop" name="segment">
                <option value="print_shop">Print shop</option>
                <option value="designer">Designer</option>
                <option value="marketing_team">Marketing team</option>
                <option value="checklist_reader">Checklist reader</option>
                <option value="account_signup">Account signup</option>
                <option value="general_launch">General launch</option>
              </select>
            </label>
            <label className="grid gap-1 text-xs font-semibold uppercase text-muted">
              Source
              <select className="rounded-[8px] border border-border bg-background px-3 py-2 text-sm font-semibold text-surface-ink" defaultValue="manual_target_list" name="source">
                <option value="manual_target_list">Manual target list</option>
                <option value="google_maps">Google Maps</option>
                <option value="linkedin">LinkedIn</option>
                <option value="referral">Referral</option>
                <option value="community_post">Community post</option>
              </select>
            </label>
            <label className="grid gap-1 text-xs font-semibold uppercase text-muted">
              First job
              <select className="rounded-[8px] border border-border bg-background px-3 py-2 text-sm font-semibold text-surface-ink" defaultValue="flyer" name="firstSupportedJob">
                <option value="flyer">Flyer</option>
                <option value="poster">Poster</option>
                <option value="menu">Menu</option>
                <option value="brochure">Brochure</option>
                <option value="business_card">Business card</option>
                <option value="postcard">Postcard</option>
                <option value="letterhead">Letterhead</option>
              </select>
            </label>
            <label className="grid gap-1 text-xs font-semibold uppercase text-muted">
              Status
              <select className="rounded-[8px] border border-border bg-background px-3 py-2 text-sm font-semibold text-surface-ink" defaultValue="needs_follow_up" name="status">
                <option value="needs_follow_up">Needs follow-up</option>
                <option value="contacted">Contacted</option>
                <option value="vip">VIP</option>
                <option value="customer">Customer</option>
                <option value="blocked">Blocked</option>
              </select>
            </label>
            <label className="grid gap-1 text-xs font-semibold uppercase text-muted">
              Priority
              <input className="rounded-[8px] border border-border bg-background px-3 py-2 text-sm font-semibold text-surface-ink" defaultValue="55" max="100" min="0" name="priorityScore" type="number" />
            </label>
            <label className="grid gap-1 text-xs font-semibold uppercase text-muted">
              Last contact
              <input className="rounded-[8px] border border-border bg-background px-3 py-2 text-sm font-semibold text-surface-ink" name="lastContactAt" type="datetime-local" />
            </label>
            <label className="grid gap-1 text-xs font-semibold uppercase text-muted md:col-span-2">
              Public contact path
              <input className="rounded-[8px] border border-border bg-background px-3 py-2 text-sm font-semibold text-surface-ink" name="publicContactPath" />
            </label>
            <label className="grid gap-1 text-xs font-semibold uppercase text-muted md:col-span-2">
              Likely pain
              <input className="rounded-[8px] border border-border bg-background px-3 py-2 text-sm font-semibold text-surface-ink" name="likelyPain" />
            </label>
            <label className="grid gap-1 text-xs font-semibold uppercase text-muted md:col-span-2">
              Notes
              <input className="rounded-[8px] border border-border bg-background px-3 py-2 text-sm font-semibold text-surface-ink" name="notes" />
            </label>
          </div>
        </form>
        <div className="max-w-full overflow-x-auto rounded-[8px] border border-border bg-surface">
          <table className="w-full min-w-[1120px] border-collapse text-sm">
            <thead className="bg-surface-strong text-left text-xs uppercase text-muted">
              <tr>
                <th className="px-3 py-3">Lead</th>
                <th className="px-3 py-3">Origin</th>
                <th className="px-3 py-3">Segment</th>
                <th className="px-3 py-3">Follow-up</th>
                <th className="px-3 py-3">Priority</th>
                <th className="px-3 py-3">Use case</th>
                <th className="px-3 py-3">Last signal</th>
                <th className="px-3 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {pilotLeads.map((lead) => (
                <tr className="border-t border-border align-top" key={lead.email}>
                  <td className="px-3 py-3">
                    <div className="font-semibold text-surface-ink">{lead.email}</div>
                    <div className="text-xs text-muted">{lead.companyName ?? lead.contactName ?? lead.source}</div>
                    {lead.role || lead.monthlyPrintJobs ? <div className="text-xs text-muted">{[lead.role, lead.monthlyPrintJobs ? `${lead.monthlyPrintJobs} jobs/mo` : undefined].filter(Boolean).join(" · ")}</div> : null}
                  </td>
                  <td className="px-3 py-3">
                    <div className="font-semibold text-surface-ink">{label(lead.origin)}</div>
                    {lead.firstSupportedJob ? <div className="text-xs text-muted">{label(lead.firstSupportedJob)}</div> : null}
                  </td>
                  <td className="px-3 py-3">
                    <div className="font-semibold text-surface-ink">{lead.segmentLabel}</div>
                    <div className="text-xs text-muted">{lead.source}</div>
                  </td>
                  <td className="px-3 py-3">
                    <Badge status={lead.followUpStatus}>{lead.followUpLabel}</Badge>
                    {lead.lastContactAt ? <div className="mt-1 text-xs text-muted">Last contact {date(lead.lastContactAt)}</div> : null}
                  </td>
                  <td className="px-3 py-3">
                    <Badge status={lead.priorityLabel === "High" ? "vip" : lead.priorityLabel === "Medium" ? "lead" : "expired"}>{lead.priorityLabel}</Badge>
                    <div className="mt-1 text-xs text-muted">Score {lead.priorityScore}</div>
                  </td>
                  <td className="px-3 py-3 max-w-[280px] text-sm leading-5 text-muted">{lead.useCase}</td>
                  <td className="px-3 py-3">{date(lead.lastSignalAt)}</td>
                  <td className="px-3 py-3">
                    <div className="flex flex-col gap-1">
                      <Link className="text-xs font-semibold text-brand hover:underline" href={`/admin/accounts/${encodeURIComponent(lead.email)}`}>Open account</Link>
                      <a className="text-xs font-semibold text-brand hover:underline" href={`mailto:${lead.email}`}>Email</a>
                      {lead.publicContactPath ? <span className="max-w-[180px] truncate text-xs text-muted">{lead.publicContactPath}</span> : null}
                    </div>
                  </td>
                </tr>
              ))}
              {!pilotLeads.length ? (
                <tr>
                  <td className="px-3 py-6 text-muted" colSpan={8}>No launch-list leads yet.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
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
