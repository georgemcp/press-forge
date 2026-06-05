"use client";

import Image from "next/image";
import { useEffect, useState, useTransition } from "react";
import {
  BadgeCheck,
  Box,
  Download,
  FileCheck2,
  Layers3,
  Loader2,
  LockKeyhole,
  Mail,
  Play,
  Ruler,
  Settings,
  ShieldCheck,
  Sparkles,
  WalletCards,
  TriangleAlert
} from "lucide-react";
import { PRODUCT_PROFILES, type ProductType } from "@/lib/print/constants";
import type { LayoutSpec } from "@/lib/print/layout-spec";
import type { PreflightReport, PreflightStatus } from "@/lib/print/preflight";
import { trackEvent } from "@/lib/analytics/events";

interface TrimProofWorkspaceProps {
  checkoutSessionId?: string;
  checkoutState?: string;
  initialSpec: LayoutSpec;
  initialMode?: WorkspaceMode;
}

interface ProofApiResponse {
  mode: WorkspaceMode;
  report: PreflightReport;
  productionDownloadLocked?: boolean;
  downloadUrl?: string;
  sourceUrl?: string;
  svgUrl?: string;
  reportUrl?: string;
  assetUrls?: Array<{
    slotId: string;
    provider: "openai" | "gemini" | "recraft" | "deterministic";
    url: string;
    previewUrl?: string;
    effectiveDpi: number;
  }>;
}

type ProofAssetUrl = NonNullable<ProofApiResponse["assetUrls"]>[number];

interface LayoutSpecApiResponse {
  spec: LayoutSpec;
  error?: string;
}

type CheckoutMode = "payment" | "subscription";
type WorkspaceMode = "dummy" | "advanced";

interface PaidSession {
  id: string;
  entitlement: "export_credit" | "subscription";
}

const statusTone: Record<PreflightStatus, string> = {
  passed: "bg-success text-white",
  failed: "bg-danger text-white",
  needs_attention: "bg-warning text-surface-ink"
};

function StatusPill({ status }: { status: PreflightStatus }) {
  const label = status === "needs_attention" ? "Needs attention" : status;
  return (
    <span className={`inline-flex items-center rounded-[6px] px-2.5 py-1 text-xs font-semibold capitalize ${statusTone[status]}`}>
      {label}
    </span>
  );
}

function GuideLabel({ children, tone }: { children: React.ReactNode; tone: "bleed" | "trim" | "safe" }) {
  const colors = {
    bleed: "border-accent text-accent",
    trim: "border-surface-ink text-surface-ink",
    safe: "border-success text-success"
  };
  return <span className={`rounded-[4px] border px-2 py-1 text-[11px] font-semibold uppercase tracking-normal ${colors[tone]}`}>{children}</span>;
}

