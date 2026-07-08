"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { getAnalyticsAttribution } from "@/lib/analytics/attribution";
import { trackEvent } from "@/lib/analytics/events";

const segmentOptions = [
  { value: "print_shop", label: "Print shop" },
  { value: "marketing_team", label: "Marketing team" },
  { value: "designer", label: "Freelance designer" },
  { value: "checklist_reader", label: "Checklist reader" },
  { value: "general_launch", label: "Other print buyer" }
];

const jobOptions = [
  { value: "flyer", label: "Flyer" },
  { value: "poster", label: "Poster" },
  { value: "menu", label: "Menu" },
  { value: "brochure", label: "Brochure" },
  { value: "business_card", label: "Business card" },
  { value: "postcard", label: "Postcard" },
  { value: "letterhead", label: "Letterhead" }
];

const monthlyJobOptions = [
  { value: "under_10", label: "Under 10" },
  { value: "10_50", label: "10-50" },
  { value: "51_200", label: "51-200" },
  { value: "200_plus", label: "200+" },
  { value: "unknown", label: "Not sure" }
];

interface PilotApplicationState {
  companyName: string;
  contactName: string;
  consentToContact: boolean;
  email: string;
  firstSupportedJob: string;
  likelyPain: string;
  monthlyPrintJobs: string;
  printerSpec: string;
  publicContactPath: string;
  role: string;
  segment: string;
  website: string;
}

const initialState: PilotApplicationState = {
  companyName: "",
  contactName: "",
  consentToContact: false,
  email: "",
  firstSupportedJob: "flyer",
  likelyPain: "",
  monthlyPrintJobs: "unknown",
  printerSpec: "",
  publicContactPath: "",
  role: "",
  segment: "print_shop",
  website: ""
};

