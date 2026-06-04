"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  FileCheck2,
  Layers3,
  Mail,
  Ruler,
  SearchCheck,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { trackEvent } from "@/lib/analytics/events";

const answerBlocks = [
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
      "Dummy proof mode gives visitors a fast sample business-card proof so they can see the bleed, trim, safe area, crop marks, and preflight report without setting up a full production job."
  }
];

const keywordTargets = [
  "AI flyer generator",
  "AI business card generator",
  "print ready PDF",
  "PDF/X-1a",
  "convert PDF to CMYK",
  "add bleed to PDF online",
  "PDF preflight checker"
];

const workflowCards: Array<[string, string, LucideIcon]> = [
  ["Brief", "Describe the piece: business card, flyer, postcard, or letterhead.", Sparkles],
  ["Creative assets", "Use AI for imagery and decorative art, never final text.", Layers3],
  ["Prepress", "Typeset text as embedded vector fonts and build exact bleed geometry.", Ruler],
  ["Gate", "Run PDF/X, CMYK, font, DPI, and box checks before delivery.", ShieldCheck]
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
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
          description: "Pricing is configured through Stripe for export credits and subscriptions."
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
          { "@type": "HowToStep", name: "Write a brief", text: "Describe the business card, flyer, postcard, or letterhead you need." },
          { "@type": "HowToStep", name: "Choose a proof mode", text: "Use dummy proof mode for a fast sample or advanced mode for full PDF/X export controls." },
          { "@type": "HowToStep", name: "Run preflight", text: "Trim Proof checks trim, bleed, fonts, color workflow, image DPI, and PDF/X status." },
          { "@type": "HowToStep", name: "Download the file", text: "Download the validated file after the preflight gate passes or is flagged for review." }
        ]
      }
    ]
  };

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />;
}

function EmailCapture() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    const response = await fetch("/api/email-signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, source: "marketing_home" })
    });
    if (!response.ok) {
      setStatus("error");
      return;
    }
    trackEvent("email_signup_submitted", { source: "marketing_home" });
    setEmail("");
    setStatus("sent");
  }

  return (
    <form className="flex flex-col gap-2 sm:flex-row" onSubmit={submit}>
      <label className="sr-only" htmlFor="email">
        Email address
      </label>
      <input
        id="email"
        className="h-11 min-w-0 flex-1 rounded-[8px] border border-border bg-surface px-3 text-sm text-surface-ink"
        placeholder="you@printshop.com"
        type="email"
        value={email}
        required
        onChange={(event) => setEmail(event.target.value)}
      />
      <button
        className="inline-flex h-11 items-center justify-center gap-2 rounded-[8px] bg-surface-ink px-5 text-sm font-semibold text-white disabled:opacity-60"
        disabled={status === "loading"}
        type="submit"
      >
        <Mail aria-hidden className="h-4 w-4" />
        Get launch updates
      </button>
      <span className="sr-only" aria-live="polite">
        {status === "sent" ? "Signup received" : status === "error" ? "Signup failed" : ""}
      </span>
    </form>
  );
}

