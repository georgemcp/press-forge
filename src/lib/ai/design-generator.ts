import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import { layoutSpecSchema, type LayoutSpec } from "@/lib/print/layout-spec";
import { validatePrintableText } from "@/lib/print/pdf-export";
import type { ProductType, PrintProfileId } from "@/lib/print/constants";
import type { BriefEnhancementResult } from "./brief-enhancer";

export interface DesignGenerationInput {
  enhancedBrief: BriefEnhancementResult;
  productType: ProductType;
  printProfile?: PrintProfileId;
  pdfxLevel?: LayoutSpec["pdfxLevel"];
  cropMarks?: boolean;
  referenceImageUrls?: string[];
  designIteration?: number;
  layoutFeedback?: string;
  previousLayout?: LayoutSpec;
}

export interface DesignGenerationResult {
  layoutSpec: LayoutSpec;
  designRationale: string;
  assetPrompts: Array<{
    slotId: string;
    prompt: string;
    providerHint: "openai" | "gemini";
  }>;
}

function buildDesignSpecPrompt(input: DesignGenerationInput): string {
  const parts = [
    "You are a master print designer and layout artist. Create a complete print-ready layout specification based on the creative brief below.",
    "",
    "=== CREATIVE BRIEF ===",
    `Brand: ${input.enhancedBrief.brandName}`,
    `Tagline: ${input.enhancedBrief.tagline}`,
    `Style Direction: ${input.enhancedBrief.styleDirection}`,
    `Color Palette: ${input.enhancedBrief.colorPalette.name} — Primary ${input.enhancedBrief.colorPalette.primary}, Secondary ${input.enhancedBrief.colorPalette.secondary}, Accent ${input.enhancedBrief.colorPalette.accent}, Background ${input.enhancedBrief.colorPalette.background}`,
    "",
    "=== CONTENT ===",
    `Headline: ${input.enhancedBrief.suggestedContent.headline}`,
    `Subhead: ${input.enhancedBrief.suggestedContent.subhead}`,
    `Body: ${input.enhancedBrief.suggestedContent.body}`,
    `Contact: ${input.enhancedBrief.suggestedContent.contactInfo}`,
    "",
    "=== DESIGN NOTES ===",
    ...input.enhancedBrief.designNotes.map((n) => `- ${n}`),
    "",
    "=== ASSET SUGGESTIONS ===",
    ...input.enhancedBrief.assetSuggestions.map(
      (a) => `- ${a.kind}: ${a.description} (placement: ${a.placement})`
    ),
    "",
    "=== SPECS ===",
    `Product Type: ${input.productType}`,
    `Print Profile: ${input.printProfile || "USWebCoatedSWOP"}`,
    `PDF/X Level: ${input.pdfxLevel || "PDF/X-1a:2001"}`,
    `Crop Marks: ${input.cropMarks !== false ? "Yes" : "No"}`,
    `Iteration: ${input.designIteration || 1}`,
  ];

  if (input.referenceImageUrls && input.referenceImageUrls.length > 0) {
    parts.push("", "=== REFERENCE IMAGES ===");
    parts.push(
      "The following reference images were uploaded. Incorporate their visual style, colors, and motifs:"
    );
    parts.push(...input.referenceImageUrls.map((url, i) => `Reference ${i + 1}: ${url}`));
  }

  if (input.layoutFeedback) {
    parts.push("", "=== REQUIRED LAYOUT CORRECTION ===", input.layoutFeedback,
      "Correct the issue below without changing the supplied copy. Use fewer decorative assets if necessary. Reduce headline size or reposition blocks to leave room for wrapped lines.",
      `Previous layout: ${JSON.stringify(input.previousLayout)}`);
  }

  parts.push(
    "",
    "Return a JSON object with:",
    "1. layoutSpec: A complete LayoutSpec object with:",
    '   - productType: "business_card" | "postcard" | "flyer" | "poster" | "brochure" | "letterhead"',
    '   - printProfile: "USWebCoatedSWOP" | "GRACoL2013" | "FOGRA39"',
    '   - pdfxLevel: "PDF/X-1a:2001" | "PDF/X-4"',
    "   - cropMarks: boolean",
    "   - palette: { paper: {c,m,y,k}, ink: {c,m,y,k}, accent: {c,m,y,k} } — CMYK values 0-1",
    '   - textBlocks: Array of { id, role: "brand"|"headline"|"subhead"|"body"|"contact"|"legal", content, x, y, width, fontSize, weight: "regular"|"medium"|"bold", color: {c,m,y,k} }',
    "     Positions in inches from bottom-left of trim area. x and y must be within the trim bounds. y=0 is bottom, higher y moves up.",
    '   - assetSlots: Array of { id, kind: "background"|"photo"|"illustration"|"logo"|"icon", prompt (detailed AI image generation prompt), providerHint: "openai"|"gemini", x, y, width, height, minimumDpi: 300 }',
    "     Position assets within trim area. Asset dimensions in inches.",
    "   - styleDirection: string describing the visual approach",
    "",
    "2. designRationale: A paragraph explaining the design choices.",
    "",
    "3. assetPrompts: Array of { slotId, prompt (detailed, creative prompt for AI image generation), providerHint }",
    "   Make prompts detailed and visual. Include: composition, lighting, color scheme, subject matter, style references, mood.",
    "   For logos: describe mark style, typography, iconography.",
    "   For backgrounds: describe texture, gradient, pattern, atmosphere.",
    "   For photos/illustrations: describe subject, composition, lighting, mood, color palette.",
    "",
    "IMPORTANT RULES:",
    "- EVERY text block MUST be positioned within the trim area. x and y are inches from bottom-left of the trim box.",
    "- For business cards (3.5x2in): y ranges from 0 to 2. x ranges from 0 to 3.5.",
    "- For postcards (6x4in): y ranges from 0 to 4. x ranges from 0 to 6.",
    "- For flyers (8.5x11in): y ranges from 0 to 11. x ranges from 0 to 8.5.",
    "- For posters (11x17in): y ranges from 0 to 17. x ranges from 0 to 11.",
    "- For brochures (11x8.5in): y ranges from 0 to 8.5. x ranges from 0 to 11.",
    "- For letterheads (8.5x11in): y ranges from 0 to 11. x ranges from 0 to 8.5.",
    "- Text blocks MUST use these role values: brand, headline, subhead, body, contact, legal.",
    "- Font sizes should be proportional to the product size. Business cards use smaller text (6-16pt), posters use larger (14-54pt).",
    "- Asset slots positioned first as backgrounds, then logos/icons overlaid.",
    "- Use only assets needed by the brief. A text-led design can have zero asset slots. Do not generate a wordmark image that duplicates a vector brand text block.",
    "- Preserve all supplied copy and legal notices. Keep legal text visibly contrasting with its background; never hide it by matching the paper color.",
    "- Keep text at least 0.25 inches inside every trim edge. Text y is the FIRST LINE BASELINE, not the top edge. Reserve room above it for the font ascent and below it for every wrapped line.",
    "- Text wraps to its width at the actual font size. Reserve at least fontSize * 1.22 points per line. Do not overlap text blocks or place logos over text.",
    "- The renderer supports two font families: Instrument Sans for regular weight and Bricolage Grotesque for medium/bold. Do not promise serif typography or unsupported font choices.",
    "- CMYK values must be between 0 and 1.",
    "",
    "Return ONLY valid JSON. No markdown wrapping, no explanation outside the JSON."
  );

  return parts.join("\n");
}

