import type { Metadata } from "next";
import { AudiencePageView } from "@/components/audience-page";
import { getAudiencePage } from "@/lib/seo/audience-pages";

const page = getAudiencePage("print-shops");

export const metadata: Metadata = {
  title: page?.title,
  description: page?.metaDescription,
  alternates: {
    canonical: "/for-print-shops"
  },
  openGraph: {
    title: page?.title,
    description: page?.metaDescription,
    url: "/for-print-shops",
    siteName: "Trim Proof",
    type: "website"
  },
  twitter: {
    card: "summary",
    title: page?.title,
    description: page?.metaDescription
  }
};

export default function ForPrintShopsPage() {
  if (!page) {
    return null;
  }

  return <AudiencePageView page={page} />;
}
