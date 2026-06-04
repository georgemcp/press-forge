import type { AssetSlot } from "@/lib/print/layout-spec";
import { GeminiImageProvider } from "./gemini-image-provider";
import { OpenAiImageProvider } from "./openai-image-provider";
import type { CreativeProvider } from "./types";

export function getCreativeProvider(slot: AssetSlot): CreativeProvider {
  if (slot.providerHint === "gemini" || slot.kind === "background" || slot.kind === "photo") {
    return new GeminiImageProvider();
  }
  return new OpenAiImageProvider();
}
