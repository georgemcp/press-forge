import { describe, expect, it } from "vitest";
import { buildDataForSeoSerpSummary, normalizeSerpDomain, type DataForSeoSerpFile } from "@/lib/seo/dataforseo-serp";

describe("DataForSEO SERP summary", () => {
  it("normalizes domains and sorts the page-one competitors", () => {
    const file: DataForSeoSerpFile = {
      generatedAt: "2026-06-06T12:00:00.000Z",
      market: "google.com / US",
      snapshots: [
        {
          keyword: "ai flyer generator",
          se_domain: "google.com",
          check_url: "https://example.com/ai-flyer-generator",
          items: [
            { rank_group: 3, title: "Design", url: "https://www.design.com/ai-flyer-generator", domain: "www.design.com", description: null },
            { rank_group: 1, title: "Adobe", url: "https://www.adobe.com/express/create/ai/flyer", domain: "www.adobe.com", description: null },
            { rank_group: 2, title: "Canva", url: "https://www.canva.com/create/flyers/", domain: "www.canva.com", description: null },
            { rank_group: 4, title: "Template.net", url: "https://www.template.net/ai-flyer-generator", domain: "www.template.net", description: null },
            { rank_group: 5, title: "Venngage", url: "https://venngage.com/ai-tools/flyer-generator", domain: "venngage.com", description: null }
          ]
        },
        {
          keyword: "convert PDF to CMYK",
          se_domain: "google.com",
          check_url: "https://example.com/convert-pdf-to-cmyk",
          items: [
            { rank_group: 2, title: "Reddit", url: "https://www.reddit.com/r/graphic_design/", domain: "www.reddit.com", description: null },
            { rank_group: 1, title: "PDF2CMYK", url: "https://www.pdf2cmyk.com/", domain: "www.pdf2cmyk.com", description: null },
            { rank_group: 3, title: "Adobe", url: "https://community.adobe.com/", domain: "community.adobe.com", description: null },
            { rank_group: 4, title: "Kenthebookprinter", url: "https://kenthebookprinter.com/", domain: "kenthebookprinter.com", description: null },
            { rank_group: 5, title: "PDF editor free", url: "https://pdf-editor-free.com/", domain: "pdf-editor-free.com", description: null }
          ]
        }
      ]
    };

    const summary = buildDataForSeoSerpSummary(file);

    expect(normalizeSerpDomain("www.adobe.com")).toBe("adobe.com");
    expect(summary.totalSnapshots).toBe(2);
    expect(summary.snapshots[0].keyword).toBe("ai flyer generator");
    expect(summary.snapshots[0].topResults[0]).toMatchObject({
      rank_group: 1,
      domain: "www.adobe.com"
    });
    expect(summary.topDomains[0]).toMatchObject({
      domain: "www.adobe.com",
      appearances: 1,
      bestRank: 1
    });
    expect(summary.topDomains.find((domain) => domain.domain === "community.adobe.com")).toMatchObject({
      domain: "community.adobe.com",
      appearances: 1,
      bestRank: 3
    });
  });
});