function PrintPreview({ spec, assetUrl, assetProvider }: { spec: LayoutSpec; assetUrl?: string; assetProvider?: ProofAssetUrl["provider"] }) {
  const productProfile = PRODUCT_PROFILES[spec.productType];
  const aspect = productProfile.trimWidthIn / productProfile.trimHeightIn;
  const brand = spec.textBlocks.find((block) => block.id === "brand")?.content ?? "TRIM PROOF";
  const tagline = spec.textBlocks.find((block) => block.id === "tagline")?.content ?? "AI creative, deterministic prepress.";
  const name = spec.textBlocks.find((block) => block.id === "name")?.content ?? "Mara Vale";
  const contact = spec.textBlocks.find((block) => block.id === "contact")?.content ?? "trimproof.com";

  return (
    <section className="flex min-h-0 flex-1 flex-col border-y border-border bg-surface xl:border-x xl:border-y-0">
      <div className="flex min-h-12 shrink-0 flex-col gap-2 border-b border-border px-4 py-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Ruler aria-hidden className="h-4 w-4 text-accent" />
          <div>
            <h2 className="font-display text-sm font-semibold text-surface-ink">{productProfile.label} proof</h2>
            <p className="text-xs text-muted">
              {productProfile.trimWidthIn} in x {productProfile.trimHeightIn} in trim, {productProfile.bleedIn} in bleed, PDF/X-1a target
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {assetProvider ? <span className="rounded-[4px] border border-brand/40 bg-brand-soft px-2 py-1 text-[11px] font-semibold uppercase text-brand">{assetProvider}</span> : null}
          <GuideLabel tone="bleed">Bleed</GuideLabel>
          <GuideLabel tone="trim">Trim</GuideLabel>
          <GuideLabel tone="safe">Safe</GuideLabel>
        </div>
      </div>

      <div className="print-grid flex min-h-0 flex-1 items-center justify-center p-3">
        <div
          className="relative max-h-full max-w-[860px] border border-accent/80 bg-background p-[4.8%] shadow-[0_18px_56px_oklch(0.18_0.02_252_/_0.15)]"
          data-proof-card
          style={{
            aspectRatio: `${productProfile.trimWidthIn} / ${productProfile.trimHeightIn}`,
            width: `min(96%, ${Math.round(700 * aspect)}px)`
          }}
        >
          <div className="absolute inset-[4.8%] border border-dashed border-accent" />
          <div className="absolute inset-[9.6%] border border-surface-ink" />
          <div className="absolute inset-[15.2%] border border-dashed border-success" />
          <div
            className="relative h-full overflow-hidden border border-transparent bg-[oklch(0.98_0.008_84)] p-5 sm:p-8"
            data-proof-asset={assetUrl ? "ready" : "pending"}
          >
            {assetUrl ? (
              <Image
                alt=""
                className="absolute inset-0 object-cover opacity-100 saturate-[1.08] contrast-[1.04]"
                fill
                sizes="(min-width: 1280px) 52vw, 94vw"
                src={assetUrl}
                unoptimized
              />
            ) : null}
            <div className="absolute inset-0 bg-[linear-gradient(90deg,oklch(0.98_0.008_84_/_0.86)_0%,oklch(0.98_0.008_84_/_0.68)_24%,oklch(0.98_0.008_84_/_0.22)_48%,transparent_72%)]" />
            <div className="absolute bottom-5 right-5 top-5 z-10 w-2 bg-accent sm:bottom-7 sm:right-8 sm:top-7 sm:w-3" />
            <div className="relative z-10 flex h-full flex-col justify-between">
              <div>
                <div className="relative font-display text-2xl font-bold tracking-normal text-surface-ink sm:text-3xl">{brand}</div>
                <div className="relative mt-2 max-w-[360px] text-sm font-semibold text-muted">{tagline}</div>
              </div>
              <div>
                <div className="relative font-display text-lg font-bold text-surface-ink sm:text-xl">{name}</div>
                <div className="relative mt-1 text-xs font-medium text-muted sm:text-sm">{contact}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function IntakePanel({
  spec,
  brief,
  setBrief,
  mode,
  setMode,
  productType,
  setProductType
}: {
  spec: LayoutSpec;
  brief: string;
  setBrief: (value: string) => void;
  mode: WorkspaceMode;
  setMode: (mode: WorkspaceMode) => void;
  productType: ProductType;
  setProductType: (productType: ProductType) => void;
}) {
  const productProfile = PRODUCT_PROFILES[productType];

  return (
    <aside className="flex w-full shrink-0 flex-col overflow-hidden bg-surface-strong/75 xl:w-[310px]">
      <div className="shrink-0 border-b border-border p-4">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles aria-hidden className="h-4 w-4 text-accent" />
          <h2 className="font-display text-sm font-semibold text-surface-ink">Brief intake</h2>
        </div>
        <textarea
          value={brief}
          onChange={(event) => setBrief(event.target.value)}
          className="h-[clamp(5.5rem,16vh,8.25rem)] w-full resize-none rounded-[8px] border border-border bg-surface p-3 text-sm leading-6 text-surface-ink shadow-sm"
          aria-label="Design brief"
        />
      </div>

      <div className="min-h-0 space-y-4 overflow-auto p-4">
        <div>
          <label className="text-xs font-semibold uppercase text-muted">Proof mode</label>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {[
              ["dummy", "Dummy proof"],
              ["advanced", "Advanced"]
            ].map(([value, label]) => (
              <button
                key={value}
                className={`rounded-[8px] border px-3 py-2 text-left text-xs font-semibold ${
                  mode === value ? "border-accent bg-accent/10 text-accent" : "border-border bg-surface text-muted"
                }`}
                type="button"
                onClick={() => {
                  const nextMode = value as WorkspaceMode;
                  setMode(nextMode);
                  trackEvent(nextMode === "advanced" ? "advanced_mode_selected" : "dummy_proof_started", { source: "workspace_mode_toggle" });
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold uppercase text-muted">Product</label>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(Object.keys(PRODUCT_PROFILES) as ProductType[]).map((product) => (
              <button
                key={product}
                className={`rounded-[8px] border px-3 py-2 text-left text-xs font-semibold ${
                  productType === product ? "border-brand bg-brand-soft text-brand" : "border-border bg-surface text-muted"
                }`}
                type="button"
                onClick={() => setProductType(product)}
              >
                {PRODUCT_PROFILES[product].label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-[8px] border border-border bg-surface p-3">
            <div className="text-[11px] font-semibold uppercase text-muted">Bleed</div>
            <div className="mt-1 font-display text-xl font-bold text-surface-ink">{productProfile.bleedIn} in</div>
          </div>
          <div className="rounded-[8px] border border-border bg-surface p-3">
            <div className="text-[11px] font-semibold uppercase text-muted">Min DPI</div>
            <div className="mt-1 font-display text-xl font-bold text-surface-ink">300</div>
          </div>
        </div>

        <div className="rounded-[8px] border border-border bg-surface p-3">
          <div className="mb-2 flex items-center gap-2">
            <Layers3 aria-hidden className="h-4 w-4 text-brand" />
            <h3 className="font-display text-sm font-semibold">LayoutSpec</h3>
          </div>
          <div className="space-y-2 text-xs text-muted">
            <div className="flex justify-between">
              <span>Text blocks</span>
              <span className="font-semibold text-surface-ink">{spec.textBlocks.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Asset slots</span>
              <span className="font-semibold text-surface-ink">{spec.assetSlots.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Print profile</span>
              <span className="font-semibold text-surface-ink">{spec.printProfile}</span>
            </div>
            <div className="flex justify-between">
              <span>Trim size</span>
              <span className="font-semibold text-surface-ink">
                {productProfile.trimWidthIn} x {productProfile.trimHeightIn} in
              </span>
            </div>
          </div>
        </div>

        {mode === "advanced" ? (
          <div className="rounded-[8px] border border-brand/30 bg-brand-soft/60 p-4">
            <h3 className="font-display text-sm font-semibold text-brand">Advanced export settings</h3>
            <div className="mt-3 space-y-2 text-xs text-surface-ink">
              <div className="flex justify-between">
                <span>PDF/X level</span>
                <span className="font-semibold">{spec.pdfxLevel}</span>
              </div>
              <div className="flex justify-between">
                <span>Output intent</span>
                <span className="font-semibold">{spec.printProfile}</span>
              </div>
              <div className="flex justify-between">
                <span>Billing model</span>
                <span className="font-semibold">Credit or subscription</span>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  );
}

function PreflightPanel({
  mode,
  paidSession,
  report,
  isPending,
  checkoutPending,
  accessPending,
  portalPending,
  billingEmail,
  accessMessage,
  setBillingEmail,
  onGenerate,
  onCheckout,
  onManageSubscription,
  onSendAccessLink,
  downloadUrl,
  productionDownloadLocked
}: {
  mode: WorkspaceMode;
  paidSession?: PaidSession;
  report?: PreflightReport;
  isPending: boolean;
  checkoutPending?: CheckoutMode;
  accessPending?: boolean;
  portalPending?: boolean;
  billingEmail: string;
  accessMessage?: string;
  setBillingEmail: (email: string) => void;
  onGenerate: () => void;
  onCheckout: (mode: CheckoutMode) => void;
  onManageSubscription: () => void;
  onSendAccessLink: () => void;
  downloadUrl?: string;
  productionDownloadLocked?: boolean;
}) {
  const advancedLocked = mode === "advanced" && !paidSession;
  const checks = report?.checks ?? [
    { id: "layout", label: "LayoutSpec schema", status: "passed" as const, evidence: "Ready" },
    { id: "pdfx", label: "PDF/X proof", status: "needs_attention" as const, evidence: "Run export to verify." },
    { id: "fonts", label: "Vector text", status: "needs_attention" as const, evidence: "Run export to verify." }
  ];

  return (
    <aside className="flex w-full shrink-0 flex-col overflow-hidden bg-surface-strong/75 xl:w-[330px]">
      <div className="shrink-0 border-b border-border p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCheck2 aria-hidden className="h-4 w-4 text-success" />
            <h2 className="font-display text-sm font-semibold text-surface-ink">Preflight gate</h2>
          </div>
          {report ? <StatusPill status={report.status} /> : <StatusPill status="needs_attention" />}
        </div>
        <button
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-[8px] bg-surface-ink px-4 text-sm font-semibold text-white transition hover:opacity-[0.92] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isPending}
          type="button"
          onClick={onGenerate}
        >
          {isPending ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <Play aria-hidden className="h-4 w-4" />}
          {advancedLocked ? "Unlock export first" : report ? "Regenerate proof" : "Generate press proof"}
        </button>
        {downloadUrl ? (
          <a
            className="mt-2 inline-flex h-10 w-full items-center justify-center gap-2 rounded-[8px] border border-border bg-surface px-4 text-sm font-semibold text-surface-ink"
            href={downloadUrl}
          >
            <Download aria-hidden className="h-4 w-4" />
            Download PDF/X proof
          </a>
        ) : null}
        {productionDownloadLocked ? (
          <div className="mt-2 rounded-[8px] border border-brand/30 bg-brand-soft px-3 py-2 text-xs font-semibold leading-5 text-brand">
            Sample preflight complete. Buy an export credit or start Pro to unlock the production PDF/X download.
          </div>
        ) : null}
      </div>

      <div className="shrink-0 border-b border-border p-4">
        <div className="mb-2 flex items-center gap-2">
          <WalletCards aria-hidden className="h-4 w-4 text-brand" />
          <h3 className="font-display text-sm font-semibold text-surface-ink">Billing</h3>
        </div>
        <label className="text-xs font-semibold uppercase text-muted" htmlFor="billing-email">
          Billing email
        </label>
        <input
          id="billing-email"
          className="mt-2 h-10 w-full rounded-[8px] border border-border bg-surface px-3 text-sm text-surface-ink"
          inputMode="email"
          placeholder="you@company.com"
          type="email"
          value={billingEmail}
          onChange={(event) => setBillingEmail(event.target.value)}
        />
        <div className="grid grid-cols-2 gap-2">
          <button
            className="mt-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-[8px] border border-border bg-surface px-3 text-xs font-semibold text-surface-ink disabled:cursor-not-allowed disabled:opacity-60"
            disabled={Boolean(checkoutPending)}
            type="button"
            aria-label="Buy one export credit for nine dollars"
            onClick={() => onCheckout("payment")}
          >
            {checkoutPending === "payment" ? <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" /> : <LockKeyhole aria-hidden className="h-3.5 w-3.5" />}
            <span className="flex flex-col text-left leading-tight">
              <span>Buy export</span>
              <span className="text-[11px] text-muted">$9 one-time</span>
            </span>
          </button>
          <button
            className="mt-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-[8px] border border-border bg-surface px-3 text-xs font-semibold text-surface-ink disabled:cursor-not-allowed disabled:opacity-60"
            disabled={Boolean(checkoutPending)}
            type="button"
            aria-label="Start Trim Proof Pro subscription for twenty nine dollars per month"
            onClick={() => onCheckout("subscription")}
          >
            {checkoutPending === "subscription" ? <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck aria-hidden className="h-3.5 w-3.5" />}
            <span className="flex flex-col text-left leading-tight">
              <span>Start Pro</span>
              <span className="text-[11px] text-muted">$29/month</span>
            </span>
          </button>
        </div>
        <button
          className="mt-2 inline-flex h-9 w-full items-center justify-center gap-2 rounded-[8px] border border-border bg-surface px-3 text-xs font-semibold text-surface-ink disabled:cursor-not-allowed disabled:opacity-60"
          disabled={Boolean(accessPending)}
          type="button"
          onClick={onSendAccessLink}
        >
          {accessPending ? <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" /> : <Mail aria-hidden className="h-3.5 w-3.5" />}
          Email my access link
        </button>
        {paidSession?.entitlement === "subscription" ? (
          <button
            className="mt-2 inline-flex h-9 w-full items-center justify-center gap-2 rounded-[8px] border border-brand/30 bg-brand-soft px-3 text-xs font-semibold text-brand disabled:cursor-not-allowed disabled:opacity-60"
            disabled={Boolean(portalPending)}
            type="button"
            onClick={onManageSubscription}
          >
            {portalPending ? <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" /> : <Settings aria-hidden className="h-3.5 w-3.5" />}
            Manage subscription
          </button>
        ) : null}
        <p className="mt-2 text-xs leading-5 text-muted">
          {paidSession
            ? paidSession.entitlement === "subscription"
              ? "Subscription verified. Advanced exports are unlocked for this session."
              : "Paid export credit verified. This credit is consumed when the PDF/X proof is generated."
            : "Use the same billing email at checkout so Trim Proof can send access links for unused credits or subscriptions."}
        </p>
        {accessMessage ? <p className="mt-2 text-xs font-semibold text-brand">{accessMessage}</p> : null}
      </div>

      <div className="min-h-0 overflow-hidden p-4">
        <div className="grid gap-1.5">
        {checks.map((check) => {
          const Icon = check.status === "passed" ? BadgeCheck : check.status === "failed" ? TriangleAlert : ShieldCheck;
          return (
            <div key={check.id} className="rounded-[8px] border border-border bg-surface px-2 py-1.5">
              <div className="flex items-center gap-2">
                <Icon
                  aria-hidden
                  className={`h-3.5 w-3.5 shrink-0 ${check.status === "passed" ? "text-success" : check.status === "failed" ? "text-danger" : "text-warning"}`}
                />
                <div className="min-w-0">
                  <div className="truncate text-xs font-semibold text-surface-ink" title={check.label}>
                    {check.label}
                  </div>
                  <p className="hidden truncate text-[10px] leading-3 text-muted 2xl:block" title={check.evidence}>
                    {check.evidence}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
        </div>
      </div>
    </aside>
  );
}

export function TrimProofWorkspace({ checkoutSessionId, checkoutState, initialMode = "dummy", initialSpec }: TrimProofWorkspaceProps) {
  const [mode, setMode] = useState<WorkspaceMode>(initialMode);
  const [brief, setBrief] = useState("Create a premium business card for a prepress automation studio. Keep all text vector and export PDF/X-1a.");
  const [proof, setProof] = useState<ProofApiResponse>();
  const [error, setError] = useState<string>();
  const [checkoutPending, setCheckoutPending] = useState<CheckoutMode>();
  const [accessPending, setAccessPending] = useState(false);
  const [portalPending, setPortalPending] = useState(false);
  const [billingEmail, setBillingEmail] = useState("");
  const [accessMessage, setAccessMessage] = useState<string>();
  const [paidSession, setPaidSession] = useState<PaidSession>();
  const [sessionPending, setSessionPending] = useState(Boolean(checkoutSessionId));
  const [spec, setSpec] = useState(initialSpec);
  const [productType, setProductTypeState] = useState<ProductType>(initialSpec.productType);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!checkoutSessionId) {
      if (checkoutState === "cancelled") {
        setError("Checkout was cancelled. Advanced export is still locked.");
      }
      return;
    }
    let cancelled = false;
    setSessionPending(true);
    void (async () => {
      const response = await fetch(`/api/billing/session?session_id=${encodeURIComponent(checkoutSessionId)}`);
      const payload = (await response.json().catch(() => undefined)) as { session?: PaidSession; error?: string } | undefined;
      if (cancelled) {
        return;
      }
      if (!response.ok || !payload?.session) {
        setError(payload?.error ?? "Checkout could not be verified.");
      } else {
        setPaidSession(payload.session);
        setMode("advanced");
        trackEvent("checkout_verified", { entitlement: payload.session.entitlement });
      }
      setSessionPending(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [checkoutSessionId, checkoutState]);

  function setProductType(product: ProductType) {
    setProductTypeState(product);
    setProof(undefined);
    setError(undefined);
    void (async () => {
      try {
        const specResponse = await fetch("/api/layout-spec", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ brief, productType: product })
        });
        const specPayload = (await specResponse.json().catch(() => undefined)) as LayoutSpecApiResponse | undefined;
        if (specResponse.ok && specPayload?.spec) {
          setSpec(specPayload.spec);
        } else {
          setError(specPayload?.error ?? "Product layout refresh failed.");
        }
      } catch {
        setError("Product layout refresh failed.");
      }
    })();
  }

  function generateProof() {
    setError(undefined);
    if (mode === "advanced" && !paidSession) {
      setError("Advanced export requires a Stripe export credit or subscription first.");
      return;
    }
    startTransition(() => {
      void (async () => {
        try {
          const specResponse = await fetch("/api/layout-spec", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ brief, productType })
          });
          const specPayload = (await specResponse.json().catch(() => undefined)) as LayoutSpecApiResponse | undefined;
          if (!specResponse.ok || !specPayload?.spec) {
            setError(specPayload?.error ?? "LayoutSpec generation failed.");
            return;
          }
          setSpec(specPayload.spec);
          setProductTypeState(specPayload.spec.productType);
          trackEvent(mode === "dummy" ? "dummy_proof_started" : "proof_export_started", { mode });
          const response = await fetch("/api/exports/proof", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ brief, spec: specPayload.spec, mode, checkoutSessionId: paidSession?.id })
          });
          if (!response.ok) {
            const payload = (await response.json().catch(() => undefined)) as { error?: string } | undefined;
            setError(payload?.error ?? "Proof generation failed.");
            return;
          }
          const payload = (await response.json()) as ProofApiResponse;
          setProof(payload);
          if (mode === "advanced" && paidSession?.entitlement === "export_credit") {
            setPaidSession(undefined);
          }
          trackEvent("proof_export_completed", { mode, status: payload.report.status });
        } catch {
          setError("Proof generation failed.");
        }
      })();
    });
  }

  async function startCheckout(mode: CheckoutMode) {
    setError(undefined);
    setAccessMessage(undefined);
    const email = billingEmail.trim().toLowerCase();
    if (!email.includes("@")) {
      setError("Enter a billing email first so Trim Proof can attach the checkout to your access link.");
      return;
    }
    setCheckoutPending(mode);
    trackEvent("checkout_started", { mode });
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ mode, email })
      });
      const payload = (await response.json().catch(() => undefined)) as { url?: string; error?: string } | undefined;
      if (!response.ok || !payload?.url) {
        setError(payload?.error ?? "Stripe checkout could not start.");
        return;
      }
      window.location.href = payload.url;
    } finally {
      setCheckoutPending(undefined);
    }
  }

  async function sendAccessLink() {
    setError(undefined);
    setAccessMessage(undefined);
    const email = billingEmail.trim().toLowerCase();
    if (!email.includes("@")) {
      setError("Enter the billing email used for checkout first.");
      return;
    }
    setAccessPending(true);
    try {
      const response = await fetch("/api/billing/access-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email })
      });
      const payload = (await response.json().catch(() => undefined)) as { matched?: boolean; error?: string; email?: { status?: string } } | undefined;
      if (!response.ok) {
        setError(payload?.error ?? "Access link request failed.");
        return;
      }
      if (payload?.matched && payload.email?.status === "sent") {
        setAccessMessage("Access link sent. Check your inbox.");
      } else if (payload?.matched) {
        setAccessMessage("Access was found, but email delivery is not configured.");
      } else {
        setAccessMessage("No unused credit or active subscription was found for that email.");
      }
    } finally {
      setAccessPending(false);
    }
  }

  async function manageSubscription() {
    setError(undefined);
    setAccessMessage(undefined);
    if (!paidSession || paidSession.entitlement !== "subscription") {
      setError("Verify a Trim Proof Pro checkout session before opening subscription management.");
      return;
    }
    setPortalPending(true);
    trackEvent("subscription_portal_started", { entitlement: paidSession.entitlement });
    try {
      const response = await fetch("/api/billing/portal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ sessionId: paidSession.id })
      });
      const payload = (await response.json().catch(() => undefined)) as { url?: string; error?: string } | undefined;
      if (!response.ok || !payload?.url) {
        setError(payload?.error ?? "Subscription management could not start.");
        return;
      }
      window.location.href = payload.url;
    } finally {
      setPortalPending(false);
    }
  }

  return (
    <main className="min-h-screen overflow-auto p-2 text-foreground xl:h-screen xl:overflow-hidden">
      <div className="mx-auto flex min-h-[calc(100vh-1rem)] max-w-[1500px] flex-col overflow-hidden rounded-[8px] border border-border bg-surface shadow-[0_20px_70px_oklch(0.18_0.02_252_/_0.12)] xl:h-full">
        <header className="flex min-h-14 shrink-0 flex-col gap-2 border-b border-border bg-surface px-4 py-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-[8px] bg-surface-ink text-white">
              <Box aria-hidden className="h-4 w-4" />
            </div>
            <div>
              <h1 className="font-display text-lg font-bold text-surface-ink">Trim Proof</h1>
              <p className="text-xs font-medium text-muted">Model-made art. Deterministic PDF/X proofing.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-muted sm:gap-3">
            <span className="rounded-[6px] border border-border bg-surface px-2.5 py-1">GPT Image 1.5</span>
            <span className="rounded-[6px] border border-border bg-surface px-2.5 py-1">Nano Banana Pro</span>
            <span className="rounded-[6px] border border-border bg-surface px-2.5 py-1">PDF/X-1a:2001</span>
          </div>
        </header>

        {error ? (
          <div className="shrink-0 border-b border-danger/30 bg-danger/10 px-4 py-2 text-sm font-semibold text-danger">{error}</div>
        ) : null}
        {sessionPending ? (
          <div className="shrink-0 border-b border-brand/20 bg-brand-soft px-4 py-2 text-sm font-semibold text-brand">Verifying checkout session...</div>
        ) : null}

        <div className="flex min-h-0 flex-1 flex-col overflow-visible xl:flex-row xl:overflow-hidden">
          <IntakePanel
            brief={brief}
            mode={mode}
            productType={productType}
            setBrief={setBrief}
            setMode={setMode}
            setProductType={setProductType}
            spec={spec}
          />
          <PrintPreview assetProvider={proof?.assetUrls?.[0]?.provider} assetUrl={proof?.assetUrls?.[0]?.previewUrl ?? proof?.assetUrls?.[0]?.url} spec={spec} />
          <PreflightPanel
            accessMessage={accessMessage}
            accessPending={accessPending}
            billingEmail={billingEmail}
            checkoutPending={checkoutPending}
            downloadUrl={proof?.downloadUrl}
            isPending={isPending}
            mode={mode}
            onCheckout={startCheckout}
            onGenerate={generateProof}
            onManageSubscription={manageSubscription}
            onSendAccessLink={sendAccessLink}
            paidSession={paidSession}
            portalPending={portalPending}
            productionDownloadLocked={proof?.productionDownloadLocked}
            report={proof?.report}
            setBillingEmail={setBillingEmail}
          />
        </div>
      </div>
    </main>
  );
}
