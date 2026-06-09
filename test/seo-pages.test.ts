import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { getToolPageMetadata } from "@/lib/seo/tool-page-metadata";
import { getToolPage, toolPages } from "@/lib/seo/tool-pages";

const toolPageTemplate = readFileSync("src/app/tools/[slug]/page.tsx", "utf8");
const toolsIndexSource = readFileSync("src/app/tools/page.tsx", "utf8");
const pricingPageSource = readFileSync("src/app/pricing/page.tsx", "utf8");
const marketingSiteSource = readFileSync("src/components/marketing-site.tsx", "utf8");

describe("SEO tool pages", () => {
  it("keeps tool page slugs unique", () => {
    const slugs = toolPages.map((page) => page.slug);

    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("keeps related links resolvable", () => {
    for (const page of toolPages) {
      for (const relatedSlug of page.relatedSlugs) {
        expect(
          getToolPage(relatedSlug),
          `${page.slug} related slug ${relatedSlug}`
        ).toBeDefined();
      }
    }
  });

  it("keeps answer-engine fields populated", () => {
    for (const page of toolPages) {
      expect(page.answer.length, `${page.slug} answer`).toBeGreaterThan(80);
      expect(page.checks.length, `${page.slug} checks`).toBeGreaterThanOrEqual(5);
      expect(page.steps.length, `${page.slug} steps`).toBeGreaterThanOrEqual(5);
      expect(page.sections.length, `${page.slug} sections`).toBeGreaterThanOrEqual(2);
      expect(page.faq.length, `${page.slug} faq`).toBeGreaterThanOrEqual(1);
      expect(page.keywords.length, `${page.slug} keywords`).toBeGreaterThanOrEqual(3);
    }
  });

  it("keeps supported product-template pages in the registry", () => {
    expect(getToolPage("business-card-pdf-template")).toBeDefined();
    expect(getToolPage("flyer-pdf-template")).toBeDefined();
    expect(getToolPage("poster-pdf-template")).toBeDefined();
    expect(getToolPage("tri-fold-brochure-template")).toBeDefined();
    expect(getToolPage("postcard-pdf-template")).toBeDefined();
    expect(getToolPage("letterhead-pdf-template")).toBeDefined();
  });

  it("keeps the business card bleed size guide accurate and bounded", () => {
    const page = getToolPage("business-card-bleed-size");

    expect(page).toBeDefined();
    expect(page?.pageType).toBe("guide");
    expect(page?.keywords).toContain("business card bleed size");
    expect(page?.answer).toContain("3.75 x 2.25 inches");
    expect(page?.answer).toContain("1125 x 675 px");
    expect(page?.answer).toContain("Printer specifications still control");
  });

  it("keeps the business card template page broad enough and bounded", () => {
    const page = getToolPage("business-card-pdf-template");

    expect(page).toBeDefined();
    expect(page?.title).toContain("Business Card Template");
    expect(page?.keywords).toContain("business card template");
    expect(page?.keywords).toContain("business card templates");
    expect(page?.keywords).toContain("business card template with bleed");
    expect(page?.answer).toContain("3.5 x 2 inch");
    expect(page?.answer).toContain("0.125 inch bleed");
    expect(page?.answer).toContain("static downloadable template");
    expect(page?.sections.map((section) => section.heading).join(" ")).toContain("Free template versus print-ready proof");
    expect(page?.sections.map((section) => section.body).join(" ")).toContain("1125 x 675 px");
    expect(page?.sections.map((section) => section.body).join(" ")).toContain("not a universal template marketplace");
    expect(page?.faq.map((item) => item.question).join(" ")).toContain("Should LLC be on a business card?");
    expect(page?.faq.map((item) => item.question).join(" ")).toContain("Is $20 for 100 business cards a good price?");
    expect(page?.faq.map((item) => item.answer).join(" ")).toContain("does not provide legal advice");
    expect(page?.faq.map((item) => item.answer).join(" ")).toContain("does not sell printed cards");
  });

  it("keeps the business card size guide accurate and bounded", () => {
    const page = getToolPage("business-card-size-guide");

    expect(page).toBeDefined();
    expect(page?.pageType).toBe("guide");
    expect(page?.keywords).toContain("business card size");
    expect(page?.keywords).toContain("business card dimensions");
    expect(page?.answer).toContain("3.5 x 2 inches");
    expect(page?.answer).toContain("1050 x 600 px");
    expect(page?.answer).toContain("1125 x 675 px");
    expect(page?.sections.map((section) => section.heading).join(" ")).toContain("Standard business card dimensions");
    expect(page?.faq.map((item) => item.question).join(" ")).toContain("Is a business card 2 x 3 inches or 3 x 5 inches?");
    expect(page?.faq.map((item) => item.question).join(" ")).toContain("Can Trim Proof guarantee a printer will accept my business card?");
  });

  it("keeps the business card pixel size guide accurate and bounded", () => {
    const page = getToolPage("business-card-pixel-size");

    expect(page).toBeDefined();
    expect(page?.pageType).toBe("guide");
    expect(page?.keywords).toContain("business card size pixels");
    expect(page?.keywords).toContain("business card pixel size");
    expect(page?.keywords).toContain("business card dimensions pixels");
    expect(page?.answer).toContain("1050 x 600 px");
    expect(page?.answer).toContain("1125 x 675 px");
    expect(page?.answer).toContain("975 x 525 px");
    expect(page?.answer).toContain("Printer templates can use different");
    expect(page?.checks).toContain("1125 x 675 px full-bleed size at 300 DPI");
    expect(page?.sections.map((section) => section.heading).join(" ")).toContain("Why printer pixel sizes disagree");
    expect(page?.sections.map((section) => section.body).join(" ")).toContain("Free demo art is watermarked");
    expect(page?.faq.map((item) => item.question).join(" ")).toContain("What business card pixel size should I use in Photoshop?");
    expect(page?.faq.map((item) => item.question).join(" ")).toContain("Is a business card 2 x 3 inches?");
    expect(page?.faq.map((item) => item.answer).join(" ")).toContain("each printer can set its own");
  });

  it("keeps the business card maker page broad enough and bounded", () => {
    const page = getToolPage("ai-business-card-generator");

    expect(page).toBeDefined();
    expect(page?.title).toContain("Business Card Maker");
    expect(page?.keywords).toContain("business card maker");
    expect(page?.keywords).toContain("business card creator");
    expect(page?.keywords).toContain("business card generator");
    expect(page?.keywords).toContain("online business card maker");
    expect(page?.keywords).toContain("free business card maker");
    expect(page?.keywords).toContain("AI business card generator");
    expect(page?.answer).toContain("3.5 x 2 inch");
    expect(page?.answer).toContain("Free demo art is watermarked");
    expect(page?.answer).toContain("PDF/X-1a downloads require a paid export credit");
    expect(page?.answer).toContain("printer specifications still control final acceptance");
    expect(page?.checks).toContain("3.5 x 2 inch business-card trim profile");
    expect(page?.checks).toContain("0.125 inch bleed on every side when artwork reaches the edge");
    expect(page?.sections.map((section) => section.heading).join(" ")).toContain("Free business card maker versus paid clean export");
    expect(page?.sections.map((section) => section.body).join(" ")).toContain("does not sell printed cards");
    expect(page?.faq.map((item) => item.question).join(" ")).toContain("What is the best site to make business cards?");
    expect(page?.faq.map((item) => item.question).join(" ")).toContain("What is the best free business card maker?");
    expect(page?.faq.map((item) => item.question).join(" ")).toContain("What is the average cost for 100 business cards?");
    expect(page?.faq.map((item) => item.answer).join(" ")).toContain("does not sell printed cards");
  });

  it("keeps the free business card maker page clear about watermarked demo export", () => {
    const page = getToolPage("free-ai-business-card-generator");

    expect(page).toBeDefined();
    expect(page?.title).toContain("Free Business Card Maker");
    expect(page?.keywords).toContain("free business card maker");
    expect(page?.keywords).toContain("free business card generator");
    expect(page?.answer).toContain("watermarked business-card proof");
    expect(page?.answer).toContain("clean checked PDF/X-1a export");
    expect(page?.checks).toContain("Free watermarked demo account path");
    expect(page?.sections.map((section) => section.heading).join(" ")).toContain("Free watermarked demo versus paid clean export");
    expect(page?.faq.map((item) => item.question).join(" ")).toContain("Can I make business cards for free?");
    expect(page?.faq.map((item) => item.answer).join(" ")).toContain("Clean production PDF/X downloads require a paid export credit");
  });

  it("keeps the flyer maker page broad enough and bounded", () => {
    const page = getToolPage("ai-flyer-generator");

    expect(page).toBeDefined();
    expect(page?.title).toContain("Flyer Maker");
    expect(page?.keywords).toContain("flyer maker");
    expect(page?.keywords).toContain("free flyer maker");
    expect(page?.keywords).toContain("free flyer generator");
    expect(page?.keywords).toContain("online flyer maker");
    expect(page?.keywords).toContain("AI flyer generator");
    expect(page?.answer).toContain("Free demo art is watermarked");
    expect(page?.answer).toContain("PDF/X-1a downloads require a paid export credit");
    expect(page?.answer).toContain("printer specifications still control final acceptance");
    expect(page?.checks).toContain("0.125 inch bleed when artwork reaches the edge");
    expect(page?.sections.map((section) => section.heading).join(" ")).toContain("Free flyer maker versus paid clean export");
    expect(page?.sections.map((section) => section.body).join(" ")).toContain("does not sell printed flyers");
    expect(page?.faq.map((item) => item.question).join(" ")).toContain("What is the best free flyer maker?");
    expect(page?.faq.map((item) => item.question).join(" ")).toContain("How do I make my own flyers?");
    expect(page?.faq.map((item) => item.question).join(" ")).toContain("Can ChatGPT create a flyer?");
    expect(page?.faq.map((item) => item.answer).join(" ")).toContain("does not sell printed flyers");
  });

  it("keeps the free flyer maker page clear about watermarked demo export", () => {
    const page = getToolPage("free-ai-flyer-generator");

    expect(page).toBeDefined();
    expect(page?.title).toContain("Free Flyer Maker");
    expect(page?.keywords).toContain("free flyer maker");
    expect(page?.keywords).toContain("free flyer generator");
    expect(page?.answer).toContain("watermarked flyer proof");
    expect(page?.answer).toContain("clean checked PDF/X-1a export");
    expect(page?.checks).toContain("Free watermarked demo account path");
    expect(page?.sections.map((section) => section.heading).join(" ")).toContain("Free watermarked demo versus paid clean export");
    expect(page?.faq.map((item) => item.question).join(" ")).toContain("Where can I create a flyer for free?");
    expect(page?.faq.map((item) => item.answer).join(" ")).toContain("Clean production PDF/X-1a downloads are unlocked");
  });

  it("keeps the flyer size guide accurate and bounded", () => {
    const page = getToolPage("flyer-size-guide");

    expect(page).toBeDefined();
    expect(page?.pageType).toBe("guide");
    expect(page?.keywords).toContain("flyer size");
    expect(page?.keywords).toContain("standard flyer dimensions");
    expect(page?.answer).toContain("8.5 x 11 inches");
    expect(page?.answer).toContain("2550 x 3300 px");
    expect(page?.answer).toContain("2625 x 3375 px");
    expect(page?.sections.map((section) => section.heading).join(" ")).toContain("A4, A5, and A6 flyer sizes");
    expect(page?.sections.map((section) => section.body).join(" ")).toContain("0.25 inch safe margin");
    expect(page?.faq.map((item) => item.question).join(" ")).toContain("Should a flyer be A5 or A6?");
    expect(page?.faq.map((item) => item.question).join(" ")).toContain("Can Trim Proof guarantee a printer will accept my flyer?");
  });

  it("keeps the flyer template page broad enough and bounded", () => {
    const page = getToolPage("flyer-pdf-template");

    expect(page).toBeDefined();
    expect(page?.title).toContain("Flyer Template");
    expect(page?.keywords).toContain("flyer template");
    expect(page?.keywords).toContain("flyer templates");
    expect(page?.keywords).toContain("free flyer template");
    expect(page?.keywords).toContain("flyer template PDF");
    expect(page?.answer).toContain("static downloadable template");
    expect(page?.answer).toContain("printer specifications still control final acceptance");
    expect(page?.checks).toContain("0.125 inch bleed on every side when artwork reaches the edge");
    expect(page?.sections.map((section) => section.heading).join(" ")).toContain("Free template versus print-ready proof");
    expect(page?.sections.map((section) => section.body).join(" ")).toContain("8.75 x 11.25 inch");
    expect(page?.sections.map((section) => section.body).join(" ")).toContain("2625 x 3375 px");
    expect(page?.sections.map((section) => section.body).join(" ")).toContain("not a universal template marketplace");
    expect(page?.faq.map((item) => item.question).join(" ")).toContain("Can I make flyers for free?");
    expect(page?.faq.map((item) => item.question).join(" ")).toContain("How is Trim Proof different from Canva");
    expect(page?.faq.map((item) => item.answer).join(" ")).toContain("does not");
  });

  it("keeps the poster maker page broad enough and bounded", () => {
    const page = getToolPage("poster-maker");

    expect(page).toBeDefined();
    expect(page?.title).toContain("Poster Maker");
    expect(page?.keywords).toContain("poster maker");
    expect(page?.keywords).toContain("poster creator");
    expect(page?.keywords).toContain("AI poster generator");
    expect(page?.keywords).toContain("online poster maker");
    expect(page?.answer).toContain("11 x 17 inch starter poster profile");
    expect(page?.answer).toContain("Free demo art is watermarked");
    expect(page?.answer).toContain("PDF/X-1a downloads require a paid export credit");
    expect(page?.answer).toContain("printer specifications still control final acceptance");
    expect(page?.checks).toContain("11 x 17 inch starter poster trim profile");
    expect(page?.sections.map((section) => section.heading).join(" ")).toContain("Free poster maker versus paid clean export");
    expect(page?.sections.map((section) => section.body).join(" ")).toContain("does not sell printed posters");
    expect(page?.faq.map((item) => item.question).join(" ")).toContain("What is the best free poster maker?");
    expect(page?.faq.map((item) => item.question).join(" ")).toContain("Is Trim Proof a poster printing service?");
    expect(page?.faq.map((item) => item.answer).join(" ")).toContain("does not sell printed posters");
  });

  it("keeps the free poster maker page clear about watermarked demo export", () => {
    const page = getToolPage("free-poster-maker");

    expect(page).toBeDefined();
    expect(page?.title).toContain("Free Poster Maker");
    expect(page?.keywords).toContain("free poster maker");
    expect(page?.keywords).toContain("free poster generator");
    expect(page?.keywords).toContain("AI poster generator");
    expect(page?.answer).toContain("watermarked poster proof");
    expect(page?.answer).toContain("clean checked PDF/X-1a export");
    expect(page?.checks).toContain("Free watermarked demo account path");
    expect(page?.sections.map((section) => section.heading).join(" ")).toContain("Free watermarked demo versus paid clean export");
    expect(page?.faq.map((item) => item.question).join(" ")).toContain("Where can I create a poster for free?");
    expect(page?.faq.map((item) => item.answer).join(" ")).toContain("Clean production PDF/X-1a downloads are unlocked");
  });

  it("keeps the poster size guide accurate and bounded", () => {
    const page = getToolPage("poster-size-guide");

    expect(page).toBeDefined();
    expect(page?.pageType).toBe("guide");
    expect(page?.keywords).toContain("poster size");
    expect(page?.keywords).toContain("poster dimensions");
    expect(page?.answer).toContain("11 x 17 poster is 3300 x 5100 px");
    expect(page?.answer).toContain("3375 x 5175 px");
    expect(page?.answer).toContain("Printer specifications still control");
    expect(page?.sections.map((section) => section.heading).join(" ")).toContain("Common poster dimensions");
    expect(page?.sections.map((section) => section.body).join(" ")).toContain("0.5 inch safe margin");
    expect(page?.faq.map((item) => item.question).join(" ")).toContain("Is 24 x 36 a standard poster size?");
    expect(page?.faq.map((item) => item.question).join(" ")).toContain("What pixel size is an 18 x 24 poster?");
  });

  it("keeps the poster template page broad enough and bounded", () => {
    const page = getToolPage("poster-pdf-template");

    expect(page).toBeDefined();
    expect(page?.title).toContain("Poster Template");
    expect(page?.keywords).toContain("poster template");
    expect(page?.keywords).toContain("poster templates");
    expect(page?.keywords).toContain("free poster template");
    expect(page?.keywords).toContain("poster PDF template");
    expect(page?.answer).toContain("11 x 17 starter poster proof");
    expect(page?.answer).toContain("free demo art is watermarked");
    expect(page?.answer).toContain("printer specifications still control final acceptance");
    expect(page?.checks).toContain("11 x 17 inch starter poster trim profile");
    expect(page?.sections.map((section) => section.heading).join(" ")).toContain("Free template versus print-ready proof");
    expect(page?.sections.map((section) => section.body).join(" ")).toContain("3375 x 5175 px");
    expect(page?.sections.map((section) => section.body).join(" ")).toContain("not a universal template marketplace");
    expect(page?.faq.map((item) => item.question).join(" ")).toContain("Can I make posters for free?");
    expect(page?.faq.map((item) => item.answer).join(" ")).toContain("Production PDF/X downloads are unlocked");
  });

  it("keeps the brochure maker page broad enough and bounded", () => {
    const page = getToolPage("brochure-maker");

    expect(page).toBeDefined();
    expect(page?.title).toContain("Brochure Maker");
    expect(page?.keywords).toContain("brochure maker");
    expect(page?.keywords).toContain("brochure creator");
    expect(page?.keywords).toContain("AI brochure maker");
    expect(page?.keywords).toContain("tri fold brochure maker");
    expect(page?.answer).toContain("8.5 x 11 inch landscape tri-fold");
    expect(page?.answer).toContain("Free demo art is watermarked");
    expect(page?.answer).toContain("PDF/X-1a downloads require a paid export credit");
    expect(page?.answer).toContain("printer specifications still control final acceptance");
    expect(page?.checks).toContain("8.5 x 11 inch landscape tri-fold brochure starter profile");
    expect(page?.sections.map((section) => section.heading).join(" ")).toContain("Free brochure maker versus paid clean export");
    expect(page?.sections.map((section) => section.body).join(" ")).toContain("does not sell printed brochures");
    expect(page?.faq.map((item) => item.question).join(" ")).toContain("What is the best program to make brochures?");
    expect(page?.faq.map((item) => item.question).join(" ")).toContain("Can ChatGPT make a brochure?");
    expect(page?.faq.map((item) => item.answer).join(" ")).toContain("does not sell printed brochures");
  });

  it("keeps the free brochure maker page clear about watermarked demo export", () => {
    const page = getToolPage("free-brochure-maker");

    expect(page).toBeDefined();
    expect(page?.title).toContain("Free Brochure Maker");
    expect(page?.keywords).toContain("free brochure maker");
    expect(page?.keywords).toContain("brochure maker free");
    expect(page?.answer).toContain("watermarked 8.5 x 11 tri-fold brochure proof");
    expect(page?.answer).toContain("clean checked PDF/X-1a export");
    expect(page?.checks).toContain("Free watermarked demo account path");
    expect(page?.sections.map((section) => section.heading).join(" ")).toContain("Free watermarked demo versus paid clean export");
    expect(page?.faq.map((item) => item.question).join(" ")).toContain("How can I make a brochure for free?");
    expect(page?.faq.map((item) => item.answer).join(" ")).toContain("Clean production PDF/X-1a downloads are unlocked");
  });

  it("keeps the tri-fold brochure template page broad enough and bounded", () => {
    const page = getToolPage("tri-fold-brochure-template");

    expect(page).toBeDefined();
    expect(page?.title).toContain("Tri-Fold Brochure Template");
    expect(page?.keywords).toContain("brochure template");
    expect(page?.keywords).toContain("tri fold brochure template");
    expect(page?.keywords).toContain("trifold brochure template");
    expect(page?.keywords).toContain("free brochure template");
    expect(page?.answer).toContain("static downloadable template");
    expect(page?.answer).toContain("free demo art is watermarked");
    expect(page?.answer).toContain("printer specifications still control final acceptance");
    expect(page?.checks).toContain("Panel guides and fold-safe placement for text and logos");
    expect(page?.sections.map((section) => section.heading).join(" ")).toContain("Free template versus print-ready proof");
    expect(page?.sections.map((section) => section.body).join(" ")).toContain("11.25 x 8.75 inch");
    expect(page?.sections.map((section) => section.body).join(" ")).toContain("3375 x 2625 px");
    expect(page?.sections.map((section) => section.body).join(" ")).toContain("Microsoft Word replacement");
    expect(page?.faq.map((item) => item.question).join(" ")).toContain("Does Word have a tri-fold brochure template?");
    expect(page?.faq.map((item) => item.question).join(" ")).toContain("Where can I find a trifold brochure template?");
    expect(page?.faq.map((item) => item.answer).join(" ")).toContain("does not distribute one static template file");
  });

  it("keeps the brochure size guide accurate and bounded", () => {
    const page = getToolPage("brochure-size-guide");

    expect(page).toBeDefined();
    expect(page?.pageType).toBe("guide");
    expect(page?.keywords).toContain("brochure size");
    expect(page?.keywords).toContain("tri fold brochure dimensions");
    expect(page?.answer).toContain("11 x 8.5 inches flat");
    expect(page?.answer).toContain("3300 x 2550 px");
    expect(page?.answer).toContain("3375 x 2625 px");
    expect(page?.sections.map((section) => section.heading).join(" ")).toContain("Brochure bleed, panels, and safe area");
    expect(page?.sections.map((section) => section.body).join(" ")).toContain("folded panel widths can vary by printer");
    expect(page?.faq.map((item) => item.question).join(" ")).toContain("What size is a tri-fold brochure?");
    expect(page?.faq.map((item) => item.question).join(" ")).toContain("Can Trim Proof guarantee a printer will accept my brochure?");
  });

  it("keeps the letterhead format guide accurate and bounded", () => {
    const page = getToolPage("letterhead-format-guide");

    expect(page).toBeDefined();
    expect(page?.pageType).toBe("guide");
    expect(page?.keywords).toContain("letterhead format");
    expect(page?.keywords).toContain("standard letterhead size");
    expect(page?.answer).toContain("8.5 x 11 inches");
    expect(page?.answer).toContain("210 x 297 mm");
    expect(page?.answer).toContain("2550 x 3300 px");
    expect(page?.answer).toContain("2625 x 3375 px");
    expect(page?.sections.map((section) => section.heading).join(" ")).toContain("Letterhead margins, bleed, and safe area");
    expect(page?.sections.map((section) => section.body).join(" ")).toContain("Microsoft Word templates");
    expect(page?.faq.map((item) => item.question).join(" ")).toContain("Can I make my own letterhead in Word?");
    expect(page?.faq.map((item) => item.question).join(" ")).toContain("Can Trim Proof guarantee a printer will accept my letterhead?");
  });

  it("keeps the letterhead template page broad enough and bounded", () => {
    const page = getToolPage("letterhead-pdf-template");

    expect(page).toBeDefined();
    expect(page?.title).toContain("Letterhead Template");
    expect(page?.keywords).toContain("letterhead template");
    expect(page?.keywords).toContain("letterhead templates");
    expect(page?.keywords).toContain("free letterhead template");
    expect(page?.keywords).toContain("business letterhead template");
    expect(page?.keywords).toContain("letterhead template Word");
    expect(page?.answer).toContain("static templates");
    expect(page?.answer).toContain("free demo art is watermarked");
    expect(page?.answer).toContain("printer specifications still control final acceptance");
    expect(page?.checks).toContain("US Letter 8.5 x 11 inch starter letterhead profile");
    expect(page?.sections.map((section) => section.heading).join(" ")).toContain("Free template versus print-ready proof");
    expect(page?.sections.map((section) => section.body).join(" ")).toContain("8.75 x 11.25 inch");
    expect(page?.sections.map((section) => section.body).join(" ")).toContain("2625 x 3375 px");
    expect(page?.sections.map((section) => section.body).join(" ")).toContain("not a universal template marketplace");
    expect(page?.sections.map((section) => section.body).join(" ")).toContain("Microsoft Word replacement");
    expect(page?.faq.map((item) => item.question).join(" ")).toContain("How do I get a letterhead template in Word?");
    expect(page?.faq.map((item) => item.question).join(" ")).toContain("Where can I get free letterhead templates?");
    expect(page?.faq.map((item) => item.answer).join(" ")).toContain("clean production PDF/X downloads require a paid export credit");
    expect(page?.faq.map((item) => item.answer).join(" ")).toContain("does not distribute one static template file");
  });

  it("keeps the letterhead maker page broad enough and bounded", () => {
    const page = getToolPage("letterhead-maker");

    expect(page).toBeDefined();
    expect(page?.title).toContain("Letterhead Maker");
    expect(page?.keywords).toContain("letterhead design");
    expect(page?.keywords).toContain("letterhead maker");
    expect(page?.keywords).toContain("letterhead generator");
    expect(page?.keywords).toContain("business letterhead maker");
    expect(page?.keywords).toContain("AI letterhead generator");
    expect(page?.answer).toContain("Free demo art is watermarked");
    expect(page?.answer).toContain("PDF/X-1a downloads require a paid export credit");
    expect(page?.answer).toContain("printer specifications still control final acceptance");
    expect(page?.checks).toContain("Optional 0.125 inch bleed when artwork or color reaches the edge");
    expect(page?.sections.map((section) => section.heading).join(" ")).toContain("Free letterhead maker versus paid clean export");
    expect(page?.sections.map((section) => section.body).join(" ")).toContain("does not sell printed letterhead");
    expect(page?.faq.map((item) => item.question).join(" ")).toContain("What is the best free letterhead maker?");
    expect(page?.faq.map((item) => item.question).join(" ")).toContain("How do I make my own business letterhead?");
    expect(page?.faq.map((item) => item.answer).join(" ")).toContain("does not sell printed letterhead");
  });

  it("keeps the free letterhead maker page clear about watermarked demo export", () => {
    const page = getToolPage("free-letterhead-maker");

    expect(page).toBeDefined();
    expect(page?.title).toContain("Free Letterhead Maker");
    expect(page?.keywords).toContain("free letterhead maker");
    expect(page?.keywords).toContain("free letterhead generator");
    expect(page?.keywords).toContain("letterhead maker with bleed");
    expect(page?.answer).toContain("watermarked letterhead proof");
    expect(page?.answer).toContain("clean checked PDF/X-1a export");
    expect(page?.checks).toContain("Free watermarked demo account path");
    expect(page?.sections.map((section) => section.heading).join(" ")).toContain("Free watermarked demo versus paid clean export");
    expect(page?.faq.map((item) => item.question).join(" ")).toContain("Where can I create letterhead for free?");
    expect(page?.faq.map((item) => item.answer).join(" ")).toContain("Clean production PDF/X-1a downloads are unlocked");
  });

  it("keeps the postcard template page broad enough and bounded", () => {
    const page = getToolPage("postcard-pdf-template");

    expect(page).toBeDefined();
    expect(page?.title).toContain("Postcard Template");
    expect(page?.keywords).toContain("postcard template");
    expect(page?.keywords).toContain("postcard templates");
    expect(page?.keywords).toContain("free postcard template");
    expect(page?.keywords).toContain("4x6 postcard template");
    expect(page?.keywords).toContain("direct mail postcard template");
    expect(page?.answer).toContain("static downloadable template marketplace");
    expect(page?.answer).toContain("watermarks free demo art");
    expect(page?.answer).toContain("USPS and printer specifications still control final acceptance");
    expect(page?.checks).toContain("4 x 6 or selected postcard trim profile");
    expect(page?.sections.map((section) => section.heading).join(" ")).toContain("Free template versus print-ready proof");
    expect(page?.sections.map((section) => section.body).join(" ")).toContain("6.25 x 4.25 inches");
    expect(page?.sections.map((section) => section.body).join(" ")).toContain("1875 x 1275 px");
    expect(page?.sections.map((section) => section.body).join(" ")).toContain("not a universal template marketplace");
    expect(page?.sections.map((section) => section.body).join(" ")).toContain("USPS approval service");
    expect(page?.faq.map((item) => item.question).join(" ")).toContain("Does Word have a postcard template?");
    expect(page?.faq.map((item) => item.question).join(" ")).toContain("How can I make my own postcards?");
    expect(page?.faq.map((item) => item.answer).join(" ")).toContain("Clean production PDF/X downloads require a paid export credit");
    expect(page?.faq.map((item) => item.answer).join(" ")).toContain("does not distribute one static template file");
  });

  it("keeps the postcard maker page broad enough and bounded", () => {
    const page = getToolPage("postcard-maker");

    expect(page).toBeDefined();
    expect(page?.title).toContain("Postcard Maker");
    expect(page?.keywords).toContain("postcard design");
    expect(page?.keywords).toContain("postcard maker");
    expect(page?.keywords).toContain("online postcard maker");
    expect(page?.keywords).toContain("AI postcard generator");
    expect(page?.answer).toContain("Free demo art is watermarked");
    expect(page?.answer).toContain("PDF/X-1a downloads require a paid export credit");
    expect(page?.answer).toContain("USPS, direct-mail vendor, and printer specifications still control final acceptance");
    expect(page?.checks).toContain("0.125 inch bleed when artwork reaches the edge");
    expect(page?.sections.map((section) => section.heading).join(" ")).toContain("Free postcard maker versus paid clean export");
    expect(page?.sections.map((section) => section.body).join(" ")).toContain("does not sell printed postcards");
    expect(page?.faq.map((item) => item.question).join(" ")).toContain("What is the best free postcard maker?");
    expect(page?.faq.map((item) => item.question).join(" ")).toContain("How do I make my own postcards?");
    expect(page?.faq.map((item) => item.answer).join(" ")).toContain("does not sell printed postcards");
  });

  it("keeps the free postcard maker page clear about watermarked demo export", () => {
    const page = getToolPage("free-postcard-maker");

    expect(page).toBeDefined();
    expect(page?.title).toContain("Free Postcard Maker");
    expect(page?.keywords).toContain("free postcard maker");
    expect(page?.keywords).toContain("free postcard generator");
    expect(page?.keywords).toContain("postcard maker with bleed");
    expect(page?.answer).toContain("watermarked postcard proof");
    expect(page?.answer).toContain("clean checked PDF/X-1a export");
    expect(page?.checks).toContain("Free watermarked demo account path");
    expect(page?.sections.map((section) => section.heading).join(" ")).toContain("Free watermarked demo versus paid clean export");
    expect(page?.faq.map((item) => item.question).join(" ")).toContain("Where can I create a postcard for free?");
    expect(page?.faq.map((item) => item.answer).join(" ")).toContain("Clean production PDF/X-1a downloads are unlocked");
  });

  it("keeps the postcard size guide accurate and bounded", () => {
    const page = getToolPage("postcard-size-guide");

    expect(page).toBeDefined();
    expect(page?.pageType).toBe("guide");
    expect(page?.keywords).toContain("postcard size");
    expect(page?.keywords).toContain("postcard dimensions");
    expect(page?.answer).toContain("4 x 6 inches");
    expect(page?.answer).toContain("6.25 x 4.25 inch");
    expect(page?.answer).toContain("1875 x 1275 px");
    expect(page?.sections.map((section) => section.heading).join(" ")).toContain("USPS mailing dimensions versus print dimensions");
    expect(page?.faq.map((item) => item.question).join(" ")).toContain("Can Trim Proof guarantee USPS or printer acceptance?");
  });

  it("keeps the print-ready artwork guide accurate and bounded", () => {
    const page = getToolPage("print-ready-artwork");

    expect(page).toBeDefined();
    expect(page?.pageType).toBe("guide");
    expect(page?.keywords).toContain("print ready artwork");
    expect(page?.keywords).toContain("print ready art");
    expect(page?.keywords).toContain("camera ready artwork");
    expect(page?.keywords).toContain("camera ready art");
    expect(page?.checks).toContain("PDF/X status and preflight evidence");
    expect(page?.sections.map((section) => section.heading).join(" ")).toContain("What is camera-ready artwork?");
    expect(page?.faq.map((item) => item.question).join(" ")).toContain("Is camera-ready artwork the same as print-ready artwork?");
    expect(page?.answer).toContain("does not guarantee every printer accepts every file");
    expect(page?.answer).toContain("repair arbitrary files");
  });

  it("keeps the prepress checklist guide in the registry", () => {
    const page = getToolPage("prepress-checklist");

    expect(page).toBeDefined();
    expect(page?.pageType).toBe("guide");
    expect(page?.keywords).toContain("print file requirements");
    expect(page?.answer).toContain("printer-specific requirements");
  });

  it("keeps the Canva print quality guide accurate and bounded", () => {
    const page = getToolPage("canva-cmyk-print-quality");

    expect(page).toBeDefined();
    expect(page?.pageType).toBe("guide");
    expect(page?.keywords).toContain("Canva print quality");
    expect(page?.keywords).toContain("Canva CMYK");
    expect(page?.answer).toContain("does not repair every Canva PDF");
    expect(page?.faq.map((item) => item.question).join(" ")).toContain("Can Trim Proof fix a low-quality Canva PDF?");
  });

  it("generates page-specific canonical and social metadata", async () => {
    const page = getToolPage("canva-print-ready-pdf");
    expect(page).toBeDefined();
    const metadata = getToolPageMetadata(page!);
    const openGraph = metadata.openGraph as { url?: string } | undefined;

    expect(metadata.alternates?.canonical).toBe("/tools/canva-print-ready-pdf");
    expect(openGraph?.url).toBe("/tools/canva-print-ready-pdf");
  });

  it("keeps conversion paths on public tool pages", () => {
    expect(toolPageTemplate).toContain("Create a demo account");
    expect(toolPageTemplate).toContain("Buy one export credit");
    expect(toolPageTemplate).toContain("Use Trim Proof Pro");
    expect(toolPageTemplate).toContain("/signup?intent=demo&next=/app");
    expect(toolPageTemplate).toContain("/signup?intent=single_export&next=/app%3Fmode%3Dadvanced");
    expect(toolPageTemplate).toContain("/signup?intent=pro&next=/app%3Fmode%3Dadvanced");
  });

  it("links the flyer PDF template from the homepage keyword map", () => {
    expect(marketingSiteSource).toContain("Flyer PDF template");
    expect(marketingSiteSource).toContain("/tools/flyer-pdf-template");
  });

  it("links the business card bleed guide from the homepage keyword map", () => {
    expect(marketingSiteSource).toContain("Business card bleed size");
    expect(marketingSiteSource).toContain("/tools/business-card-bleed-size");
  });

  it("links the business card size guide from the homepage keyword map", () => {
    expect(marketingSiteSource).toContain("Business card size");
    expect(marketingSiteSource).toContain("/tools/business-card-size-guide");
  });

  it("links the business card pixel size guide from the homepage keyword map", () => {
    expect(marketingSiteSource).toContain("Business card pixel size");
    expect(marketingSiteSource).toContain("/tools/business-card-pixel-size");
  });

  it("links the business card maker pages from the homepage keyword map", () => {
    expect(marketingSiteSource).toContain("Business card maker");
    expect(marketingSiteSource).toContain("Free business card maker");
    expect(marketingSiteSource).toContain("/tools/ai-business-card-generator");
    expect(marketingSiteSource).toContain("/tools/free-ai-business-card-generator");
  });

  it("links the flyer maker pages from the homepage keyword map", () => {
    expect(marketingSiteSource).toContain("Flyer maker");
    expect(marketingSiteSource).toContain("Free flyer maker");
    expect(marketingSiteSource).toContain("/tools/ai-flyer-generator");
    expect(marketingSiteSource).toContain("/tools/free-ai-flyer-generator");
  });

  it("links the flyer size guide from the homepage keyword map", () => {
    expect(marketingSiteSource).toContain("Flyer size");
    expect(marketingSiteSource).toContain("/tools/flyer-size-guide");
  });

  it("links the poster pages from the homepage keyword map", () => {
    expect(marketingSiteSource).toContain("Poster maker");
    expect(marketingSiteSource).toContain("Free poster maker");
    expect(marketingSiteSource).toContain("AI poster generator");
    expect(marketingSiteSource).toContain("Poster size");
    expect(marketingSiteSource).toContain("Poster template");
    expect(marketingSiteSource).toContain("/tools/poster-maker");
    expect(marketingSiteSource).toContain("/tools/free-poster-maker");
    expect(marketingSiteSource).toContain("/tools/poster-size-guide");
    expect(marketingSiteSource).toContain("/tools/poster-pdf-template");
  });

  it("links the brochure pages from the homepage keyword map", () => {
    expect(marketingSiteSource).toContain("Brochure maker");
    expect(marketingSiteSource).toContain("Free brochure maker");
    expect(marketingSiteSource).toContain("Tri-fold brochure template");
    expect(marketingSiteSource).toContain("Brochure size");
    expect(marketingSiteSource).toContain("/tools/brochure-maker");
    expect(marketingSiteSource).toContain("/tools/free-brochure-maker");
    expect(marketingSiteSource).toContain("/tools/tri-fold-brochure-template");
    expect(marketingSiteSource).toContain("/tools/brochure-size-guide");
  });

  it("links the postcard size guide from the homepage keyword map", () => {
    expect(marketingSiteSource).toContain("Postcard size");
    expect(marketingSiteSource).toContain("/tools/postcard-size-guide");
  });

  it("links the postcard template page from the homepage keyword map", () => {
    expect(marketingSiteSource).toContain("Postcard template");
    expect(marketingSiteSource).toContain("/tools/postcard-pdf-template");
  });

  it("links the postcard maker pages from the homepage keyword map", () => {
    expect(marketingSiteSource).toContain("Postcard maker");
    expect(marketingSiteSource).toContain("Free postcard maker");
    expect(marketingSiteSource).toContain("/tools/postcard-maker");
    expect(marketingSiteSource).toContain("/tools/free-postcard-maker");
  });

  it("links the letterhead format guide from the homepage keyword map", () => {
    expect(marketingSiteSource).toContain("Letterhead format");
    expect(marketingSiteSource).toContain("/tools/letterhead-format-guide");
  });

  it("links the letterhead template page from the homepage keyword map", () => {
    expect(marketingSiteSource).toContain("Letterhead template");
    expect(marketingSiteSource).toContain("/tools/letterhead-pdf-template");
  });

  it("links the letterhead maker pages from the homepage keyword map", () => {
    expect(marketingSiteSource).toContain("Letterhead maker");
    expect(marketingSiteSource).toContain("Free letterhead maker");
    expect(marketingSiteSource).toContain("/tools/letterhead-maker");
    expect(marketingSiteSource).toContain("/tools/free-letterhead-maker");
  });

  it("links the print-ready artwork guide from the homepage keyword map", () => {
    expect(marketingSiteSource).toContain("Print-ready artwork");
    expect(marketingSiteSource).toContain("/tools/print-ready-artwork");
  });

  it("links the prepress checklist from the homepage keyword map", () => {
    expect(marketingSiteSource).toContain("Prepress checklist");
    expect(marketingSiteSource).toContain("/tools/prepress-checklist");
  });

  it("links the Canva print quality guide from the homepage keyword map", () => {
    expect(marketingSiteSource).toContain("Canva print quality");
    expect(marketingSiteSource).toContain("/tools/canva-cmyk-print-quality");
  });

  it("keeps the public tools hub crawlable and structured", () => {
    expect(toolsIndexSource).toContain("Print-ready PDF tools and prepress guides");
    expect(toolsIndexSource).toContain("CollectionPage");
    expect(toolsIndexSource).toContain("ItemList");
    expect(toolsIndexSource).toContain("BreadcrumbList");
    expect(toolsIndexSource).toContain("Supported product size guides");
    expect(toolsIndexSource).toContain("flyer-size-guide");
    expect(toolsIndexSource).toContain("business-card-pixel-size");
    expect(toolsIndexSource).toContain("poster-maker");
    expect(toolsIndexSource).toContain("free-poster-maker");
    expect(toolsIndexSource).toContain("poster-size-guide");
    expect(toolsIndexSource).toContain("poster-pdf-template");
    expect(toolsIndexSource).toContain("brochure-maker");
    expect(toolsIndexSource).toContain("free-brochure-maker");
    expect(toolsIndexSource).toContain("tri-fold-brochure-template");
    expect(toolsIndexSource).toContain("brochure-size-guide");
    expect(toolsIndexSource).toContain("postcard-maker");
    expect(toolsIndexSource).toContain("free-postcard-maker");
    expect(toolsIndexSource).toContain("letterhead-maker");
    expect(toolsIndexSource).toContain("free-letterhead-maker");
    expect(toolsIndexSource).toContain("letterhead-format-guide");
    expect(toolsIndexSource).toContain("toolPages.length");
    expect(marketingSiteSource).toContain("href=\"/tools\"");
  });

  it("keeps public pricing factual and structured", () => {
    expect(pricingPageSource).toContain("Trim Proof Pricing");
    expect(pricingPageSource).toContain("$12");
    expect(pricingPageSource).toContain("$49");
    expect(pricingPageSource).toContain("15 advanced exports per month");
    expect(pricingPageSource).toContain("does not guarantee acceptance");
    expect(pricingPageSource).toContain("AggregateOffer");
    expect(pricingPageSource).toContain("FAQPage");
    expect(pricingPageSource).toContain("BreadcrumbList");
    expect(marketingSiteSource).toContain("href=\"/pricing\"");
  });
});
