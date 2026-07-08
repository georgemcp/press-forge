import type { Metadata } from "next";
import { adminNoindexRobots } from "@/app/admin/admin-metadata";

export const metadata: Metadata = {
  robots: adminNoindexRobots
};

export default function AdminLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
