import { PRODUCT_PROFILES, type PrintProfileId, type ProductType } from "./constants";
import { layoutSpecSchema, type AssetSlot, type CmykColor, type LayoutSpec, type TextBlock } from "./layout-spec";
import { sampleBusinessCardLayout } from "./sample-layout";

interface BriefLayoutInput {
  brief?: string;
  productType?: ProductType;
  printProfile?: PrintProfileId;
  pdfxLevel?: LayoutSpec["pdfxLevel"];
  cropMarks?: boolean;
}

type TextBlockTemplate = Pick<TextBlock, "id" | "role" | "x" | "y" | "width" | "fontSize" | "weight">;

const textBlockTemplates: Record<ProductType, TextBlockTemplate[]> = {
  business_card: sampleBusinessCardLayout.textBlocks.map(({ id, role, x, y, width, fontSize, weight }) => ({ id, role, x, y, width, fontSize, weight })),
  postcard: [
    { id: "brand", role: "brand", x: 0.55, y: 3.08, width: 4.8, fontSize: 28, weight: "bold" },
    { id: "tagline", role: "subhead", x: 0.55, y: 2.62, width: 4.4, fontSize: 12, weight: "medium" },
    { id: "name", role: "headline", x: 0.55, y: 0.96, width: 2.6, fontSize: 16, weight: "bold" },
    { id: "contact", role: "contact", x: 0.55, y: 0.62, width: 4.8, fontSize: 9.2, weight: "regular" }
  ],
  flyer: [
    { id: "brand", role: "brand", x: 0.72, y: 9.75, width: 7.2, fontSize: 42, weight: "bold" },
    { id: "tagline", role: "subhead", x: 0.75, y: 8.86, width: 6.8, fontSize: 19, weight: "medium" },
    { id: "name", role: "headline", x: 0.78, y: 1.72, width: 3.6, fontSize: 23, weight: "bold" },
    { id: "contact", role: "contact", x: 0.8, y: 1.18, width: 6.8, fontSize: 12.5, weight: "regular" }
  ],
  letterhead: [
    { id: "brand", role: "brand", x: 0.68, y: 10.12, width: 6.4, fontSize: 30, weight: "bold" },
    { id: "tagline", role: "subhead", x: 0.7, y: 9.52, width: 5.8, fontSize: 12.5, weight: "medium" },
    { id: "name", role: "headline", x: 0.7, y: 8.64, width: 3.4, fontSize: 15.5, weight: "bold" },
    { id: "contact", role: "contact", x: 0.72, y: 0.72, width: 7.2, fontSize: 10, weight: "regular" }
  ]
};

const genericBrandPhrases = new Set([
  "a business card",
  "a premium business card",
  "business card",
  "premium business card",
  "flyer",
  "postcard",
  "letterhead"
]);

const palettes: Record<string, { paper: CmykColor; ink: CmykColor; accent: CmykColor }> = {
  calm: {
    paper: { c: 0.02, m: 0.01, y: 0.03, k: 0 },
    ink: { c: 0.78, m: 0.6, y: 0.44, k: 0.82 },
    accent: { c: 0.72, m: 0.18, y: 0.34, k: 0.06 }
  },
  luxury: {
    paper: { c: 0.04, m: 0.03, y: 0.08, k: 0 },
    ink: { c: 0.72, m: 0.62, y: 0.48, k: 0.9 },
    accent: { c: 0.08, m: 0.24, y: 0.78, k: 0.08 }
  },
  technical: sampleBusinessCardLayout.palette,
  urgent: {
    paper: { c: 0.01, m: 0.01, y: 0.02, k: 0 },
    ink: { c: 0.74, m: 0.66, y: 0.58, k: 0.84 },
    accent: { c: 0, m: 0.82, y: 0.78, k: 0.02 }
  }
};

function normalizeBrief(brief?: string) {
  return (brief ?? "").replace(/\s+/g, " ").trim();
}

function titleCase(value: string) {
  return value
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((word) => {
      if (/^(ai|pdf|pdfx|pdf\/x|cmyk|hvac|seo|aeo)$/i.test(word)) {
        return word.toUpperCase();
      }
      return `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`;
    })
    .join(" ");
}

