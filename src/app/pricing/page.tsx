import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, CreditCard, FileCheck2, ShieldCheck } from "lucide-react";
import { getSiteOrigin } from "@/lib/seo/site-url";

export const metadata: Metadata = {
  title: "Trim Proof Pricing",
  description:
    "Trim Proof pricing: create a free watermarked demo proof, buy a $12 export credit for one clean production PDF/X export, or use Trim Proof Pro for $49/month with 15 advanced exports.",
  alternates: {
    canonical: "/pricing"
  },
  openGraph: {
    title: "Trim Proof Pricing",
    description:
      "Free watermarked demo proof, $12 export credit, and $49/month Trim Proof Pro for recurring print-ready PDF/X work.",
    url: "/pricing",
    siteName: "Trim Proof",
    type: "website"
  },
  twitter: {
    card: "summary",
    title: "Trim Proof Pricing",
    description:
      "Compare the free watermarked demo, one-export credit, and Trim Proof Pro plan for checked PDF/X proofs."
  }
};

const plans = [
  {
    id: "demo",
    name: "Dummy proof",
    price: "$0",
    cadence: "account demo",
    body: "Create a free account to see a watermarked sample proof, bleed guides, crop marks, and a preflight report before buying a clean export.",
    cta: "Create demo account",
    href: "/signup?intent=demo&next=/app",
    features: ["Account required", "Watermarked sample art", "Visible trim, bleed, and safe-area guides", "Preflight report"]
  },
  {
    id: "export",
    name: "Export credit",
    price: "$12",
    cadence: "per export",
    body: "Buy one advanced PDF/X-1a production export when a specific flyer, poster, brochure, card, postcard, or letterhead job is ready.",
    cta: "Buy one export credit",
    href: "/signup?intent=single_export&next=/app%3Fmode%3Dadvanced",
    features: ["One production PDF/X-1a export", "CMYK-oriented output path", "Crop marks when requested", "Credit consumed on generated proof"]
  },
  {
    id: "pro",
    name: "Trim Proof Pro",
    price: "$49",
    cadence: "per month",
    body: "Use Pro when recurring print work needs checked exports without buying one credit at a time.",
    cta: "Start Pro",
    href: "/signup?intent=pro&next=/app%3Fmode%3Dadvanced",
    features: ["15 advanced exports per month", "Subscription checkout", "Built for recurring flyer, poster, brochure, card, postcard, and letterhead jobs", "Stripe subscription management"]
  }
];

const facts = [
  ["Supported products", "Flyers, posters, brochures, business cards, postcards, and letterhead."],
  ["Current verified export", "PDF/X-1a-oriented production export with preflight checks."],
  ["Prepress checks", "Bleed, crop marks, trim boxes, embedded vector text, color workflow, image DPI, and PDF/X status."],
  ["Product boundary", "Trim Proof does not guarantee acceptance by every printer and is not a universal PDF repair tool or proof approval suite."]
];

const faq = [
  {
    question: "Can I use Trim Proof for free?",
    answer:
      "Yes. A free account can create a watermarked sample proof and preflight report. Clean production PDF/X downloads require an export credit or Trim Proof Pro."
  },
  {
    question: "What does the $12 export credit include?",
    answer:
      "One export credit unlocks one advanced production PDF/X-1a export when a specific supported print job is ready. The credit is consumed when the generated proof is exported."
  },
  {
    question: "What does Trim Proof Pro include?",
    answer:
      "Trim Proof Pro is $49 per month and includes 15 advanced exports per billing month for recurring flyer, poster, brochure, business-card, postcard, and letterhead work."
  },
  {
    question: "Does paying guarantee printer acceptance?",
    answer:
      "No. Trim Proof checks common file-structure issues, but printer-specific requirements can vary. Compare the final proof against the printer's own specifications."
  }
];

