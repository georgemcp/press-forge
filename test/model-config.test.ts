import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_GEMINI_IMAGE_MODEL,
  DEFAULT_OPENAI_IMAGE_MODEL,
  getCreativeProviderStatus,
  resolveGeminiImageModel,
  resolveImageProviderMode,
  resolveOpenAiImageModel
} from "@/lib/providers/model-config";

describe("creative provider model config", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults to premium image models", () => {
    vi.stubEnv("OPENAI_IMAGE_MODEL", "");
    vi.stubEnv("GEMINI_IMAGE_MODEL", "");

    expect(resolveOpenAiImageModel()).toBe(DEFAULT_OPENAI_IMAGE_MODEL);
    expect(resolveGeminiImageModel()).toBe(DEFAULT_GEMINI_IMAGE_MODEL);
  });

  it("normalizes human model names and common typos", () => {
    expect(resolveOpenAiImageModel("gbt-2")).toBe("gpt-image-2");
    expect(resolveOpenAiImageModel("gpt image 2")).toBe("gpt-image-2");
    expect(resolveGeminiImageModel("nana banna pro")).toBe("gemini-3-pro-image");
    expect(resolveGeminiImageModel("Nano Banana Pro")).toBe("gemini-3-pro-image");
  });

  it("keeps explicit provider model IDs intact", () => {
    expect(resolveOpenAiImageModel("gpt-image-1-mini")).toBe("gpt-image-1-mini");
    expect(resolveGeminiImageModel("custom-gemini-image-model")).toBe("custom-gemini-image-model");
  });

  it("reports configured providers without exposing credentials", () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("OPENAI_IMAGE_MODEL", "gbt-2");
    vi.stubEnv("GEMINI_IMAGE_MODEL", "nana banna pro");
    vi.stubEnv("TRIMPROOF_IMAGE_PROVIDER_MODE", "required");

    expect(resolveImageProviderMode()).toBe("required");
    expect(getCreativeProviderStatus()).toEqual({
      mode: "required",
      openaiConfigured: true,
      openaiModel: "gpt-image-2",
      geminiConfigured: false,
      geminiModel: "gemini-3-pro-image"
    });
  });
});
