import type { LayoutSpec } from "./layout-spec";

export const sampleBusinessCardLayout: LayoutSpec = {
  productType: "business_card",
  printProfile: "USWebCoatedSWOP",
  pdfxLevel: "PDF/X-1a:2001",
  cropMarks: true,
  palette: {
    paper: { c: 0.03, m: 0.02, y: 0.04, k: 0 },
    ink: { c: 0.75, m: 0.62, y: 0.5, k: 0.86 },
    accent: { c: 0.02, m: 0.92, y: 0.18, k: 0.02 }
  },
  styleDirection:
    "Modern AI-powered print design studio: warm paper, rich ink, and precision prepress calibration.",
  textBlocks: [
    {
      id: "brand",
      role: "brand",
      content: "PRESS FORGE",
      x: 0.42,
      y: 1.36,
      width: 2.62,
      fontSize: 16,
      weight: "bold",
      color: { c: 0.76, m: 0.64, y: 0.54, k: 0.84 }
    },
    {
      id: "tagline",
      role: "subhead",
      content: "AI-powered print design studio.",
      x: 0.42,
      y: 1.04,
      width: 2.6,
      fontSize: 8.5,
      weight: "medium",
      color: { c: 0.58, m: 0.46, y: 0.42, k: 0.44 }
    },
    {
      id: "name",
      role: "headline",
      content: "Mara Vale",
      x: 0.42,
      y: 0.62,
      width: 1.7,
      fontSize: 12,
      weight: "bold",
      color: { c: 0.72, m: 0.58, y: 0.48, k: 0.8 }
    },
    {
      id: "contact",
      role: "contact",
      content: "pressforge.com  |  PDF/X-1a ready",
      x: 0.42,
      y: 0.38,
      width: 2.4,
      fontSize: 6.8,
      weight: "regular",
      color: { c: 0.5, m: 0.4, y: 0.34, k: 0.4 }
    }
  ],
  assetSlots: []
};
