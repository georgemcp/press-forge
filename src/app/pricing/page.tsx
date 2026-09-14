import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, CreditCard, FileCheck2, ShieldCheck } from "lucide-react";
import { getSiteOrigin } from "@/lib/seo/site-url";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Try a free watermarked demo with a Trim Proof account. Clean PDF/X exports cost $12 each, or $49/month for 15 exports with Pro.",
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
    name: "Free demo",
    price: "$0",
    cadence: "with a free account",
    body: "See how a sample proof looks and review its file checks before you buy an export.",
    cta: "Try the free demo",
    href: "/signup?intent=demo&next=/app",
    features: ["Watermarked sample artwork", "File-check report included", "Visible trim, bleed, and safe-area guides", "No clean production download"]
  },
  {
    id: "export",
    name: "Export credit",
    price: "$12",
    cadence: "per export",
    body: "For a single print job. Buy one credit to generate and download one clean PDF/X proof.",
    cta: "Choose one export",
    href: "/signup?intent=single_export&next=/app%3Fmode%3Dadvanced",
    features: ["One clean PDF/X-1a export", "File checks and CMYK conversion", "Credit used only after checks pass", "No subscription"]
  },
  {
    id: "pro",
    name: "Trim Proof Pro",
    price: "$49",
    cadence: "per month",
    body: "For recurring print work. Get 15 clean PDF/X exports each billing month.",
    cta: "Choose Pro",
    href: "/signup?intent=pro&next=/app%3Fmode%3Dadvanced",
    features: ["15 exports per billing month", "Same file checks as single exports", "Monthly subscription", "Manage your subscription online"]
  }
];

const facts = [
  ["Supported products", "Flyers, posters, brochures, business cards, postcards, and letterhead."],
  ["Export format", "Clean PDF/X-1a files after the preflight checks pass."],
  ["File checks", "Page size, bleed, embedded fonts, image resolution, and PDF/X format."],
  ["Before printing", "Trim Proof does not guarantee acceptance by every printer. Compare the proof with your printer's specifications before ordering."]
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
      "One credit pays for one clean PDF/X-1a export. The credit is used when the proof passes its checks and is generated. If generation fails or the checks need attention, your credit stays available."
  },
  {
    question: "What does Trim Proof Pro include?",
    answer:
      "Pro costs $49 per month and includes 15 clean PDF/X exports per billing month for flyers, posters, brochures, business cards, postcards, and letterhead. Failed checks do not use an export from your allowance."
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
          "Trim Proof helps create print designs and checks size, bleed, embedded fonts, image resolution, and PDF/X format before paid export.",
        offers: {
          "@type": "AggregateOffer",
          priceCurrency: "USD",
          lowPrice: "0",
          highPrice: "49",
          offerCount: plans.length,
          offers: [
            { "@type": "Offer", name: "Free demo", price: "0", priceCurrency: "USD", url: `${origin}/signup?intent=demo&next=/app` },
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
              Try free demo
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
            Try the demo. Choose how you export.
          </h1>
        </div>
        <div className="border-y border-border bg-surface p-5">
          <p className="text-xs font-bold uppercase text-brand">Your export options</p>
          <p className="mt-3 text-lg leading-8 text-surface-ink">
            Start with a free account and a watermarked sample. Choose a $12 credit for one clean PDF/X export,
            or $49 per month for 15 exports with Pro. Clean downloads unlock after the file checks pass.
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
          <h2 className="mt-4 font-display text-4xl font-bold text-surface-ink">What your export includes</h2>
          <p className="mt-4 text-base leading-7 text-muted">
            Paid exports include a clean PDF/X file and a report of its print checks.
            Review the design and match the settings to your printer before placing an order.
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
            <h2 className="mt-4 font-display text-4xl font-bold text-surface-ink">Before you choose</h2>
            <p className="mt-4 text-base leading-7 text-muted">
              Start with the sample to see the workspace and file-check report.
              Then choose the number of exports that fits your print work.
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
