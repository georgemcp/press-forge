import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Box, CheckCircle2 } from "lucide-react";
import { SignupForm } from "@/components/account/account-access-form";
import { getAccountSessionFromCookies } from "@/lib/auth/account-server";
import { safeInternalPath } from "@/lib/security/navigation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Create Account",
  description: "Create a Trim Proof account before running a watermarked demo proof or paid clean PDF/X export.",
  robots: {
    index: false,
    follow: false
  }
};

interface SignupPageProps {
  searchParams: Promise<{
    next?: string;
    intent?: string;
  }>;
}

function planInterest(value?: string, nextPath?: string): "demo" | "single_export" | "pro" {
  if (value === "demo" || value === "single_export" || value === "pro") {
    return value;
  }
  return value === undefined && nextPath?.includes("mode=advanced") ? "pro" : "demo";
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = await searchParams;
  const nextPath = safeInternalPath(params.next);
  const session = await getAccountSessionFromCookies();
  if (session) {
    redirect(nextPath);
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto grid min-h-screen max-w-6xl gap-8 px-4 py-8 lg:grid-cols-[0.86fr_1.14fr] lg:items-center">
        <section className="max-w-xl">
          <Link className="mb-8 inline-flex items-center gap-3" href="/">
            <span className="grid h-11 w-11 place-items-center rounded-[8px] bg-surface-ink text-white">
              <Box aria-hidden className="h-5 w-5" />
            </span>
            <span>
              <span className="block font-display text-2xl font-bold text-surface-ink">Trim Proof</span>
              <span className="text-sm font-semibold text-muted">Design. Check. Print.</span>
            </span>
          </Link>
          <h1 className="font-display text-5xl font-bold leading-tight text-surface-ink">Try your first print proof.</h1>
          <p className="mt-4 text-base leading-7 text-muted">
            Create a free account to try a watermarked sample and see its file-check report.
            When you need a clean download, choose a single export or the monthly plan from your workspace.
          </p>
          <div className="mt-8 grid gap-3 text-sm font-semibold text-surface-ink">
            {["Free watermarked sample and file-check report", "$12 for one clean PDF/X export", "$49 per month for 15 exports with Pro"].map((item) => (
              <div key={item} className="flex items-center gap-2">
                <CheckCircle2 aria-hidden className="h-4 w-4 text-success" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[8px] border border-border bg-surface p-5 shadow-[0_18px_60px_oklch(0.18_0.02_252_/_0.12)] sm:p-6">
          <div className="mb-5">
            <h2 className="font-display text-2xl font-bold text-surface-ink">Create your account</h2>
            <p className="mt-1 text-sm leading-6 text-muted">No payment is required to create an account or try the demo.</p>
          </div>
          <SignupForm nextPath={nextPath} planInterest={planInterest(params.intent, nextPath)} />
        </section>
      </div>
    </main>
  );
}
