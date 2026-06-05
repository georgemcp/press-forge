"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ADMIN_SESSION_COOKIE,
  createAdminSessionValue,
  getAdminSessionCookieOptions,
  isAdminAuthConfigured,
  validateAdminPassword
} from "@/lib/admin/auth";

export interface AdminLoginState {
  error?: string;
}

export async function loginAdmin(_state: AdminLoginState, formData: FormData): Promise<AdminLoginState> {
  if (!isAdminAuthConfigured()) {
    return {
      error: "Admin login is not configured. Set TRIMPROOF_ADMIN_PASSWORD and TRIMPROOF_ADMIN_SESSION_SECRET."
    };
  }

  const password = String(formData.get("password") ?? "");
  if (!validateAdminPassword(password)) {
    return {
      error: "That admin password did not match."
    };
  }

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, createAdminSessionValue(), getAdminSessionCookieOptions());
  redirect("/admin");
}

export async function logoutAdmin() {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, "", {
    ...getAdminSessionCookieOptions(),
    maxAge: 0
  });
  redirect("/admin/login");
}
