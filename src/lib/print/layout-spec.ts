import { z } from "zod";

export const cmykColorSchema = z.object({
  c: z.number().min(0).max(1),
  m: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  k: z.number().min(0).max(1)
});

export const textBlockSchema = z.object({
  id: z.string().min(1),
  role: z.enum(["brand", "headline", "subhead", "body", "contact", "legal"]),
  content: z.string().min(1),
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  fontSize: z.number().positive(),
  weight: z.enum(["regular", "medium", "bold"]),
  color: cmykColorSchema
});

export const assetSlotSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["background", "photo", "illustration", "logo", "icon"]),
  prompt: z.string().min(1),
  providerHint: z.enum(["openai", "gemini", "recraft", "deterministic"]).optional(),
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  minimumDpi: z.number().int().min(300).default(300)
});

export const layoutSpecSchema = z.object({
  productType: z.enum(["business_card", "postcard", "flyer", "poster", "brochure", "letterhead", "menu"]),
  printProfile: z.enum(["USWebCoatedSWOP", "GRACoL2013", "FOGRA39"]).default("USWebCoatedSWOP"),
  pdfxLevel: z.enum(["PDF/X-1a:2001", "PDF/X-4"]).default("PDF/X-1a:2001"),
  cropMarks: z.boolean().default(true),
  palette: z.object({
    paper: cmykColorSchema,
    ink: cmykColorSchema,
    accent: cmykColorSchema
  }),
  textBlocks: z.array(textBlockSchema).min(1),
  assetSlots: z.array(assetSlotSchema).default([]),
  styleDirection: z.string().min(1)
});

export type CmykColor = z.infer<typeof cmykColorSchema>;
export type TextBlock = z.infer<typeof textBlockSchema>;
export type AssetSlot = z.infer<typeof assetSlotSchema>;
export type LayoutSpec = z.infer<typeof layoutSpecSchema>;
