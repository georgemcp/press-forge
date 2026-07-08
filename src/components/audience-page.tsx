import Link from "next/link";
import { ArrowRight, CheckCircle2, ClipboardCheck, FileCheck2, ShieldCheck } from "lucide-react";
import { EmailCaptureForm } from "@/components/email-capture-form";
import type { AudiencePage } from "@/lib/seo/audience-pages";
import { getSiteOrigin } from "@/lib/seo/site-url";

interface AudiencePageViewProps {
  page: AudiencePage;
}

export function AudiencePageView({ page }: AudiencePageViewProps) {
  const origin = getSiteOrigin();
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Trim Proof", item: `${origin}/` },
          { "@type": "ListItem", position: 2, name: page.title, item: `${origin}${page.path}` }
        ]
      },
      {
        "@type": "WebPage",
        "@id": `${origin}${page.path}#webpage`,
        name: page.title,
        url: `${origin}${page.path}`,
        description: page.metaDescription
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${origin}/#software`,
        name: "Trim Proof",
        applicationCategory: "DesignApplication",
        operatingSystem: "Web",
        description:
          "Trim Proof turns plain-English print briefs into checked PDF/X proofs with deterministic prepress validation."
      },
      {
        "@type": "FAQPage",
        mainEntity: page.faq.map((item) => ({
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

  return (
    <main className="min-h-screen bg-background text-foreground">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
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

      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-16 lg:grid-cols-[0.82fr_1.18fr] lg:items-end">
        <div>
          <FileCheck2 aria-hidden className="h-7 w-7 text-brand" />
          <p className="mt-5 text-sm font-bold uppercase text-brand">{page.eyebrow}</p>
          <h1 className="mt-3 font-display text-5xl font-bold leading-[1.04] text-surface-ink">{page.h1}</h1>
        </div>
        <div className="border-y border-border bg-surface p-5">
          <p className="text-xs font-bold uppercase text-brand">Short answer</p>
          <p className="mt-3 text-lg leading-8 text-surface-ink">{page.shortAnswer}</p>
        </div>
      </section>

      <section className="border-y border-border bg-surface">
        <div className="mx-auto grid max-w-6xl gap-0 overflow-hidden px-4 py-12 md:grid-cols-2">
          {page.proofPoints.map(([label, value]) => (
            <article key={label} className="border-b border-border bg-background p-5 md:border-r md:odd:border-r">
              <p className="text-xs font-bold uppercase text-muted">{label}</p>
              <p className="mt-3 font-display text-xl font-bold leading-7 text-surface-ink">{value}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-14 lg:grid-cols-[0.72fr_1.28fr]">
        <div>
          <ClipboardCheck aria-hidden className="h-6 w-6 text-success" />
          <h2 className="mt-4 font-display text-4xl font-bold leading-tight text-surface-ink">Where it fits</h2>
          <p className="mt-4 text-base leading-7 text-muted">
            Trim Proof is useful when the job is common enough to standardize, but important enough that a screen-ready
            design file is not a safe final handoff.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {page.useCases.map(([heading, body]) => (
            <article key={heading} className="rounded-[8px] border border-border bg-surface p-5">
              <CheckCircle2 aria-hidden className="h-5 w-5 text-success" />
              <h3 className="mt-4 font-display text-2xl font-bold text-surface-ink">{heading}</h3>
              <p className="mt-3 text-sm leading-6 text-muted">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-surface">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-12 lg:grid-cols-[0.72fr_1.28fr]">
          <div>
            <ShieldCheck aria-hidden className="h-6 w-6 text-success" />
            <h2 className="mt-4 font-display text-4xl font-bold leading-tight text-surface-ink">The practical workflow</h2>
          </div>
          <ol className="grid gap-3">
            {page.workflow.map((step, index) => (
              <li key={step} className="flex gap-3 rounded-[8px] border border-border bg-background p-4 text-sm font-semibold leading-6 text-surface-ink">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-[6px] bg-brand-soft text-xs text-brand">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-14 lg:grid-cols-[0.72fr_1.28fr]">
        <div>
          <h2 className="font-display text-4xl font-bold leading-tight text-surface-ink">Boundaries that keep the handoff honest</h2>
          <p className="mt-4 text-base leading-7 text-muted">
            Trim Proof should reduce avoidable file-prep uncertainty, not create false certainty where printer specs still matter.
          </p>
        </div>
        <ul className="grid gap-3">
          {page.boundaries.map((boundary) => (
            <li key={boundary} className="flex gap-3 border-b border-border pb-4 text-sm font-semibold leading-6 text-surface-ink">
              <CheckCircle2 aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              <span>{boundary}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-y border-border bg-surface">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
          <div>
            <h2 className="font-display text-4xl font-bold leading-tight text-surface-ink">{page.primaryCta}</h2>
            <p className="mt-4 text-base leading-7 text-muted">
              Join the early list and we will route your signup by use case so the follow-up can focus on the print
              workflows you actually need.
            </p>
          </div>
          <div className="rounded-[8px] border border-border bg-background p-5">
            <EmailCaptureForm buttonLabel={page.primaryCta} id={`${page.slug}-email`} source={page.emailSource} />
            <p className="mt-4 text-xs font-semibold leading-5 text-muted">
              No invented guarantees, no fake urgency. The early list is for launch notes, checklist updates, and pilot
              follow-up where the workflow fits.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-14">
        <h2 className="font-display text-4xl font-bold text-surface-ink">Common questions</h2>
        <div className="mt-7 divide-y divide-border border-y border-border">
          {page.faq.map((item) => (
            <article key={item.question} className="grid gap-3 py-6 lg:grid-cols-[0.42fr_0.58fr]">
              <h3 className="font-display text-xl font-bold text-surface-ink">{item.question}</h3>
              <p className="text-base leading-7 text-muted">{item.answer}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="border-t border-border bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-sm font-semibold text-muted sm:flex-row sm:items-center sm:justify-between">
          <Link className="transition hover:text-surface-ink" href="/">
            Trim Proof
          </Link>
          <div className="flex flex-wrap gap-4">
            <Link className="transition hover:text-surface-ink" href="/for-print-shops">
              Print shops
            </Link>
            <Link className="transition hover:text-surface-ink" href="/for-marketers">
              Marketers
            </Link>
            <Link className="transition hover:text-surface-ink" href="/for-designers">
              Designers
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
