"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  Gauge,
  Layers3,
  MoveRight,
  Ruler,
  SearchCheck,
  ShieldCheck,
  Sparkles,
  Store,
  UsersRound,
  WalletCards
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { trackEvent } from "@/lib/analytics/events";
import { EmailCaptureForm } from "@/components/email-capture-form";

const answerBlocks = [
  {
    question: "What does Trim Proof do?",
    answer:
      "Trim Proof turns plain-English briefs for flyers, posters, menus, brochures, business cards, postcards, and letterhead into print-ready PDF/X proofs with bleed, crop marks, embedded vector text, CMYK-oriented output, and preflight checks."
  },
  {
    question: "What is a print-ready PDF?",
    answer:
      "A print-ready PDF has the correct final size, bleed, crop marks, embedded fonts, high-resolution images, and a printer-safe color workflow. Trim Proof creates and checks those properties before a file is delivered."
  },
  {
    question: "Can AI make a PDF/X file by itself?",
    answer:
      "Image models can create useful creative assets, but they do not reliably create vector text, CMYK output, trim boxes, bleed boxes, ICC profiles, or PDF/X conformance. Trim Proof keeps AI in the creative stage and uses deterministic prepress tooling for the final file."
  },
  {
    question: "What is dummy proof mode?",
    answer:
      "Dummy proof mode gives visitors a fast sample proof with watermarked art so they can see the bleed, trim, safe area, crop marks, and preflight report before paying for a clean production download."
  }
];

const keywordTargets = [
  { label: "Business card maker", href: "/tools/ai-business-card-generator" },
  { label: "Business card creator", href: "/tools/ai-business-card-generator" },
  { label: "Business card generator", href: "/tools/ai-business-card-generator" },
  { label: "Poster size", href: "/tools/poster-size-guide" },
  { label: "Business card size", href: "/tools/business-card-size-guide" },
  { label: "Poster maker", href: "/tools/poster-maker" },
  { label: "Flyer maker", href: "/tools/ai-flyer-generator" },
  { label: "Free flyer maker", href: "/tools/free-ai-flyer-generator" },
  { label: "Free AI flyer generator", href: "/tools/free-ai-flyer-generator" },
  { label: "AI business card generator", href: "/tools/ai-business-card-generator" },
  { label: "Free business card maker", href: "/tools/free-ai-business-card-generator" },
  { label: "Free poster maker", href: "/tools/free-poster-maker" },
  { label: "AI poster generator", href: "/tools/poster-maker" },
  { label: "Poster template", href: "/tools/poster-pdf-template" },
  { label: "Postcard size", href: "/tools/postcard-size-guide" },
  { label: "Brochure maker", href: "/tools/brochure-maker" },
  { label: "Free brochure maker", href: "/tools/free-brochure-maker" },
  { label: "Tri-fold brochure template", href: "/tools/tri-fold-brochure-template" },
  { label: "Brochure size", href: "/tools/brochure-size-guide" },
  { label: "Menu maker", href: "/tools/menu-maker" },
  { label: "Free menu maker", href: "/tools/free-menu-maker" },
  { label: "Menu template", href: "/tools/menu-pdf-template" },
  { label: "Print ready PDF", href: "/tools/print-ready-pdf-generator" },
  { label: "Print-ready artwork", href: "/tools/print-ready-artwork" },
  { label: "Convert PDF to CMYK", href: "/tools/pdf-to-cmyk-converter" },
  { label: "Add bleed to PDF online", href: "/tools/add-bleed-to-pdf-online" },
  { label: "PDF preflight checker", href: "/tools/pdf-preflight-checker" },
  { label: "PDF/X-4", href: "/tools/pdfx-4-print-ready-pdf" },
  { label: "Canva print quality", href: "/tools/canva-cmyk-print-quality" },
  { label: "Canva print ready PDF", href: "/tools/canva-print-ready-pdf" },
  { label: "Canva bleed and crop marks", href: "/tools/canva-bleed-and-crop-marks" },
  { label: "Online prepress tools", href: "/tools/online-pdf-prepress-tools" },
  { label: "Prepress checklist", href: "/tools/prepress-checklist" },
  { label: "Prepress software", href: "/tools/prepress-automation-software" },
  { label: "Proofing software", href: "/tools/online-proofing-software" },
  { label: "Flyer size", href: "/tools/flyer-size-guide" },
  { label: "Business card pixel size", href: "/tools/business-card-pixel-size" },
  { label: "Business card bleed size", href: "/tools/business-card-bleed-size" },
  { label: "Flyer PDF template", href: "/tools/flyer-pdf-template" },
  { label: "Postcard maker", href: "/tools/postcard-maker" },
  { label: "Free postcard maker", href: "/tools/free-postcard-maker" },
  { label: "Postcard template", href: "/tools/postcard-pdf-template" },
  { label: "Letterhead maker", href: "/tools/letterhead-maker" },
  { label: "Free letterhead maker", href: "/tools/free-letterhead-maker" },
  { label: "Letterhead format", href: "/tools/letterhead-format-guide" },
  { label: "Letterhead template", href: "/tools/letterhead-pdf-template" }
];

