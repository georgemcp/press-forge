"use client";

type AnalyticsWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
};

export type PressForgeEvent =
  | "dummy_proof_started"
  | "advanced_mode_selected"
  | "proof_export_started"
  | "proof_export_completed"
  | "checkout_started"
  | "checkout_verified"
  | "subscription_portal_started"
  | "email_signup_submitted"
  | "brief_enhance_started"
  | "brief_enhance_completed"
  | "design_generation_started"
  | "design_generation_completed"
  | "reference_image_uploaded";

/** @deprecated Use PressForgeEvent instead */
export type TrimProofEvent = PressForgeEvent;

export function trackEvent(event: PressForgeEvent, params: Record<string, string | number | boolean | undefined> = {}) {
  if (typeof window === "undefined") {
    return;
  }
  const analyticsWindow = window as AnalyticsWindow;
  analyticsWindow.dataLayer?.push({
    event,
    ...params
  });
  analyticsWindow.gtag?.("event", event, params);
}
