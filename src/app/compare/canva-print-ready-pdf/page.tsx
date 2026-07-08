import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BadgeCheck, ClipboardCheck, ExternalLink, FileSearch, ShieldCheck, Sparkles } from "lucide-react";
import { EmailCaptureForm } from "@/components/email-capture-form";
import { getComparisonPage, type ComparisonPage } from "@/lib/seo/comparison-pages";
import { getSiteOrigin } from "@/lib/seo/site-url";

function requireComparisonPage(slug: string): ComparisonPage {
  const pageData = getComparisonPage(slug);
  if (!pageData) {
    throw new Error(`Missing comparison page data for ${slug}.`);
  }
  return pageData;
}

const page = requireComparisonPage("canva-print-ready-pdf");

export const metadata: Metadata = {
  title: page.title,
  description: page.metaDescription,
  alternates: {
    canonical: page.path
  },
  openGraph: {
    title: page.title,
    description: page.metaDescription,
    url: page.path,
    siteName: "Trim Proof",
    type: "article"
  },
  twitter: {
    card: "summary",
    title: page.title,
    description: page.metaDescription
  }
};

function ComparisonJsonLd() {
  const origin = getSiteOrigin();
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Trim Proof", item: `${origin}/` },
          { "@type": "ListItem", position: 2, name: "Compare", item: `${origin}/compare/canva-print-ready-pdf` }
        ]
      },
      {
        "@type": "Article",
        "@id": `${origin}${page.path}#article`,
        headline: page.h1,
        description: page.metaDescription,
        author: {
          "@type": "Organization",
          name: "Trim Proof",
          url: `${origin}/`
        },
        about: ["Canva print-ready PDF", "PDF Print", "PDF/X proof", "preflight report", "print-ready PDF"]
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

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />;
}

