import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ClipboardCheck, FileCheck2, ShieldCheck, UsersRound } from "lucide-react";
import { PilotApplicationForm } from "@/components/pilot-application-form";
import { getSiteOrigin } from "@/lib/seo/site-url";

export const metadata: Metadata = {
  title: "Apply for the Trim Proof Pilot",
  description:
    "Apply for the Trim Proof pilot for print shops, designers, and marketing teams that need checked PDF/X-oriented proofs for supported print jobs.",
  alternates: {
    canonical: "/pilot-application"
  },
  openGraph: {
    title: "Apply for the Trim Proof Pilot",
    description:
      "A structured pilot application for supported flyers, posters, menus, brochures, business cards, postcards, and letterhead.",
    url: "/pilot-application",
    siteName: "Trim Proof",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "Apply for the Trim Proof Pilot",
    description: "Tell Trim Proof which supported print job should be pressure-tested first."
  }
};

const pilotFitSignals = [
  "You handle repeat flyers, menus, posters, postcards, cards, brochures, or letterhead.",
  "You can name the printer spec or the handoff problem that usually slows the job down.",
  "You want a checked first proof, not a promise that every printer will accept every file."
];

const pilotBoundaries = [
  "No private customer files should be submitted through this application.",
  "Printer specifications still control final acceptance.",
  "Pilot evidence has to be reviewed before any public claim or quote is used."
];

function PilotApplicationJsonLd() {
  const origin = getSiteOrigin();
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Trim Proof", item: `${origin}/` },
          { "@type": "ListItem", position: 2, name: "Pilot Application", item: `${origin}/pilot-application` }
        ]
      },
      {
        "@type": "WebPage",
        "@id": `${origin}/pilot-application#webpage`,
        name: "Apply for the Trim Proof pilot",
        description:
          "A structured pilot application for print shops, designers, and marketing teams testing supported Trim Proof print workflows."
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${origin}/#software`,
        name: "Trim Proof",
        applicationCategory: "DesignApplication",
        operatingSystem: "Web"
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "Who is the Trim Proof pilot for?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "The pilot is for print shops, designers, and marketing teams with supported print jobs such as flyers, posters, menus, brochures, business cards, postcards, and letterhead."
            }
          },
          {
            "@type": "Question",
            name: "Does joining the pilot guarantee printer acceptance?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "No. Printer specifications still control final acceptance, and pilot applications are reviewed for fit before real job evidence is used."
            }
          }
        ]
      }
    ]
  };

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />;
}

export default function PilotApplicationPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <PilotApplicationJsonLd />
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link className="font-display text-lg font-bold text-surface-ink" href="/">
            Trim Proof
          </Link>
          <div className="flex items-center gap-4 text-sm font-semibold">
            <Link className="hidden text-muted transition hover:text-surface-ink sm:inline" href="/sample-reports">
              Sample reports
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

      <section className="mx-auto grid max-w-6xl gap-9 px-4 py-16 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
        <div>
          <ClipboardCheck aria-hidden className="h-7 w-7 text-brand" />
          <p className="mt-5 text-sm font-bold uppercase text-brand">Structured pilot intake</p>
          <h1 className="mt-3 font-display text-5xl font-bold leading-[1.04] text-surface-ink">
            Apply for the Trim Proof pilot.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted">
            Tell us who you are, which supported print job should go first, and what handoff problem a checked proof
            needs to make clearer.
          </p>
          <div className="mt-7 overflow-hidden rounded-[8px] border border-border bg-surface shadow-[0_22px_70px_oklch(0.18_0.02_252_/_0.12)]">
            <Image
              alt="Trim Proof workspace with print proof guides and preflight controls."
              className="h-auto w-full"
              height={860}
              priority
              sizes="(min-width: 1024px) 42vw, 100vw"
              src="/images/product/trim-proof-workspace-app.png"
              width={1440}
            />
          </div>
        </div>
        <PilotApplicationForm />
      </section>

      <section className="border-y border-border bg-surface">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 lg:grid-cols-3">
          <div>
            <UsersRound aria-hidden className="h-6 w-6 text-brand" />
            <h2 className="mt-4 font-display text-3xl font-bold text-surface-ink">Fit signals</h2>
            <div className="mt-5 grid gap-3">
              {pilotFitSignals.map((signal) => (
                <p className="rounded-[8px] border border-border bg-background p-4 text-sm font-semibold leading-6 text-surface-ink" key={signal}>
                  {signal}
                </p>
              ))}
            </div>
          </div>
          <div>
            <ShieldCheck aria-hidden className="h-6 w-6 text-success" />
            <h2 className="mt-4 font-display text-3xl font-bold text-surface-ink">Boundaries</h2>
            <div className="mt-5 grid gap-3">
              {pilotBoundaries.map((boundary) => (
                <p className="rounded-[8px] border border-border bg-background p-4 text-sm font-semibold leading-6 text-muted" key={boundary}>
                  {boundary}
                </p>
              ))}
            </div>
          </div>
          <div>
            <FileCheck2 aria-hidden className="h-6 w-6 text-brand" />
            <h2 className="mt-4 font-display text-3xl font-bold text-surface-ink">Next step</h2>
            <p className="mt-5 rounded-[8px] border border-border bg-background p-4 text-sm font-semibold leading-6 text-muted">
              Accepted pilot leads move into the admin pipeline for founder review, then real-job evidence is recorded
              before any public proof claim is published.
            </p>
            <Link className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-[8px] bg-surface-ink px-4 text-sm font-bold text-white" href="/sample-reports">
              View sample reports
              <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
