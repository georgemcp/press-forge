import { describe, expect, it } from "vitest";
import { keywordTakeaway } from "@/lib/seo/serp-takeaways";

describe("SEO research section takeaways", () => {
  it("describes template-heavy postcard and brochure queries accurately", () => {
    expect(keywordTakeaway("postcard template")).toContain("Canva, Adobe Express, Walgreens, Vistaprint");
    expect(keywordTakeaway("postcard size")).toContain("USPS and printer guides");
    expect(keywordTakeaway("tri-fold brochure template")).toContain("Word, Canva, Adobe Express");
    expect(keywordTakeaway("brochure size")).toContain("printer and design-tool guides");
    expect(keywordTakeaway("letterhead format")).toContain("page size, margins, and Word/DIY caveats");
  });

  it("keeps the generic design and prepress buckets distinct", () => {
    expect(keywordTakeaway("AI flyer generator")).toContain("Adobe, Canva, Design.com, Template.net, and Venngage");
    expect(keywordTakeaway("convert PDF to CMYK")).toContain("Adobe help, Reddit, and niche print tools");
  });

  it("covers the supported menu cluster", () => {
    expect(keywordTakeaway("menu template")).toContain("restaurant menu tools");
    expect(keywordTakeaway("menu maker")).toContain("restaurant menu tools");
    expect(keywordTakeaway("free menu maker")).toContain("single-sheet menu proofing");
  });
});
