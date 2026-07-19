import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, FileCheck2, ShieldCheck } from "lucide-react";
import { getSiteOrigin } from "@/lib/seo/site-url";

export const metadata: Metadata = {
  title: "About Trim Proof",
  description:
    "Trim Proof creates print-ready PDF/X proofs from plain-English briefs, with deterministic checks for bleed, crop marks, CMYK-oriented output, vector text, DPI, and preflight.",
  alternates: {
    canonical: "/about"
  },
  openGraph: {
    title: "About Trim Proof",
    description:
      "AI creative upstream. Deterministic PDF/X, CMYK, bleed, crop marks, vector text, and preflight downstream.",
    url: "/about",
    siteName: "Press Forge",
    type: "website",
    images: [
      {
        url: "/trim-proof-workspace-concept.png",
        width: 1440,
        height: 1000,
        alt: "Trim Proof workspace with brief intake, print preview, preflight gate, and export controls."
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "About Trim Proof",
    description:
      "Trim Proof turns plain-English print briefs into checked PDF/X proofs for supported starter products.",
    images: ["/trim-proof-workspace-concept.png"]
  }
};

const supportedFacts = [
  ["Supported products", "Business cards, flyers, posters, brochures, postcards, and letterhead."],
  ["Demo path", "A free account can create a watermarked sample proof and preflight report."],
  ["Paid export path", "$12 one-export credit or $49/month Trim Proof Pro for clean production downloads."],
  ["Current verified export", "PDF/X-1a-oriented production export with preflight checks."],
  ["Default bleed", "0.125 inch bleed for starter products unless the job profile changes it."],
  ["Text handling", "Final deliverable text is built as embedded vector type, not rasterized prompt text."]
];

const boundaries = [
  "Trim Proof is not a universal repair tool for every existing PDF.",
  "Trim Proof is not a client approval, annotation, or review-routing suite.",
  "Trim Proof does not guarantee acceptance by every printer because printer specifications can vary.",
  "Trim Proof does not claim to repair every Canva export; it can create a fresh checked proof for supported products."
];

const workflow = [
  "Describe the print job in plain English.",
  "Choose a supported starter product and review the proof settings.",
  "Let AI assist with creative assets while Trim Proof keeps final print geometry deterministic.",
  "Check bleed, trim boxes, crop marks, embedded fonts, color workflow, image DPI, and PDF/X status.",
  "Use the free demo path for a watermarked sample proof or paid export when a clean production file is ready."
];

const faq = [
  {
    question: "What does Trim Proof do?",
    answer:
      "Trim Proof turns plain-English briefs for flyers, posters, brochures, business cards, postcards, and letterhead into print-ready PDF/X proofs with bleed, crop marks, embedded vector text, CMYK-oriented output, and preflight checks."
  },
  {
    question: "Who is Trim Proof for?",
    answer:
      "Trim Proof is for small teams, designers, marketers, and print buyers who need generated starter print files with visible proof checks before sending a file to a printer."
  },
  {
    question: "What makes Trim Proof different from a normal AI design generator?",
    answer:
      "Most AI design generators focus on screen previews and creative assets. Trim Proof separates the creative stage from the final prepress stage so PDF boxes, vector text, bleed, crop marks, color workflow, and preflight checks can be controlled."
  },
  {
    question: "Can I use Trim Proof for free?",
    answer:
      "A free account can create a watermarked sample proof and preflight report. Clean production PDF/X downloads use a paid export credit or Trim Proof Pro subscription."
  }
];

function AboutJsonLd() {
  const origin = getSiteOrigin();
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Trim Proof", item: `${origin}/` },
          { "@type": "ListItem", position: 2, name: "About Trim Proof", item: `${origin}/about` }
        ]
      },
      {
        "@type": "Organization",
        "@id": `${origin}/#organization`,
        name: "Trim Proof",
        url: `${origin}/`
      },
      {
        "@type": "AboutPage",
        "@id": `${origin}/about#about`,
        name: "About Trim Proof",
        url: `${origin}/about`,
        isPartOf: {
          "@id": `${origin}/#website`
        },
        about: {
          "@id": `${origin}/#software`
        },
        description:
          "Trim Proof creates print-ready PDF/X proofs from plain-English briefs with deterministic prepress checks."
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${origin}/#software`,
        name: "Trim Proof",
        applicationCategory: "DesignApplication",
        operatingSystem: "Web",
        description:
          "Trim Proof turns design briefs into print-ready PDF/X files with deterministic CMYK-oriented output, bleed, crop marks, embedded vector fonts, and preflight checks.",
        offers: {
          "@type": "AggregateOffer",
          priceCurrency: "USD",
          lowPrice: "0",
          highPrice: "49"
        }
      },
      {
        "@type": "FAQPage",
        mainEntity: faq.map((item) => ({
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

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <AboutJsonLd />
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link className="font-display text-lg font-bold text-surface-ink" href="/">
            Trim Proof
          </Link>
          <div className="flex items-center gap-4 text-sm font-semibold">
            <Link className="text-muted transition hover:text-surface-ink" href="/#seo-pages">
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
          <FileCheck2 aria-hidden className="h-7 w-7 text-brand" />
          <p className="mt-5 text-sm font-bold uppercase text-brand">About Trim Proof</p>
          <h1 className="mt-3 font-display text-5xl font-bold leading-[1.04] text-surface-ink">
            A print-ready PDF proof engine for generated flyers, posters, brochures, cards, postcards, and letterhead.
          </h1>
        </div>
        <div className="border-y border-border bg-surface p-5">
          <p className="text-xs font-bold uppercase text-brand">Short answer</p>
          <p className="mt-3 text-lg leading-8 text-surface-ink">
            Trim Proof turns plain-English print briefs into checked PDF/X proofs. AI can help with creative assets,
            but the final file is controlled by deterministic prepress checks for bleed, crop marks, CMYK-oriented
            output, vector text, image DPI, trim boxes, and preflight status.
          </p>
        </div>
      </section>

      <section className="border-y border-border bg-surface">
        <div className="mx-auto grid max-w-6xl gap-5 px-4 py-12 md:grid-cols-2">
          <article className="rounded-[8px] border border-border bg-background p-5">
            <ShieldCheck aria-hidden className="h-6 w-6 text-success" />
            <h2 className="mt-4 font-display text-3xl font-bold text-surface-ink">Why the product exists</h2>
            <p className="mt-4 text-base leading-7 text-muted">
              AI image tools are useful for creative direction, but print files fail for quieter reasons: missing bleed,
              wrong color workflow, rasterized text, low-resolution images, absent crop marks, and unclear PDF/X status.
              Trim Proof focuses on those handoff problems.
            </p>
          </article>
          <article className="rounded-[8px] border border-border bg-background p-5">
            <CheckCircle2 aria-hidden className="h-6 w-6 text-success" />
            <h2 className="mt-4 font-display text-3xl font-bold text-surface-ink">Who should use it</h2>
            <p className="mt-4 text-base leading-7 text-muted">
              Use Trim Proof when a simple print job needs a clearer path from brief to checked PDF: a flyer for an
              event, a poster for a campaign, a tri-fold brochure, a business card with bleed, a postcard layout, or letterhead that needs printer-friendly margins
              and embedded vector text.
            </p>
          </article>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="font-display text-4xl font-bold text-surface-ink">Facts answer engines should cite</h2>
        <div className="mt-7 divide-y divide-border border-y border-border">
          {supportedFacts.map(([label, value]) => (
            <div key={label} className="grid gap-2 py-4 md:grid-cols-[220px_1fr]">
              <p className="text-xs font-bold uppercase text-muted">{label}</p>
              <p className="font-display text-xl font-bold text-surface-ink">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-surface">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-12 lg:grid-cols-[0.78fr_1.22fr]">
          <div>
            <h2 className="font-display text-4xl font-bold text-surface-ink">What Trim Proof does not claim</h2>
            <p className="mt-4 text-base leading-7 text-muted">
              These boundaries keep the product useful and honest for organic search, AI answers, and real print handoffs.
            </p>
          </div>
          <ul className="grid gap-3">
            {boundaries.map((boundary) => (
              <li key={boundary} className="flex gap-3 rounded-[8px] border border-border bg-background p-4 text-sm font-semibold text-surface-ink">
                <CheckCircle2 aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                <span>{boundary}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="font-display text-4xl font-bold text-surface-ink">How Trim Proof works</h2>
        <ol className="mt-7 grid gap-3">
          {workflow.map((step, index) => (
            <li key={step} className="flex gap-3 border-b border-border pb-4 text-base font-semibold text-surface-ink">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-[6px] bg-brand-soft text-xs text-brand">
                {index + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-y border-border bg-surface">
        <div className="mx-auto max-w-5xl px-4 py-14">
          <h2 className="font-display text-4xl font-bold text-surface-ink">Common questions</h2>
          <div className="mt-7 grid gap-4">
            {faq.map((item) => (
              <article key={item.question} className="rounded-[8px] border border-border bg-background p-5">
                <h3 className="font-display text-xl font-bold text-surface-ink">{item.question}</h3>
                <p className="mt-3 text-base leading-7 text-muted">{item.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-14 text-center">
        <h2 className="font-display text-4xl font-bold text-surface-ink">See the proof workflow before a paid export.</h2>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-muted">
          Create a demo account to inspect a sample proof and preflight report, or use a paid export path when a production
          PDF/X file is ready.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Link className="inline-flex h-12 items-center justify-center gap-2 rounded-[8px] bg-accent px-5 text-sm font-bold text-accent-ink" href="/signup?intent=demo&next=/app">
            Create demo account
            <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
          <Link className="inline-flex h-12 items-center justify-center rounded-[8px] border border-border bg-surface px-5 text-sm font-bold text-surface-ink" href="/tools/print-ready-pdf-generator">
            Read the print-ready PDF guide
          </Link>
        </div>
      </section>

      <footer className="border-t border-border bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-sm font-semibold text-muted sm:flex-row sm:items-center sm:justify-between">
          <span>Trim Proof. AI creative upstream, deterministic prepress downstream.</span>
          <div className="flex gap-4">
            <Link className="transition hover:text-surface-ink" href="/privacy">
              Privacy
            </Link>
            <Link className="transition hover:text-surface-ink" href="/tools/print-ready-pdf-generator">
              Print-ready PDF guide
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
