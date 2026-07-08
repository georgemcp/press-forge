import { GoogleGenAI } from "@google/genai";
import type { AssetSlot } from "@/lib/print/layout-spec";
import { resolveGeminiImageModel } from "./model-config";
import { ProviderUnavailableError, type CreativeProvider, type GeneratedAsset } from "./types";

export class GeminiImageProvider implements CreativeProvider {
  id = "gemini" as const;

  async generateAsset(slot: AssetSlot): Promise<GeneratedAsset> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new ProviderUnavailableError("gemini", "GEMINI_API_KEY is not configured.");
    }

    const client = new GoogleGenAI({ apiKey });
    const model = resolveGeminiImageModel();
    const response = await client.models.generateContent({
      model,
      contents: slot.prompt
    });
    const imagePart = response.candidates?.[0]?.content?.parts?.find((part) => "inlineData" in part);
    const data = imagePart && "inlineData" in imagePart ? imagePart.inlineData?.data : undefined;
    const mimeType = imagePart && "inlineData" in imagePart ? imagePart.inlineData?.mimeType ?? "image/png" : "image/png";
    if (!data) {
      throw new Error("Gemini image generation returned no image payload.");
    }
    return {
      slotId: slot.id,
      provider: "gemini",
      mimeType,
      bytes: Uint8Array.from(Buffer.from(data, "base64")),
      widthPx: 4096,
      heightPx: 4096,
      isVector: false
    };
  }
}
