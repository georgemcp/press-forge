export function keywordTakeaway(keyword: string) {
  const lowerKeyword = keyword.toLowerCase();

  if (lowerKeyword.includes("postcard")) {
    if (lowerKeyword.includes("size") || lowerKeyword.includes("dimension") || lowerKeyword.includes("pixel")) {
      return "Postcard size SERPs are dominated by USPS and printer guides. Answer size, bleed, pixels, safe area, and mailing caveats first, then route into the checked postcard proof workflow.";
    }

    return "Postcard template and maker SERPs are dominated by Canva, Adobe Express, Walgreens, Vistaprint, Jukebox Print, Avery, MyPostcard, MyCreativeShop, Design.com, Kittl, and MOO. Keep the checked print-handoff wedge, not a mailing or print-shop claim.";
  }

  if (lowerKeyword.includes("brochure")) {
    if (lowerKeyword.includes("size") || lowerKeyword.includes("dimension") || lowerKeyword.includes("pixel")) {
      return "Brochure size SERPs are dominated by printer and design-tool guides. Answer 11 x 8.5 flat setup, pixels, bleed, safe area, and fold-safe margins first.";
    }

    return "Brochure template and maker SERPs are dominated by Word, Canva, Adobe Express, printer templates, Pinterest, Google Docs libraries, Vecteezy, Venngage, and YouTube tutorials. Keep the checked print-handoff wedge, not a generic static-template claim.";
  }

  if (lowerKeyword.includes("letterhead")) {
    if (lowerKeyword.includes("format") || lowerKeyword.includes("size") || lowerKeyword.includes("dimension")) {
      return "Letterhead format SERPs are dominated by Canva, Microsoft Word, Adobe, and template libraries. Answer page size, margins, and Word/DIY caveats first.";
    }

    return "Letterhead template and maker SERPs are dominated by Word, Adobe, Canva, Template.net, Design.com, Pinterest, Vecteezy, Venngage, and app-store tools. Keep the checked print-handoff wedge, not a generic template claim.";
  }

  if (lowerKeyword.includes("menu")) {
    if (lowerKeyword.includes("template")) {
      return "Menu template SERPs are dominated by restaurant menu tools, template libraries, and print-design products. Keep the checked print-handoff wedge and stay explicit about single-sheet menu proofing.";
    }

    if (lowerKeyword.includes("free")) {
      return "Free menu maker SERPs are dominated by restaurant menu tools, template libraries, and print-design products. Keep the checked print-handoff wedge and stay explicit about single-sheet menu proofing.";
    }

    return "Menu maker SERPs are dominated by restaurant menu tools, template libraries, and print-design products. Keep the checked print-handoff wedge, not a generic restaurant or ordering-platform claim.";
  }

  if (lowerKeyword.includes("flyer") || lowerKeyword.includes("business card") || lowerKeyword.includes("poster")) {
    return "Generic AI design SERPs are locked by Adobe, Canva, Design.com, Template.net, and Venngage. Keep the checked print handoff wedge, not a generic template claim.";
  }

  return "Technical prepress SERPs split across Adobe help, Reddit, and niche print tools. Answer the prep problem first, then route into print-ready export.";
}
