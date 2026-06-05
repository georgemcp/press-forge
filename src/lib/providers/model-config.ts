export const DEFAULT_OPENAI_IMAGE_MODEL = "gpt-image-2";
export const DEFAULT_GEMINI_IMAGE_MODEL = "gemini-3-pro-image";

const OPENAI_IMAGE_MODEL_ALIASES = new Map<string, string>([
  ["gbt-2", DEFAULT_OPENAI_IMAGE_MODEL],
  ["gpt-2", DEFAULT_OPENAI_IMAGE_MODEL],
  ["gpt-image-2", DEFAULT_OPENAI_IMAGE_MODEL],
  ["gptimage2", DEFAULT_OPENAI_IMAGE_MODEL],
  ["gpt-image-1-5", "gpt-image-1.5"],
  ["gpt-image-1.5", "gpt-image-1.5"],
  ["gpt-image-1", "gpt-image-1"],
  ["gpt-image-1-mini", "gpt-image-1-mini"]
]);

const GEMINI_IMAGE_MODEL_ALIASES = new Map<string, string>([
  ["nana-banna-pro", DEFAULT_GEMINI_IMAGE_MODEL],
  ["nana-banana-pro", DEFAULT_GEMINI_IMAGE_MODEL],
  ["nano-banna-pro", DEFAULT_GEMINI_IMAGE_MODEL],
  ["nano-banana-pro", DEFAULT_GEMINI_IMAGE_MODEL],
  ["gemini-3-pro-image", DEFAULT_GEMINI_IMAGE_MODEL],
  ["gemini-3-pro-image-preview", DEFAULT_GEMINI_IMAGE_MODEL],
  ["gemini-3-1-flash-image", "gemini-3.1-flash-image"],
  ["gemini-3.1-flash-image", "gemini-3.1-flash-image"],
  ["nano-banana-2", "gemini-3.1-flash-image"],
  ["gemini-2-5-flash-image", "gemini-2.5-flash-image"],
  ["gemini-2.5-flash-image", "gemini-2.5-flash-image"],
  ["nano-banana", "gemini-2.5-flash-image"]
]);

export type ImageProviderMode = "auto" | "deterministic" | "required";

function normalizeAlias(value: string) {
  return value.trim().toLowerCase().replace(/[_\s]+/g, "-").replace(/-+/g, "-");
}

function resolveModel(value: string | undefined, fallback: string, aliases: Map<string, string>) {
  const candidate = value?.trim();
  if (!candidate) {
    return fallback;
  }
  return aliases.get(normalizeAlias(candidate)) ?? candidate;
}

export function resolveOpenAiImageModel(value = process.env.OPENAI_IMAGE_MODEL) {
  return resolveModel(value, DEFAULT_OPENAI_IMAGE_MODEL, OPENAI_IMAGE_MODEL_ALIASES);
}

export function resolveGeminiImageModel(value = process.env.GEMINI_IMAGE_MODEL) {
  return resolveModel(value, DEFAULT_GEMINI_IMAGE_MODEL, GEMINI_IMAGE_MODEL_ALIASES);
}

export function resolveImageProviderMode(value = process.env.TRIMPROOF_IMAGE_PROVIDER_MODE): ImageProviderMode {
  if (value === "deterministic" || value === "required") {
    return value;
  }
  return "auto";
}

export function getCreativeProviderStatus() {
  return {
    mode: resolveImageProviderMode(),
    openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
    openaiModel: resolveOpenAiImageModel(),
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    geminiModel: resolveGeminiImageModel()
  };
}