function CheckList({ items }: { items: string[] }) {
  return (
    <ul className="mt-5 grid gap-3">
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-sm font-semibold leading-6 text-surface-ink">
          <BadgeCheck aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-success" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function CanvaPrintReadyPdfComparisonPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <ComparisonJsonLd />
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link className="font-display text-lg font-bold text-surface-ink" href="/">
            Trim Proof
          </Link>
          <div className="flex items-center gap-4 text-sm font-semibold">
            <Link className="hidden text-muted transition hover:text-surface-ink sm:inline" href="/tools/canva-print-ready-pdf">
              Canva guide
            </Link>
            <Link className="text-muted transition hover:text-surface-ink" href="/prepress-checklist">
              Checklist
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
          <FileSearch aria-hidden className="h-7 w-7 text-brand" />
          <p className="mt-5 text-sm font-bold uppercase text-brand">{page.eyebrow}</p>
          <h1 className="mt-3 font-display text-5xl font-bold leading-[1.04] text-surface-ink">{page.h1}</h1>
        </div>
        <div className="border-y border-border bg-surface p-5">
          <p className="text-xs font-bold uppercase text-brand">Short answer</p>
          <p className="mt-3 text-lg leading-8 text-surface-ink">{page.shortAnswer}</p>
        </div>
      </section>

      <section className="border-y border-border bg-surface">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-12 lg:grid-cols-[0.72fr_1.28fr]">
          <div>
            <ClipboardCheck aria-hidden className="h-6 w-6 text-success" />
            <h2 className="mt-4 font-display text-4xl font-bold leading-tight text-surface-ink">Decision matrix</h2>
            <p className="mt-4 text-base leading-7 text-muted">
              This is not a winner-takes-all comparison. The right answer depends on where the file starts and how much
              print risk the job carries.
            </p>
          </div>
          <div className="overflow-hidden rounded-[8px] border border-border bg-background">
            <div className="hidden grid-cols-[0.72fr_1fr_1fr_1fr] border-b border-border bg-surface text-xs font-bold uppercase text-muted lg:grid">
              <div className="p-4">Question</div>
              <div className="p-4">Canva fit</div>
              <div className="p-4">Trim Proof fit</div>
              <div className="p-4">Specialist fit</div>
            </div>
            {page.decisionRows.map((row) => (
              <article key={row.question} className="grid gap-0 border-b border-border last:border-b-0 lg:grid-cols-[0.72fr_1fr_1fr_1fr]">
                <h3 className="border-b border-border bg-surface p-4 font-display text-xl font-bold text-surface-ink lg:border-b-0 lg:bg-background">
                  {row.question}
                </h3>
                <p className="p-4 text-sm leading-6 text-muted">
                  <span className="mb-1 block text-xs font-bold uppercase text-brand lg:hidden">Canva fit</span>
                  {row.canvaFit}
                </p>
                <p className="border-y border-border p-4 text-sm font-semibold leading-6 text-surface-ink lg:border-x lg:border-y-0">
                  <span className="mb-1 block text-xs font-bold uppercase text-brand lg:hidden">Trim Proof fit</span>
                  {row.trimProofFit}
                </p>
                <p className="p-4 text-sm leading-6 text-muted">
                  <span className="mb-1 block text-xs font-bold uppercase text-brand lg:hidden">Specialist fit</span>
                  {row.specialistFit}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 py-14 lg:grid-cols-3">
        <article className="rounded-[8px] border border-border bg-surface p-5">
          <Sparkles aria-hidden className="h-5 w-5 text-brand" />
          <h2 className="mt-4 font-display text-2xl font-bold text-surface-ink">Use Canva when</h2>
          <CheckList items={page.useCanvaWhen} />
        </article>
        <article className="rounded-[8px] border border-accent/40 bg-accent/5 p-5">
          <FileSearch aria-hidden className="h-5 w-5 text-accent" />
          <h2 className="mt-4 font-display text-2xl font-bold text-surface-ink">Use Trim Proof when</h2>
          <CheckList items={page.useTrimProofWhen} />
        </article>
        <article className="rounded-[8px] border border-border bg-surface p-5">
          <ShieldCheck aria-hidden className="h-5 w-5 text-success" />
          <h2 className="mt-4 font-display text-2xl font-bold text-surface-ink">Use a specialist when</h2>
          <CheckList items={page.useSpecialistWhen} />
        </article>
      </section>

      <section className="border-y border-border bg-surface">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-12 lg:grid-cols-[0.72fr_1.28fr]">
          <div>
            <ShieldCheck aria-hidden className="h-6 w-6 text-success" />
            <h2 className="mt-4 font-display text-4xl font-bold leading-tight text-surface-ink">Boundaries that make the comparison useful</h2>
            <p className="mt-4 text-base leading-7 text-muted">
              A comparison page should reduce risk, not create a new unsupported claim. These limits keep the recommendation honest.
            </p>
          </div>
          <ul className="grid gap-3">
            {page.boundaries.map((boundary) => (
              <li key={boundary} className="flex gap-3 rounded-[8px] border border-border bg-background p-4 text-sm font-semibold leading-6 text-surface-ink">
                <BadgeCheck aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                <span>{boundary}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-14 lg:grid-cols-[0.72fr_1.28fr]">
        <div>
          <ExternalLink aria-hidden className="h-6 w-6 text-brand" />
          <h2 className="mt-4 font-display text-4xl font-bold leading-tight text-surface-ink">Source notes checked June 15, 2026</h2>
          <p className="mt-4 text-base leading-7 text-muted">
            The comparison uses public Canva Help pages for Canva-specific export behavior and Trim Proof product evidence
            from the current app, docs, and generated proof flow.
          </p>
        </div>
        <div className="divide-y divide-border border-y border-border">
          {page.sourceNotes.map((source) => (
            <article key={source.href} className="grid gap-3 py-5 lg:grid-cols-[0.38fr_0.62fr]">
              <a className="inline-flex items-center gap-2 font-display text-xl font-bold text-surface-ink transition hover:text-brand" href={source.href} rel="noopener noreferrer" target="_blank">
                {source.label}
                <ExternalLink aria-hidden className="h-4 w-4" />
              </a>
              <p className="text-base leading-7 text-muted">{source.note}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-surface">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
          <div>
            <h2 className="font-display text-4xl font-bold leading-tight text-surface-ink">Want the practical checklist behind the comparison?</h2>
            <p className="mt-4 text-base leading-7 text-muted">
              Join the early list for launch notes, comparison updates, and pilot follow-up when a supported print workflow fits.
            </p>
          </div>
          <div className="rounded-[8px] border border-border bg-background p-5">
            <EmailCaptureForm buttonLabel={page.primaryCta} id={`${page.slug}-email`} source={page.emailSource} />
            <p className="mt-4 text-xs font-semibold leading-5 text-muted">
              No fake urgency. Use the visible comparison and checklist first; sign up when the workflow matches a real job.
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
            <Link className="transition hover:text-surface-ink" href="/tools/canva-print-ready-pdf">
              Canva guide
            </Link>
            <Link className="transition hover:text-surface-ink" href="/prepress-checklist">
              Checklist
            </Link>
            <Link className="transition hover:text-surface-ink" href="/signup?intent=demo&next=/app">
              Create account
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