function PricingJsonLd() {
  const origin = getSiteOrigin();
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Trim Proof", item: `${origin}/` },
          { "@type": "ListItem", position: 2, name: "Pricing", item: `${origin}/pricing` }
        ]
      },
      {
        "@type": "WebPage",
        "@id": `${origin}/pricing#webpage`,
        name: "Trim Proof Pricing",
        url: `${origin}/pricing`,
        description:
          "Trim Proof pricing for free watermarked demo proofs, one-time export credits, and Trim Proof Pro."
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${origin}/#software`,
        name: "Trim Proof",
        applicationCategory: "DesignApplication",
        operatingSystem: "Web",
        description:
          "Trim Proof creates print-ready PDF/X proofs with deterministic prepress checks for supported starter products.",
        offers: {
          "@type": "AggregateOffer",
          priceCurrency: "USD",
          lowPrice: "0",
          highPrice: "49",
          offerCount: plans.length,
          offers: [
            { "@type": "Offer", name: "Dummy proof", price: "0", priceCurrency: "USD", url: `${origin}/signup?intent=demo&next=/app` },
            { "@type": "Offer", name: "Export credit", price: "12", priceCurrency: "USD", url: `${origin}/signup?intent=single_export&next=/app%3Fmode%3Dadvanced` },
            { "@type": "Offer", name: "Trim Proof Pro", price: "49", priceCurrency: "USD", url: `${origin}/signup?intent=pro&next=/app%3Fmode%3Dadvanced` }
          ]
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

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <PricingJsonLd />
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link className="font-display text-lg font-bold text-surface-ink" href="/">
            Trim Proof
          </Link>
          <div className="flex items-center gap-4 text-sm font-semibold">
            <Link className="text-muted transition hover:text-surface-ink" href="/tools">
              Tools
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
          <CreditCard aria-hidden className="h-7 w-7 text-brand" />
          <p className="mt-5 text-sm font-bold uppercase text-brand">Trim Proof pricing</p>
          <h1 className="mt-3 font-display text-5xl font-bold leading-[1.04] text-surface-ink">
            Start with a free watermarked proof. Pay when a clean production PDF/X export is ready.
          </h1>
        </div>
        <div className="border-y border-border bg-surface p-5">
          <p className="text-xs font-bold uppercase text-brand">Short answer</p>
          <p className="mt-3 text-lg leading-8 text-surface-ink">
            Trim Proof offers a free watermarked demo account, a $12 one-export credit, and Trim Proof Pro at $49/month with 15 advanced exports. Paid paths unlock clean production-oriented PDF/X-1a exports for supported flyers, posters, brochures, business cards, postcards, and letterhead.
          </p>
        </div>
      </section>

      <section className="border-y border-border bg-surface">
        <div className="mx-auto grid max-w-6xl gap-4 px-4 py-12 lg:grid-cols-3">
          {plans.map((plan) => (
            <article key={plan.id} className="flex min-h-[420px] flex-col rounded-[8px] border border-border bg-background p-5">
              <div className="flex-1">
                <p className="text-xs font-bold uppercase text-brand">{plan.cadence}</p>
                <h2 className="mt-2 font-display text-3xl font-bold text-surface-ink">{plan.name}</h2>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="font-display text-5xl font-bold text-surface-ink">{plan.price}</span>
                  {plan.id === "pro" ? <span className="text-sm font-semibold text-muted">/mo</span> : null}
                </div>
                <p className="mt-4 text-sm leading-6 text-muted">{plan.body}</p>
                <ul className="mt-6 grid gap-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-2 text-sm font-semibold text-surface-ink">
                      <CheckCircle2 aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <Link className="mt-7 inline-flex h-11 items-center justify-center gap-2 rounded-[8px] bg-surface-ink px-4 text-sm font-bold text-white" href={plan.href}>
                {plan.cta}
                <ArrowRight aria-hidden className="h-4 w-4" />
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-14 lg:grid-cols-[0.72fr_1.28fr]">
        <div>
          <FileCheck2 aria-hidden className="h-6 w-6 text-success" />
          <h2 className="mt-4 font-display text-4xl font-bold text-surface-ink">What paid export is for</h2>
          <p className="mt-4 text-base leading-7 text-muted">
            Use paid export when the proof is for a real print job and the file needs a production-oriented PDF/X download rather than only a demo preview.
          </p>
        </div>
        <div className="divide-y divide-border border-y border-border">
          {facts.map(([label, value]) => (
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
            <ShieldCheck aria-hidden className="h-6 w-6 text-success" />
            <h2 className="mt-4 font-display text-4xl font-bold text-surface-ink">Pricing boundaries</h2>
            <p className="mt-4 text-base leading-7 text-muted">
              The checkout paths unlock the generated-proof workflow in Trim Proof. They do not turn the product into a universal PDF repair tool, a proof approval suite, or a guarantee that every printer will accept every file.
            </p>
          </div>
          <div className="grid gap-4">
            {faq.map((item) => (
              <article key={item.question} className="rounded-[8px] border border-border bg-background p-5">
                <h3 className="font-display text-xl font-bold text-surface-ink">{item.question}</h3>
                <p className="mt-3 text-base leading-7 text-muted">{item.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
