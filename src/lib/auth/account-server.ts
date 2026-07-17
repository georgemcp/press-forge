import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ACCOUNT_SESSION_COOKIE, verifyAccountSessionValue, type AccountSession } from "@/lib/auth/account-session";
import { createServiceSupabaseClient } from "@/lib/db/supabase";

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function authUserWasChangedAfterSession(updatedAt: string | undefined, issuedAt: number | undefined) {
  if (!updatedAt || !issuedAt) {
    return false;
  }
  const updatedAtMs = new Date(updatedAt).getTime();
  return Number.isFinite(updatedAtMs) && updatedAtMs > issuedAt + 5_000;
}

export async function getAccountSessionFromCookies(): Promise<AccountSession | undefined> {
  const cookieStore = await cookies();
  const session = verifyAccountSessionValue(cookieStore.get(ACCOUNT_SESSION_COOKIE)?.value);
  if (!session) {
    return undefined;
  }

  const supabase = createServiceSupabaseClient();
  if (!supabase) {
    return undefined;
  }

  try {
    const { data, error } = await supabase.auth.admin.getUserById(session.userId);
    const user = data.user;
    const bannedUntil = user?.banned_until ? new Date(user.banned_until).getTime() : 0;
    if (
      error ||
      !user?.email ||
      !user.email_confirmed_at ||
      normalizeEmail(user.email) !== session.email ||
      (Number.isFinite(bannedUntil) && bannedUntil > Date.now()) ||
      authUserWasChangedAfterSession(user.updated_at, session.issuedAt)
    ) {
      return undefined;
    }
    return session;
  } catch {
    return undefined;
  }
}

export async function requireAccountSession(nextPath = "/app") {
  const session = await getAccountSessionFromCookies();
  if (!session) {
    redirect(`/signup?next=${encodeURIComponent(nextPath)}`);
  }
  return session;
}
