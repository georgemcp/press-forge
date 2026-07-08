import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AccountDetail } from "@/components/admin/account-detail";
import { ADMIN_SESSION_COOKIE, isAdminAuthConfigured, verifyAdminSessionValue } from "@/lib/admin/auth";
import { getAdminAccountDetailData } from "@/lib/admin/data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin Account",
  description: "Trim Proof account management workspace."
};

interface AdminAccountPageProps {
  params: Promise<{
    email: string;
  }>;
  searchParams: Promise<{
    saved?: string;
    adminError?: string;
  }>;
}

function decodeEmail(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export default async function AdminAccountPage({ params, searchParams }: AdminAccountPageProps) {
  const cookieStore = await cookies();
  if (!isAdminAuthConfigured() || !verifyAdminSessionValue(cookieStore.get(ADMIN_SESSION_COOKIE)?.value)) {
    redirect("/admin/login");
  }

  const [{ email }, messages] = await Promise.all([params, searchParams]);
  const data = await getAdminAccountDetailData(decodeEmail(email));
  return <AccountDetail data={data} error={messages.adminError} saved={messages.saved} />;
}