function cleanupCandidate(value: string) {
  return value
    .replace(/\b(?:with|that|and|for|business card|flyer|postcard|letterhead)\b.*$/i, "")
    .replace(/[.,;:|]+$/g, "")
    .trim();
}

function rejectGeneric(value: string) {
  const normalized = value.toLowerCase().replace(/^the\s+/i, "").trim();
  if (/^(?:create|make|design|generate|build|prepare|write|draft)\b/.test(normalized) || genericBrandPhrases.has(normalized) || normalized.length < 2) {
    return undefined;
  }
  return value;
}

function extractQuotedBrand(brief: string) {
  const quoted = brief.match(/["“]([^"”]{2,48})["”]/)?.[1];
  return quoted ? rejectGeneric(cleanupCandidate(quoted)) : undefined;
}

function extractLabeledValue(brief: string, labels: string[]) {
  const labelPattern = labels.join("|");
  const match = brief.match(new RegExp(`(?:${labelPattern})\\s*[:=-]\\s*([^,;|]{2,64})`, "i"));
  return match?.[1] ? cleanupCandidate(match[1]) : undefined;
}

function extractBrand(brief: string) {
  const explicit = extractLabeledValue(brief, ["brand", "company", "business"]);
  if (explicit) {
    return titleCase(explicit);
  }

  const quoted = extractQuotedBrand(brief);
  if (quoted) {
    return titleCase(quoted);
  }

  const forMatch = brief.match(/\bfor\s+(?:a|an|the)?\s*([^,.;|]{2,64}?)(?=,|;|\.|\||\s+with\b|\s+that\b|\s+to\b|$)/i)?.[1];
  const candidate = forMatch ? rejectGeneric(cleanupCandidate(forMatch)) : undefined;
  if (candidate) {
    return titleCase(candidate);
  }

  const leadingProductMatch = brief.match(/^([A-Za-z0-9&'. -]{2,48})\s+(?:business card|flyer|postcard|letterhead)\b/i)?.[1];
  const leadingCandidate = leadingProductMatch ? rejectGeneric(cleanupCandidate(leadingProductMatch)) : undefined;
  return leadingCandidate ? titleCase(leadingCandidate) : "Trim Proof";
}

function inferProductType(brief: string, requested?: ProductType): ProductType {
  if (requested) {
    return requested;
  }
  const lower = brief.toLowerCase();
  if (lower.includes("letterhead")) {
    return "letterhead";
  }
  if (lower.includes("flyer")) {
    return "flyer";
  }
  if (lower.includes("postcard")) {
    return "postcard";
  }
  return "business_card";
}

function extractPersonName(brief: string) {
  const explicit = extractLabeledValue(brief, ["name", "person"]);
  if (explicit) {
    return titleCase(explicit);
  }
  return "Avery Cole";
}

function extractContact(brief: string, brand: string) {
  const email = brief.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
  if (email) {
    return email.toLowerCase();
  }

  const phone = brief.match(/(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/)?.[0];
  if (phone) {
    return phone;
  }

  const url = brief.match(/\b(?:https?:\/\/)?(?:www\.)?[a-z0-9-]+\.[a-z]{2,}(?:\/[^\s,;]*)?/i)?.[0];
  if (url) {
    return url.replace(/^https?:\/\//i, "");
  }

  return `${brand.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 28) || "brand"}.com`;
}

function getTagline(brief: string) {
  const explicit = extractLabeledValue(brief, ["tagline", "headline"]);
  if (explicit) {
    return explicit;
  }

  const lower = brief.toLowerCase();
  if (lower.includes("luxury") || lower.includes("premium")) {
    return "Premium work, prepared for print.";
  }
  if (lower.includes("hvac") || lower.includes("repair") || lower.includes("urgent") || lower.includes("emergency")) {
    return "Fast service. Clean proof. Ready to run.";
  }
  if (lower.includes("restaurant") || lower.includes("coffee") || lower.includes("bar")) {
    return "Memorable details, made print-ready.";
  }
  if (lower.includes("tech") || lower.includes("software") || lower.includes("studio")) {
    return "Sharp creative, deterministic output.";
  }
  return "Designed cleanly. Exported precisely.";
}

function selectPalette(brief: string) {
  const lower = brief.toLowerCase();
  if (lower.includes("luxury") || lower.includes("gold") || lower.includes("premium")) {
    return palettes.luxury;
  }
  if (lower.includes("emergency") || lower.includes("urgent") || lower.includes("bold")) {
    return palettes.urgent;
  }
  if (lower.includes("calm") || lower.includes("wellness") || lower.includes("spa")) {
    return palettes.calm;
  }
  return palettes.technical;
}

function createTextBlocks(productType: ProductType, values: Record<string, string>, palette: LayoutSpec["palette"], pdfxLevel: LayoutSpec["pdfxLevel"]) {
  const pdfxLabel = pdfxLevel === "PDF/X-1a:2001" ? "PDF/X-1a" : pdfxLevel;
  return textBlockTemplates[productType].map((block) => {
    if (block.id === "brand") {
      return { ...block, content: values.brand.toUpperCase(), color: palette.ink } satisfies TextBlock;
    }
    if (block.id === "tagline") {
      return { ...block, content: values.tagline, color: { c: 0.55, m: 0.44, y: 0.38, k: 0.46 } } satisfies TextBlock;
    }
    if (block.id === "name") {
      return { ...block, content: values.personName, color: palette.ink } satisfies TextBlock;
    }
    return { ...block, content: `${values.contact}  |  ${pdfxLabel} ready`, color: { c: 0.48, m: 0.38, y: 0.32, k: 0.42 } } satisfies TextBlock;
  });
}

function createAssetSlots(productType: ProductType, brief: string, brand: string, tagline: string): AssetSlot[] {
  const profile = PRODUCT_PROFILES[productType];
  const style = brief || `Premium print-ready identity proof for ${brand}.`;
  const productLabel = profile.label.toLowerCase();
  return [
    {
      id: "background-art",
      kind: "background",
      prompt: [
        `Create a professional full-bleed ${productLabel} background image for commercial printing.`,
        `Brand context: ${brand}.`,
        `Mood: ${tagline}.`,
        `Creative brief: ${style}.`,
        "No text, no letters, no numbers, no logo, no watermark, no mockup, no paper shadows.",
        "Make the artwork visibly present with refined shapes, texture, or brand-relevant atmosphere; do not return a mostly blank white canvas.",
        "Leave the left third calm enough for vector typography and place stronger visual energy toward the right edge."
      ].join(" "),
      providerHint: "gemini",
      x: -profile.bleedIn,
      y: -profile.bleedIn,
      width: profile.trimWidthIn + 2 * profile.bleedIn,
      height: profile.trimHeightIn + 2 * profile.bleedIn,
      minimumDpi: 300
    }
  ];
}

export function deriveLayoutSpecFromBrief(input: BriefLayoutInput): LayoutSpec {
  const brief = normalizeBrief(input.brief);
  const productType = inferProductType(brief, input.productType);
  const pdfxLevel = input.pdfxLevel ?? sampleBusinessCardLayout.pdfxLevel;
  const brand = extractBrand(brief);
  const personName = extractPersonName(brief);
  const contact = extractContact(brief, brand);
  const tagline = getTagline(brief);
  const palette = selectPalette(brief);

  return layoutSpecSchema.parse({
    ...sampleBusinessCardLayout,
    productType,
    printProfile: input.printProfile ?? sampleBusinessCardLayout.printProfile,
    pdfxLevel,
    cropMarks: input.cropMarks ?? sampleBusinessCardLayout.cropMarks,
    palette,
    styleDirection: brief || sampleBusinessCardLayout.styleDirection,
    textBlocks: createTextBlocks(productType, { brand, personName, contact, tagline }, palette, pdfxLevel),
    assetSlots: createAssetSlots(productType, brief, brand, tagline)
  });
}
