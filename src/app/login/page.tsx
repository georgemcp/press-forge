import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Box, CheckCircle2 } from "lucide-react";
import { LoginForm } from "@/components/account/account-access-form";
import { getAccountSessionFromCookies } from "@/lib/auth/account-server";
import { safeInternalPath } from "@/lib/security/navigation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to Trim Proof before running demo proofs or paid PDF/X exports.",
  robots: {
    index: false,
    follow: false
  }
};

interface LoginPageProps {
  searchParams: Promise<{
    next?: string;
  }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextPath = safeInternalPath(params.next);
  const session = await getAccountSessionFromCookies();
  if (session) {
    redirect(nextPath);
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto grid min-h-screen max-w-5xl gap-8 px-4 py-8 md:grid-cols-[0.82fr_1fr] md:items-center">
        <section>
          <Link className="mb-8 inline-flex items-center gap-3" href="/">
            <span className="grid h-11 w-11 place-items-center rounded-[8px] bg-surface-ink text-white">
              <Box aria-hidden className="h-5 w-5" />
            </span>
            <span>
              <span className="block font-display text-2xl font-bold text-surface-ink">Trim Proof</span>
              <span className="text-sm font-semibold text-muted">Protected proof workspace</span>
            </span>
          </Link>
          <h1 className="font-display text-5xl font-bold leading-tight text-surface-ink">Welcome back.</h1>
          <p className="mt-4 text-base leading-7 text-muted">Sign in to continue your demo, buy an export credit, or manage Pro access.</p>
          <div className="mt-8 grid gap-3 text-sm font-semibold text-surface-ink">
            {["Demo and advanced mode both require an account", "Checkout uses your saved account email", "Access links stay attached to your profile"].map((item) => (
              <div key={item} className="flex items-center gap-2">
                <CheckCircle2 aria-hidden className="h-4 w-4 text-success" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[8px] border border-border bg-surface p-5 shadow-[0_18px_60px_oklch(0.18_0.02_252_/_0.12)] sm:p-6">
          <div className="mb-5">
            <h2 className="font-display text-2xl font-bold text-surface-ink">Sign in</h2>
            <p className="mt-1 text-sm leading-6 text-muted">Use the account you created before starting the proof workspace.</p>
          </div>
          <LoginForm nextPath={nextPath} />
        </section>
      </div>
    </main>
  );
}
