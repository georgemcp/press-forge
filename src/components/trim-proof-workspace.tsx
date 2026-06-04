"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  BadgeCheck,
  Box,
  Download,
  FileCheck2,
  Layers3,
  Loader2,
  LockKeyhole,
  Play,
  Ruler,
  ShieldCheck,
  Sparkles,
  WalletCards,
  TriangleAlert
} from "lucide-react";
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
  report: PreflightReport;
  downloadUrl: string;
  sourceUrl: string;
  svgUrl: string;
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

function PrintPreview({ spec }: { spec: LayoutSpec }) {
  const brand = spec.textBlocks.find((block) => block.id === "brand")?.content ?? "TRIM PROOF";
  const tagline = spec.textBlocks.find((block) => block.id === "tagline")?.content ?? "AI creative, deterministic prepress.";
  const name = spec.textBlocks.find((block) => block.id === "name")?.content ?? "Mara Vale";
  const contact = spec.textBlocks.find((block) => block.id === "contact")?.content ?? "trimproof.com";

  return (
    <section className="flex min-h-[520px] flex-1 flex-col border-y border-border bg-surface xl:min-h-[560px] xl:border-x xl:border-y-0">
      <div className="flex min-h-14 flex-col gap-3 border-b border-border px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Ruler aria-hidden className="h-4 w-4 text-accent" />
          <div>
            <h2 className="font-display text-sm font-semibold text-surface-ink">Business card proof</h2>
            <p className="text-xs text-muted">3.5 in x 2 in trim, 0.125 in bleed, PDF/X-1a target</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <GuideLabel tone="bleed">Bleed</GuideLabel>
          <GuideLabel tone="trim">Trim</GuideLabel>
          <GuideLabel tone="safe">Safe</GuideLabel>
        </div>
      </div>

      <div className="print-grid flex flex-1 items-center justify-center p-4 sm:p-8">
        <div className="relative aspect-[4/2.5] w-full max-w-[760px] border border-accent/80 bg-background p-[4.8%] shadow-[0_22px_70px_oklch(0.18_0.02_252_/_0.18)]">
          <div className="absolute inset-[4.8%] border border-dashed border-accent" />
          <div className="absolute inset-[9.6%] border border-surface-ink" />
          <div className="absolute inset-[15.2%] border border-dashed border-success" />
          <div className="relative h-full border border-transparent bg-[oklch(0.98_0.008_84)] p-6 sm:p-10">
            <div className="absolute bottom-6 right-6 top-6 w-2 bg-accent sm:bottom-8 sm:right-10 sm:top-8 sm:w-3" />
            <div className="flex h-full flex-col justify-between">
              <div>
                <div className="font-display text-2xl font-bold tracking-normal text-surface-ink sm:text-4xl">{brand}</div>
                <div className="mt-3 max-w-[360px] text-sm font-semibold text-muted sm:text-base">{tagline}</div>
              </div>
              <div>
                <div className="font-display text-xl font-bold text-surface-ink sm:text-2xl">{name}</div>
                <div className="mt-2 text-xs font-medium text-muted sm:text-sm">{contact}</div>
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
  setMode
}: {
  spec: LayoutSpec;
  brief: string;
  setBrief: (value: string) => void;
  mode: WorkspaceMode;
  setMode: (mode: WorkspaceMode) => void;
}) {
  return (
    <aside className="flex w-full shrink-0 flex-col bg-surface-strong/75 xl:w-[330px]">
      <div className="border-b border-border p-5">
        <div className="mb-4 flex items-center gap-2">
          <Sparkles aria-hidden className="h-4 w-4 text-accent" />
          <h2 className="font-display text-sm font-semibold text-surface-ink">Brief intake</h2>
        </div>
        <textarea
          value={brief}
          onChange={(event) => setBrief(event.target.value)}
          className="min-h-32 w-full resize-none rounded-[8px] border border-border bg-surface p-3 text-sm leading-6 text-surface-ink shadow-sm"
          aria-label="Design brief"
        />
      </div>

      <div className="space-y-5 p-5">
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
          <p className="mt-2 text-xs leading-5 text-muted">
            Dummy proof runs the sample preflight. Advanced mode exposes paid production export controls.
          </p>
        </div>

        <div>
          <label className="text-xs font-semibold uppercase text-muted">Product</label>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {["Business card", "Postcard", "Flyer", "Letterhead"].map((product, index) => (
              <button
                key={product}
                className={`rounded-[8px] border px-3 py-2 text-left text-xs font-semibold ${
                  index === 0 ? "border-brand bg-brand-soft text-brand" : "border-border bg-surface text-muted"
                }`}
                type="button"
              >
                {product}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-[8px] border border-border bg-surface p-3">
            <div className="text-[11px] font-semibold uppercase text-muted">Bleed</div>
            <div className="mt-1 font-display text-xl font-bold text-surface-ink">0.125 in</div>
          </div>
          <div className="rounded-[8px] border border-border bg-surface p-3">
            <div className="text-[11px] font-semibold uppercase text-muted">Min DPI</div>
            <div className="mt-1 font-display text-xl font-bold text-surface-ink">300</div>
          </div>
        </div>

        <div className="rounded-[8px] border border-border bg-surface p-4">
          <div className="mb-3 flex items-center gap-2">
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
  onGenerate,
  onCheckout,
  downloadUrl
}: {
  mode: WorkspaceMode;
  paidSession?: PaidSession;
  report?: PreflightReport;
  isPending: boolean;
  checkoutPending?: CheckoutMode;
  onGenerate: () => void;
  onCheckout: (mode: CheckoutMode) => void;
  downloadUrl?: string;
}) {
  const advancedLocked = mode === "advanced" && !paidSession;
  const checks = report?.checks ?? [
    { id: "layout", label: "LayoutSpec schema", status: "passed" as const, evidence: "Ready" },
    { id: "pdfx", label: "PDF/X proof", status: "needs_attention" as const, evidence: "Run export to verify." },
    { id: "fonts", label: "Vector text", status: "needs_attention" as const, evidence: "Run export to verify." }
  ];

  return (
    <aside className="flex w-full shrink-0 flex-col bg-surface-strong/75 xl:w-[360px]">
      <div className="border-b border-border p-5">
        <div className="mb-4 flex items-center justify-between">
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
            className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-[8px] border border-border bg-surface px-4 text-sm font-semibold text-surface-ink"
            href={downloadUrl}
          >
            <Download aria-hidden className="h-4 w-4" />
            Download PDF/X proof
          </a>
        ) : null}
      </div>

      <div className="border-b border-border p-5">
        <div className="mb-3 flex items-center gap-2">
          <WalletCards aria-hidden className="h-4 w-4 text-brand" />
          <h3 className="font-display text-sm font-semibold text-surface-ink">Billing</h3>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[8px] border border-border bg-surface px-3 text-xs font-semibold text-surface-ink disabled:cursor-not-allowed disabled:opacity-60"
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
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[8px] border border-border bg-surface px-3 text-xs font-semibold text-surface-ink disabled:cursor-not-allowed disabled:opacity-60"
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
        <p className="mt-3 text-xs leading-5 text-muted">
          {paidSession
            ? paidSession.entitlement === "subscription"
              ? "Subscription verified. Advanced exports are unlocked for this session."
              : "Paid export credit verified. This credit is consumed when the PDF/X proof is generated."
            : "Advanced PDF/X export requires a Stripe export credit or subscription."}
        </p>
      </div>

      <div className="space-y-3 overflow-auto p-5">
        {checks.map((check) => {
          const Icon = check.status === "passed" ? BadgeCheck : check.status === "failed" ? TriangleAlert : ShieldCheck;
          return (
            <div key={check.id} className="rounded-[8px] border border-border bg-surface p-3">
              <div className="flex items-start gap-3">
                <Icon
                  aria-hidden
                  className={`mt-0.5 h-4 w-4 ${check.status === "passed" ? "text-success" : check.status === "failed" ? "text-danger" : "text-warning"}`}
                />
                <div>
                  <div className="text-sm font-semibold text-surface-ink">{check.label}</div>
                  <p className="mt-1 text-xs leading-5 text-muted">{check.evidence}</p>
                </div>
              </div>
            </div>
          );
        })}
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
  const [paidSession, setPaidSession] = useState<PaidSession>();
  const [sessionPending, setSessionPending] = useState(Boolean(checkoutSessionId));
  const [isPending, startTransition] = useTransition();

  const spec = useMemo(() => initialSpec, [initialSpec]);

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

  function generateProof() {
    setError(undefined);
    if (mode === "advanced" && !paidSession) {
      setError("Advanced export requires a Stripe export credit or subscription first.");
      return;
    }
    startTransition(() => {
      void (async () => {
        trackEvent(mode === "dummy" ? "dummy_proof_started" : "proof_export_started", { mode });
        const response = await fetch("/api/exports/proof", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ brief, spec, mode, checkoutSessionId: paidSession?.id })
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
      })();
    });
  }

  async function startCheckout(mode: CheckoutMode) {
    setError(undefined);
    setCheckoutPending(mode);
    trackEvent("checkout_started", { mode });
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ mode })
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

  return (
    <main className="min-h-screen p-2 text-foreground sm:p-4">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-[1500px] flex-col overflow-hidden rounded-[8px] border border-border bg-surface shadow-[0_24px_90px_oklch(0.18_0.02_252_/_0.12)]">
        <header className="flex min-h-16 flex-col gap-3 border-b border-border bg-surface px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-[8px] bg-surface-ink text-white">
              <Box aria-hidden className="h-4 w-4" />
            </div>
            <div>
              <h1 className="font-display text-lg font-bold text-surface-ink">Trim Proof</h1>
              <p className="text-xs font-medium text-muted">Creative AI upstream. Deterministic prepress downstream.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-muted sm:gap-3">
            <span className="rounded-[6px] border border-border bg-surface px-2.5 py-1">PDF/X-1a:2001</span>
            <span className="rounded-[6px] border border-border bg-surface px-2.5 py-1">CMYK</span>
            <span className="rounded-[6px] border border-border bg-surface px-2.5 py-1">Vector text</span>
          </div>
        </header>

        {error ? (
          <div className="border-b border-danger/30 bg-danger/10 px-5 py-3 text-sm font-semibold text-danger">{error}</div>
        ) : null}
        {sessionPending ? (
          <div className="border-b border-brand/20 bg-brand-soft px-5 py-3 text-sm font-semibold text-brand">Verifying checkout session...</div>
        ) : null}

        <div className="flex flex-1 flex-col overflow-auto xl:flex-row xl:overflow-hidden">
          <IntakePanel brief={brief} mode={mode} setBrief={setBrief} setMode={setMode} spec={spec} />
          <PrintPreview spec={spec} />
          <PreflightPanel
            checkoutPending={checkoutPending}
            downloadUrl={proof?.downloadUrl}
            isPending={isPending}
            mode={mode}
            onCheckout={startCheckout}
            onGenerate={generateProof}
            paidSession={paidSession}
            report={proof?.report}
          />
        </div>
      </div>
    </main>
  );
}
