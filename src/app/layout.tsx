import type { Metadata } from "next";
import { Bricolage_Grotesque, Instrument_Sans } from "next/font/google";
import { AnalyticsTags } from "@/components/analytics-tags";
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
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: "Trim Proof | AI Print-Ready PDF Generator",
    template: "%s | Trim Proof"
  },
  description:
    "Create print-ready PDF/X files from a plain-English brief with deterministic CMYK, bleed, crop marks, embedded vector fonts, and preflight checks.",
  alternates: {
    canonical: "/"
  },
  openGraph: {
    title: "Trim Proof | AI Print-Ready PDF Generator",
    description:
      "Turn a design brief into a print-ready PDF/X file with deterministic prepress validation.",
    url: "/",
    siteName: "Trim Proof",
    images: [
      {
        url: "/trim-proof-workspace-concept.png",
        width: 1440,
        height: 1000,
        alt: "Trim Proof workspace with brief intake, print preview, preflight gate, and export controls."
      }
    ],
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "Trim Proof | AI Print-Ready PDF Generator",
    description:
      "AI creative upstream. Deterministic PDF/X, CMYK, bleed, crop marks, and preflight downstream."
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
