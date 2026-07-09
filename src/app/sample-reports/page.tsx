import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ClipboardCheck, FileCheck2, Printer, ShieldCheck } from "lucide-react";
import { getSiteOrigin } from "@/lib/seo/site-url";
import { sampleReportExamples, sampleReportHandoffExamples, sampleReportProofRules } from "@/lib/seo/sample-reports";

export const metadata: Metadata = {
  title: "Sample Trim Proof Preflight Reports",
  description:
    "Review non-customer sample Trim Proof preflight reports for business cards, menus, and postcards, with supported checks, handoff examples, and honest claim boundaries.",
  alternates: {
    canonical: "/sample-reports"
  },
  openGraph: {
    title: "Sample Trim Proof Preflight Reports",
    description:
      "Non-customer sample reports showing trim, bleed, safe area, vector text, image DPI, color workflow, PDF/X-oriented checks, and bounded proof rules.",
    url: "/sample-reports",
    siteName: "Trim Proof",
    type: "article"
  },
  twitter: {
    card: "summary_large_image",
    title: "Sample Trim Proof Preflight Reports",
    description: "See non-customer sample reports and before/after handoff examples for supported Trim Proof workflows."
  }
};

function statusLabel(status: "passed" | "needs_attention") {
  return status === "passed" ? "Passed" : "Needs attention";
}

function statusClass(status: "passed" | "needs_attention") {
  return status === "passed" ? "border-success/30 bg-success/10 text-success" : "border-warning/40 bg-warning/10 text-surface-ink";
}

function SampleReportsJsonLd() {
  const origin = getSiteOrigin();
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Trim Proof", item: `${origin}/` },
          { "@type": "ListItem", position: 2, name: "Sample Reports", item: `${origin}/sample-reports` }
        ]
      },
      {
        "@type": "CollectionPage",
        "@id": `${origin}/sample-reports#collection`,
        name: "Sample Trim Proof preflight reports",
        description:
          "Non-customer sample reports for supported Trim Proof print workflows, including checks, handoff examples, and claim boundaries.",
        hasPart: sampleReportExamples.map((example) => ({
          "@type": "CreativeWork",
          name: example.title,
          about: example.productType,
          description: example.summary
        }))
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "Are these customer case studies?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "No. These are non-customer sample reports that demonstrate the report structure and supported checks."
            }
          },
          {
            "@type": "Question",
            name: "Do sample reports prove printer acceptance?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "No. Printer specifications still control final acceptance, and sample reports are not acceptance-rate evidence."
            }
          }
        ]
      }
    ]
  };

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />;
}

