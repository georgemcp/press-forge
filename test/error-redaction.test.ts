import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as enhanceBriefRoute } from "@/app/api/brief/enhance/route";
import { POST as designChatRoute } from "@/app/api/design/chat/route";
import { POST as designGenerateRoute } from "@/app/api/design/generate/route";
import { clearRateLimitState } from "@/lib/security/request";

const mocks = vi.hoisted(() => ({
  enhanceBrief: vi.fn(),
  designChat: vi.fn(),
  generateDesignSpec: vi.fn()
}));

vi.mock("@/lib/auth/account-server", () => ({
  getAccountSessionFromCookies: async () => ({ userId: "user_test", email: "buyer@example.com" })
}));

vi.mock("@/lib/ai/brief-enhancer", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai/brief-enhancer")>();
  return { ...actual, enhanceBrief: mocks.enhanceBrief };
});

vi.mock("@/lib/ai/design-agent", () => ({
  designChat: mocks.designChat
}));

vi.mock("@/lib/ai/design-generator", () => ({
  generateDesignSpec: mocks.generateDesignSpec
}));

const enhancedBrief = {
  enhancedBrief: "A warm, print-ready business card for a neighborhood bakery.",
  brandName: "Marlow Bakery",
  tagline: "Baked daily",
  styleDirection: "Warm, artisanal, high-contrast type.",
  colorPalette: {
    name: "Warm crust",
    primary: "#2a1a10",
    secondary: "#7a4a24",
    accent: "#f2a541",
    background: "#fff8ee"
  },
  suggestedContent: {
    headline: "Marlow Bakery",
    subhead: "Baked daily",
    body: "Sourdough, pastries, and coffee.",
    contactInfo: "hello@example.com"
  },
  designNotes: ["Keep the type legible at card size."],
  assetSuggestions: [],
  productTypeHint: "business_card"
};

function jsonRequest(path: string, body: unknown) {
  return new Request(`https://attacker.example${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

describe("API error redaction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearRateLimitState();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    clearRateLimitState();
  });

  it("does not expose provider details from brief enhancement failures", async () => {
    mocks.enhanceBrief.mockRejectedValue(new Error("OPENAI_API_KEY sk-live-secret rejected by provider"));

    const response = await enhanceBriefRoute(jsonRequest("/api/brief/enhance", {
      brief: "A business card for a bakery"
    }));
    const body = await response.text();

    expect(response.status).toBe(500);
    expect(JSON.parse(body)).toEqual({
      error: "AI brief enhancement failed. Check that at least one AI provider is configured."
    });
    expect(body).not.toContain("sk-live-secret");
  });

  it("does not expose provider details from design chat failures", async () => {
    mocks.designChat.mockRejectedValue(new Error("Gemini project 12345 quota detail"));

    const response = await designChatRoute(jsonRequest("/api/design/chat", {
      messages: [{ role: "user", content: "Make the card warmer" }],
      context: { brief: "A bakery card", iteration: 1, productType: "business_card" }
    }));
    const body = await response.text();

    expect(response.status).toBe(500);
    expect(JSON.parse(body)).toEqual({
      error: "Design chat failed. Check AI provider configuration."
    });
    expect(body).not.toContain("Gemini project");
  });

  it("does not expose provider details from design generation failures", async () => {
    mocks.generateDesignSpec.mockRejectedValue(new Error("provider stack trace detail"));

    const response = await designGenerateRoute(jsonRequest("/api/design/generate", {
      enhancedBrief,
      productType: "business_card"
    }));
    const body = await response.text();

    expect(response.status).toBe(500);
    expect(JSON.parse(body)).toEqual({
      error: "Design generation failed. Check AI provider configuration."
    });
    expect(body).not.toContain("provider stack trace detail");
  });
});
