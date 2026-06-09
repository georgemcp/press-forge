"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Building2, Loader2, LockKeyhole, Mail, Phone, UserRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type PlanInterest = "demo" | "single_export" | "pro";

interface SignupFormProps {
  nextPath: string;
  planInterest: PlanInterest;
}

interface LoginFormProps {
  nextPath: string;
}

const planLabels: Record<PlanInterest, string> = {
  demo: "Create account and start demo",
  single_export: "Create account for export",
  pro: "Create account for Pro"
};

async function parseError(response: Response) {
  const payload = (await response.json().catch(() => undefined)) as { error?: string } | undefined;
  return payload?.error ?? "Something went wrong. Try again.";
}

export function SignupForm({ nextPath, planInterest }: SignupFormProps) {
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setPending(true);
    const form = new FormData(event.currentTarget);
    const payload = {
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
      fullName: String(form.get("fullName") ?? ""),
      companyName: String(form.get("companyName") ?? ""),
      role: String(form.get("role") ?? ""),
      companyWebsite: String(form.get("companyWebsite") ?? ""),
      phone: String(form.get("phone") ?? ""),
      monthlyPrintJobs: String(form.get("monthlyPrintJobs") ?? "1-3"),
      primaryUseCase: String(form.get("primaryUseCase") ?? "business_cards"),
      planInterest,
      marketingConsent: form.get("marketingConsent") === "on"
    };

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        setError(await parseError(response));
        return;
      }
      window.location.assign(nextPath);
    } finally {
      setPending(false);
    }
  }

  return (
    <form action="/api/auth/signup" className="grid gap-4" method="post" onSubmit={submit}>
      <input name="nextPath" type="hidden" value={nextPath} />
      <input name="planInterest" type="hidden" value={planInterest} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field icon={UserRound} label="Full name" name="fullName" placeholder="Mara Vale" required />
        <Field icon={Mail} label="Work email" name="email" placeholder="you@company.com" required type="email" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field icon={Building2} label="Company" name="companyName" placeholder="Acme Print Studio" required />
        <Field label="Role" name="role" placeholder="Owner, designer, production lead" required />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Company website" name="companyWebsite" placeholder="company.com" />
        <Field icon={Phone} label="Phone" name="phone" placeholder="Optional" type="tel" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField label="Monthly print jobs" name="monthlyPrintJobs">
          <option value="1-3">1-3 jobs</option>
          <option value="4-10">4-10 jobs</option>
          <option value="11-25">11-25 jobs</option>
          <option value="26-plus">26+ jobs</option>
        </SelectField>
        <SelectField label="Primary use case" name="primaryUseCase">
          <option value="business_cards">Business cards</option>
          <option value="flyers">Flyers</option>
          <option value="posters">Posters</option>
          <option value="brochures">Brochures</option>
          <option value="postcards">Postcards</option>
          <option value="letterhead">Letterhead</option>
          <option value="mixed_print">Mixed print work</option>
        </SelectField>
      </div>
      <Field icon={LockKeyhole} label="Password" minLength={8} name="password" placeholder="At least 8 characters" required type="password" />

      <label className="flex gap-3 text-sm leading-6 text-muted">
        <input className="mt-1 h-4 w-4 rounded border-border accent-surface-ink" defaultChecked name="marketingConsent" type="checkbox" />
        <span>Send product updates, launch notes, and account help for Trim Proof.</span>
      </label>

      {error ? <p className="rounded-[8px] border border-danger/30 bg-danger/10 px-3 py-2 text-sm font-semibold text-danger">{error}</p> : null}

      <button className="inline-flex h-12 items-center justify-center gap-2 rounded-[8px] bg-surface-ink px-5 text-sm font-bold text-white disabled:opacity-60" disabled={pending} type="submit">
        {pending ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <ArrowRight aria-hidden className="h-4 w-4" />}
        {planLabels[planInterest]}
      </button>
      <p className="text-center text-sm text-muted">
        Already have an account?{" "}
        <Link className="font-bold text-surface-ink hover:underline" href={`/login?next=${encodeURIComponent(nextPath)}`}>
          Sign in
        </Link>
      </p>
    </form>
  );
}

export function LoginForm({ nextPath }: LoginFormProps) {
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setPending(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: String(form.get("email") ?? ""),
          password: String(form.get("password") ?? "")
        })
      });
      if (!response.ok) {
        setError(await parseError(response));
        return;
      }
      window.location.assign(nextPath);
    } finally {
      setPending(false);
    }
  }

  return (
    <form action="/api/auth/login" className="grid gap-4" method="post" onSubmit={submit}>
      <input name="nextPath" type="hidden" value={nextPath} />
      <Field icon={Mail} label="Work email" name="email" placeholder="you@company.com" required type="email" />
      <Field icon={LockKeyhole} label="Password" name="password" placeholder="Your password" required type="password" />
      {error ? <p className="rounded-[8px] border border-danger/30 bg-danger/10 px-3 py-2 text-sm font-semibold text-danger">{error}</p> : null}
      <button className="inline-flex h-12 items-center justify-center gap-2 rounded-[8px] bg-surface-ink px-5 text-sm font-bold text-white disabled:opacity-60" disabled={pending} type="submit">
        {pending ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <ArrowRight aria-hidden className="h-4 w-4" />}
        Sign in and continue
      </button>
      <p className="text-center text-sm text-muted">
        New to Trim Proof?{" "}
        <Link className="font-bold text-surface-ink hover:underline" href={`/signup?next=${encodeURIComponent(nextPath)}`}>
          Create an account
        </Link>
      </p>
    </form>
  );
}

function Field({
  icon: Icon,
  label,
  name,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  icon?: LucideIcon;
  label: string;
  name: string;
}) {
  const id = `account-${name}`;

  return (
    <div className="grid gap-1.5 text-sm font-semibold text-surface-ink">
      <label htmlFor={id}>{label}</label>
      <span className="relative">
        {Icon ? <Icon aria-hidden className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" /> : null}
        <input
          className={`h-11 w-full rounded-[8px] border border-border bg-surface px-3 text-sm font-medium text-surface-ink outline-none transition focus:border-brand ${Icon ? "pl-9" : ""}`}
          id={id}
          name={name}
          {...props}
        />
      </span>
    </div>
  );
}

function SelectField({ children, label, name }: { children: React.ReactNode; label: string; name: string }) {
  const id = `account-${name}`;

  return (
    <div className="grid gap-1.5 text-sm font-semibold text-surface-ink">
      <label htmlFor={id}>{label}</label>
      <select className="h-11 w-full rounded-[8px] border border-border bg-surface px-3 text-sm font-medium text-surface-ink outline-none transition focus:border-brand" id={id} name={name}>
        {children}
      </select>
    </div>
  );
}
