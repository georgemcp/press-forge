import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { getToolPageMetadata } from "@/lib/seo/tool-page-metadata";
import { getToolPage, toolPages, type ToolPage } from "@/lib/seo/tool-pages";

const conversionPaths = [
  {
    name: "Create a demo account",
    price: "$0",
    body: "See a watermarked sample proof, bleed guides, crop marks, and preflight report before buying a clean export.",
    href: "/signup?intent=demo&next=/app",
    cta: "Create demo account"
  },
  {
    name: "Buy one export credit",
    price: "$12",
    body: "Use advanced mode for one production PDF/X-1a export when a specific print job is ready.",
    href: "/signup?intent=single_export&next=/app%3Fmode%3Dadvanced",
    cta: "Buy export credit"
  },
  {
    name: "Use Trim Proof Pro",
    price: "$49/mo",
    body: "Choose the subscription when repeat flyers, cards, postcards, or letterhead jobs need checked files.",
    href: "/signup?intent=pro&next=/app%3Fmode%3Dadvanced",
    cta: "Start Pro"
  }
];

interface ToolPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export function generateStaticParams() {
  return toolPages.map((page) => ({
    slug: page.slug
  }));
}

export async function generateMetadata({ params }: ToolPageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = getToolPage(slug);
  if (!page) {
    return {};
  }
  return getToolPageMetadata(page);
}

