import Link from "next/link";
import {
  ArrowLeft,
  BadgeDollarSign,
  CalendarClock,
  CreditCard,
  ExternalLink,
  Mail,
  NotebookPen,
  ReceiptText,
  ShieldCheck,
  Users
} from "lucide-react";
import {
  cancelSubscription,
  expireOrderAccess,
  openStripeCustomerPortal,
  refundOrder,
  sendOrderAccessLink,
  updateAccountManagement
} from "@/app/admin/actions";
import { getOrderRevenueCents } from "@/lib/admin/metrics";
import type { AdminAccountDetailData } from "@/lib/admin/data";

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

function datetimeLocal(value?: string | null) {
  if (!value) {
    return "";
  }
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) {
    return "";
  }
  return parsed.toISOString().slice(0, 16);
}

function label(value: string) {
  return value.replaceAll("_", " ");
}

function statusClass(status: string) {
  if (status === "paid" || status === "consumed" || status === "active" || status === "vip" || status === "customer") {
    return "border-success/30 bg-success/10 text-success";
  }
  if (status === "refunded" || status === "expired" || status === "blocked" || status === "churn_risk") {
    return "border-danger/30 bg-danger/10 text-danger";
  }
  return "border-warning/30 bg-warning/10 text-surface-ink";
}

function Badge({ children, status }: { children: React.ReactNode; status: string }) {
  return <span className={`inline-flex rounded-[6px] border px-2 py-1 text-[11px] font-bold uppercase ${statusClass(status)}`}>{children}</span>;
}

function KpiCard({ title, value, detail, icon: Icon }: { title: string; value: string; detail: string; icon: typeof BadgeDollarSign }) {
  return (
    <article className="rounded-[8px] border border-border bg-surface p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-muted">{title}</p>
          <p className="mt-2 font-display text-3xl font-bold text-surface-ink">{value}</p>
        </div>
        <Icon aria-hidden className="h-5 w-5 text-brand" />
      </div>
      <p className="mt-3 text-sm leading-5 text-muted">{detail}</p>
    </article>
  );
}

function Message({ saved, error }: { saved?: string; error?: string }) {
  if (!saved && !error) {
    return null;
  }
  return (
    <div className={`rounded-[8px] border p-3 text-sm font-semibold ${error ? "border-danger/30 bg-danger/10 text-danger" : "border-success/30 bg-success/10 text-success"}`}>
      {error ?? saved}
    </div>
  );
}

function stripePrefix() {
  return process.env.STRIPE_SECRET_KEY?.startsWith("sk_test") ? "https://dashboard.stripe.com/test" : "https://dashboard.stripe.com";
}

function StripeLink({ kind, id }: { kind: "customers" | "checkout/sessions" | "subscriptions"; id?: string | null }) {
  if (!id) {
    return null;
  }
  return (
    <a className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline" href={`${stripePrefix()}/${kind}/${id}`} rel="noreferrer" target="_blank">
      Stripe <ExternalLink aria-hidden className="h-3 w-3" />
    </a>
  );
}

function metadataText(value: unknown) {
  if (!value || (typeof value === "object" && Object.keys(value).length === 0)) {
    return "{}";
  }
  return JSON.stringify(value);
}

function actionReturnPath(email: string) {
  return `/admin/accounts/${encodeURIComponent(email)}`;
}

function OrderActions({ data, order }: { data: AdminAccountDetailData; order: AdminAccountDetailData["orders"][number] }) {
  const returnPath = actionReturnPath(data.email);
  const canSendAccessLink = order.status === "paid" && Boolean(order.customer_email);
  const canExpire = order.status === "paid" || order.status === "processing";
  const canRefund = order.status !== "refunded" && order.status !== "expired" && Boolean(order.stripe_payment_intent_id);
  const canCancel = order.status === "paid" && order.entitlement === "subscription" && Boolean(order.stripe_subscription_id);

  return (
    <div className="flex min-w-[190px] flex-col gap-2">
      {order.stripe_customer_id ? (
        <form action={openStripeCustomerPortal}>
          <input name="returnPath" type="hidden" value={returnPath} />
          <input name="stripeCustomerId" type="hidden" value={order.stripe_customer_id} />
          <button className="inline-flex w-full items-center justify-center gap-2 rounded-[8px] border border-border bg-background px-3 py-2 text-xs font-bold text-surface-ink" type="submit">
            <CreditCard aria-hidden className="h-3.5 w-3.5" />
            Portal
          </button>
        </form>
      ) : null}
      {canSendAccessLink ? (
        <form action={sendOrderAccessLink}>
          <input name="returnPath" type="hidden" value={returnPath} />
          <input name="orderId" type="hidden" value={order.id} />
          <input name="email" type="hidden" value={order.customer_email ?? ""} />
          <button className="inline-flex w-full items-center justify-center gap-2 rounded-[8px] border border-border bg-background px-3 py-2 text-xs font-bold text-surface-ink" type="submit">
            <Mail aria-hidden className="h-3.5 w-3.5" />
            Access link
          </button>
        </form>
      ) : null}
      {canExpire ? (
        <form action={expireOrderAccess}>
          <input name="returnPath" type="hidden" value={returnPath} />
          <input name="orderId" type="hidden" value={order.id} />
          <button className="inline-flex w-full items-center justify-center gap-2 rounded-[8px] border border-warning/40 bg-warning/10 px-3 py-2 text-xs font-bold text-surface-ink" type="submit">
            Expire access
          </button>
        </form>
      ) : null}
      {canRefund ? (
        <form action={refundOrder}>
          <input name="returnPath" type="hidden" value={returnPath} />
          <input name="orderId" type="hidden" value={order.id} />
          <button className="inline-flex w-full items-center justify-center gap-2 rounded-[8px] border border-danger/40 bg-danger/10 px-3 py-2 text-xs font-bold text-danger" type="submit">
            Refund
          </button>
        </form>
      ) : null}
      {canCancel ? (
        <form action={cancelSubscription}>
          <input name="returnPath" type="hidden" value={returnPath} />
          <input name="orderId" type="hidden" value={order.id} />
          <button className="inline-flex w-full items-center justify-center gap-2 rounded-[8px] border border-danger/40 bg-danger/10 px-3 py-2 text-xs font-bold text-danger" type="submit">
            Cancel subscription
          </button>
        </form>
      ) : null}
    </div>
  );
}

