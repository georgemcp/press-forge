import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, FileCheck2, Layers3, SearchCheck } from "lucide-react";
import { getSiteOrigin } from "@/lib/seo/site-url";
import { getToolPage, toolPages, type ToolPage } from "@/lib/seo/tool-pages";

export const metadata: Metadata = {
  title: "Print-Ready PDF Tools and Prepress Guides",
  description:
    "Browse Trim Proof tools and guides for print-ready PDFs, AI flyers, AI posters, AI brochures, AI business cards, postcard makers, letterhead makers, CMYK, bleed, crop marks, PDF/X, Canva exports, and preflight.",
  alternates: {
    canonical: "/tools"
  },
  openGraph: {
    title: "Print-Ready PDF Tools and Prepress Guides",
    description:
      "A crawlable hub for Trim Proof's print-ready PDF tools, Canva guides, prepress checks, templates, and AI print-proof workflows.",
    url: "/tools",
    siteName: "Press Forge",
    type: "website"
  },
  twitter: {
    card: "summary",
    title: "Print-Ready PDF Tools and Prepress Guides",
    description:
      "Browse print-ready PDF tools and guides for CMYK, bleed, crop marks, PDF/X, Canva exports, and preflight."
  }
};

const toolGroups = [
  {
    title: "Start a print-ready PDF",
    description: "Core paths for turning a brief or PDF question into a checked production handoff.",
    slugs: [
      "print-ready-pdf-generator",
      "ai-flyer-generator",
      "ai-business-card-generator",
      "poster-maker",
      "brochure-maker",
      "postcard-maker",
      "letterhead-maker",
      "free-ai-flyer-generator",
      "free-ai-business-card-generator",
      "free-poster-maker",
      "free-brochure-maker",
      "free-postcard-maker",
      "free-letterhead-maker"
    ]
  },
  {
    title: "Prepress checks",
    description: "File-prep checks for print geometry, color, PDF standards, and preflight evidence.",
    slugs: [
      "online-pdf-prepress-tools",
      "prepress-checklist",
      "prepress-automation-software",
      "pdf-preflight-checker",
      "pdf-to-cmyk-converter",
      "rgb-to-cmyk-pdf",
      "pdfx-1a-generator",
      "pdfx-4-print-ready-pdf"
    ]
  },
  {
    title: "Bleed, crop marks, and Canva exports",
    description: "Troubleshooting for edge-to-edge artwork, Canva handoffs, printer requests, and export settings.",
    slugs: ["add-bleed-to-pdf-online", "add-crop-marks-to-pdf", "canva-print-ready-pdf", "canva-cmyk-print-quality", "canva-bleed-and-crop-marks"]
  },
  {
    title: "Supported product templates",
    description: "Starter-product pages for formats Trim Proof currently supports.",
    slugs: ["business-card-pdf-template", "flyer-pdf-template", "poster-pdf-template", "tri-fold-brochure-template", "postcard-pdf-template", "letterhead-pdf-template"]
  },
  {
    title: "Supported product size guides",
    description: "Dimension, format, bleed, pixel, margin, panel, and safe-area guides for supported flyer, poster, brochure, card, postcard, and letterhead proofs.",
    slugs: ["flyer-size-guide", "poster-size-guide", "brochure-size-guide", "business-card-size-guide", "business-card-pixel-size", "business-card-bleed-size", "postcard-size-guide", "letterhead-format-guide"]
  },
  {
    title: "Proofing and software research",
    description: "Guides for separating print-production checks from approval, markup, and review-routing tools.",
    slugs: ["online-proofing-software"]
  }
] as const;

function getGroupPages(slugs: readonly string[]) {
  return slugs
    .map((slug) => getToolPage(slug))
    .filter((page): page is ToolPage => Boolean(page));
}

function ToolsJsonLd() {
  const origin = getSiteOrigin();
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Trim Proof", item: `${origin}/` },
          { "@type": "ListItem", position: 2, name: "Tools", item: `${origin}/tools` }
        ]
      },
      {
        "@type": "CollectionPage",
        "@id": `${origin}/tools#collection`,
        name: "Print-Ready PDF Tools and Prepress Guides",
        url: `${origin}/tools`,
        description:
          "A collection of Trim Proof tools and guides for print-ready PDFs, AI print proofs, CMYK, bleed, crop marks, PDF/X, Canva exports, and preflight."
      },
      {
        "@type": "ItemList",
        "@id": `${origin}/tools#itemlist`,
        name: "Trim Proof tool pages",
        numberOfItems: toolPages.length,
        itemListElement: toolPages.map((page, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: page.title,
          url: `${origin}/tools/${page.slug}`
        }))
      }
    ]
  };

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />;
}

