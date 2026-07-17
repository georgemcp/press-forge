import { z } from "zod";

export const monthlyPrintJobs = ["1-3", "4-10", "11-25", "26-plus"] as const;
export const primaryUseCases = ["business_cards", "flyers", "posters", "brochures", "postcards", "letterhead", "mixed_print"] as const;
export const planInterests = ["demo", "single_export", "pro"] as const;

export const accountProfileSchema = z.object({
  email: z.string().email(),
  password: z.string().min(12).max(120),
  fullName: z.string().min(2).max(120),
  companyName: z.string().min(2).max(140),
  role: z.string().min(2).max(100),
  companyWebsite: z.string().trim().max(180).optional(),
  phone: z.string().trim().max(40).optional(),
  monthlyPrintJobs: z.enum(monthlyPrintJobs),
  primaryUseCase: z.enum(primaryUseCases),
  planInterest: z.enum(planInterests).default("demo"),
  marketingConsent: z.boolean().default(false)
});

export type AccountProfileInput = z.infer<typeof accountProfileSchema>;

export function normalizeOptionalText(value?: string) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

export function normalizeWebsite(value?: string) {
  const trimmed = normalizeOptionalText(value);
  if (!trimmed) {
    return null;
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

export function profileToUserUpdate(profile: AccountProfileInput) {
  return {
    email: profile.email.trim().toLowerCase(),
    full_name: profile.fullName.trim(),
    company_name: profile.companyName.trim(),
    role: profile.role.trim(),
    company_website: normalizeWebsite(profile.companyWebsite),
    phone: normalizeOptionalText(profile.phone),
    monthly_print_jobs: profile.monthlyPrintJobs,
    primary_use_case: profile.primaryUseCase,
    plan_interest: profile.planInterest,
    marketing_consent: profile.marketingConsent,
    onboarding_completed_at: new Date().toISOString()
  };
}
