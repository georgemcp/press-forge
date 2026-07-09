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
    default: "Trim Proof | AI Print Design Studio",
    template: "%s | Trim Proof"
  },
  description:
    "Create print-ready designs with AI. Upload references, describe your vision, and get production-ready PDF/X files with CMYK, bleed, crop marks, and embedded fonts.",
  alternates: {
    canonical: "/"
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: "/icon.svg",
    apple: "/icon.svg"
  },
  openGraph: {
    title: "Trim Proof | AI Print Design Studio",
    description:
      "Describe your vision, upload references, and let AI generate print-ready designs with deterministic PDF/X export.",
    url: "/",
    siteName: "Trim Proof",
    images: [
      {
        url: "/trim-proof-workspace-concept.png",
        width: 1440,
        height: 1000,
        alt: "Trim Proof workspace with AI brief enhancement, design preview, chat panel, and export controls."
      }
    ],
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "Trim Proof | AI Print Design Studio",
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
