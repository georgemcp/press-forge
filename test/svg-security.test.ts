import { describe, expect, it } from "vitest";
import { escapeSvgText } from "@/lib/print/pdf-export";

describe("SVG export security", () => {
  it("escapes active markup from customer text", () => {
    const escaped = escapeSvgText('</text><script>alert("xss")</script>&');

    expect(escaped).not.toContain("<script>");
    expect(escaped).toBe("&lt;/text&gt;&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;&amp;");
  });
});
