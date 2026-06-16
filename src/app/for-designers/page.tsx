import type { Metadata } from "next";
import { AudiencePageView } from "@/components/audience-page";
import { getAudiencePage } from "@/lib/seo/audience-pages";

const page = getAudiencePage("designers");

export const metadata: Metadata = {
  title: page?.title,
  description: page?.metaDescription,
  alternates: {
    canonical: "/for-designers"
  },
  openGraph: {
    title: page?.title,
    description: page?.metaDescription,
    url: "/for-designers",
    siteName: "Trim Proof",
    type: "website"
  },
  twitter: {
    card: "summary",
    title: page?.title,
    description: page?.metaDescription
  }
};

export default function ForDesignersPage() {
  if (!page) {
    return null;
  }

  return <AudiencePageView page={page} />;
}
