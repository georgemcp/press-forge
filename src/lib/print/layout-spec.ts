import { z } from "zod";

export const cmykColorSchema = z.object({
  c: z.number().min(0).max(1),
  m: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  k: z.number().min(0).max(1)
});

export const textBlockSchema = z.object({
  id: z.string().min(1).max(80).regex(/^[a-zA-Z0-9_-]+$/),
  role: z.enum(["brand", "headline", "subhead", "body", "contact", "legal"]),
  content: z.string().min(1).max(4000),
  x: z.number().finite().min(-1).max(40),
  y: z.number().finite().min(-1).max(40),
  width: z.number().finite().positive().max(40),
  fontSize: z.number().finite().min(4).max(240),
  weight: z.enum(["regular", "medium", "bold"]),
  color: cmykColorSchema
});

export const assetSlotSchema = z.object({
  id: z.string().min(1).max(80).regex(/^[a-zA-Z0-9_-]+$/),
  kind: z.enum(["background", "photo", "illustration", "logo", "icon"]),
  prompt: z.string().min(1).max(4000),
  providerHint: z.enum(["openai", "gemini", "recraft", "deterministic"]).optional(),
  x: z.number().finite().min(-1).max(40),
  y: z.number().finite().min(-1).max(40),
  width: z.number().finite().positive().max(40),
  height: z.number().finite().positive().max(40),
  minimumDpi: z.number().int().min(300).max(1200).default(300)
});

export const layoutSpecSchema = z.object({
  productType: z.enum(["business_card", "postcard", "flyer", "poster", "brochure", "letterhead"]),
  printProfile: z.enum(["USWebCoatedSWOP", "GRACoL2013", "FOGRA39"]).default("USWebCoatedSWOP"),
  pdfxLevel: z.enum(["PDF/X-1a:2001", "PDF/X-4"]).default("PDF/X-1a:2001"),
  cropMarks: z.boolean().default(true),
  palette: z.object({
    paper: cmykColorSchema,
    ink: cmykColorSchema,
    accent: cmykColorSchema
  }),
  textBlocks: z.array(textBlockSchema).min(1).max(64),
  assetSlots: z.array(assetSlotSchema).max(8).default([]),
  styleDirection: z.string().min(1).max(2000)
});

export type CmykColor = z.infer<typeof cmykColorSchema>;
export type TextBlock = z.infer<typeof textBlockSchema>;
export type AssetSlot = z.infer<typeof assetSlotSchema>;
export type LayoutSpec = z.infer<typeof layoutSpecSchema>;
