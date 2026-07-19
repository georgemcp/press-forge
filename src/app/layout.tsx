import type { Metadata } from "next";
import { Bricolage_Grotesque, Instrument_Sans } from "next/font/google";
import { AnalyticsTags } from "@/components/analytics-tags";
import { getSiteUrl } from "@/lib/seo/site-url";
import "./globals.css";

const display = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap"
});

const body = Instrument_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap"
});

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: {
    default: "Press Forge | AI Print Design Studio",
    template: "%s | Press Forge"
  },
  description:
    "Create print-ready designs with AI. Upload references, describe your vision, and get production-ready PDF/X files with CMYK, bleed, crop marks, and embedded fonts.",
  alternates: {
    canonical: "/"
  },
  openGraph: {
    title: "Press Forge | AI Print Design Studio",
    description:
      "Describe your vision, upload references, and let AI generate print-ready designs with deterministic PDF/X export.",
    url: "/",
    siteName: "Press Forge",
    images: [
      {
        url: "/trim-proof-workspace-concept.png",
        width: 1440,
        height: 1000,
        alt: "Press Forge workspace with AI brief enhancement, design preview, chat panel, and export controls."
      }
    ],
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "Press Forge | AI Print Design Studio",
    description:
      "AI-powered print design from brief to PDF/X. Upload references, chat with AI to iterate, export production-ready files."
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable}`}>
        <AnalyticsTags />
        {children}
      </body>
    </html>
  );
}
