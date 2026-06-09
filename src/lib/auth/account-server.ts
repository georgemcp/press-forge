import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ACCOUNT_SESSION_COOKIE, verifyAccountSessionValue, type AccountSession } from "@/lib/auth/account-session";

export async function getAccountSessionFromCookies(): Promise<AccountSession | undefined> {
  const cookieStore = await cookies();
  return verifyAccountSessionValue(cookieStore.get(ACCOUNT_SESSION_COOKIE)?.value);
}

export async function requireAccountSession(nextPath = "/app") {
  const session = await getAccountSessionFromCookies();
  if (!session) {
    redirect(`/signup?next=${encodeURIComponent(nextPath)}`);
  }
  return session;
}