export default async function ToolLandingPage({ params }: ToolPageProps) {
  const { slug } = await params;
  const page = getToolPage(slug);
  if (!page) {
    notFound();
  }
  const isGuide = page.pageType === "guide";

  const faqSchema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Trim Proof", item: "https://trimproof.com/" },
          { "@type": "ListItem", position: 2, name: page.title, item: `https://trimproof.com/tools/${page.slug}` }
        ]
      },
      isGuide
        ? {
            "@type": "Article",
            "@id": `https://trimproof.com/tools/${page.slug}#article`,
            headline: page.title,
            description: page.answer,
            about: page.keywords,
            author: {
              "@type": "Organization",
              name: "Trim Proof",
              url: "https://trimproof.com/"
            }
          }
        : {
            "@type": "SoftwareApplication",
            "@id": `https://trimproof.com/tools/${page.slug}#software`,
            name: page.title,
            applicationCategory: "DesignApplication",
            operatingSystem: "Web",
            description: page.answer,
            offers: {
              "@type": "AggregateOffer",
              priceCurrency: "USD",
              lowPrice: "0",
              highPrice: "49"
            }
          },
      {
        "@type": "HowTo",
        name: `How to use ${page.title}`,
        step: page.steps.map((step, index) => ({
          "@type": "HowToStep",
          position: index + 1,
          name: step,
          text: step
        }))
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
  const relatedPages = page.relatedSlugs
    .map((relatedSlug) => getToolPage(relatedSlug))
    .filter((relatedPage): relatedPage is ToolPage => Boolean(relatedPage));

  return (
    <main className="min-h-screen text-foreground">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link className="font-display text-lg font-bold text-surface-ink" href="/">
            Trim Proof
          </Link>
          <Link className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-surface-ink px-4 text-sm font-semibold text-white" href="/signup?intent=demo&next=/app">
            Create account
            <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-4 py-16">
        <h1 className="font-display text-5xl font-bold leading-[1.05] text-surface-ink">{page.h1}</h1>
        <div className="mt-6 rounded-[8px] border border-border bg-surface p-5">
          <p className="text-xs font-semibold uppercase text-brand">Short answer</p>
          <p className="mt-2 text-lg leading-8 text-surface-ink">{page.answer}</p>
        </div>
        <p className="mt-5 text-base leading-7 text-muted">{page.intent}</p>
        <div className="mt-8 flex flex-wrap gap-2">
          {page.keywords.map((keyword) => (
            <span key={keyword} className="rounded-[6px] border border-border bg-surface px-3 py-1 text-sm font-semibold text-muted">
              {keyword}
            </span>
          ))}
        </div>
        <div className="mt-10 border-y border-border bg-surface">
          <div className="grid gap-0 md:grid-cols-3">
            {conversionPaths.map((path) => (
              <article key={path.name} className="flex min-h-[220px] flex-col border-b border-border p-5 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0">
                <div className="flex-1">
                  <p className="text-xs font-bold uppercase text-brand">{path.price}</p>
                  <h2 className="mt-2 font-display text-xl font-bold text-surface-ink">{path.name}</h2>
                  <p className="mt-3 text-sm leading-6 text-muted">{path.body}</p>
                </div>
                <Link className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-[8px] bg-surface-ink px-4 text-sm font-bold text-white" href={path.href}>
                  {path.cta}
                  <ArrowRight aria-hidden className="h-4 w-4" />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-surface">
        <div className="mx-auto grid max-w-6xl gap-5 px-4 py-12 lg:grid-cols-2">
          <article className="rounded-[8px] border border-border bg-background p-5">
            <h2 className="font-display text-2xl font-bold text-surface-ink">{isGuide ? "What this page covers" : "What Trim Proof checks"}</h2>
            <ul className="mt-5 grid gap-3 text-sm font-semibold text-surface-ink">
              {page.checks.map((check) => (
                <li key={check} className="flex gap-2">
                  <CheckCircle2 aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  <span>{check}</span>
                </li>
              ))}
            </ul>
          </article>
          <article className="rounded-[8px] border border-border bg-background p-5">
            <h2 className="font-display text-2xl font-bold text-surface-ink">{isGuide ? "How to use this guidance" : "How the workflow runs"}</h2>
            <ol className="mt-5 grid gap-3 text-sm font-semibold text-surface-ink">
              {page.steps.map((step, index) => (
                <li key={step} className="flex gap-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-[6px] bg-brand-soft text-xs text-brand">{index + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </article>
        </div>
      </section>

      <section className="border-y border-border bg-surface">
        <div className="mx-auto grid max-w-6xl gap-5 px-4 py-12 md:grid-cols-2">
          {page.sections.map((section) => (
            <article key={section.heading} className="rounded-[8px] border border-border bg-background p-5">
              <CheckCircle2 aria-hidden className="h-5 w-5 text-success" />
              <h2 className="mt-4 font-display text-2xl font-bold text-surface-ink">{section.heading}</h2>
              <p className="mt-3 text-base leading-7 text-muted">{section.body}</p>
            </article>
          ))}
        </div>
      </section>

      {relatedPages.length > 0 ? (
        <section className="border-b border-border bg-background">
          <div className="mx-auto max-w-6xl px-4 py-12">
            <h2 className="font-display text-3xl font-bold text-surface-ink">Related print-ready tools</h2>
            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {relatedPages.map((relatedPage) => (
                <Link
                  key={relatedPage.slug}
                  className="rounded-[8px] border border-border bg-surface p-4 transition hover:border-accent"
                  href={`/tools/${relatedPage.slug}`}
                >
                  <span className="font-display text-lg font-bold text-surface-ink">{relatedPage.title}</span>
                  <span className="mt-2 block text-sm leading-6 text-muted">{relatedPage.metaDescription}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="mx-auto max-w-4xl px-4 py-14">
        <h2 className="font-display text-3xl font-bold text-surface-ink">Common questions</h2>
        <div className="mt-6 space-y-4">
          {page.faq.map((item) => (
            <article key={item.question} className="rounded-[8px] border border-border bg-surface p-5">
              <h3 className="font-display text-xl font-bold text-surface-ink">{item.question}</h3>
              <p className="mt-3 text-base leading-7 text-muted">{item.answer}</p>
            </article>
          ))}
        </div>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link className="inline-flex h-12 items-center justify-center gap-2 rounded-[8px] bg-accent px-5 text-sm font-bold text-accent-ink" href="/signup?intent=demo&next=/app">
            Create demo account
            <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
          <Link className="inline-flex h-12 items-center justify-center gap-2 rounded-[8px] border border-border bg-surface px-5 text-sm font-bold text-surface-ink" href="/signup?intent=single_export&next=/app%3Fmode%3Dadvanced">
            Buy one export credit
          </Link>
        </div>
      </section>

      <footer className="border-t border-border bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6 text-sm font-semibold text-muted">
          <Link className="transition hover:text-surface-ink" href="/">
            Trim Proof
          </Link>
          <div className="flex gap-4">
            <Link className="transition hover:text-surface-ink" href="/about">
              About
            </Link>
            <Link className="transition hover:text-surface-ink" href="/privacy">
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
