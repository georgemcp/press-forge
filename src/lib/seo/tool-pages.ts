export interface ToolPage {
  slug: string;
  title: string;
  metaDescription: string;
  h1: string;
  answer: string;
  intent: string;
  checks: string[];
  steps: string[];
  relatedSlugs: string[];
  sections: Array<{
    heading: string;
    body: string;
  }>;
  faq: Array<{
    question: string;
    answer: string;
  }>;
  keywords: string[];
}

export const toolPages: ToolPage[] = [
  {
    slug: "print-ready-pdf-generator",
    title: "Print-Ready PDF Generator",
    metaDescription:
      "Create print-ready PDF/X files with bleed, crop marks, CMYK output, embedded vector fonts, and preflight checks.",
    h1: "Print-ready PDF generator for business cards, flyers, postcards, and letterhead",
    answer:
      "A print-ready PDF generator should create the correct trim size, bleed, crop marks, embedded fonts, CMYK output, and preflight report. Trim Proof is built to generate creative assets separately from the deterministic prepress step that makes the final file printable.",
    keywords: ["print ready PDF", "print ready PDF generator", "make PDF print ready"],
    intent: "Use this page when you need to turn a plain-English print brief into a PDF that a printer can inspect without guessing the trim size, bleed, fonts, color workflow, or raster resolution.",
    checks: ["TrimBox and BleedBox dimensions", "PDF/X subtype", "Embedded vector fonts", "Placed raster DPI", "Crop marks when enabled"],
    steps: ["Describe the product and brand", "Generate a dummy proof", "Review the visible bleed, trim, and safe guides", "Open advanced mode for a paid production export", "Download the PDF/X proof after preflight passes"],
    relatedSlugs: ["ai-business-card-generator", "ai-flyer-generator", "pdf-preflight-checker"],
    sections: [
      {
        heading: "What makes a PDF print-ready?",
        body:
          "A PDF is print-ready when the printer can impose and produce it without guessing. The file should have correct trim and bleed boxes, embedded fonts, printer-safe color handling, high-resolution raster assets, and visible crop marks when requested."
      },
      {
        heading: "Why Trim Proof separates AI from prepress",
        body:
          "AI image models are useful for creative direction and artwork, but they do not reliably control PDF boxes, ICC profiles, CMYK output, or vector typography. Trim Proof keeps those final properties in deterministic code."
      }
    ],
    faq: [
      {
        question: "Does Trim Proof rasterize text?",
        answer: "No. Deliverable text is typeset as real embedded vector fonts in the deterministic composition layer."
      },
      {
        question: "Can I try it without paying?",
        answer: "Yes. Dummy proof mode creates a sample proof and preflight report before you configure a paid export."
      }
    ]
  },
  {
    slug: "pdf-to-cmyk-converter",
    title: "PDF to CMYK Converter",
    metaDescription:
      "Convert PDF color workflows toward CMYK with output-intent profiles and preflight checks for print production.",
    h1: "PDF to CMYK conversion for print-ready exports",
    answer:
      "PDF to CMYK conversion should use an ICC-aware print workflow, not a visual-only color filter. Trim Proof targets CMYK output through Ghostscript and validates the final file before download.",
    keywords: ["pdf to cmyk", "convert PDF to CMYK", "CMYK PDF converter"],
    intent: "Use this page when an RGB or screen-first PDF needs a print-oriented color workflow before it goes to a commercial printer.",
    checks: ["Explicit print profile", "PDF/X output intent", "CMYK-oriented export path", "Preflight report after conversion", "No hidden rasterized text requirement"],
    steps: ["Choose the print profile expected by the printer", "Keep text as vector fonts", "Generate or upload the structured proof", "Convert through the deterministic prepress layer", "Inspect the preflight report before sending"],
    relatedSlugs: ["print-ready-pdf-generator", "pdf-preflight-checker", "add-bleed-to-pdf-online"],
    sections: [
      {
        heading: "Why RGB PDFs cause print surprises",
        body:
          "RGB colors are designed for screens. Print workflows need predictable separations and output intent, so colors should be converted with a known CMYK profile such as SWOP, GRACoL, or FOGRA."
      },
      {
        heading: "How Trim Proof handles color",
        body:
          "The system stores print-profile choices in the LayoutSpec and routes final PDF output through the deterministic prepress stage. The default profile is configurable and should match the printer or market."
      }
    ],
    faq: [
      {
        question: "Is CMYK conversion the same for every printer?",
        answer: "No. The best profile depends on the printer, stock, region, and press workflow. Trim Proof keeps the profile explicit."
      }
    ]
  },
  {
    slug: "add-bleed-to-pdf-online",
    title: "Add Bleed to PDF Online",
    metaDescription:
      "Add bleed, trim, safe-area guides, and crop marks to print files before export.",
    h1: "Add bleed to a PDF before it goes to print",
    answer:
      "Bleed is artwork that extends beyond the trim edge so small cutting shifts do not leave white slivers. Trim Proof uses product-specific bleed geometry, usually 0.125 inches on each side by default.",
    keywords: ["add bleed to PDF online", "PDF bleed generator", "crop marks and bleed PDF"],
    intent: "Use this page when the artwork reaches the cut edge and the printer needs extra image area outside the final trim size.",
    checks: ["0.125 inch default bleed for starter products", "Separate TrimBox and BleedBox", "Safe-area guide", "Crop marks", "Artwork placed through the bleed edge"],
    steps: ["Confirm the final trim size", "Extend background artwork into bleed", "Keep important text inside the safe area", "Generate crop marks if requested", "Run preflight before downloading the PDF"],
    relatedSlugs: ["ai-business-card-generator", "print-ready-pdf-generator", "pdf-preflight-checker"],
    sections: [
      {
        heading: "How much bleed should a file have?",
        body:
          "Many US print workflows expect 0.125 inches of bleed on every edge, but printer specs can vary. Trim Proof keeps bleed as an explicit product setting instead of a visual guess."
      },
      {
        heading: "Bleed is not just a bigger canvas",
        body:
          "A printable file should preserve TrimBox and BleedBox values so prepress systems know the final cut size and extra artwork area."
      }
    ],
    faq: [
      {
        question: "Do crop marks replace bleed?",
        answer: "No. Crop marks show where to cut; bleed provides artwork beyond that cut."
      }
    ]
  },
  {
    slug: "pdf-preflight-checker",
    title: "PDF Preflight Checker",
    metaDescription:
      "Check PDF/X status, bleed boxes, trim size, embedded fonts, color workflow, and image DPI before printing.",
    h1: "PDF preflight checker for online print exports",
    answer:
      "A PDF preflight checker should verify that the file is the expected size, has correct trim and bleed boxes, embeds fonts, uses the intended color workflow, and contains images at print resolution.",
    keywords: ["PDF preflight", "preflight PDF online", "check PDF for print"],
    intent: "Use this page when a PDF looks fine on screen but needs structural print checks before a printer or client receives it.",
    checks: ["PDF exists and is downloadable", "MediaBox, TrimBox, and BleedBox", "PDF/X subtype", "Embedded fonts", "Placed raster DPI", "Ghostscript PDF/X conversion"],
    steps: ["Generate the proof", "Run the preflight gate", "Review passed and needs-attention checks", "Fix geometry, fonts, or images when needed", "Download the PDF only after the report is acceptable"],
    relatedSlugs: ["print-ready-pdf-generator", "pdf-to-cmyk-converter", "add-bleed-to-pdf-online"],
    sections: [
      {
        heading: "What Trim Proof checks before delivery",
        body:
          "The first proof checks PDF creation, MediaBox, TrimBox, BleedBox, PDF/X subtype, embedded fonts, and raster DPI. Paid production exports use the same gate before delivery."
      },
      {
        heading: "Why automated preflight matters",
        body:
          "A file can look fine on screen and still fail at print. Automated preflight catches structural PDF problems before a user pays for or sends the file."
      }
    ],
    faq: [
      {
        question: "Can preflight guarantee every printer will accept a file?",
        answer: "No software can guarantee every vendor-specific requirement, but preflight greatly reduces avoidable production failures."
      }
    ]
  },
  {
    slug: "ai-business-card-generator",
    title: "AI Business Card Generator",
    metaDescription:
      "Generate business card creative ideas while keeping final print text vector, embedded, and preflighted for PDF/X export.",
    h1: "AI business card generator with print-ready PDF/X export",
    answer:
      "An AI business card generator is useful only if the final export is actually printable. Trim Proof lets AI assist with creative assets while deterministic code handles vector text, bleed, CMYK, crop marks, and PDF/X.",
    keywords: ["AI business card generator", "business card PDF", "business card with bleed"],
    intent: "Use this page when you want AI-assisted business-card creative without accepting distorted model-painted text or missing bleed geometry.",
    checks: ["3.5 by 2 inch trim profile", "0.125 inch bleed", "Vector business-card text", "Embedded fonts", "Raster background DPI", "PDF/X preflight"],
    steps: ["Write the brand or business-card brief", "Let the creative layer generate background art", "Keep contact text in vector type", "Check the safe area", "Export the PDF/X proof when preflight passes"],
    relatedSlugs: ["print-ready-pdf-generator", "add-bleed-to-pdf-online", "pdf-preflight-checker"],
    sections: [
      {
        heading: "Why model-painted text is risky",
        body:
          "Image models often distort small lettering. Trim Proof never uses model-painted glyphs in deliverables; business card text is typeset as real embedded fonts."
      },
      {
        heading: "Dummy proof mode for business cards",
        body:
          "The built-in dummy proof demonstrates a business-card export with trim, bleed, safe area, crop marks, font embedding, and preflight reporting."
      }
    ],
    faq: [
      {
        question: "Can Trim Proof make a business card PDF with bleed?",
        answer: "Yes. The business-card profile uses a 3.5 by 2 inch trim size with 0.125 inch bleed by default."
      }
    ]
  },
  {
    slug: "ai-flyer-generator",
    title: "AI Flyer Generator",
    metaDescription:
      "Create flyer concepts with AI assets and deterministic print-ready PDF export for CMYK, bleed, crop marks, and preflight.",
    h1: "AI flyer generator built for print-ready output",
    answer:
      "An AI flyer generator should produce more than a screen image. Trim Proof is designed to turn flyer briefs into structured layouts, generate creative assets, and export deterministic print-ready PDF/X files.",
    keywords: ["AI flyer generator", "flyer PDF maker", "print ready artwork generator"],
    intent: "Use this page when you need flyer concepts from AI but still need a print-production path for bleed, crop marks, CMYK, and preflight.",
    checks: ["Product-specific trim and bleed", "Creative asset slots", "Vector headline and body text", "Output profile", "Preflight report before download"],
    steps: ["Describe the flyer offer and format", "Generate creative art separately from text", "Review safe margins", "Choose advanced export settings for production", "Download the checked PDF/X file"],
    relatedSlugs: ["print-ready-pdf-generator", "pdf-to-cmyk-converter", "pdf-preflight-checker"],
    sections: [
      {
        heading: "Flyers need production geometry",
        body:
          "Flyer artwork often goes edge to edge, which makes bleed and safe margins important. Trim Proof keeps those geometry rules in product profiles."
      },
      {
        heading: "Advanced mode for production jobs",
        body:
          "Advanced mode exposes print profile, PDF/X level, crop marks, and preflight state so teams can prepare production exports instead of downloading a flat image."
      }
    ],
    faq: [
      {
        question: "Does advanced mode require payment?",
        answer: "Production exports can be sold as one-time export credits or through subscriptions using Stripe Price IDs."
      }
    ]
  }
];

export function getToolPage(slug: string) {
  return toolPages.find((page) => page.slug === slug);
}
