import type { Metadata } from "next";
import { AudiencePageView } from "@/components/audience-page";
import { getAudiencePage } from "@/lib/seo/audience-pages";

const page = getAudiencePage("marketers");

export const metadata: Metadata = {
  title: page?.title,
  description: page?.metaDescription,
  alternates: {
    canonical: "/for-marketers"
  },
  openGraph: {
    title: page?.title,
    description: page?.metaDescription,
    url: "/for-marketers",
    siteName: "Trim Proof",
    type: "website"
  },
  twitter: {
    card: "summary",
    title: page?.title,
    description: page?.metaDescription
  }
};

export default function ForMarketersPage() {
  if (!page) {
    return null;
  }

  return <AudiencePageView page={page} />;
}
