import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminCenter } from "@/components/admin/admin-center";
import { getAdminCenterData, parseAdminRange } from "@/lib/admin/data";
import { ADMIN_SESSION_COOKIE, isAdminAuthConfigured, verifyAdminSessionValue } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin Center",
  description: "Trim Proof business management center for revenue, accounts, subscriptions, usage, and readiness."
};

interface AdminPageProps {
  searchParams: Promise<{
    range?: string;
  }>;
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const cookieStore = await cookies();
  if (!isAdminAuthConfigured() || !verifyAdminSessionValue(cookieStore.get(ADMIN_SESSION_COOKIE)?.value)) {
    redirect("/admin/login");
  }
  const params = await searchParams;
  const range = parseAdminRange(params.range);
  const data = await getAdminCenterData(range);
  return <AdminCenter data={data} range={range} />;
}