const proofMetrics = [
  ["Trim", "starter profiles"],
  ["Bleed", "0.125 in"],
  ["Images", "300 DPI gate"],
  ["Text", "Vector embedded"],
  ["Color", "CMYK / ICC"],
  ["Output", "PDF/X-1a"]
];

const workflowCards: Array<[string, string, LucideIcon]> = [
  ["01 Brief", "Plain-English job intake for cards, flyers, posters, menus, brochures, postcards, and letterhead.", Sparkles],
  ["02 Creative", "Image models create decorative art while final text stays deterministic.", Layers3],
  ["03 Geometry", "Trim, bleed, safe area, crop marks, ICC profile, and boxes are built exactly.", Ruler],
  ["04 Gate", "PDF/X, fonts, color, and DPI checks decide whether the file is safe to export.", ShieldCheck]
];

const buyerSegments: Array<[string, string, string, string, LucideIcon]> = [
  [
    "Print shops",
    "Move small customer jobs from rough notes to checked starter proofs before production staff touch the file.",
    "Use Trim Proof for repeatable first-pass setup, preflight evidence, and fewer avoidable file-prep conversations.",
    "/for-print-shops",
    Store
  ],
  [
    "In-house marketers",
    "Create local flyers, menus, postcards, posters, and handouts without guessing the printer's file rules.",
    "Use Trim Proof when the deadline is close and the final file still needs bleed, crop marks, and vector text.",
    "/for-marketers",
    Building2
  ],
  [
    "Freelance designers",
    "Turn client copy into a structured proof, then hand over a PDF/X-oriented file with a visible checklist.",
    "Use Trim Proof as a production safety layer around fast creative work instead of a generic template library.",
    "/for-designers",
    UsersRound
  ]
];

const comparisonRows = [
  ["Generic AI design tools", "Fast visual concepts, template browsing, and social assets.", "They often stop at screen-ready art, raster text, RGB output, or unclear print boxes."],
  ["Traditional preflight tools", "Deep inspection and repair for production specialists.", "They expect the file already exists and usually assume Acrobat, plugins, or prepress training."],
  ["Trim Proof", "A guided path from brief to checked proof.", "AI helps upstream; deterministic code owns PDF/X, CMYK-oriented output, bleed, crop marks, vector text, and the preflight report."]
];

const launchPlays: Array<[string, string, LucideIcon]> = [
  ["10-credit print-shop pilot", "Test repeat jobs with a short feedback program built for printers, designers, and high-volume local marketers.", ClipboardCheck],
  ["Free prepress checklist", "Start with the print checks buyers already search for: bleed, CMYK, PDF/X, Canva print quality, and preflight.", SearchCheck],
  ["Founder follow-up", "Get help turning real job details into supported proofs, then use the same account for paid exports when a file is ready.", Gauge]
];

const productEvidence = [
  ["Guided brief intake", "Sample jobs and a readiness checklist help new users start without a blank canvas."],
  ["Visible print geometry", "Trim, bleed, and safe-area guides appear around the proof before export."],
  ["Preflight path", "The workspace leads toward a press proof, report, and paid clean PDF/X download."],
  ["Honest limits", "Demo art stays watermarked and production files stay locked until an export is paid."]
];

