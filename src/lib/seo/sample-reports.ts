import type { ProductType } from "@/lib/print/constants";

export interface SampleReportCheck {
  label: string;
  status: "passed" | "needs_attention";
  evidence: string;
}

export interface SampleReportExample {
  productType: ProductType;
  title: string;
  status: "passed" | "needs_attention";
  sourceMaterial: string;
  printerSpec: string;
  summary: string;
  checks: SampleReportCheck[];
  boundary: string;
}

export interface SampleReportHandoffExample {
  before: string;
  after: string;
}

export const sampleReportExamples: SampleReportExample[] = [
  {
    productType: "business_card",
    title: "Business card sample report",
    status: "passed",
    sourceMaterial: "Non-customer sample brief for a local service business card.",
    printerSpec: "Standard 3.5 x 2 in card with 0.125 in bleed and crop marks.",
    summary: "The sample card shows trim, bleed, safe area, vector text, embedded fonts, CMYK-oriented output, and PDF/X target checks in one handoff note.",
    checks: [
      { label: "Trim and bleed", status: "passed", evidence: "3.5 x 2 in trim with 0.125 in bleed." },
      { label: "Safe area", status: "passed", evidence: "Important text stays inside the safe margin." },
      { label: "Vector text", status: "passed", evidence: "Live text is produced as vector drawing instructions." },
      { label: "PDF/X target", status: "passed", evidence: "PDF/X-oriented export path selected for the sample profile." }
    ],
    boundary: "This is a sample report, not a guarantee that every printer will accept the file unchanged."
  },
  {
    productType: "menu",
    title: "Restaurant menu sample report",
    status: "needs_attention",
    sourceMaterial: "Demo menu copy and sample food sections, with no customer file or private content.",
    printerSpec: "Letter-size handout menu with bleed, crop marks, and a CMYK-oriented handoff.",
    summary: "The sample menu demonstrates how a report can separate passed structural checks from items that should be reviewed before production.",
    checks: [
      { label: "Trim and bleed", status: "passed", evidence: "Letter profile includes bleed and crop marks." },
      { label: "Image DPI", status: "needs_attention", evidence: "One decorative image should be reviewed before clean export." },
      { label: "Color workflow", status: "passed", evidence: "Print profile is recorded in the report." },
      { label: "Handoff note", status: "passed", evidence: "The report names the review item before download." }
    ],
    boundary: "Needs-attention samples are learning examples, not printer rejection or acceptance claims."
  },
  {
    productType: "postcard",
    title: "Postcard sample report",
    status: "passed",
    sourceMaterial: "Sample postcard campaign brief for a fictional local event.",
    printerSpec: "4 x 6 in postcard with bleed, safe area, crop marks, and report notes.",
    summary: "The sample postcard shows how recurring local marketing assets can move from a rough brief to a checked starter proof.",
    checks: [
      { label: "Supported product", status: "passed", evidence: "4 x 6 in postcard profile selected." },
      { label: "Crop marks", status: "passed", evidence: "Crop marks are present in the proof output." },
      { label: "Text safety", status: "passed", evidence: "Headline and call-to-action stay inside the safe area." },
      { label: "Report file", status: "passed", evidence: "HTML, text, and JSON report artifacts can be generated." }
    ],
    boundary: "The postcard example uses non-customer sample content and does not imply measured time saved."
  }
];

export const sampleReportHandoffExamples: SampleReportHandoffExample[] = [
  {
    before: "A customer sends loose business card copy and asks for a file the printer can use.",
    after: "Trim Proof creates a checked proof and preflight report showing trim, bleed, safe area, vector text, and PDF/X target status."
  },
  {
    before: "A restaurant menu looks finished on screen, but one image may not be production-ready.",
    after: "The preflight report separates passed checks from review items before anyone treats the export as final."
  },
  {
    before: "A marketer needs a postcard for a repeat campaign but does not know which print checks matter.",
    after: "The report gives a concise handoff summary that can travel with the proof and printer spec."
  }
];

export const sampleReportProofRules = [
  "No customer logos, testimonials, or customer names appear on this page.",
  "No printer acceptance, uptime, or time-saved metrics are claimed from sample reports.",
  "Pilot learnings require a pilot_evidence_records row with approved_public status before public use.",
  "Printer specs still control final acceptance for every job."
];
