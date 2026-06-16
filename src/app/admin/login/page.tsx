import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Box } from "lucide-react";
import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { adminLoginMetadata } from "@/app/admin/admin-metadata";
import { ADMIN_SESSION_COOKIE, isAdminAuthConfigured, verifyAdminSessionValue } from "@/lib/admin/auth";

export const metadata: Metadata = adminLoginMetadata;

export default async function AdminLoginPage() {
  const cookieStore = await cookies();
  if (verifyAdminSessionValue(cookieStore.get(ADMIN_SESSION_COOKIE)?.value)) {
    redirect("/admin");
  }
  const configured = isAdminAuthConfigured();

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-10 text-foreground">
      <section className="w-full max-w-md rounded-[8px] border border-border bg-surface p-6 shadow-[0_24px_80px_oklch(0.18_0.02_252_/_0.14)]">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-[8px] bg-surface-ink text-white">
            <Box aria-hidden className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-brand">Trim Proof</p>
            <h1 className="font-display text-2xl font-bold text-surface-ink">Admin center</h1>
          </div>
        </div>
        <p className="mt-4 text-sm leading-6 text-muted">
          Super admin access for accounts, subscriptions, proof usage, revenue, margin, and production readiness.
        </p>
        <div className="mt-6">
          <AdminLoginForm configured={configured} />
        </div>
        {!configured ? (
          <p className="mt-4 rounded-[8px] border border-warning/30 bg-warning/10 px-3 py-2 text-sm font-semibold text-surface-ink">
            Set `TRIMPROOF_ADMIN_EMAIL`, `TRIMPROOF_ADMIN_PASSWORD`, and `TRIMPROOF_ADMIN_SESSION_SECRET` in production to enable login.
          </p>
        ) : null}
        <Link className="mt-5 inline-flex text-sm font-semibold text-brand hover:underline" href="/">
          Back to site
        </Link>
      </section>
    </main>
  );
}
