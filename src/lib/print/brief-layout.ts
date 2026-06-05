import { layoutSpecSchema, type CmykColor, type LayoutSpec, type TextBlock } from "./layout-spec";
import { sampleBusinessCardLayout } from "./sample-layout";

interface BriefLayoutInput {
  brief?: string;
}

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
  if (genericBrandPhrases.has(normalized) || normalized.length < 2) {
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

  const forMatch = brief.match(/\bfor\s+(?:a|an|the)?\s*([A-Za-z0-9&'. -]{2,48})(?:,| with| that| to |$)/i)?.[1];
  const candidate = forMatch ? rejectGeneric(cleanupCandidate(forMatch)) : undefined;
  return candidate ? titleCase(candidate) : "Trim Proof";
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

function updateTextBlocks(blocks: TextBlock[], values: Record<string, string>, palette: LayoutSpec["palette"]) {
  return blocks.map((block) => {
    if (block.id === "brand") {
      return { ...block, content: values.brand.toUpperCase(), color: palette.ink };
    }
    if (block.id === "tagline") {
      return { ...block, content: values.tagline, color: { c: 0.55, m: 0.44, y: 0.38, k: 0.46 } };
    }
    if (block.id === "name") {
      return { ...block, content: values.personName, color: palette.ink };
    }
    if (block.id === "contact") {
      return { ...block, content: `${values.contact}  |  PDF/X-1a ready`, color: { c: 0.48, m: 0.38, y: 0.32, k: 0.42 } };
    }
    return block;
  });
}

export function deriveLayoutSpecFromBrief(input: BriefLayoutInput): LayoutSpec {
  const brief = normalizeBrief(input.brief);
  const brand = extractBrand(brief);
  const personName = extractPersonName(brief);
  const contact = extractContact(brief, brand);
  const tagline = getTagline(brief);
  const palette = selectPalette(brief);

  return layoutSpecSchema.parse({
    ...sampleBusinessCardLayout,
    palette,
    styleDirection: brief || sampleBusinessCardLayout.styleDirection,
    textBlocks: updateTextBlocks(sampleBusinessCardLayout.textBlocks, { brand, personName, contact, tagline }, palette)
  });
}