export async function generateDesignSpecWithOpenAI(
  input: DesignGenerationInput
): Promise<DesignGenerationResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const client = new OpenAI({ apiKey });
  const prompt = buildDesignSpecPrompt(input);

  const response = await client.chat.completions.create({
    model: process.env.OPENAI_DESIGN_MODEL || "gpt-4.1",
    messages: [
      {
        role: "system",
        content:
          "You are a master print designer who creates print-ready layout specifications. You output only valid JSON with precise measurements. Your designs are creative, professional, and production-ready.",
      },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.8,
    max_tokens: 4000,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI returned empty design spec");
  }

  const result = JSON.parse(content) as DesignGenerationResult;

  // Post-process: ensure all CMYK values are in range
  const clamp = (v: number) => Math.max(0, Math.min(1, v));
  result.layoutSpec.palette.paper.c = clamp(result.layoutSpec.palette.paper.c);
  result.layoutSpec.palette.paper.m = clamp(result.layoutSpec.palette.paper.m);
  result.layoutSpec.palette.paper.y = clamp(result.layoutSpec.palette.paper.y);
  result.layoutSpec.palette.paper.k = clamp(result.layoutSpec.palette.paper.k);
  result.layoutSpec.palette.ink.c = clamp(result.layoutSpec.palette.ink.c);
  result.layoutSpec.palette.ink.m = clamp(result.layoutSpec.palette.ink.m);
  result.layoutSpec.palette.ink.y = clamp(result.layoutSpec.palette.ink.y);
  result.layoutSpec.palette.ink.k = clamp(result.layoutSpec.palette.ink.k);
  result.layoutSpec.palette.accent.c = clamp(result.layoutSpec.palette.accent.c);
  result.layoutSpec.palette.accent.m = clamp(result.layoutSpec.palette.accent.m);
  result.layoutSpec.palette.accent.y = clamp(result.layoutSpec.palette.accent.y);
  result.layoutSpec.palette.accent.k = clamp(result.layoutSpec.palette.accent.k);

  return result;
}

export async function generateDesignSpecWithGemini(
  input: DesignGenerationInput
): Promise<DesignGenerationResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const client = new GoogleGenAI({ apiKey });
  const prompt = buildDesignSpecPrompt(input);

  const response = await client.models.generateContent({
    model: process.env.GEMINI_DESIGN_MODEL || "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      temperature: 0.8,
      maxOutputTokens: 4000,
    },
  });

  const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Gemini returned empty design spec");
  }

  const result = JSON.parse(text) as DesignGenerationResult;
  return result;
}