export function AccountDetail({ data, saved, error }: { data: AdminAccountDetailData; saved?: string; error?: string }) {
  const summary = data.summary;
  const revenueCents = summary?.revenueCents ?? 0;
  const activeSubscription = summary?.activeSubscription ?? false;
  const returnPath = actionReturnPath(data.email);
  const currentStatus = data.management?.status ?? summary?.managementStatus ?? (revenueCents > 0 ? "customer" : "lead");

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link className="inline-flex items-center gap-2 text-sm font-semibold text-brand hover:underline" href="/admin">
              <ArrowLeft aria-hidden className="h-4 w-4" />
              Management center
            </Link>
            <div className="mt-3 flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-[8px] bg-surface-ink text-white">
                <Users aria-hidden className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase text-brand">Account workspace</p>
                <h1 className="break-all font-display text-2xl font-bold text-surface-ink">{data.email}</h1>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge status={currentStatus}>{label(currentStatus)}</Badge>
            <Badge status={activeSubscription ? "active" : "expired"}>{activeSubscription ? "active subscription" : "no active subscription"}</Badge>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-5 px-4 py-6">
        <Message error={error} saved={saved} />
        {data.sourceErrors.length ? (
          <div className="rounded-[8px] border border-danger/30 bg-danger/10 p-4 text-sm font-semibold text-danger">
            {data.sourceErrors.map((sourceError) => (
              <p key={sourceError}>{sourceError}</p>
            ))}
          </div>
        ) : null}

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard detail={`${number(summary?.orderCount ?? 0)} orders attached to this account`} icon={BadgeDollarSign} title="Revenue" value={money(revenueCents)} />
          <KpiCard detail={`${summary?.unusedCredits ?? 0} unused · ${summary?.consumedExports ?? 0} consumed export credits`} icon={CreditCard} title="Credits" value={number(summary?.unusedCredits ?? 0)} />
          <KpiCard detail={`${number(data.projects.length)} projects · ${number(data.exports.length)} database exports`} icon={ReceiptText} title="Usage" value={number(data.assets.length)} />
          <KpiCard detail={`Last activity ${date(summary?.lastActivityAt)}`} icon={CalendarClock} title="Audit events" value={number(data.auditEvents.length)} />
        </div>

        <section className="grid gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <form action={updateAccountManagement} className="rounded-[8px] border border-border bg-surface p-4">
            <div className="flex items-center gap-2">
              <NotebookPen aria-hidden className="h-5 w-5 text-brand" />
              <h2 className="font-display text-xl font-bold text-surface-ink">Management notes</h2>
            </div>
            <input name="email" type="hidden" value={data.email} />
            <input name="returnPath" type="hidden" value={returnPath} />
            <label className="mt-5 block text-xs font-semibold uppercase text-muted" htmlFor="status">
              Status
            </label>
            <select className="mt-2 w-full rounded-[8px] border border-border bg-background px-3 py-3 text-sm font-semibold text-surface-ink" defaultValue={currentStatus} id="status" name="status">
              {["lead", "customer", "vip", "churn_risk", "blocked"].map((status) => (
                <option key={status} value={status}>
                  {label(status)}
                </option>
              ))}
            </select>
            <label className="mt-4 block text-xs font-semibold uppercase text-muted" htmlFor="lastContactAt">
              Last contact
            </label>
            <input
              className="mt-2 w-full rounded-[8px] border border-border bg-background px-3 py-3 text-sm font-semibold text-surface-ink"
              defaultValue={datetimeLocal(data.management?.last_contact_at ?? summary?.lastContactAt)}
              id="lastContactAt"
              name="lastContactAt"
              type="datetime-local"
            />
            <label className="mt-4 block text-xs font-semibold uppercase text-muted" htmlFor="notes">
              Notes
            </label>
            <textarea
              className="mt-2 min-h-40 w-full resize-y rounded-[8px] border border-border bg-background px-3 py-3 text-sm leading-6 text-surface-ink"
              defaultValue={data.management?.notes ?? summary?.managementNotes ?? ""}
              id="notes"
              name="notes"
              placeholder="Account context, support state, refund notes, sales follow-up, or risk notes."
            />
            <button className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-[8px] bg-surface-ink px-4 py-3 text-sm font-bold text-white" type="submit">
              <ShieldCheck aria-hidden className="h-4 w-4" />
              Save account
            </button>
          </form>

          <div className="rounded-[8px] border border-border bg-surface p-4">
            <h2 className="font-display text-xl font-bold text-surface-ink">Account records</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[8px] border border-border bg-background p-3">
                <p className="text-xs font-semibold uppercase text-muted">Customer IDs</p>
                <p className="mt-2 font-mono text-xs text-surface-ink">{summary?.stripeCustomerId ?? "No Stripe customer"}</p>
              </div>
              <div className="rounded-[8px] border border-border bg-background p-3">
                <p className="text-xs font-semibold uppercase text-muted">Source</p>
                <p className="mt-2 text-sm font-semibold text-surface-ink">{summary?.accountSource ?? "untracked"}</p>
              </div>
              <div className="rounded-[8px] border border-border bg-background p-3">
                <p className="text-xs font-semibold uppercase text-muted">Signups</p>
                <p className="mt-2 text-sm font-semibold text-surface-ink">{number(data.signups.length)}</p>
              </div>
              <div className="rounded-[8px] border border-border bg-background p-3">
                <p className="text-xs font-semibold uppercase text-muted">User rows</p>
                <p className="mt-2 text-sm font-semibold text-surface-ink">{number(data.users.length)}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="font-display text-2xl font-bold text-surface-ink">Orders and subscription access</h2>
            <p className="text-sm text-muted">{number(data.orders.length)} checkout records</p>
          </div>
          <div className="max-w-full overflow-x-auto rounded-[8px] border border-border bg-surface">
            <table className="w-full min-w-[1120px] border-collapse text-sm">
              <thead className="bg-surface-strong text-left text-xs uppercase text-muted">
                <tr>
                  <th className="px-3 py-3">Order</th>
                  <th className="px-3 py-3">Amount</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Proof job</th>
                  <th className="px-3 py-3">Created</th>
                  <th className="px-3 py-3">Stripe</th>
                  <th className="px-3 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.orders.map((order) => {
                  const currency = order.currency ?? "USD";
                  return (
                    <tr className="border-t border-border align-top" key={order.id}>
                      <td className="px-3 py-3">
                        <div className="font-semibold text-surface-ink">{label(order.entitlement)}</div>
                        <div className="font-mono text-xs text-muted">{order.stripe_session_id}</div>
                      </td>
                      <td className="px-3 py-3 font-semibold">{money(getOrderRevenueCents(order, data.economics), currency)}</td>
                      <td className="px-3 py-3"><Badge status={order.status}>{order.status}</Badge></td>
                      <td className="px-3 py-3 font-mono text-xs">{order.proof_job_id ?? "n/a"}</td>
                      <td className="px-3 py-3">{date(order.created_at)}</td>
                      <td className="px-3 py-3">
                        <div className="flex flex-col gap-1">
                          <StripeLink id={order.stripe_session_id} kind="checkout/sessions" />
                          <StripeLink id={order.stripe_customer_id} kind="customers" />
                          <StripeLink id={order.stripe_subscription_id} kind="subscriptions" />
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <OrderActions data={data} order={order} />
                      </td>
                    </tr>
                  );
                })}
                {!data.orders.length ? (
                  <tr>
                    <td className="px-3 py-6 text-muted" colSpan={7}>No orders are attached to this account.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="font-display text-2xl font-bold text-surface-ink">Audit trail</h2>
            <p className="text-sm text-muted">Recent admin actions for this account and its orders</p>
          </div>
          <div className="max-w-full overflow-x-auto rounded-[8px] border border-border bg-surface">
            <table className="w-full min-w-[860px] border-collapse text-sm">
              <thead className="bg-surface-strong text-left text-xs uppercase text-muted">
                <tr>
                  <th className="px-3 py-3">When</th>
                  <th className="px-3 py-3">Action</th>
                  <th className="px-3 py-3">Target</th>
                  <th className="px-3 py-3">Metadata</th>
                </tr>
              </thead>
              <tbody>
                {data.auditEvents.map((event) => (
                  <tr className="border-t border-border align-top" key={event.id}>
                    <td className="px-3 py-3">{date(event.created_at)}</td>
                    <td className="px-3 py-3 font-semibold text-surface-ink">{event.action}</td>
                    <td className="px-3 py-3">
                      <div>{event.target_type}</div>
                      <div className="font-mono text-xs text-muted">{event.target_id}</div>
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-muted">{metadataText(event.metadata)}</td>
                  </tr>
                ))}
                {!data.auditEvents.length ? (
                  <tr>
                    <td className="px-3 py-6 text-muted" colSpan={4}>No admin audit events yet.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  );
}
