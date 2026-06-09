import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import type { LayoutSpec } from "@/lib/print/layout-spec";
import type { BriefEnhancementResult } from "./brief-enhancer";

export interface DesignChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface DesignChatContext {
  brief: string;
  enhancedBrief?: BriefEnhancementResult;
  currentSpec?: LayoutSpec;
  designRationale?: string;
  iteration: number;
  productType: string;
}

export interface DesignChatResponse {
  message: string;
  specChanges?: Partial<LayoutSpec>;
  newAssetSlots?: LayoutSpec["assetSlots"];
  newTextBlocks?: LayoutSpec["textBlocks"];
  newStyleDirection?: string;
  suggestedAction?: "regenerate" | "tweak" | "approve";
}

function buildChatSystemPrompt(context: DesignChatContext): string {
  const parts = [
    "You are a master print designer helping a client refine their print design. You work with precise layout specifications and can make specific, actionable changes.",
    "",
    "=== CURRENT DESIGN CONTEXT ===",
    `Product: ${context.productType}`,
    `Brief: ${context.brief}`,
    `Iteration: ${context.iteration}`,
  ];

  if (context.enhancedBrief) {
    parts.push(
      `Brand: ${context.enhancedBrief.brandName}`,
      `Style: ${context.enhancedBrief.styleDirection}`,
      `Palette: ${context.enhancedBrief.colorPalette.name}`
    );
  }

  if (context.currentSpec) {
    parts.push(
      "",
      "=== CURRENT LAYOUT ===",
      `Text blocks: ${context.currentSpec.textBlocks.length}`,
      `Asset slots: ${context.currentSpec.assetSlots.length}`,
      `Style: ${context.currentSpec.styleDirection}`
    );

    parts.push("Current text blocks:");
    for (const block of context.currentSpec.textBlocks) {
      parts.push(
        `- ${block.id} (${block.role}): "${block.content}" at x=${block.x}, y=${block.y}, w=${block.width}, size=${block.fontSize}pt, weight=${block.weight}`
      );
    }

    parts.push("Current asset slots:");
    for (const slot of context.currentSpec.assetSlots) {
      parts.push(
        `- ${slot.id} (${slot.kind}): "${slot.prompt.slice(0, 80)}..." at x=${slot.x}, y=${slot.y}, ${slot.width}x${slot.height}in`
      );
    }
  }

  if (context.designRationale) {
    parts.push("", `Design Rationale: ${context.designRationale}`);
  }

  parts.push(
    "",
    "=== YOUR ROLE ===",
    "The user will ask you to make changes to the design. You can:",
    "1. Modify text block content, positions, sizes, or styles",
    "2. Add, remove, or modify asset slots",
    "3. Change the style direction",
    "4. Suggest when to regenerate the full design",
    "",
    "When the user asks for a change, respond conversationally AND provide the technical changes in JSON format.",
    "",
    "Return a JSON object with:",
    '- message: Your conversational response to the user explaining what you changed (be specific and enthusiastic about design).',
    '- specChanges: Partial LayoutSpec with only the fields that changed (e.g., { textBlocks: [...], styleDirection: "..." }).',
    '- newAssetSlots: Complete new asset slots array if assets changed, otherwise omit.',
    '- newTextBlocks: Complete new text blocks array if text changed, otherwise omit.',
    '- newStyleDirection: New style direction string if changed, otherwise omit.',
    '- suggestedAction: "regenerate" if a full regeneration would help, "tweak" if small changes are enough, "approve" if the design looks good.',
    "",
    "IMPORTANT:",
    "- Keep text block positions within trim bounds for the product type.",
    "- When changing font sizes, keep them proportional to the product.",
    "- When adding asset slots, use descriptive AI prompts.",
    "- Position changes must be in inches from bottom-left.",
    "- Be creative and opinionated — you're the designer!",
    "",
    "Return ONLY valid JSON. No markdown wrapping."
  );

  return parts.join("\n");
}

export async function chatWithOpenAI(
  messages: DesignChatMessage[],
  context: DesignChatContext
): Promise<DesignChatResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const client = new OpenAI({ apiKey });
  const systemPrompt = buildChatSystemPrompt(context);

  const response = await client.chat.completions.create({
    model: process.env.OPENAI_CHAT_MODEL || "gpt-4.1",
    messages: [
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
    max_tokens: 2000,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI returned empty chat response");
  }

  return JSON.parse(content) as DesignChatResponse;
}

export async function chatWithGemini(
  messages: DesignChatMessage[],
  context: DesignChatContext
): Promise<DesignChatResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const client = new GoogleGenAI({ apiKey });
  const systemPrompt = buildChatSystemPrompt(context);

  const conversationHistory = messages
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n");

  const fullPrompt = `${systemPrompt}\n\n=== CONVERSATION ===\n${conversationHistory}\n\nRespond with the JSON changes as specified.`;

  const response = await client.models.generateContent({
    model: process.env.GEMINI_CHAT_MODEL || "gemini-2.5-flash",
    contents: fullPrompt,
    config: {
      responseMimeType: "application/json",
      temperature: 0.7,
      maxOutputTokens: 2000,
    },
  });

  const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Gemini returned empty chat response");
  }

  return JSON.parse(text) as DesignChatResponse;
}

export async function designChat(
  messages: DesignChatMessage[],
  context: DesignChatContext
): Promise<DesignChatResponse> {
  if (process.env.OPENAI_API_KEY) {
    try {
      return await chatWithOpenAI(messages, context);
    } catch (error) {
      console.warn("OpenAI design chat failed, trying Gemini:", error);
    }
  }

  if (process.env.GEMINI_API_KEY) {
    return await chatWithGemini(messages, context);
  }

  throw new Error("No AI provider configured.");
}
