export interface ComparisonPage {
  path: string;
  slug: string;
  title: string;
  metaDescription: string;
  eyebrow: string;
  h1: string;
  shortAnswer: string;
  emailSource: string;
  primaryCta: string;
  sourceNotes: Array<{
    label: string;
    href: string;
    note: string;
  }>;
  decisionRows: Array<{
    question: string;
    canvaFit: string;
    trimProofFit: string;
    specialistFit: string;
  }>;
  useCanvaWhen: string[];
  useTrimProofWhen: string[];
  useSpecialistWhen: string[];
  boundaries: string[];
  faq: Array<{
    question: string;
    answer: string;
  }>;
}

export const comparisonPages: ComparisonPage[] = [
  {
    path: "/compare/canva-print-ready-pdf",
    slug: "canva-print-ready-pdf",
    title: "Canva Print-Ready PDF vs Trim Proof",
    metaDescription:
      "Compare Canva PDF Print exports with Trim Proof checked PDF/X proofs. See when Canva is enough, when a fresh preflight report helps, and what neither tool should promise.",
    eyebrow: "Comparison guide",
    h1: "Canva print-ready PDF or Trim Proof? Use the right workflow for the print risk.",
    shortAnswer:
      "Use Canva when you need a familiar design workspace and the printer accepts its requested export settings. Use Trim Proof when the job needs a fresh checked proof for a supported product, visible trim and bleed geometry, vector text, PDF/X-oriented output, and a shareable preflight report before production download.",
    emailSource: "comparison_canva_print_ready_pdf",
    primaryCta: "Get comparison updates",
    sourceNotes: [
      {
        label: "Canva Help: margins, bleed, and crop marks",
        href: "https://www.canva.com/help/margins-bleed-crop-marks/",
        note: "Canva documents PDF Print export with a crop marks and bleed option."
      },
      {
        label: "Canva Help: download file types",
        href: "https://www.canva.com/help/download-file-types/",
        note: "Canva describes PDF Print as a print-focused file type with 300 dpi language, bleed, crop marks, and color-profile selection options."
      },
      {
        label: "Canva Help: flattened PDF",
        href: "https://www.canva.com/help/download-flattened-pdf/",
        note: "Canva documents flattened PDF downloads for PDF Standard and PDF Print exports."
      }
    ],
    decisionRows: [
      {
        question: "Starting point",
        canvaFit: "Best when the design already lives in Canva or the team needs a broad template and editing workspace.",
        trimProofFit: "Best when the buyer has a plain-English brief and needs a fresh supported proof with visible print checks.",
        specialistFit: "Best when the job already has complex source files, vendor specs, finishing, or production constraints."
      },
      {
        question: "Print handoff evidence",
        canvaFit: "Useful when the printer accepts the chosen Canva export settings and no separate preflight report is required.",
        trimProofFit: "Useful when someone needs a readable report covering trim, bleed, boxes, fonts, image DPI, PDF/X status, and review items.",
        specialistFit: "Useful when the file needs expert repair, RIP checks, imposition, or vendor-specific production approval."
      },
      {
        question: "Text and layout control",
        canvaFit: "Strong for collaborative editing, brand kits, templates, and fast visual iteration.",
        trimProofFit: "Focused on final supported proof output with production text placed as vector type in the generated PDF layer.",
        specialistFit: "Required for advanced typography, brand-system control, packaging, dielines, or native-file production."
      },
      {
        question: "Commercial fit",
        canvaFit: "Good for teams already paying for Canva or using Canva Print/vendor-accepted downloads.",
        trimProofFit: "Good for occasional $12 clean exports or Pro users who need repeat checked proofs.",
        specialistFit: "Good when production risk is high enough to justify expert prepress time."
      }
    ],
    useCanvaWhen: [
      "Your team already edits the design in Canva and the printer accepts the requested PDF Print settings.",
      "The job mostly needs template editing, brand-kit collaboration, or quick visual iteration.",
      "You are ordering through a workflow where Canva's own print proof and production path are the source of truth."
    ],
    useTrimProofWhen: [
      "You need a fresh proof from a brief for a supported product: flyer, poster, menu, brochure, business card, postcard, or letterhead.",
      "The printer or client is asking about bleed, crop marks, vector text, PDF/X, color workflow, image DPI, or preflight evidence.",
      "You want to inspect a watermarked demo proof and report before paying for a clean production-oriented PDF/X export."
    ],
    useSpecialistWhen: [
      "The file is an arbitrary existing PDF that needs diagnosis or repair.",
      "The job involves packaging, dielines, specialty finishing, variable data, regulatory review, or unusual print conditions.",
      "The printer requires proprietary settings, a specific RIP workflow, or manual prepress approval before production."
    ],
    boundaries: [
      "Trim Proof does not directly convert or repair every Canva export.",
      "Canva can be the right tool when its export settings match the printer's requirements.",
      "Neither Canva nor Trim Proof should be treated as a universal guarantee of printer acceptance.",
      "Printer specifications, substrates, finishing, upload portals, and approval rules still control final production."
    ],
    faq: [
      {
        question: "Is Trim Proof a Canva replacement?",
        answer:
          "No. Canva is a broad design workspace. Trim Proof is narrower: it creates checked PDF/X-oriented proofs for supported print products and exposes the preflight report before a clean export."
      },
      {
        question: "Can Trim Proof fix any Canva PDF?",
        answer:
          "No. Trim Proof is not a universal Canva repair service. It can create a fresh checked proof from structured inputs when the current file cannot prove the required print geometry or preflight checks."
      },
      {
        question: "When is Canva enough for print?",
        answer:
          "Canva may be enough when the design is set up correctly, the PDF Print settings match the printer's requirements, and the printer does not require a separate PDF/X preflight report."
      },
      {
        question: "When should I rebuild the file in Trim Proof?",
        answer:
          "Rebuild when the job fits a supported Trim Proof product and the current file leaves uncertainty around trim, bleed, crop marks, vector text, image DPI, color workflow, or PDF/X status."
      }
    ]
  }
];

export function getComparisonPage(slug: string) {
  return comparisonPages.find((page) => page.slug === slug);
}