export default function ToolsIndexPage() {
  return (
    <main className="min-h-screen text-foreground">
      <ToolsJsonLd />
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link className="font-display text-lg font-bold text-surface-ink" href="/">
            Trim Proof
          </Link>
          <div className="flex items-center gap-4 text-sm font-semibold">
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

      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-16 lg:grid-cols-[0.72fr_0.28fr]">
        <div>
          <SearchCheck aria-hidden className="h-7 w-7 text-brand" />
          <h1 className="mt-5 font-display text-5xl font-bold leading-[1.05] text-surface-ink">Print-ready PDF tools and prepress guides</h1>
          <div className="mt-6 rounded-[8px] border border-border bg-surface p-5">
            <p className="text-xs font-semibold uppercase text-brand">Short answer</p>
            <p className="mt-2 text-lg leading-8 text-surface-ink">
              Trim Proof tools help turn print briefs into checked PDF/X proofs and explain the file-prep details printers ask for: CMYK-oriented output, bleed, crop marks, embedded vector text, image DPI, PDF/X, and preflight.
            </p>
          </div>
          <p className="mt-5 max-w-3xl text-base leading-7 text-muted">
            Browse the researched pages below by job. Trim Proof currently supports generated proofs for flyers, posters, brochures, business cards, postcards, and letterhead. It is not a universal repair tool for every existing PDF or a client approval suite.
          </p>
        </div>
        <aside className="border-l border-border pl-5">
          <FileCheck2 aria-hidden className="h-6 w-6 text-success" />
          <h2 className="mt-4 font-display text-2xl font-bold text-surface-ink">Current public library</h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            {toolPages.length} indexable tool and guide pages mapped to DataForSEO-backed print-ready PDF, Canva, CMYK, bleed, PDF/X, preflight, AI flyer, AI poster, AI brochure, AI business-card, postcard maker, letterhead maker, and template demand.
          </p>
          <Link className="mt-5 inline-flex h-11 items-center gap-2 rounded-[8px] bg-surface-ink px-4 text-sm font-bold text-white" href="/signup?intent=demo&next=/app">
            Create demo account
            <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
        </aside>
      </section>

      <section className="border-y border-border bg-surface">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12">
          {toolGroups.map((group) => {
            const pages = getGroupPages(group.slugs);
            return (
              <section key={group.title} aria-labelledby={`${group.title.toLowerCase().replaceAll(" ", "-")}-heading`}>
                <div className="flex items-start gap-3">
                  <Layers3 aria-hidden className="mt-1 h-5 w-5 text-brand" />
                  <div>
                    <h2 id={`${group.title.toLowerCase().replaceAll(" ", "-")}-heading`} className="font-display text-3xl font-bold text-surface-ink">
                      {group.title}
                    </h2>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{group.description}</p>
                  </div>
                </div>
                <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {pages.map((page) => (
                    <Link key={page.slug} className="group rounded-[8px] border border-border bg-background p-4 transition hover:border-accent" href={`/tools/${page.slug}`}>
                      <span className="font-display text-lg font-bold text-surface-ink">{page.title}</span>
                      <span className="mt-2 block text-sm leading-6 text-muted">{page.metaDescription}</span>
                      <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-brand">
                        Open guide
                        <ArrowRight aria-hidden className="h-4 w-4 transition group-hover:translate-x-1" />
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-14">
        <h2 className="font-display text-3xl font-bold text-surface-ink">What makes these pages different?</h2>
        <div className="mt-6 divide-y divide-border border-y border-border">
          <article className="grid gap-3 py-5 md:grid-cols-[0.35fr_0.65fr]">
            <h3 className="font-display text-xl font-bold text-surface-ink">AI creative upstream</h3>
            <p className="text-base leading-7 text-muted">AI can help with background artwork and layout direction, but final print text and PDF structure stay in deterministic code.</p>
          </article>
          <article className="grid gap-3 py-5 md:grid-cols-[0.35fr_0.65fr]">
            <h3 className="font-display text-xl font-bold text-surface-ink">Prepress downstream</h3>
            <p className="text-base leading-7 text-muted">The final proof path checks trim and bleed boxes, crop marks, embedded fonts, color workflow, image DPI, PDF/X status, and preflight evidence.</p>
          </article>
          <article className="grid gap-3 py-5 md:grid-cols-[0.35fr_0.65fr]">
            <h3 className="font-display text-xl font-bold text-surface-ink">Bounded claims</h3>
            <p className="text-base leading-7 text-muted">The pages describe supported starter products and practical handoff checks without claiming universal PDF repair, arbitrary Canva conversion, or guaranteed printer acceptance.</p>
          </article>
        </div>
      </section>
    </main>
  );
}
