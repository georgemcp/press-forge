"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import { getAnalyticsAttribution } from "@/lib/analytics/attribution";
import { trackEvent } from "@/lib/analytics/events";

interface EmailCaptureFormProps {
  buttonLabel?: string;
  id: string;
  placeholder?: string;
  source: string;
}

export function EmailCaptureForm({
  buttonLabel = "Get launch updates",
  id,
  placeholder = "you@printshop.com",
  source
}: EmailCaptureFormProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    const response = await fetch("/api/email-signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, source, analytics: getAnalyticsAttribution() })
    });
    if (!response.ok) {
      setStatus("error");
      return;
    }
    trackEvent("email_signup_submitted", { source });
    setEmail("");
    setStatus("sent");
  }

  const statusMessage =
    status === "sent"
      ? "Signup received. Check your inbox for the next step."
      : status === "error"
        ? "Signup failed. Try again with a valid email address."
        : "";

  return (
    <form className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]" onSubmit={submit}>
      <label className="sr-only" htmlFor={id}>
        Email address
      </label>
      <input
        id={id}
        className="h-11 min-w-0 rounded-[8px] border border-border bg-surface px-3 text-sm text-surface-ink"
        placeholder={placeholder}
        type="email"
        value={email}
        required
        onChange={(event) => setEmail(event.target.value)}
      />
      <button
        className="inline-flex h-11 items-center justify-center gap-2 rounded-[8px] bg-surface-ink px-5 text-sm font-semibold text-white transition hover:bg-brand disabled:opacity-60"
        disabled={status === "loading"}
        type="submit"
      >
        <Mail aria-hidden className="h-4 w-4" />
        {status === "loading" ? "Sending..." : buttonLabel}
      </button>
      <span
        className={statusMessage ? "text-xs font-semibold text-muted sm:col-span-2" : "sr-only"}
        aria-live="polite"
      >
        {statusMessage}
      </span>
    </form>
  );
}
