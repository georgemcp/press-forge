import type { AssetSlot, LayoutSpec } from "@/lib/print/layout-spec";

export interface GeneratedAsset {
  slotId: string;
  provider: "openai" | "gemini" | "recraft" | "deterministic";
  mimeType: string;
  bytes: Uint8Array;
  widthPx: number;
  heightPx: number;
  isVector: boolean;
}

export interface CreativeProvider {
  id: GeneratedAsset["provider"];
  generateAsset(slot: AssetSlot, layoutSpec: LayoutSpec): Promise<GeneratedAsset>;
}

export class ProviderUnavailableError extends Error {
  constructor(provider: string, reason: string) {
    super(`${provider} provider unavailable: ${reason}`);
    this.name = "ProviderUnavailableError";
  }
}
