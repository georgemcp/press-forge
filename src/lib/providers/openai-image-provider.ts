import OpenAI from "openai";
import type { AssetSlot } from "@/lib/print/layout-spec";
import { ProviderUnavailableError, type CreativeProvider, type GeneratedAsset } from "./types";

export class OpenAiImageProvider implements CreativeProvider {
  id = "openai" as const;

  async generateAsset(slot: AssetSlot): Promise<GeneratedAsset> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new ProviderUnavailableError("openai", "OPENAI_API_KEY is not configured.");
    }

    const client = new OpenAI({ apiKey });
    const model = process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1.5";
    const result = await client.images.generate({
      model,
      prompt: slot.prompt,
      size: "1536x1024"
    });
    const b64 = result.data?.[0]?.b64_json;
    if (!b64) {
      throw new Error("OpenAI image generation returned no image payload.");
    }
    const bytes = Uint8Array.from(Buffer.from(b64, "base64"));
    return {
      slotId: slot.id,
      provider: "openai",
      mimeType: "image/png",
      bytes,
      widthPx: 1536,
      heightPx: 1024,
      isVector: false
    };
  }
}
