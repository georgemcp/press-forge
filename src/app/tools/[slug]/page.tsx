import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { getToolPage, toolPages } from "@/lib/seo/tool-pages";

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
  return {
    title: page.title,
    description: page.metaDescription,
    alternates: {
      canonical: `/tools/${page.slug}`
    }
  };
}

export default async function ToolLandingPage({ params }: ToolPageProps) {
  const { slug } = await params;
  const page = getToolPage(slug);
  if (!page) {
    notFound();
  }

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: page.faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer
      }
    }))
  };

  return (
    <main className="min-h-screen text-foreground">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link className="font-display text-lg font-bold text-surface-ink" href="/">
            Trim Proof
          </Link>
          <Link className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-surface-ink px-4 text-sm font-semibold text-white" href="/app">
            Try dummy proof
            <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-4 py-16">
        <h1 className="font-display text-5xl font-bold leading-[1.05] text-surface-ink">{page.h1}</h1>
        <p className="mt-6 rounded-[8px] border border-border bg-surface p-5 text-lg leading-8 text-surface-ink">{page.answer}</p>
        <div className="mt-8 flex flex-wrap gap-2">
          {page.keywords.map((keyword) => (
            <span key={keyword} className="rounded-[6px] border border-border bg-surface px-3 py-1 text-sm font-semibold text-muted">
              {keyword}
            </span>
          ))}
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
        <div className="mt-8">
          <Link className="inline-flex h-12 items-center gap-2 rounded-[8px] bg-accent px-5 text-sm font-bold text-accent-ink" href="/app?mode=advanced">
            Open advanced mode
            <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </main>
  );
}