export function PilotApplicationForm() {
  const [fields, setFields] = useState<PilotApplicationState>(initialState);
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");

  function setField<K extends keyof PilotApplicationState>(field: K, value: PilotApplicationState[K]) {
    setFields((current) => ({
      ...current,
      [field]: value
    }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    const response = await fetch("/api/pilot-application", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...fields,
        analytics: getAnalyticsAttribution()
      })
    });

    if (!response.ok) {
      setStatus("error");
      return;
    }

    trackEvent("pilot_application_submitted", {
      source: "pilot_application",
      segment: fields.segment,
      first_supported_job: fields.firstSupportedJob
    });
    setFields(initialState);
    setStatus("sent");
  }

  const statusMessage =
    status === "sent"
      ? "Application received. We will review fit before inviting pilot jobs."
      : status === "error"
        ? "Application failed. Check the required fields and try again."
        : "";

  return (
    <form className="grid gap-4 rounded-[8px] border border-border bg-background p-5 shadow-sm" onSubmit={submit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold text-surface-ink" htmlFor="pilot-application-email">
          Work email
          <input
            id="pilot-application-email"
            className="h-11 min-w-0 rounded-[8px] border border-border bg-surface px-3 text-sm font-normal text-surface-ink"
            type="email"
            value={fields.email}
            required
            onChange={(event) => setField("email", event.target.value)}
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-surface-ink" htmlFor="pilot-application-company">
          Company
          <input
            id="pilot-application-company"
            className="h-11 min-w-0 rounded-[8px] border border-border bg-surface px-3 text-sm font-normal text-surface-ink"
            value={fields.companyName}
            onChange={(event) => setField("companyName", event.target.value)}
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-surface-ink" htmlFor="pilot-application-contact">
          Name
          <input
            id="pilot-application-contact"
            className="h-11 min-w-0 rounded-[8px] border border-border bg-surface px-3 text-sm font-normal text-surface-ink"
            value={fields.contactName}
            onChange={(event) => setField("contactName", event.target.value)}
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-surface-ink" htmlFor="pilot-application-role">
          Role
          <input
            id="pilot-application-role"
            className="h-11 min-w-0 rounded-[8px] border border-border bg-surface px-3 text-sm font-normal text-surface-ink"
            value={fields.role}
            onChange={(event) => setField("role", event.target.value)}
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-surface-ink" htmlFor="pilot-application-segment">
          Team type
          <select
            id="pilot-application-segment"
            className="h-11 min-w-0 rounded-[8px] border border-border bg-surface px-3 text-sm font-normal text-surface-ink"
            value={fields.segment}
            onChange={(event) => setField("segment", event.target.value)}
          >
            {segmentOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold text-surface-ink" htmlFor="pilot-application-job">
          First job
          <select
            id="pilot-application-job"
            className="h-11 min-w-0 rounded-[8px] border border-border bg-surface px-3 text-sm font-normal text-surface-ink"
            value={fields.firstSupportedJob}
            onChange={(event) => setField("firstSupportedJob", event.target.value)}
          >
            {jobOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold text-surface-ink" htmlFor="pilot-application-volume">
          Monthly print jobs
          <select
            id="pilot-application-volume"
            className="h-11 min-w-0 rounded-[8px] border border-border bg-surface px-3 text-sm font-normal text-surface-ink"
            value={fields.monthlyPrintJobs}
            onChange={(event) => setField("monthlyPrintJobs", event.target.value)}
          >
            {monthlyJobOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold text-surface-ink" htmlFor="pilot-application-contact-path">
          Public contact path
          <input
            id="pilot-application-contact-path"
            className="h-11 min-w-0 rounded-[8px] border border-border bg-surface px-3 text-sm font-normal text-surface-ink"
            placeholder="Website, public profile, or contact page"
            value={fields.publicContactPath}
            onChange={(event) => setField("publicContactPath", event.target.value)}
          />
        </label>
      </div>
      <label className="grid gap-2 text-sm font-semibold text-surface-ink" htmlFor="pilot-application-pain">
        What print handoff problem should the pilot pressure-test?
        <textarea
          id="pilot-application-pain"
          className="min-h-28 resize-y rounded-[8px] border border-border bg-surface px-3 py-3 text-sm font-normal leading-6 text-surface-ink"
          value={fields.likelyPain}
          required
          minLength={20}
          maxLength={500}
          onChange={(event) => setField("likelyPain", event.target.value)}
        />
      </label>
      <label className="grid gap-2 text-sm font-semibold text-surface-ink" htmlFor="pilot-application-spec">
        Known printer spec
        <textarea
          id="pilot-application-spec"
          className="min-h-20 resize-y rounded-[8px] border border-border bg-surface px-3 py-3 text-sm font-normal leading-6 text-surface-ink"
          placeholder="Trim, bleed, stock, ICC profile, file format, or vendor notes"
          value={fields.printerSpec}
          maxLength={500}
          onChange={(event) => setField("printerSpec", event.target.value)}
        />
      </label>
      <div className="hidden" aria-hidden="true">
        <label htmlFor="pilot-application-website">Website</label>
        <input
          id="pilot-application-website"
          tabIndex={-1}
          autoComplete="off"
          value={fields.website}
          onChange={(event) => setField("website", event.target.value)}
        />
      </div>
      <label className="flex items-start gap-3 rounded-[8px] border border-border bg-surface p-3 text-sm font-semibold leading-6 text-surface-ink" htmlFor="pilot-application-consent">
        <input
          id="pilot-application-consent"
          className="mt-1 h-4 w-4 rounded border-border"
          type="checkbox"
          checked={fields.consentToContact}
          required
          onChange={(event) => setField("consentToContact", event.target.checked)}
        />
        <span>Trim Proof can contact me about pilot fit. No private customer files are submitted through this form.</span>
      </label>
      <button
        className="inline-flex h-12 items-center justify-center gap-2 rounded-[8px] bg-brand px-5 text-sm font-bold text-white transition hover:bg-surface-ink disabled:opacity-60"
        disabled={status === "loading"}
        type="submit"
      >
        {status === "loading" ? "Sending application..." : "Apply for pilot"}
        <ArrowRight aria-hidden className="h-4 w-4" />
      </button>
      <span className={statusMessage ? "inline-flex items-center gap-2 text-sm font-semibold text-muted" : "sr-only"} aria-live="polite">
        {status === "sent" ? <CheckCircle2 aria-hidden className="h-4 w-4 text-success" /> : null}
        {statusMessage}
      </span>
    </form>
  );
}