export function MarketingSite() {
  return (
    <main className="min-h-screen text-foreground">
      <JsonLd />
      <header className="sticky top-0 z-10 border-b border-border bg-background/92 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <Link className="flex items-center gap-3" href="/">
            <span className="grid h-9 w-9 place-items-center rounded-[8px] bg-surface-ink text-white">
              <FileCheck2 aria-hidden className="h-4 w-4" />
            </span>
            <span className="font-display text-lg font-bold">Trim Proof</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-semibold text-muted md:flex">
            <a href="#how-it-works">How it works</a>
            <a href="#seo-pages">Tools</a>
            <a href="#faq">FAQ</a>
          </nav>
          <Link
            className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] bg-surface-ink px-4 text-sm font-semibold text-white"
            href="/app"
            onClick={() => trackEvent("dummy_proof_started", { source: "nav" })}
          >
            Try dummy proof
            <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <section className="relative min-h-[calc(100svh-8rem)] overflow-hidden">
        <Image
          alt="Trim Proof SaaS workspace showing brief intake, business card proof, PDF/X preflight, and billing controls."
          className="object-cover"
          fill
          priority
          sizes="100vw"
          src="/trim-proof-workspace-concept.png"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,oklch(0.16_0.02_248_/_0.88),oklch(0.16_0.02_248_/_0.58)_48%,oklch(0.16_0.02_248_/_0.18))]" />
        <div className="relative mx-auto flex min-h-[calc(100svh-8rem)] max-w-7xl items-center px-4 py-14">
          <div className="max-w-3xl">
            <h1 className="font-display text-5xl font-bold leading-[1.02] text-white md:text-6xl">
            Create print-ready PDF/X files from a plain-English brief.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/86">
              Trim Proof pairs AI-assisted creative direction with deterministic prepress: CMYK output, bleed, crop marks,
              embedded vector fonts, 300 DPI checks, and a preflight gate before download.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                className="inline-flex h-12 items-center justify-center gap-2 rounded-[8px] bg-accent px-5 text-sm font-bold text-accent-ink"
                href="/app"
                onClick={() => trackEvent("dummy_proof_started", { source: "hero" })}
              >
                Run a dummy proof
                <ArrowRight aria-hidden className="h-4 w-4" />
              </Link>
              <Link
                className="inline-flex h-12 items-center justify-center gap-2 rounded-[8px] border border-white/28 bg-white/12 px-5 text-sm font-bold text-white backdrop-blur"
                href="/app?mode=advanced"
                onClick={() => trackEvent("advanced_mode_selected", { source: "hero" })}
              >
                Open advanced mode
              </Link>
            </div>
            <div className="mt-8 grid max-w-xl grid-cols-2 gap-3 text-sm font-semibold text-white sm:grid-cols-3">
              {["PDF/X-1a", "CMYK", "Bleed boxes", "Crop marks", "Vector text", "Preflight"].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <CheckCircle2 aria-hidden className="h-4 w-4 text-accent" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-surface" id="how-it-works">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 md:grid-cols-4">
          {workflowCards.map(([title, body, Icon]) => (
            <div key={title} className="rounded-[8px] border border-border bg-background p-5">
              <Icon aria-hidden className="h-5 w-5 text-accent" />
              <h2 className="mt-4 font-display text-xl font-bold text-surface-ink">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-muted">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="grid gap-8 lg:grid-cols-[0.75fr_1fr]">
          <div>
            <SearchCheck aria-hidden className="h-6 w-6 text-brand" />
            <h2 className="mt-4 font-display text-3xl font-bold text-surface-ink">Built around the searches print buyers actually make.</h2>
            <p className="mt-4 text-base leading-7 text-muted">
              DataForSEO research showed demand around AI flyer generation, AI business cards, CMYK PDF conversion,
              PDF/X-1a, print-ready PDFs, and business cards with bleed. The product and content architecture target those
              jobs directly.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {keywordTargets.map((keyword) => (
              <Link
                key={keyword}
                className="rounded-[8px] border border-border bg-surface p-4 font-semibold text-surface-ink transition hover:border-accent"
                href="/tools/print-ready-pdf-generator"
              >
                {keyword}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-surface" id="faq">
        <div className="mx-auto max-w-5xl px-4 py-16">
          <h2 className="font-display text-3xl font-bold text-surface-ink">Answers for printers, designers, and small teams</h2>
          <div className="mt-8 space-y-4">
            {answerBlocks.map((item) => (
              <article key={item.question} className="rounded-[8px] border border-border bg-background p-5">
                <h3 className="font-display text-xl font-bold text-surface-ink">{item.question}</h3>
                <p className="mt-3 text-base leading-7 text-muted">{item.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-16 text-center">
        <BadgeCheck aria-hidden className="mx-auto h-7 w-7 text-success" />
        <h2 className="mt-4 font-display text-3xl font-bold text-surface-ink">Get the launch notes and prepress checklist.</h2>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-muted">
          Join the early list for product updates, SEO pages, print-profile notes, and the first production export tests.
        </p>
        <div className="mx-auto mt-6 max-w-xl">
          <EmailCapture />
        </div>
      </section>
    </main>
  );
}
