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
    default: "Trim Proof | Create and Check PDFs for Print",
    template: "%s | Trim Proof"
  },
  description:
    "Create flyers, business cards and more with AI-assisted design and PDF/X preflight checks. Try a free watermarked demo; clean exports start at $12.",
  alternates: {
    canonical: "/"
  },
  openGraph: {
    title: "Trim Proof | Create and Check PDFs for Print",
    description:
      "Design your print piece, review its file checks, and export a clean PDF/X proof. Free watermarked demo, $12 single export, or $49/month for 15 exports.",
    url: "/",
    siteName: "Trim Proof",
    images: [
      {
        url: "/trim-proof-workspace-concept.png",
        width: 1440,
        height: 1000,
        alt: "Trim Proof workspace illustration showing a design brief, preview, and export controls."
      }
    ],
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "Trim Proof | Create and Check PDFs for Print",
    description:
      "AI-assisted design with PDF/X file checks. Try a free watermarked demo; clean exports are $12 each or $49/month for 15 exports."
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