const pricingPlans = [
  {
    id: "dummy",
    name: "Dummy proof",
    price: "$0",
    cadence: "account demo",
    body: "Create a free account, then see bleed, trim, safe-area guides, crop marks, and a preflight report.",
    cta: "Create demo account",
    href: "/signup?intent=demo&next=/app",
    features: ["Account required", "Sample business-card proof", "Preflight report"]
  },
  {
    id: "export",
    name: "Export credit",
    price: "$12",
    cadence: "per export",
    body: "Unlock one advanced PDF/X export when a specific job needs a printer-ready file.",
    cta: "Buy export credit",
    href: "/signup?intent=single_export&next=/app%3Fmode%3Dadvanced",
    features: ["PDF/X-1a export", "CMYK conversion", "Credit consumed on generated proof"]
  },
  {
    id: "pro",
    name: "Trim Proof Pro",
    price: "$49",
    cadence: "per month",
    body: "Use advanced mode for recurring print work without buying one credit at a time.",
    cta: "Start Pro",
    href: "/signup?intent=pro&next=/app%3Fmode%3Dadvanced",
    features: ["15 advanced exports per month", "Subscription checkout", "Built for frequent jobs"]
  }
];

function JsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://trimproof.com/#organization",
        name: "Trim Proof",
        url: "https://trimproof.com/",
        sameAs: []
      },
      {
        "@type": "SoftwareApplication",
        "@id": "https://trimproof.com/#software",
        name: "Trim Proof",
        applicationCategory: "DesignApplication",
        operatingSystem: "Web",
        description:
          "Trim Proof turns design briefs into print-ready PDF/X files with deterministic CMYK conversion, bleed, crop marks, embedded vector fonts, and preflight checks.",
        offers: {
          "@type": "AggregateOffer",
          priceCurrency: "USD",
          lowPrice: "0",
          highPrice: "49",
          offerCount: 3,
          offers: [
            { "@type": "Offer", name: "Dummy proof", price: "0", priceCurrency: "USD" },
            { "@type": "Offer", name: "Export credit", price: "12", priceCurrency: "USD" },
            { "@type": "Offer", name: "Trim Proof Pro", price: "49", priceCurrency: "USD" }
          ]
        }
      },
      {
        "@type": "FAQPage",
        mainEntity: answerBlocks.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.answer
          }
        }))
      },
      {
        "@type": "HowTo",
        name: "How to create a print-ready PDF with Trim Proof",
        step: [
          {
            "@type": "HowToStep",
            name: "Write a brief",
            text: "Describe the business card, flyer, poster, menu, brochure, postcard, or letterhead you need."
          },
          { "@type": "HowToStep", name: "Choose a proof mode", text: "Use dummy proof mode for a fast watermarked sample or advanced mode for full PDF/X export controls." },
          { "@type": "HowToStep", name: "Run preflight", text: "Trim Proof checks trim, bleed, fonts, color workflow, image DPI, and PDF/X status." },
          { "@type": "HowToStep", name: "Download the file", text: "Use paid advanced export to download the clean production PDF/X file after the preflight gate passes or is flagged for review." }
        ]
      }
    ]
  };

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />;
}