export default function SampleReportsPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <SampleReportsJsonLd />
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link className="font-display text-lg font-bold text-surface-ink" href="/">
            Trim Proof
          </Link>
          <div className="flex items-center gap-4 text-sm font-semibold">
            <Link className="hidden text-muted transition hover:text-surface-ink sm:inline" href="/prepress-checklist">
              Checklist
            </Link>
            <Link className="text-muted transition hover:text-surface-ink" href="/pricing">
              Pricing
            </Link>
            <Link className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-surface-ink px-4 text-white" href="/signup?intent=demo&next=/app">
              Create account
              <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-16 lg:grid-cols-[0.78fr_1.22fr] lg:items-end">
        <div>
          <FileCheck2 aria-hidden className="h-7 w-7 text-brand" />
          <p className="mt-5 text-sm font-bold uppercase text-brand">Non-customer sample reports</p>
          <h1 className="mt-3 font-display text-5xl font-bold leading-[1.04] text-surface-ink">
            Sample Trim Proof preflight reports for supported print jobs.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted">
            See how a Trim Proof report names the product, source material, printer spec, checks, review items, and
            handoff boundary before a buyer treats a proof as ready.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link className="inline-flex h-12 items-center justify-center gap-2 rounded-[8px] bg-brand px-5 text-sm font-bold text-white" href="/signup?intent=demo&next=/app">
              Create demo account
              <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>
            <Link className="inline-flex h-12 items-center justify-center gap-2 rounded-[8px] border border-border bg-surface px-5 text-sm font-bold text-surface-ink" href="/prepress-checklist">
              Read the checklist
            </Link>
          </div>
        </div>
        <figure>
          <div className="overflow-hidden rounded-[8px] border border-border bg-surface shadow-[0_22px_70px_oklch(0.18_0.02_252_/_0.14)]">
            <Image
              alt="Trim Proof workspace showing sample proof guides and preflight controls."
              className="h-auto w-full"
              height={860}
              priority
              sizes="(min-width: 1024px) 54vw, 100vw"
              src="/images/product/trim-proof-workspace-app.png"
              width={1440}
            />
          </div>
          <figcaption className="mt-3 text-xs font-semibold leading-5 text-muted">
            Sample reports use non-customer content and should not be read as customer case studies.
          </figcaption>
        </figure>
      </section>

      <section className="border-y border-border bg-surface">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 lg:grid-cols-[0.72fr_1.28fr]">
          <div>
            <Printer aria-hidden className="h-6 w-6 text-brand" />
            <h2 className="mt-4 font-display text-4xl font-bold leading-tight text-surface-ink">What a report gives the handoff</h2>
            <p className="mt-4 text-base leading-7 text-muted">
              A sample report is useful before public customer proof exists because it shows the artifact buyers can inspect:
              product profile, check status, evidence, and the limits of the automated review.
            </p>
          </div>
          <div className="grid gap-4">
            {sampleReportExamples.map((example) => (
              <article className="rounded-[8px] border border-border bg-background p-5" key={example.title}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase text-brand">{example.sourceMaterial}</p>
                    <h3 className="mt-2 font-display text-2xl font-bold text-surface-ink">{example.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-muted">{example.summary}</p>
                  </div>
                  <span className={`inline-flex shrink-0 rounded-[6px] border px-2 py-1 text-[11px] font-bold uppercase ${statusClass(example.status)}`}>
                    {statusLabel(example.status)}
                  </span>
                </div>
                <div className="mt-5 grid gap-3 md:grid-cols-[0.38fr_0.62fr]">
                  <div className="rounded-[8px] border border-border bg-surface p-4">
                    <p className="text-xs font-bold uppercase text-muted">Printer spec</p>
                    <p className="mt-2 text-sm font-semibold leading-6 text-surface-ink">{example.printerSpec}</p>
                    <p className="mt-4 text-xs font-semibold leading-5 text-muted">{example.boundary}</p>
                  </div>
                  <div className="overflow-hidden rounded-[8px] border border-border bg-surface">
                    <table className="w-full border-collapse text-sm">
                      <thead className="bg-surface-strong text-left text-xs uppercase text-muted">
                        <tr>
                          <th className="px-3 py-3">Check</th>
                          <th className="px-3 py-3">Status</th>
                          <th className="px-3 py-3">Evidence</th>
                        </tr>
                      </thead>
                      <tbody>
                        {example.checks.map((check) => (
                          <tr className="border-t border-border align-top" key={`${example.title}-${check.label}`}>
                            <td className="px-3 py-3 font-semibold text-surface-ink">{check.label}</td>
                            <td className="px-3 py-3">
                              <span className={`inline-flex rounded-[6px] border px-2 py-1 text-[11px] font-bold uppercase ${statusClass(check.status)}`}>
                                {statusLabel(check.status)}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-muted">{check.evidence}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-14 lg:grid-cols-[0.72fr_1.28fr]">
        <div>
          <ClipboardCheck aria-hidden className="h-6 w-6 text-success" />
          <h2 className="mt-4 font-display text-4xl font-bold leading-tight text-surface-ink">Before and after handoff examples</h2>
          <p className="mt-4 text-base leading-7 text-muted">
            These examples show the workflow shape. They do not claim a customer outcome, printer acceptance rate, or
            measured time saved.
          </p>
        </div>
        <div className="divide-y divide-border border-y border-border">
          {sampleReportHandoffExamples.map((example) => (
            <article className="grid gap-3 py-5 md:grid-cols-2" key={example.before}>
              <div>
                <p className="text-xs font-bold uppercase text-muted">Before</p>
                <p className="mt-2 text-sm font-semibold leading-6 text-surface-ink">{example.before}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-brand">After</p>
                <p className="mt-2 text-sm font-semibold leading-6 text-surface-ink">{example.after}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-surface">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 lg:grid-cols-[0.72fr_1.28fr]">
          <div>
            <ShieldCheck aria-hidden className="h-6 w-6 text-success" />
            <h2 className="mt-4 font-display text-4xl font-bold leading-tight text-surface-ink">Proof rules before public claims</h2>
            <p className="mt-4 text-base leading-7 text-muted">
              Pilot learnings will be added only after approved evidence records exist. Until then, this page stays on
              product artifacts and non-customer sample reports.
            </p>
          </div>
          <ul className="grid gap-3">
            {sampleReportProofRules.map((rule) => (
              <li className="flex gap-3 rounded-[8px] border border-border bg-background p-4 text-sm font-semibold leading-6 text-surface-ink" key={rule}>
                <FileCheck2 aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                <span>{rule}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-16 text-center">
        <FileCheck2 aria-hidden className="mx-auto h-7 w-7 text-brand" />
        <h2 className="mt-4 font-display text-4xl font-bold text-surface-ink">Run a watermarked proof against your own brief.</h2>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-muted">
          The sample reports show the shape of the artifact. A demo account lets you inspect the workspace with your own
          supported product brief before buying a clean export.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Link className="inline-flex h-12 items-center justify-center gap-2 rounded-[8px] bg-surface-ink px-5 text-sm font-bold text-white" href="/signup?intent=demo&next=/app">
            Create demo account
            <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
          <Link className="inline-flex h-12 items-center justify-center gap-2 rounded-[8px] border border-border bg-surface px-5 text-sm font-bold text-surface-ink" href="/pilot-application">
            Apply for pilot
          </Link>
        </div>
      </section>
    </main>
  );
}
