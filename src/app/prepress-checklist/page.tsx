import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ClipboardCheck, FileCheck2, Printer, ShieldCheck } from "lucide-react";
import { EmailCaptureForm } from "@/components/email-capture-form";
import { getSiteOrigin } from "@/lib/seo/site-url";
import { prepressChecklistFacts, prepressChecklistFaq, prepressChecklistSections } from "@/lib/seo/prepress-checklist";

export const metadata: Metadata = {
  title: "Free Prepress Checklist for Print-Ready PDFs",
  description:
    "Use this practical prepress checklist before sending a print-ready PDF: trim size, bleed, safe area, crop marks, vector text, image DPI, CMYK workflow, PDF/X, and handoff notes.",
  alternates: {
    canonical: "/prepress-checklist"
  },
  openGraph: {
    title: "Free Prepress Checklist for Print-Ready PDFs",
    description:
      "A practical Trim Proof checklist for checking bleed, crop marks, fonts, image DPI, color workflow, PDF/X status, and printer handoff requirements.",
    url: "/prepress-checklist",
    siteName: "Trim Proof",
    type: "article"
  },
  twitter: {
    card: "summary",
    title: "Free Prepress Checklist for Print-Ready PDFs",
    description:
      "Check trim size, bleed, safe area, crop marks, vector text, image DPI, CMYK workflow, PDF/X, and printer handoff notes."
  }
};

function PrepressChecklistJsonLd() {
  const origin = getSiteOrigin();
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Trim Proof", item: `${origin}/` },
          { "@type": "ListItem", position: 2, name: "Prepress Checklist", item: `${origin}/prepress-checklist` }
        ]
      },
      {
        "@type": "Article",
        "@id": `${origin}/prepress-checklist#article`,
        headline: "Free Prepress Checklist for Print-Ready PDFs",
        description:
          "A practical checklist for checking trim size, bleed, safe area, crop marks, vector text, image DPI, color workflow, PDF/X status, and printer handoff details.",
        author: {
          "@type": "Organization",
          name: "Trim Proof",
          url: `${origin}/`
        }
      },
      {
        "@type": "HowTo",
        name: "How to check a print-ready PDF before handoff",
        step: prepressChecklistSections.flatMap((section) =>
          section.items.map((item) => ({
            "@type": "HowToStep",
            name: section.heading,
            text: item
          }))
        )
      },
      {
        "@type": "FAQPage",
        mainEntity: prepressChecklistFaq.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.answer
          }
        }))
      }
    ]
  };

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />;
}

export default function PrepressChecklistPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <PrepressChecklistJsonLd />
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link className="font-display text-lg font-bold text-surface-ink" href="/">
            Trim Proof
          </Link>
          <div className="flex items-center gap-4 text-sm font-semibold">
            <Link className="hidden text-muted transition hover:text-surface-ink sm:inline" href="/tools">
              Tools
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

      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-16 lg:grid-cols-[0.82fr_1.18fr] lg:items-end">
        <div>
          <ClipboardCheck aria-hidden className="h-7 w-7 text-brand" />
          <p className="mt-5 text-sm font-bold uppercase text-brand">Prepress checklist</p>
          <h1 className="mt-3 font-display text-5xl font-bold leading-[1.04] text-surface-ink">
            A practical print-ready PDF checklist before you send the file.
          </h1>
        </div>
        <div className="border-y border-border bg-surface p-5">
          <p className="text-xs font-bold uppercase text-brand">Short answer</p>
          <p className="mt-3 text-lg leading-8 text-surface-ink">
            Before handoff, check trim size, bleed, safe area, crop marks, vector text, fonts, image DPI,
            color workflow, PDF/X status, and the printer&apos;s current upload requirements. Trim Proof makes those checks
            visible for supported generated proofs.
          </p>
        </div>
      </section>

      <section className="border-y border-border bg-surface">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 lg:grid-cols-[0.78fr_1.22fr]">
          <div>
            <FileCheck2 aria-hidden className="h-6 w-6 text-success" />
            <h2 className="mt-4 font-display text-4xl font-bold leading-tight text-surface-ink">Get checklist updates</h2>
            <p className="mt-4 text-base leading-7 text-muted">
              The full checklist is visible below. Join the list if you want launch notes, printer-profile updates, and
              pilot follow-up for supported Trim Proof workflows.
            </p>
          </div>
          <div className="rounded-[8px] border border-border bg-background p-5">
            <EmailCaptureForm
              buttonLabel="Get checklist updates"
              id="prepress-checklist-email"
              placeholder="you@company.com"
              source="prepress_checklist"
            />
            <p className="mt-4 text-xs font-semibold leading-5 text-muted">
              This is not a fake download gate. The checklist stays visible so it can help before you sign up.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-4 md:grid-cols-2">
          {prepressChecklistFacts.map(([label, value]) => (
            <article key={label} className="rounded-[8px] border border-border bg-surface p-5">
              <p className="text-xs font-bold uppercase text-muted">{label}</p>
              <p className="mt-3 font-display text-xl font-bold leading-7 text-surface-ink">{value}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-surface">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-12 lg:grid-cols-[0.7fr_1.3fr]">
          <div>
            <Printer aria-hidden className="h-6 w-6 text-brand" />
            <h2 className="mt-4 font-display text-4xl font-bold leading-tight text-surface-ink">The checklist</h2>
            <p className="mt-4 text-base leading-7 text-muted">
              Work through these groups before upload. If a printer gives you a stricter spec, use the printer&apos;s spec.
            </p>
          </div>
          <div className="grid gap-4">
            {prepressChecklistSections.map((section) => (
              <article key={section.heading} className="rounded-[8px] border border-border bg-background p-5">
                <h3 className="font-display text-2xl font-bold text-surface-ink">{section.heading}</h3>
                <ul className="mt-5 grid gap-3">
                  {section.items.map((item) => (
                    <li key={item} className="flex gap-3 text-sm font-semibold leading-6 text-surface-ink">
                      <CheckCircle2 aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-14 lg:grid-cols-[0.72fr_1.28fr]">
        <div>
          <ShieldCheck aria-hidden className="h-6 w-6 text-success" />
          <h2 className="mt-4 font-display text-4xl font-bold leading-tight text-surface-ink">Use the checklist with honest limits</h2>
          <p className="mt-4 text-base leading-7 text-muted">
            The goal is fewer avoidable surprises, not false certainty. Printer specs, substrates, finishing, ink limits,
            and upload portals can still change what a job needs.
          </p>
        </div>
        <div className="divide-y divide-border border-y border-border">
          {prepressChecklistFaq.map((item) => (
            <article key={item.question} className="grid gap-3 py-5 lg:grid-cols-[0.42fr_0.58fr]">
              <h3 className="font-display text-xl font-bold text-surface-ink">{item.question}</h3>
              <p className="text-base leading-7 text-muted">{item.answer}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-surface">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-12 md:grid-cols-3">
          {[
            ["For print shops", "/for-print-shops", "Use Trim Proof for cleaner starter proofs and pilot feedback."],
            ["For marketers", "/for-marketers", "Create local print collateral without guessing every prepress term."],
            ["For designers", "/for-designers", "Add a production safety layer around small client print jobs."]
          ].map(([label, href, body]) => (
            <Link key={href} className="rounded-[8px] border border-border bg-background p-5 transition hover:border-accent" href={href}>
              <span className="font-display text-2xl font-bold text-surface-ink">{label}</span>
              <span className="mt-3 block text-sm leading-6 text-muted">{body}</span>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-brand">
                View page
                <ArrowRight aria-hidden className="h-4 w-4" />
              </span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