export function MarketingSite() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <JsonLd />
      <header className="sticky top-0 z-10 border-b border-border bg-surface/94 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <Link className="flex items-center gap-3" href="/">
            <span className="grid h-9 w-9 place-items-center rounded-[8px] bg-surface-ink text-white shadow-[0_10px_30px_oklch(0.18_0.02_252_/_0.18)]">
              <FileCheck2 aria-hidden className="h-4 w-4" />
            </span>
            <span>
              <span className="block font-display text-lg font-bold leading-none">Trim Proof</span>
              <span className="hidden text-[11px] font-semibold uppercase text-muted sm:block">PDF/X proof engine</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-semibold text-muted md:flex">
            <a href="#how-it-works">How it works</a>
            <a href="#for-teams">For teams</a>
            <a href="#compare">Compare</a>
            <Link href="/sample-reports">Sample reports</Link>
            <Link href="/pricing">Pricing</Link>
            <a href="#seo-pages">Tools</a>
            <Link href="/about">About</Link>
            <a href="#faq">FAQ</a>
          </nav>
          <Link
            className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] bg-surface-ink px-4 text-sm font-semibold text-white"
            href="/signup?intent=demo&next=/app"
            onClick={() => trackEvent("dummy_proof_started", { source: "nav" })}
          >
            Create account
            <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <section className="relative min-h-[calc(88svh-4rem)] overflow-hidden border-b border-border">
        <Image
          alt="Trim Proof SaaS workspace showing brief intake, business card proof, PDF/X preflight, and billing controls."
          className="object-cover"
          fill
          priority
          sizes="100vw"
          src="/trim-proof-workspace-concept.png"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,oklch(0.14_0.018_252_/_0.92),oklch(0.18_0.025_252_/_0.74)_42%,oklch(0.21_0.02_252_/_0.22)_76%)]" />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-[linear-gradient(0deg,oklch(0.14_0.018_252_/_0.68),transparent)]" />
        <div className="relative mx-auto grid min-h-[calc(88svh-4rem)] max-w-7xl content-end px-4 py-8 md:py-10">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.72fr)] lg:items-end">
            <div className="max-w-4xl">
              <p className="mb-4 inline-flex items-center gap-2 border-y border-white/24 py-2 text-[11px] font-bold uppercase text-white/82 sm:text-xs">
                AI upstream <MoveRight aria-hidden className="h-3.5 w-3.5" /> deterministic prepress downstream
              </p>
              <h1 className="max-w-4xl font-display text-[clamp(2.65rem,7.4vw,6.4rem)] font-bold leading-[0.92] text-white">
                AI print-ready PDF generator for flyers, posters, menus, brochures, and business cards.
            </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-white/86 md:mt-6 md:text-lg md:leading-8">
                Trim Proof turns a plain-English print brief into a checked PDF/X proof with CMYK output, crop marks,
                embedded vector fonts, correct boxes, and a preflight gate before download.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-[8px] bg-accent px-5 text-sm font-bold text-accent-ink shadow-[0_18px_50px_oklch(0.58_0.22_342_/_0.35)]"
                  href="/signup?intent=demo&next=/app"
                  onClick={() => trackEvent("dummy_proof_started", { source: "hero" })}
                >
                  Create demo account
                  <ArrowRight aria-hidden className="h-4 w-4" />
                </Link>
                <Link
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-[8px] border border-white/28 bg-white/12 px-5 text-sm font-bold text-white backdrop-blur transition hover:bg-white/18"
                  href="/signup?intent=pro&next=/app%3Fmode%3Dadvanced"
                  onClick={() => trackEvent("advanced_mode_selected", { source: "hero" })}
                >
                  Start advanced mode
                </Link>
              </div>
            </div>

            <div className="hidden border-y border-white/22 py-4 text-white sm:block">
              <p className="text-xs font-bold uppercase text-white/70">Proof manifest</p>
              <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-4">
                {proofMetrics.map(([label, value]) => (
                  <div key={label} className="border-t border-white/18 pt-3">
                    <p className="text-[11px] font-bold uppercase text-white/58">{label}</p>
                    <p className="mt-1 font-display text-lg font-bold">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-surface" id="how-it-works">
        <div className="mx-auto grid max-w-7xl gap-0 px-4 py-12 md:grid-cols-4">
          {workflowCards.map(([title, body, Icon]) => (
            <div key={title} className="border-b border-border py-5 md:border-b-0 md:border-r md:px-6 md:last:border-r-0">
              <Icon aria-hidden className="h-5 w-5 text-accent" />
              <h2 className="mt-4 font-display text-xl font-bold text-surface-ink">{title}</h2>
              <p className="mt-3 max-w-[16rem] text-sm leading-6 text-muted">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-b border-border bg-background">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-16 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <FileCheck2 aria-hidden className="h-6 w-6 text-brand" />
            <h2 className="mt-4 font-display text-4xl font-bold leading-tight text-surface-ink">A production path, not another image generator.</h2>
            <p className="mt-4 text-base leading-7 text-muted">
              Most AI design tools stop at a raster preview. Trim Proof keeps the fun part upstream, then builds the boring
              press rules every printer asks for.
            </p>
          </div>
          <div className="divide-y divide-border border-y border-border">
            {[
              ["Creative output", "AI-generated imagery and decorative art"],
              ["Layout contract", "Typed text blocks, trim size, safe area, bleed, crop marks"],
              ["Preflight evidence", "PDF/X status, color profile, fonts, DPI, and box checks"],
              ["Paid delivery", "Stripe-backed export credits or Pro with 15 monthly exports"]
            ].map(([label, value]) => (
              <div key={label} className="grid gap-2 py-4 sm:grid-cols-[180px_1fr]">
                <p className="text-xs font-bold uppercase text-muted">{label}</p>
                <p className="font-display text-xl font-bold text-surface-ink">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-surface" id="product-evidence">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-16 lg:grid-cols-[0.74fr_1.26fr] lg:items-center">
          <div>
            <FileCheck2 aria-hidden className="h-6 w-6 text-brand" />
            <p className="mt-4 text-sm font-bold uppercase text-brand">Current workspace</p>
            <h2 className="mt-3 font-display text-4xl font-bold leading-tight text-surface-ink">Show the proof surface before asking buyers to believe the pitch.</h2>
            <p className="mt-4 text-base leading-7 text-muted">
              The public message now has a real app image behind it: brief intake, sample jobs, print guides, proof readiness,
              chat, save, and export controls on the same surface.
            </p>
            <div className="mt-6 divide-y divide-border border-y border-border">
              {productEvidence.map(([label, body]) => (
                <div key={label} className="grid gap-2 py-4 sm:grid-cols-[170px_1fr]">
                  <p className="text-xs font-bold uppercase text-brand">{label}</p>
                  <p className="text-sm font-semibold leading-6 text-surface-ink">{body}</p>
                </div>
              ))}
            </div>
            <Link className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-[8px] bg-surface-ink px-4 text-sm font-bold text-white" href="/sample-reports">
              View sample reports
              <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>
          </div>
          <figure>
            <div className="overflow-hidden rounded-[8px] border border-border bg-background shadow-[0_22px_70px_oklch(0.18_0.02_252_/_0.14)]">
              <Image
                alt="Trim Proof workspace with design brief, sample print jobs, business card proof guides, design chat, and press proof controls."
                className="h-auto w-full"
                height={860}
                sizes="(min-width: 1024px) 58vw, 100vw"
                src="/images/product/trim-proof-workspace-app.png"
                width={1440}
              />
            </div>
            <figcaption className="mt-3 text-xs font-semibold leading-5 text-muted">
              Local product screenshot captured from the current Trim Proof workspace with non-customer sample content.
            </figcaption>
          </figure>
        </div>
      </section>

      <section className="border-b border-border bg-surface" id="for-teams">
        <div className="mx-auto max-w-7xl px-4 py-16">
          <div className="grid gap-5 lg:grid-cols-[0.76fr_1fr] lg:items-end">
            <div>
              <Store aria-hidden className="h-6 w-6 text-brand" />
              <h2 className="mt-4 font-display text-4xl font-bold leading-tight text-surface-ink">Built for the teams stuck between Canva and the press room.</h2>
            </div>
            <p className="text-base leading-7 text-muted">
              Use Trim Proof when a normal design tool feels fast, but the printer still needs a real
              handoff: trim size, bleed, safe area, crop marks, embedded vector text, color workflow, PDF/X status, and
              a report someone can inspect.
            </p>
          </div>
          <div className="mt-8 grid gap-0 overflow-hidden rounded-[8px] border border-border bg-background lg:grid-cols-3">
            {buyerSegments.map(([title, problem, outcome, href, Icon]) => (
              <article key={title} className="border-b border-border p-5 last:border-b-0 lg:border-b-0 lg:border-r lg:last:border-r-0">
                <Icon aria-hidden className="h-5 w-5 text-accent" />
                <h3 className="mt-4 font-display text-2xl font-bold text-surface-ink">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted">{problem}</p>
                <p className="mt-4 border-t border-border pt-4 text-sm font-semibold leading-6 text-surface-ink">{outcome}</p>
                <Link className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-brand transition hover:text-surface-ink" href={href}>
                  View use case
                  <ArrowRight aria-hidden className="h-4 w-4" />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-background" id="compare">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-16 lg:grid-cols-[0.76fr_1fr]">
          <div>
            <Gauge aria-hidden className="h-6 w-6 text-brand" />
            <h2 className="mt-4 font-display text-4xl font-bold leading-tight text-surface-ink">Not better templates. Proof before download.</h2>
            <p className="mt-4 text-base leading-7 text-muted">
              The market is split between creative generators and expert preflight software. Trim Proof can sit between
              them: easy enough for the buyer who only has a brief, rigorous enough to make print risks visible.
            </p>
          </div>
          <div className="divide-y divide-border border-y border-border">
            {comparisonRows.map(([label, strength, gap]) => (
              <div key={label} className="grid gap-3 py-5 md:grid-cols-[190px_1fr_1fr]">
                <p className="text-xs font-bold uppercase text-brand">{label}</p>
                <p className="text-sm leading-6 text-surface-ink">{strength}</p>
                <p className="text-sm leading-6 text-muted">{gap}</p>
              </div>
            ))}
            <div className="py-5">
              <Link className="inline-flex items-center gap-2 text-sm font-bold text-brand transition hover:text-surface-ink" href="/compare/canva-print-ready-pdf">
                Read the Canva print-ready PDF comparison
                <ArrowRight aria-hidden className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-surface">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-16 lg:grid-cols-[0.76fr_1fr] lg:items-start">
          <div>
            <ClipboardCheck aria-hidden className="h-6 w-6 text-success" />
            <h2 className="mt-4 font-display text-4xl font-bold leading-tight text-surface-ink">Join the print-shop pilot.</h2>
            <p className="mt-4 text-base leading-7 text-muted">
              We are inviting printers, designers, and high-volume local marketers to test real jobs, pressure-check
              the preflight path, and shape the next supported print workflows.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link className="inline-flex h-11 items-center justify-center gap-2 rounded-[8px] bg-brand px-5 text-sm font-bold text-white transition hover:bg-surface-ink" href="/pilot-application">
                Apply for pilot
                <ArrowRight aria-hidden className="h-4 w-4" />
              </Link>
              <Link className="inline-flex h-11 items-center justify-center gap-2 rounded-[8px] border border-border bg-background px-5 text-sm font-bold text-surface-ink transition hover:border-brand hover:text-brand" href="/sample-reports">
                View sample reports
              </Link>
            </div>
            <div className="mt-5 max-w-xl">
              <EmailCaptureForm buttonLabel="Join pilot list" id="pilot-email" source="print_shop_pilot" />
            </div>
          </div>
          <div className="grid gap-3">
            {launchPlays.map(([title, body, Icon]) => (
              <article key={title} className="grid gap-3 rounded-[8px] border border-border bg-background p-5 sm:grid-cols-[auto_1fr]">
                <Icon aria-hidden className="h-5 w-5 text-brand" />
                <div>
                  <h3 className="font-display text-2xl font-bold text-surface-ink">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-surface" id="pricing">
        <div className="mx-auto max-w-7xl px-4 py-16">
          <div className="grid gap-5 lg:grid-cols-[0.8fr_1fr] lg:items-end">
            <div>
            <WalletCards aria-hidden className="h-6 w-6 text-brand" />
              <h2 className="mt-4 font-display text-4xl font-bold leading-tight text-surface-ink">Pay once for one file, or subscribe for repeat print work.</h2>
            </div>
            <p className="mt-4 text-base leading-7 text-muted">
              Trim Proof is usable before checkout, then paid advanced export is handled by Stripe. Small teams can buy
              one export credit for a single job or use the monthly plan when print-ready files are part of the weekly workflow.
            </p>
          </div>
          <div className="mt-8 grid gap-0 overflow-hidden rounded-[8px] border border-border bg-background lg:grid-cols-3">
            {pricingPlans.map((plan) => (
              <article key={plan.id} className="flex min-h-[340px] flex-col border-b border-border p-5 last:border-b-0 lg:border-b-0 lg:border-r lg:last:border-r-0">
                <div>
                  <h3 className="font-display text-2xl font-bold text-surface-ink">{plan.name}</h3>
                  <div className="mt-4 flex items-end gap-2">
                    <span className="font-display text-4xl font-bold text-surface-ink">{plan.price}</span>
                    <span className="pb-1 text-sm font-semibold text-muted">{plan.cadence}</span>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-muted">{plan.body}</p>
                </div>
                <ul className="mt-5 flex-1 space-y-3 text-sm font-semibold text-surface-ink">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-2">
                      <CheckCircle2 aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-[8px] bg-surface-ink px-4 text-sm font-bold text-white"
                  href={plan.href}
                  onClick={() =>
                    trackEvent(plan.id === "dummy" ? "dummy_proof_started" : "advanced_mode_selected", {
                      source: `pricing_${plan.id}`
                    })
                  }
                >
                  {plan.cta}
                  <ArrowRight aria-hidden className="h-4 w-4" />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16" id="seo-pages">
        <div className="grid gap-8 lg:grid-cols-[0.75fr_1fr]">
          <div>
            <SearchCheck aria-hidden className="h-6 w-6 text-brand" />
            <h2 className="mt-4 font-display text-4xl font-bold leading-tight text-surface-ink">Built around the searches print buyers actually make.</h2>
            <p className="mt-4 text-base leading-7 text-muted">
              DataForSEO research refreshed on June 12, 2026 across the United States and Canada showed the strongest
              demand around business card maker and size terms, poster size and poster maker terms, flyer maker terms,
              postcard size terms, brochure template demand, menu maker and menu template searches, and letterhead
              format/template searches. The product and content architecture target those jobs directly.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {keywordTargets.map((keyword) => (
              <Link
                key={keyword.label}
                className="group flex min-h-14 items-center justify-between border-b border-border bg-surface/70 px-4 font-semibold text-surface-ink transition hover:bg-brand-soft/55"
                href={keyword.href}
              >
                <span>{keyword.label}</span>
                <ArrowRight aria-hidden className="h-4 w-4 text-muted transition group-hover:translate-x-1 group-hover:text-brand" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-surface" id="faq">
        <div className="mx-auto max-w-5xl px-4 py-16">
          <h2 className="font-display text-4xl font-bold text-surface-ink">Answers for printers, designers, and small teams</h2>
          <div className="mt-8 divide-y divide-border border-y border-border">
            {answerBlocks.map((item) => (
              <article key={item.question} className="grid gap-3 py-6 lg:grid-cols-[0.42fr_0.58fr]">
                <h3 className="font-display text-xl font-bold text-surface-ink">{item.question}</h3>
                <p className="text-base leading-7 text-muted">{item.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-16 text-center">
        <BadgeCheck aria-hidden className="mx-auto h-7 w-7 text-success" />
        <h2 className="mt-4 font-display text-4xl font-bold text-surface-ink">Get the launch notes and prepress checklist.</h2>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-muted">
          Join the early list for product updates, SEO pages, print-profile notes, and the first production export tests.
        </p>
        <div className="mx-auto mt-6 max-w-xl">
          <EmailCaptureForm buttonLabel="Get launch updates" id="launch-email" source="marketing_home" />
        </div>
      </section>

      <footer className="border-t border-border bg-surface">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-sm font-semibold text-muted sm:flex-row sm:items-center sm:justify-between">
          <span>Trim Proof. AI creative upstream, deterministic prepress downstream.</span>
          <div className="flex gap-4">
            <Link className="transition hover:text-surface-ink" href="/about">
              About
            </Link>
            <Link className="transition hover:text-surface-ink" href="/tools">
              Tools
            </Link>
            <Link className="transition hover:text-surface-ink" href="/pricing">
              Pricing
            </Link>
            <Link className="transition hover:text-surface-ink" href="/privacy">
              Privacy
            </Link>
            <Link className="transition hover:text-surface-ink" href="/signup?intent=demo&next=/app">
              App
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
