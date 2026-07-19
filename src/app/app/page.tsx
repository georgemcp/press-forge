import Link from "next/link";
import type { Metadata } from "next";
import { PressForgeWorkspace } from "@/components/press-forge-workspace";
import { getAccountSessionFromCookies } from "@/lib/auth/account-server";
import { sampleBusinessCardLayout } from "@/lib/print/sample-layout";

export const metadata: Metadata = {
  title: "Press Forge | AI Print Design Studio",
  description: "Create print-ready designs with AI. Upload references, describe your vision, and get production-ready PDF/X exports with CMYK, bleed, crop marks, and embedded fonts.",
  robots: {
    index: false,
    follow: false
  }
};

interface AppPageProps {
  searchParams: Promise<{
    checkout?: string;
    mode?: string;
    session_id?: string;
  }>;
}

export default async function AppPage({ searchParams }: AppPageProps) {
  const params = await searchParams;
  const nextQuery = new URLSearchParams();
  if (params.checkout) {
    nextQuery.set("checkout", params.checkout);
  }
  if (params.mode) {
    nextQuery.set("mode", params.mode);
  }
  if (params.session_id) {
    nextQuery.set("session_id", params.session_id);
  }
  const nextPath = `/app${nextQuery.toString() ? `?${nextQuery.toString()}` : ""}`;
  const account = await getAccountSessionFromCookies();

  if (!account) {
    return (
      <main className="grid min-h-screen place-items-center bg-background px-4 text-foreground">
        <section className="w-full max-w-lg rounded-[8px] border border-border bg-surface p-6 shadow-[0_18px_60px_oklch(0.18_0.02_252_/_0.12)]">
          <p className="text-xs font-bold uppercase text-brand">Account required</p>
          <h1 className="mt-3 font-display text-3xl font-bold text-surface-ink">Create your Press Forge account first.</h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            AI-powered design, reference uploads, and production-ready PDF/X exports need a signed-in account so your workspace,
            Stripe customer, and access links stay tied to the right company email.
          </p>
          <Link
            className="mt-6 inline-flex h-11 items-center justify-center rounded-[8px] bg-surface-ink px-5 text-sm font-bold text-white"
            href={`/signup?next=${encodeURIComponent(nextPath)}`}
          >
            Create account
          </Link>
        </section>
      </main>
    );
  }

  return (
    <PressForgeWorkspace
      accountEmail={account.email}
      checkoutSessionId={params.checkout === "success" ? params.session_id : undefined}
      checkoutState={params.checkout}
      initialMode={params.mode === "advanced" ? "advanced" : "dummy"}
      initialSpec={sampleBusinessCardLayout}
    />
  );
}
