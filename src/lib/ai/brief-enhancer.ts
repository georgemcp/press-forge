import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

const boundedText = z.string().min(1).max(4000);
const hexColor = z.string().regex(/^#[0-9a-f]{6}$/i);

export const briefEnhancementSchema = z.object({
  enhancedBrief: boundedText,
  brandName: z.string().min(1).max(200),
  tagline: z.string().max(200),
  styleDirection: boundedText,
  colorPalette: z.object({
    name: z.string().min(1).max(120),
    primary: hexColor,
    secondary: hexColor,
    accent: hexColor,
    background: hexColor
  }),
  suggestedContent: z.object({
    headline: z.string().max(1000),
    subhead: z.string().max(1000),
    body: z.string().max(4000),
    contactInfo: z.string().max(1000)
  }),
  designNotes: z.array(z.string().min(1).max(1000)).max(10),
  assetSuggestions: z.array(z.object({
    kind: z.enum(["background", "photo", "illustration", "logo", "icon"]),
    description: z.string().min(1).max(2000),
    placement: z.string().min(1).max(1000)
  })).max(8),
  productTypeHint: z.enum(["business_card", "postcard", "flyer", "poster", "brochure", "letterhead"])
});

export type BriefEnhancementResult = z.infer<typeof briefEnhancementSchema>;

export interface BriefEnhanceOptions {
  brief: string;
  productType?: string;
  referenceImageDescriptions?: string[];
  previousFeedback?: string;
}

function buildEnhancementPrompt(options: BriefEnhanceOptions): string {
  const parts = [
    "You are a professional print designer and creative director. Analyze this design brief and enhance it into a complete creative specification for a print-ready design.",
    "",
    `ORIGINAL BRIEF: "${options.brief}"`,
  ];

  if (options.productType) {
    parts.push(`PRODUCT TYPE: ${options.productType}`);
  }

  if (options.referenceImageDescriptions && options.referenceImageDescriptions.length > 0) {
    parts.push(
      `REFERENCE IMAGES PROVIDED: ${options.referenceImageDescriptions.join("; ")}`
    );
  }

  if (options.previousFeedback) {
    parts.push(`PREVIOUS FEEDBACK TO INCORPORATE: ${options.previousFeedback}`);
  }

  parts.push(
    "",
    "Return a JSON object with these fields:",
    "- enhancedBrief: A polished, detailed design brief (2-4 sentences) that captures the full creative vision, target audience, and desired impression.",
    "- brandName: The brand or company name extracted or inferred.",
    "- tagline: A compelling tagline or slogan (8 words max).",
    "- styleDirection: A detailed style direction describing the visual aesthetic, mood, typography feel, and composition approach (2-3 sentences).",
    "- colorPalette: { name: palette name, primary: hex, secondary: hex, accent: hex, background: hex } — choose colors that match the brief's intent.",
    "- suggestedContent: { headline, subhead, body, contactInfo } — write actual compelling copy (not placeholders).",
    "- designNotes: Array of 3-5 specific design recommendations (e.g., 'Use asymmetric layout with heavy left margin', 'Large bold typography for the headline').",
    "- assetSuggestions: Array of { kind, description, placement } for visual assets to generate or include. 'kind' is one of: background, photo, illustration, logo, icon.",
    "- productTypeHint: One of 'business_card', 'postcard', 'flyer', 'poster', 'brochure', 'letterhead' based on what fits the brief best.",
    "",
    "Make creative, specific choices. Do not use generic filler. Every suggestion should be actionable for print production.",
    "Return ONLY valid JSON. No markdown, no explanation."
  );

  return parts.join("\n");
}

export async function enhanceBriefWithOpenAI(
  options: BriefEnhanceOptions
): Promise<BriefEnhancementResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const client = new OpenAI({ apiKey });
  const prompt = buildEnhancementPrompt(options);

  const response = await client.chat.completions.create({
    model: process.env.OPENAI_BRIEF_MODEL || "gpt-4.1",
    messages: [
      {
        role: "system",
        content:
          "You are an expert print designer and creative director. You output only valid JSON.",
      },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI returned empty response for brief enhancement");
  }

  return briefEnhancementSchema.parse(JSON.parse(content));
}

export async function enhanceBriefWithGemini(
  options: BriefEnhanceOptions
): Promise<BriefEnhancementResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const client = new GoogleGenAI({ apiKey });
  const prompt = buildEnhancementPrompt(options);

  const response = await client.models.generateContent({
    model: process.env.GEMINI_BRIEF_MODEL || "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      temperature: 0.7,
    },
  });

  const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Gemini returned empty response for brief enhancement");
  }

  return briefEnhancementSchema.parse(JSON.parse(text));
}

export async function enhanceBrief(
  options: BriefEnhanceOptions
): Promise<BriefEnhancementResult> {
  // Try OpenAI first, fall back to Gemini
  if (process.env.OPENAI_API_KEY) {
    try {
      return await enhanceBriefWithOpenAI(options);
    } catch (error) {
      console.warn("OpenAI brief enhancement failed, trying Gemini:", error);
    }
  }

  if (process.env.GEMINI_API_KEY) {
    return await enhanceBriefWithGemini(options);
  }

  throw new Error(
    "No AI provider configured. Set OPENAI_API_KEY or GEMINI_API_KEY."
  );
}