export async function generateDesignSpec(
  input: DesignGenerationInput
): Promise<DesignGenerationResult> {
  let request = input;
  for (let attempt = 0; attempt < 2; attempt++) {
    const result = await generateWithAvailableProvider(request);
    try {
      result.layoutSpec = layoutSpecSchema.parse(result.layoutSpec);
      if (result.layoutSpec.productType !== input.productType) throw new Error("The layout must use the requested product dimensions.");
      result.layoutSpec.printProfile = input.printProfile ?? "USWebCoatedSWOP";
      result.layoutSpec.pdfxLevel = input.pdfxLevel ?? "PDF/X-1a:2001";
      result.layoutSpec.cropMarks = input.cropMarks !== false;
      // A text-only brief must not acquire paid decorative images downstream.
      if (input.enhancedBrief.assetSuggestions.length === 0) {
        result.layoutSpec.assetSlots = [];
        result.assetPrompts = [];
      }
      await validatePrintableText(result.layoutSpec);
      return result;
    } catch (error) {
      if (attempt === 1) throw error;
      request = { ...input, previousLayout: result.layoutSpec, layoutFeedback: error instanceof Error ? error.message : "The layout failed print geometry validation." };
    }
  }
  throw new Error("The layout could not be made printable.");
}

async function generateWithAvailableProvider(input: DesignGenerationInput): Promise<DesignGenerationResult> {
  if (process.env.OPENAI_API_KEY) {
    try {
      return await generateDesignSpecWithOpenAI(input);
    } catch (error) {
      console.warn("OpenAI design spec generation failed, trying Gemini:", error);
    }
  }

  if (process.env.GEMINI_API_KEY) {
    return await generateDesignSpecWithGemini(input);
  }

  throw new Error("No AI provider configured.");
}
